"use client";
import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
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
  const [lastInput, setLastInput] = useState<{ diagramType: DiagramType; filesHash: string } | null>(null);
  const [previousDiagramCode, setPreviousDiagramCode] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [generateInput, setGenerateInput] = useState<any>(null);

  // Use ref to track hasAccess without causing re-renders
  const hasAccessRef = useRef(hasAccess);
  hasAccessRef.current = hasAccess;

  // Ref to track if component is mounted (prevents state updates after unmount)
  const isMountedRef = useRef(true);

  const utils = trpc.useUtils();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear generation state on unmount to prevent stale subscriptions
      setShouldGenerate(false);
      setGenerateInput(null);
    };
  }, []);

  // Create a stable default input to prevent re-subscriptions on every render
  const defaultInput = useMemo(
    () => ({ owner: user, repo, ref: refName || 'main', path, diagramType, options }),
    [user, repo, refName, path, diagramType, options]
  );

  // Generate diagram subscription - only use generateInput when it exists, otherwise use stable default.
  // Subscription is only enabled when the user explicitly triggers generation and has access.
  const subscriptionInput = generateInput || defaultInput;
  const shouldSubscribe = shouldGenerate && !!generateInput && hasAccessRef.current;

  // Cleanup function to reset state safely
  const cleanupSubscription = useCallback(() => {
    if (isMountedRef.current) {
      setIsPending(false);
      setShouldGenerate(false);
      setGenerateInput(null);
    }
  }, []);

  trpc.diagram.generateDiagram.useSubscription(subscriptionInput, {
    enabled: shouldSubscribe,
    onData: (event: any) => {
      // Guard against updates after unmount
      if (!isMountedRef.current) return;

      if (event.type === 'progress') {
        setIsPending(true);
      } else if (event.type === 'heartbeat') {
        // Heartbeat received - connection is alive, no action needed
      } else if (event.type === 'complete') {
        setDiagramCode(event.data.diagramCode);
        setError(null);
        setLastError('');
        cleanupSubscription();
        setLastInput({
          diagramType,
          filesHash: `${user}/${repo}/${refName}/${path}/${diagramType}`,
        });

        // Invalidate queries to refresh version list and cached diagrams
        utils.diagram.getDiagramVersions.invalidate({ user, repo, ref: refName || 'main', diagramType });
        utils.diagram.publicGetDiagram.invalidate({ user, repo, ref: refName || 'main', diagramType });
      } else if (event.type === 'error') {
        const errorMessage = event.message || 'Failed to generate diagram';
        setError(errorMessage);
        setLastError(errorMessage);
        cleanupSubscription();
      }
    },
    onError: (err: any) => {
      // Handle subscription errors (connection issues, etc.)
      if (!isMountedRef.current) return;
      console.error('Diagram subscription error:', err);
      setError(err?.message || 'Connection error. Please try again.');
      cleanupSubscription();
    },
  });

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