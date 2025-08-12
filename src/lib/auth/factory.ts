import { AuthInterface } from './types';
import { useDevAuthAdapter } from './dev-adapter';
import { useProdAuthAdapter } from './prod-adapter';

// Environment detection function
export const isDevAuthMode = (): boolean => {
  return process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true';
};

// Factory function that returns the appropriate auth hook
export function useAuth(): AuthInterface {
  // Call both hooks unconditionally to satisfy React Hooks rules
  const devAuth = useDevAuthAdapter();
  const prodAuth = useProdAuthAdapter();
  
  // Return the appropriate one based on environment
  if (isDevAuthMode()) {
    return devAuth;
  }
  return prodAuth;
}

// Export both adapters for direct use if needed
export { useDevAuthAdapter } from './dev-adapter';
export { useProdAuthAdapter } from './prod-adapter';
