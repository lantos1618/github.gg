'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { WrappedData } from '@/lib/types/wrapped';

export type LogEntry = {
  message: string;
  progress: number;
  timestamp: number;
  metadata?: {
    commits?: number;
    repos?: number;
    sampleCommits?: Array<{ repo: string; message: string }>;
    prs?: number;
    personalityType?: string;
    personalityEmoji?: string;
    grade?: string;
    type?: string;
    insight?: string;
    streaming?: boolean;
    textChunk?: string;
  };
};

export type WrappedGenerationState = {
  progress: number;
  message: string;
  logs: LogEntry[];
  data: WrappedData | null;
  error: string | null;
  isLoading: boolean;
  starRequired: boolean;
  repoUrl: string | null;
  cached: boolean;
};

export type GenerationOptions = {
  withAI?: boolean;
  includeRoast?: boolean;
  force?: boolean;
};

type WrappedEvent = {
  type: string;
  progress?: number;
  message?: string;
  data?: WrappedData;
  cached?: boolean;
  repoUrl?: string;
  metadata?: {
    commits?: number;
    repos?: number;
    sampleCommits?: Array<{ repo: string; message: string }>;
    prs?: number;
    personalityType?: string;
    personalityEmoji?: string;
    grade?: string;
    type?: string;
    insight?: string;
    streaming?: boolean;
    textChunk?: string;
  };
};

export function useWrappedGeneration(year?: number) {
  const [state, setState] = useState<WrappedGenerationState>({
    progress: 0,
    message: '',
    logs: [],
    data: null,
    error: null,
    isLoading: false,
    starRequired: false,
    repoUrl: null,
    cached: false,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const utils = trpc.useUtils();

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startGeneration = useCallback((options?: GenerationOptions) => {
    cleanup();
    
    setState({
      progress: 0,
      message: 'Starting generation...',
      logs: [{ message: 'Starting generation...', progress: 0, timestamp: Date.now() }],
      data: null,
      error: null,
      isLoading: true,
      starRequired: false,
      repoUrl: null,
      cached: false,
    });

    const targetYear = year || new Date().getFullYear();
    
    const subscription = utils.client.wrapped.generateWrapped.subscribe(
      {
        year: targetYear,
        withAI: options?.withAI ?? false,
        includeRoast: options?.includeRoast ?? false,
        force: options?.force ?? false,
      },
      {
        onData: (rawEvent) => {
          const event = rawEvent as WrappedEvent;
          
          if (event.type === 'progress') {
            setState((prev) => {
              const newMessage = event.message ?? prev.message;
              const newProgress = event.progress ?? prev.progress;
              const shouldAddLog = newMessage !== prev.message;
              return {
                ...prev,
                progress: newProgress,
                message: newMessage,
                logs: shouldAddLog 
                  ? [...prev.logs, { 
                      message: newMessage, 
                      progress: newProgress, 
                      timestamp: Date.now(),
                      metadata: event.metadata,
                    }]
                  : prev.logs,
              };
            });
          } else if (event.type === 'complete') {
            setState((prev) => ({
              ...prev,
              progress: 100,
              message: 'Complete!',
              logs: [...prev.logs, { message: 'Complete!', progress: 100, timestamp: Date.now() }],
              data: event.data ?? null,
              isLoading: false,
              cached: event.cached ?? false,
            }));
            cleanup();
          } else if (event.type === 'star_required') {
            setState((prev) => ({
              ...prev,
              starRequired: true,
              repoUrl: event.repoUrl ?? null,
              message: event.message ?? 'Star required',
              isLoading: false,
            }));
            cleanup();
          } else if (event.type === 'error') {
            setState((prev) => ({
              ...prev,
              error: event.message ?? 'An error occurred',
              isLoading: false,
            }));
            cleanup();
          }
        },
        onError: (error) => {
          setState((prev) => ({
            ...prev,
            error: error.message || 'Failed to generate wrapped',
            isLoading: false,
          }));
          cleanup();
        },
        onComplete: () => {
          cleanup();
        },
      }
    );

    unsubscribeRef.current = subscription.unsubscribe;
  }, [cleanup, year, utils.client.wrapped.generateWrapped]);

  const reset = useCallback(() => {
    cleanup();
    setState({
      progress: 0,
      message: '',
      logs: [],
      data: null,
      error: null,
      isLoading: false,
      starRequired: false,
      repoUrl: null,
      cached: false,
    });
  }, [cleanup]);

  return {
    ...state,
    startGeneration,
    reset,
  };
}

export type GenerateForFriendOptions = {
  friendUsername: string;
  year?: number;
  personalMessage?: string;
};

export type GenerateForFriendState = {
  progress: number;
  message: string;
  data: {
    username: string;
    year: number;
    wrappedUrl: string;
    emailSent: boolean;
    inviteCode: string;
  } | null;
  error: string | null;
  isLoading: boolean;
  starRequired: boolean;
};

type FriendWrappedEvent = {
  type: string;
  progress?: number;
  message?: string;
  data?: {
    username: string;
    year: number;
    wrappedUrl: string;
    emailSent: boolean;
    inviteCode: string;
  };
  repoUrl?: string;
};

export function useGenerateForFriend() {
  const [state, setState] = useState<GenerateForFriendState>({
    progress: 0,
    message: '',
    data: null,
    error: null,
    isLoading: false,
    starRequired: false,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const utils = trpc.useUtils();

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const generate = useCallback((options: GenerateForFriendOptions) => {
    cleanup();
    
    setState({
      progress: 0,
      message: 'Starting...',
      data: null,
      error: null,
      isLoading: true,
      starRequired: false,
    });

    const subscription = utils.client.wrapped.generateForFriend.subscribe(
      {
        friendUsername: options.friendUsername,
        year: options.year || new Date().getFullYear(),
        personalMessage: options.personalMessage,
      },
      {
        onData: (rawEvent) => {
          const event = rawEvent as FriendWrappedEvent;
          
          if (event.type === 'progress') {
            setState((prev) => ({
              ...prev,
              progress: event.progress ?? prev.progress,
              message: event.message ?? prev.message,
            }));
          } else if (event.type === 'complete' && event.data) {
            setState((prev) => ({
              ...prev,
              progress: 100,
              message: 'Complete!',
              data: {
                username: event.data!.username,
                year: event.data!.year,
                wrappedUrl: event.data!.wrappedUrl,
                emailSent: event.data!.emailSent,
                inviteCode: event.data!.inviteCode,
              },
              isLoading: false,
            }));
            cleanup();
          } else if (event.type === 'star_required') {
            setState((prev) => ({
              ...prev,
              starRequired: true,
              message: event.message ?? 'Star required',
              isLoading: false,
            }));
            cleanup();
          } else if (event.type === 'error') {
            setState((prev) => ({
              ...prev,
              error: event.message ?? 'An error occurred',
              isLoading: false,
            }));
            cleanup();
          }
        },
        onError: (error) => {
          setState((prev) => ({
            ...prev,
            error: error.message || 'Failed to generate wrapped',
            isLoading: false,
          }));
          cleanup();
        },
        onComplete: () => {
          cleanup();
        },
      }
    );

    unsubscribeRef.current = subscription.unsubscribe;
  }, [cleanup, utils.client.wrapped.generateForFriend]);

  const reset = useCallback(() => {
    cleanup();
    setState({
      progress: 0,
      message: '',
      data: null,
      error: null,
      isLoading: false,
      starRequired: false,
    });
  }, [cleanup]);

  return {
    ...state,
    generate,
    reset,
  };
}
