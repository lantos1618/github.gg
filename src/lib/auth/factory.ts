import { AuthInterface } from './types';
import { useProdAuthAdapter } from './prod-adapter';

// Factory function that returns the auth hook
export function useAuth(): AuthInterface {
  return useProdAuthAdapter();
}

// Export adapter for direct use if needed
export { useProdAuthAdapter } from './prod-adapter';
