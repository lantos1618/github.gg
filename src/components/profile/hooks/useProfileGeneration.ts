"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';
import type { SSEStatus, SSELogItem } from '@/components/analysis/ReusableSSEFeedback';

type GenerationEvent =
  | { type: 'progress'; progress: number; message: string }
  | { type: 'complete'; data: { profile: DeveloperProfileType; cached: boolean; stale: boolean; lastUpdated: string } }
  | { type: 'error'; message: string };

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
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasCompletedRef = useRef(false);

  const utils = trpc.useUtils();

  const { refetch: checkGenerationStatus } = trpc.profile.checkGenerationStatus.useQuery(
    { username },
    { enabled: false }
  );

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const addLog = useCallback((message: string, type: SSELogItem['type']) => {
    setLogs((prev: SSELogItem[]) => {
      if (type === 'info' && prev.length > 0 && prev[prev.length - 1].message === message) {
        return prev;
      }
      return [...prev, { message, timestamp: new Date(), type }];
    });
  }, []);

  const setupEventSource = useCallback((eventSource: EventSource) => {
    eventSourceRef.current = eventSource;
    setIsGenerating(true);
    setSseStatus('processing');

    eventSource.addEventListener('progress', (rawEvent) => {
      try {
        const messageEvent = rawEvent as MessageEvent;
        const event = JSON.parse(messageEvent.data) as unknown as GenerationEvent;

        if (event.type === 'progress') {
          const newProgress = event.progress || 0;
          const newMessage = event.message || '';
          setProgress(newProgress);
          if (newMessage) {
            setCurrentStep(newMessage);
            addLog(newMessage, 'info');
          }
        }
      } catch (error) {
        console.error('Failed to parse progress event:', error);
      }
    });

    eventSource.addEventListener('complete', (rawEvent) => {
      try {
        const messageEvent = rawEvent as MessageEvent;
        const event = JSON.parse(messageEvent.data) as unknown as GenerationEvent;

        if (event.type === 'complete') {
          setIsGenerating(false);
          setProgress(100);
          setSseStatus('complete');
          setCurrentStep('Profile generated successfully');
          addLog('Profile generated successfully', 'success');
          hasCompletedRef.current = true;
          eventSource.close();
          eventSourceRef.current = null;

          utils.profile.publicGetProfile.invalidate({ username });
          utils.profile.getProfileVersions.invalidate({ username });
        }
      } catch (error) {
        console.error('Failed to parse complete event:', error);
      }
    });

    const handleError = (rawEvent: Event) => {
      console.error('Profile generation SSE error:', rawEvent);
      if (hasCompletedRef.current) {
        return;
      }
      setIsGenerating(false);
      setSseStatus('error');

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      let errorMessage = 'Failed to generate profile';
      try {
        const messageEvent = rawEvent as MessageEvent;
        if (messageEvent.data) {
          const parsed = JSON.parse(messageEvent.data);
          if (parsed.message) {
            errorMessage = parsed.message;
          }
        }
      } catch {
        // Parsing failed, use default message
      }

      // If "already in progress" error, check for recent profile that might have completed
      if (errorMessage.includes('already in progress')) {
        checkGenerationStatus().then((result) => {
          const status = result.data;
          if (status?.hasRecentProfile && status.profile) {
            setProgress(100);
            setSseStatus('complete');
            setCurrentStep('Profile generated successfully');
            setGenerationError(null);
            addLog('Profile generated successfully', 'success');
            utils.profile.publicGetProfile.invalidate({ username });
            utils.profile.getProfileVersions.invalidate({ username });
            return;
          }
        }).catch((err) => {
          console.error('Failed to check generation status:', err);
        });
      }

      if (errorMessage.includes('No original (non-forked) public repositories')) {
        errorMessage = "This user doesn't have enough original public repositories to generate a meaningful profile yet.";
      }

      setCurrentStep(errorMessage);
      setGenerationError(errorMessage);
      addLog(errorMessage, 'error');
    };

    eventSource.addEventListener('error', handleError);
  }, [username, utils, checkGenerationStatus, addLog]);

  const resetState = useCallback(() => {
    setProgress(0);
    setLogs([]);
    setGenerationError(null);
    setSseStatus('connecting');
    hasCompletedRef.current = false;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const handleGenerateProfile = useCallback(() => {
    if (isGenerating) return;

    resetState();
    setCurrentStep('Initializing analysis...');

    const params = new URLSearchParams({
      username,
      includeCodeAnalysis: 'true',
    });

    const eventSource = new EventSource(
      `/api/profile/generate?${params.toString()}`,
    );
    setupEventSource(eventSource);
  }, [username, isGenerating, resetState, setupEventSource]);

  const handleGenerateWithSelectedRepos = useCallback((selectedRepoNames: string[], forceRefreshScorecards: boolean = false) => {
    if (isGenerating) return;

    resetState();
    setCurrentStep('Initializing analysis with selected repos...');

    const params = new URLSearchParams({
      username,
      includeCodeAnalysis: 'true',
    });

    if (forceRefreshScorecards) {
      params.set('forceRefreshScorecards', 'true');
    }

    selectedRepoNames.forEach((name) => {
      params.append('selectedRepo', name);
    });

    const eventSource = new EventSource(
      `/api/profile/generate?${params.toString()}`,
    );
    setupEventSource(eventSource);
  }, [username, isGenerating, resetState, setupEventSource]);

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
        setGenerationError('Generation is still in progress. Please wait a moment and try again.');
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
