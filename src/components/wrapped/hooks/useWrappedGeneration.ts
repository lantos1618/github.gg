'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { WrappedData } from '@/lib/types/wrapped';

export type WrappedGenerationState = {
  progress: number;
  message: string;
  data: WrappedData | null;
  error: string | null;
  isLoading: boolean;
  starRequired: boolean;
  repoUrl: string | null;
};

export type GenerationOptions = {
  withAI?: boolean;
  includeRoast?: boolean;
  apiKey?: string;
};

export function useWrappedGeneration(year?: number) {
  const [state, setState] = useState<WrappedGenerationState>({
    progress: 0,
    message: '',
    data: null,
    error: null,
    isLoading: false,
    starRequired: false,
    repoUrl: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startGeneration = useCallback(async (options?: GenerationOptions) => {
    cleanup();
    
    setState({
      progress: 0,
      message: 'Starting generation...',
      data: null,
      error: null,
      isLoading: true,
      starRequired: false,
      repoUrl: null,
    });

    const targetYear = year || new Date().getFullYear();
    const params = new URLSearchParams({ year: String(targetYear) });
    if (options?.withAI) params.set('withAI', 'true');
    if (options?.includeRoast) params.set('includeRoast', 'true');
    if (options?.apiKey) params.set('apiKey', options.apiKey);
    const url = `/api/wrapped/generate?${params.toString()}`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('progress', (event) => {
        try {
          const data = JSON.parse(event.data) as { progress: number; message: string };
          setState((prev) => ({
            ...prev,
            progress: data.progress,
            message: data.message,
          }));
        } catch (e) {
          console.error('Error parsing progress event:', e);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        try {
          const eventData = JSON.parse(event.data) as { data: WrappedData };
          setState((prev) => ({
            ...prev,
            progress: 100,
            message: 'Complete!',
            data: eventData.data,
            isLoading: false,
          }));
          eventSource.close();
        } catch (e) {
          console.error('Error parsing complete event:', e);
        }
      });

      eventSource.addEventListener('star_required', (event) => {
        try {
          const data = JSON.parse(event.data) as { repoUrl: string; message: string };
          setState((prev) => ({
            ...prev,
            starRequired: true,
            repoUrl: data.repoUrl,
            message: data.message,
            isLoading: false,
          }));
          eventSource.close();
        } catch (e) {
          console.error('Error parsing star_required event:', e);
        }
      });

      eventSource.addEventListener('error', (event) => {
        if (event instanceof MessageEvent) {
          try {
            const data = JSON.parse(event.data) as { message: string };
            setState((prev) => ({
              ...prev,
              error: data.message,
              isLoading: false,
            }));
          } catch (e) {
            setState((prev) => ({
              ...prev,
              error: 'An unexpected error occurred',
              isLoading: false,
            }));
          }
        } else {
          setState((prev) => ({
            ...prev,
            error: 'Connection error',
            isLoading: false,
          }));
        }
        eventSource.close();
      });

      eventSource.addEventListener('heartbeat', () => {
        // Just to keep connection alive, no state update needed
      });

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection was closed normally
          return;
        }
        setState((prev) => ({
          ...prev,
          error: 'Connection lost. Please try again.',
          isLoading: false,
        }));
        eventSource.close();
      };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start generation',
        isLoading: false,
      }));
    }
  }, [cleanup, year]);

  const reset = useCallback(() => {
    cleanup();
    setState({
      progress: 0,
      message: '',
      data: null,
      error: null,
      isLoading: false,
      starRequired: false,
      repoUrl: null,
    });
  }, [cleanup]);

  return {
    ...state,
    startGeneration,
    reset,
  };
}
