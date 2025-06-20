'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '../trpc/client';

export function useAuth() {
  const queryClient = useQueryClient();

  // Get session data using tRPC
  const { data: sessionData, isLoading, error } = trpc.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/signout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to sign out');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch session data
      queryClient.invalidateQueries({ queryKey: ['me'] });
      // Force a page reload to clear any cached state
      window.location.reload();
    },
  });

  const signIn = () => {
    window.location.href = '/api/auth/signin/github';
  };

  const signOut = () => {
    signOutMutation.mutate();
  };

  return {
    isSignedIn: !!sessionData?.user,
    isLoading,
    user: sessionData?.user || null,
    error,
    signIn,
    signOut,
    isSigningOut: signOutMutation.isPending,
  };
} 