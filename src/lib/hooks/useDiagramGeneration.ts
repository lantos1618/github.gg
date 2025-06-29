"use client";
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { DiagramType } from '@/lib/types/diagram';

interface File {
  path: string;
  content: string;
  size: number;
}

interface UseDiagramGenerationProps {
  user: string;
  repo: string;
  refName?: string;
  files: File[];
  diagramType: DiagramType;
  options: Record<string, unknown>;
}

export function useDiagramGeneration({
  user,
  repo,
  refName,
  files,
  diagramType,
  options
}: UseDiagramGenerationProps) {
  const [diagramCode, setDiagramCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<{diagramType: DiagramType; filesHash: string} | null>(null);
  const [manualRetryKey, setManualRetryKey] = useState(0);
  const [previousDiagramCode, setPreviousDiagramCode] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');

  const generateDiagramMutation = trpc.diagram.generateDiagram.useMutation({
    onSuccess: (data) => {
      setDiagramCode(data.diagramCode);
      setError(null);
      setLastError('');
      setLastInput({
        diagramType,
        filesHash: JSON.stringify(files.map(f => f.path + f.content.length))
      });
    },
    onError: (err) => {
      const errorMessage = err.message || 'Failed to generate diagram';
      setError(errorMessage);
      setLastError(errorMessage);
    }
  });

  // Auto-generate when input changes
  useEffect(() => {
    if (!files || files.length === 0) return;
    
    const filesHash = JSON.stringify(files.map(f => f.path + f.content.length));
    const inputChanged = !lastInput || 
      lastInput.diagramType !== diagramType || 
      lastInput.filesHash !== filesHash;
    
    if (inputChanged) {
      setError(null);
      setLastError('');
      if (diagramCode) {
        setPreviousDiagramCode(diagramCode);
      }
      setDiagramCode('');
      setLastInput(null);
      
      generateDiagramMutation.mutate({
        user,
        repo,
        ref: refName || 'main',
        files: files.map(f => ({ path: f.path, content: f.content, size: f.size })),
        diagramType,
        options,
        ...(manualRetryKey > 0 && {
          previousResult: previousDiagramCode,
          lastError: lastError,
          isRetry: true,
        }),
      });
    }
  }, [files, diagramType, manualRetryKey, user, repo, refName, options, lastInput, diagramCode, previousDiagramCode, lastError, generateDiagramMutation]);

  const handleRetry = () => {
    setError(null);
    setLastInput(null);
    setManualRetryKey(k => k + 1);
  };

  const handleRetryWithContext = () => {
    if (!previousDiagramCode || !lastError) return;
    
    setError(null);
    generateDiagramMutation.mutate({
      user,
      repo,
      ref: refName || 'main',
      files: files.map(f => ({ path: f.path, content: f.content, size: f.size })),
      diagramType,
      options,
      previousResult: previousDiagramCode,
      lastError: lastError,
      isRetry: true,
    });
  };

  return {
    diagramCode,
    error,
    isPending: generateDiagramMutation.isPending,
    previousDiagramCode,
    handleRetry,
    handleRetryWithContext,
  };
} 