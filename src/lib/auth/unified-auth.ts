'use client';

import { useAuth as useBetterAuth } from './client';
import { useDevAuth } from './dev-client';

export function useAuth() {
  // Check if we're in development mode and dev auth is enabled
  const isDevMode = process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true';

  const devAuth = useDevAuth();
  const betterAuth = useBetterAuth();

  if (isDevMode) {
    return devAuth;
  }

  // Use production OAuth auth
  return betterAuth;
}

// Export a helper to check if we're in dev mode
export const isDevAuthMode = () => {
  return process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true';
};

// Export both auth systems for direct use if needed
export { useAuth as useBetterAuth } from './client';
export { useDevAuth } from './dev-client'; 