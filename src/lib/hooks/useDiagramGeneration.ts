"use client";
import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { DiagramType } from '@/lib/types/diagram';
import { DiagramOptions } from '@/lib/types/errors';

interface UseDiagramGenerationProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string; // Add path for context
  diagramType: DiagramType;
  options: DiagramOptions;
  hasAccess: boolean; // Add a flag to control execution
}

export function useDiagramGeneration({
  user,
  repo,
  refName,
  path,
  diagramType,
  options,
  hasAccess,
}: UseDiagramGenerationProps) {
  const [diagramCode, setDiagramCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<{diagramType: DiagramType; filesHash: string} | null>(null);
  const [manualRetryKey, setManualRetryKey] = useState(0);
  const [previousDiagramCode, setPreviousDiagramCode] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [generateInput, setGenerateInput] = useState<any>(null);

  // Use ref to track hasAccess without causing re-renders
  const hasAccessRef = useRef(hasAccess);
  hasAccessRef.current = hasAccess;

  const utils = trpc.useUtils();

  // Generate diagram subscription
  trpc.diagram.generateDiagram.useSubscription(
    generateInput || { owner: user, repo, ref: refName || 'main', path, diagramType, options },
    {
      enabled: shouldGenerate && !!generateInput,
      onData: (event: any) => {
        if (event.type === 'progress') {
          setIsPending(true);
        } else if (event.type === 'complete') {
          setDiagramCode(event.data.diagramCode);
          setError(null);
          setLastError('');
          setIsPending(false);
          setShouldGenerate(false);
          setLastInput({
            diagramType,
            filesHash: `${user}/${repo}/${refName}/${path}/${diagramType}`
          });

          // Invalidate queries to refresh version list and cached diagrams
          utils.diagram.getDiagramVersions.invalidate({ user, repo, ref: refName || 'main', diagramType });
          utils.diagram.publicGetDiagram.invalidate({ user, repo, ref: refName || 'main', diagramType });
        } else if (event.type === 'error') {
          const errorMessage = event.message || 'Failed to generate diagram';
          setError(errorMessage);
          setLastError(errorMessage);
          setIsPending(false);
          setShouldGenerate(false);
        }
      },
    }
  );

  // Auto-generate when input changes
  useEffect(() => {
    // NEW GUARDS: Don't run if user has no access or files aren't loaded yet.
    if (!hasAccessRef.current) {
      console.log('🔥 Skipping generation - no access (user not authenticated or no plan)');
      return;
    }
    if (!diagramType) return;
    if (!user || !repo) return;

    // The new trigger is much more stable, based on simple strings
    const currentInputHash = `${user}/${repo}/${refName}/${path}/${diagramType}`;
    const inputChanged = !lastInput || lastInput.filesHash !== currentInputHash;

    // Prevent re-triggering if a request is already pending
    if (!inputChanged || isPending) return;

    setError(null);
    setLastError('');
    if (diagramCode) {
      setPreviousDiagramCode(diagramCode);
    }
    setDiagramCode('');
    setLastInput({ diagramType, filesHash: currentInputHash });

    setGenerateInput({
      owner: user,
      repo,
      ref: refName || 'main',
      path,
      diagramType,
      options,
      ...(manualRetryKey > 0 && {
        previousResult: previousDiagramCode,
        lastError: lastError,
        isRetry: true,
      }),
    });
    setShouldGenerate(true);
  }, [user, repo, refName, path, diagramType, options, lastInput, isPending, diagramCode, previousDiagramCode, lastError, manualRetryKey]);

  const handleRetry = () => {
    setError(null);
    setLastInput(null);
    setManualRetryKey(k => k + 1);
  };

  const handleRetryWithContext = (renderError?: string) => {
    setError(null);
    setLastInput(null); // Reset lastInput to ensure mutation triggers

    // Use render error if provided, otherwise use generation error
    const errorToSend = renderError || lastError;

    // Pass the previous diagram code and error to the backend for fixing
    setGenerateInput({
      owner: user,
      repo,
      ref: refName || 'main',
      path,
      diagramType,
      options,
      previousResult: previousDiagramCode,
      lastError: errorToSend,
      isRetry: true,
    });
    setShouldGenerate(true);
  };

  return {
    diagramCode,
    error,
    isPending,
    previousDiagramCode,
    handleRetry,
    handleRetryWithContext,
  };
} 