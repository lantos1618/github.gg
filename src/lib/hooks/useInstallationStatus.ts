import { useAuth } from '@/lib/auth/client';
import { trpc } from '@/lib/trpc/client';
import { useCallback } from 'react';

export interface InstallationStatus {
  hasInstallation: boolean;
  installationId: number | null;
  canUseApp: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInstallationStatus(): InstallationStatus {
  const { isSignedIn, isLoading: authLoading } = useAuth();
  
  const { 
    data: installationInfo, 
    isLoading: isInstallationLoading, 
    error: installationError,
    refetch 
  } = trpc.github.checkInstallation.useQuery(
    undefined,
    {
      enabled: isSignedIn && !authLoading,
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: 1000,
    }
  );

  // Admin status query (unused but kept for potential future use)
  trpc.admin.isAdmin.useQuery(undefined, {
    enabled: isSignedIn && !authLoading,
    refetchOnWindowFocus: false,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  // If user is not signed in, return default state
  if (!isSignedIn || authLoading) {
    return {
      hasInstallation: false,
      installationId: null,
      canUseApp: false,
      isLoading: authLoading,
      error: null,
      refetch: handleRefetch,
    };
  }

  // If there's an error, return error state
  if (installationError) {
    return {
      hasInstallation: false,
      installationId: null,
      canUseApp: false,
      isLoading: false,
      error: installationError.message,
      refetch: handleRefetch,
    };
  }

  // If still loading, return loading state
  if (isInstallationLoading) {
    return {
      hasInstallation: false,
      installationId: null,
      canUseApp: false,
      isLoading: true,
      error: null,
      refetch: handleRefetch,
    };
  }

  // Return the actual installation status
  return {
    hasInstallation: installationInfo?.hasInstallation ?? false,
    installationId: installationInfo?.installationId ?? null,
    canUseApp: installationInfo?.canUseApp ?? false,
    isLoading: false,
    error: null,
    refetch: handleRefetch,
  };
} 