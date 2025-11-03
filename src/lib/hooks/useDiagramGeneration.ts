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

  // NO AUTO-GENERATION - user must click the button explicitly

  const handleRetry = () => {
    setError(null);
    setLastInput(null);

    // Simple retry without context
    setGenerateInput({
      owner: user,
      repo,
      ref: refName || 'main',
      path,
      diagramType,
      options,
    });
    setShouldGenerate(true);
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
      previousResult: previousDiagramCode || diagramCode,
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