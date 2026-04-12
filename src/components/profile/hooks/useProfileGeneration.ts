"use client";

import { useState, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { SSEStatus, SSELogItem } from '@/components/analysis/ReusableSSEFeedback';
import { sanitizeText } from '@/lib/utils/sanitize';

interface UseProfileGenerationOptions {
  username: string;
}

export function useProfileGeneration({ username }: UseProfileGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<SSELogItem[]>([]);
  const [sseStatus, setSseStatus] = useState<SSEStatus>('idle');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Ref-based guard to prevent duplicate triggers (survives re-renders and Strict Mode double-mount)
  const generationInFlightRef = useRef(false);

  // Subscription control
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [subscriptionInput, setSubscriptionInput] = useState<{
    username: string;
    includeCodeAnalysis?: boolean;
    selectedRepos?: string[];
    forceRefreshScorecards?: boolean;
  } | null>(null);

  const utils = trpc.useUtils();

  const { refetch: checkGenerationStatus } = trpc.profile.checkGenerationStatus.useQuery(
    { username },
    { enabled: false }
  );

  const addLog = useCallback((message: string, type: SSELogItem['type']) => {
    setLogs((prev: SSELogItem[]) => {
      if (type === 'info' && prev.length > 0 && prev[prev.length - 1].message === message) {
        return prev;
      }
      return [...prev, { message, timestamp: new Date(), type }];
    });
  }, []);

  // Poll for profile completion after connection drop
  const pollForRecovery = useCallback(async (fallbackMessage: string) => {
    setCurrentStep('Connection interrupted, checking if profile completed...');
    addLog('Connection interrupted, checking status...', 'info');

    const MAX_POLL_TIME_MS = 120_000;
    const POLL_INTERVAL_MS = 15_000;
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLL_TIME_MS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      try {
        const result = await checkGenerationStatus();
        const status = result.data;
        if (status?.hasRecentProfile && status.profile) {
          setProgress(100);
          setSseStatus('complete');
          setIsGenerating(false);
          setCurrentStep('Profile generated successfully');
          setGenerationError(null);
          addLog('Profile generated successfully', 'success');
          utils.profile.publicGetProfile.invalidate({ username });
          utils.profile.getProfileVersions.invalidate({ username });
          return;
        }
        if (!status?.lockExists) break;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setCurrentStep(`Server still generating profile... (${elapsed}s)`);
      } catch (err) {
        console.error('Failed to check generation status:', err);
      }
    }

    // Recovery failed
    setIsGenerating(false);
    setSseStatus('error');
    setCurrentStep(fallbackMessage);
    setGenerationError(fallbackMessage);
    addLog(fallbackMessage, 'error');
  }, [username, utils, checkGenerationStatus, addLog]);

  // tRPC subscription for profile generation
  trpc.profile.generateProfileMutation.useSubscription(
    subscriptionInput ?? { username: '' },
    {
      enabled: shouldGenerate && !!subscriptionInput?.username,
      onData: (event: any) => {
        if (event.type === 'progress') {
          const pct = event.progress || 0;
          const message = sanitizeText(event.message || '');
          setSseStatus('processing');
          setProgress(pct);
          if (message) {
            setCurrentStep(message);
            addLog(message, 'info');
          }
        } else if (event.type === 'complete') {
          generationInFlightRef.current = false;
          setIsGenerating(false);
          setProgress(100);
          setSseStatus('complete');
          setCurrentStep('Profile generated successfully');
          addLog('Profile generated successfully', 'success');
          setShouldGenerate(false);
          setSubscriptionInput(null);
          utils.profile.publicGetProfile.invalidate({ username });
          utils.profile.getProfileVersions.invalidate({ username });
        } else if (event.type === 'error') {
          let message = sanitizeText(event.message || 'Failed to generate profile');
          if (message.includes('No original (non-forked) public repositories')) {
            message = "This user doesn't have enough original public repositories to generate a meaningful profile yet.";
          }
          generationInFlightRef.current = false;
          setIsGenerating(false);
          setSseStatus('error');
          setCurrentStep(message);
          setGenerationError(message);
          addLog(message, 'error');
          setShouldGenerate(false);
          setSubscriptionInput(null);
        }
      },
      onError: (err) => {
        generationInFlightRef.current = false;
        setShouldGenerate(false);
        setSubscriptionInput(null);
        pollForRecovery(err.message || 'Connection error');
      },
    }
  );

  const handleGenerateProfile = useCallback(() => {
    if (isGenerating || generationInFlightRef.current) return;
    generationInFlightRef.current = true;

    setProgress(0);
    setLogs([]);
    setGenerationError(null);
    setSseStatus('connecting');
    setIsGenerating(true);
    setCurrentStep('Initializing analysis...');

    setSubscriptionInput({
      username,
      includeCodeAnalysis: true,
    });
    setShouldGenerate(true);
  }, [username, isGenerating]);

  const handleGenerateWithSelectedRepos = useCallback((selectedRepoNames: string[], forceRefreshScorecards: boolean = false) => {
    if (isGenerating || generationInFlightRef.current) return;
    generationInFlightRef.current = true;

    setProgress(0);
    setLogs([]);
    setGenerationError(null);
    setSseStatus('connecting');
    setIsGenerating(true);
    setCurrentStep('Initializing analysis with selected repos...');

    setSubscriptionInput({
      username,
      includeCodeAnalysis: true,
      selectedRepos: selectedRepoNames,
      forceRefreshScorecards,
    });
    setShouldGenerate(true);
  }, [username, isGenerating]);

  const handleReconnect = useCallback(async () => {
    try {
      const result = await checkGenerationStatus();
      const status = result.data;
      if (status?.hasRecentProfile && status.profile) {
        setProgress(100);
        setSseStatus('complete');
        setCurrentStep('Profile loaded');
        setGenerationError(null);
        addLog('Profile loaded successfully', 'success');
        utils.profile.publicGetProfile.invalidate({ username });
        utils.profile.getProfileVersions.invalidate({ username });
      } else if (status?.lockExists) {
        // Lock exists but no profile yet — poll until it completes
        setIsGenerating(true);
        setSseStatus('processing');
        setCurrentStep('Reconnecting to generation in progress...');
        setGenerationError(null);
        addLog('Reconnecting to active generation...', 'info');
        pollForRecovery('Generation timed out. Please try again.');
      } else {
        handleGenerateProfile();
      }
    } catch (err) {
      console.error('Failed to reconnect:', err);
      setGenerationError('Failed to check generation status. Please try again.');
    }
  }, [username, utils, checkGenerationStatus, handleGenerateProfile, addLog]);

  return {
    isGenerating,
    progress,
    logs,
    sseStatus,
    currentStep,
    generationError,
    handleGenerateProfile,
    handleGenerateWithSelectedRepos,
    handleReconnect,
  };
}
