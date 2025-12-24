import { parseError } from '@/lib/types/errors';
import { TRPCClientError } from '@trpc/client';

/**
 * TRPC error codes for common error scenarios
 */
const TRPC_ERROR_CODES = {
  RATE_LIMIT: 'TOO_MANY_REQUESTS',
  FORBIDDEN: 'FORBIDDEN',
} as const;

/**
 * External API error patterns (fallback when not using tRPC)
 * These are only checked when the error doesn't come from tRPC
 */
const EXTERNAL_ERROR_PATTERNS = {
  RATE_LIMIT: [
    'rate limit',
    '429',
    'quota',
    'exceeded',
    'too many requests',
    'resource_exhausted',
    'resource exhausted',
  ],
  SUBSCRIPTION: [
    'active subscription required',
    'subscription required',
    'please add your gemini api key',
    'requires a paid plan',
    'need a subscription',
    'forbidden',
    '403',
  ],
} as const;

/**
 * Parse Gemini API error to extract user-friendly message
 */
export function parseGeminiError(error: unknown): string {
  return parseError(error);
}

/**
 * Check if an error is a tRPC error with specific code
 */
function isTRPCError(error: unknown, code?: string): boolean {
  if (!(error instanceof TRPCClientError)) {
    return false;
  }
  if (code) {
    return error.data?.code === code;
  }
  return true;
}

/**
 * Check if error message matches any of the given patterns
 * Used as fallback for external API errors that don't use tRPC
 */
function matchesErrorPatterns(errorMessage: string, patterns: readonly string[]): boolean {
  const lowerError = errorMessage.toLowerCase();
  return patterns.some(pattern => lowerError.includes(pattern));
}

/**
 * Check if an error is a rate limit error
 * Prioritizes tRPC error codes, falls back to pattern matching for external APIs
 *
 * @param error - Error object, string, or unknown value to check
 * @returns true if the error indicates rate limiting
 */
export function isRateLimitError(error: unknown): boolean {
  // PRIORITY 1: Check tRPC error code (most reliable method)
  if (isTRPCError(error, TRPC_ERROR_CODES.RATE_LIMIT)) {
    return true;
  }

  // PRIORITY 2: Fallback to pattern matching for external API errors
  // This handles errors from Gemini, GitHub, and other external services
  const errorMessage = typeof error === 'string' ? error : parseError(error);
  if (!errorMessage) return false;

  return matchesErrorPatterns(errorMessage, EXTERNAL_ERROR_PATTERNS.RATE_LIMIT);
}

/**
 * Check if an error is a subscription error
 * Prioritizes tRPC error codes, falls back to pattern matching for external APIs
 *
 * @param error - Error object, string, or unknown value to check
 * @returns true if the error indicates subscription/permission issues
 */
export function isSubscriptionError(error: unknown): boolean {
  // PRIORITY 1: Check tRPC FORBIDDEN error code (most reliable method)
  if (isTRPCError(error, TRPC_ERROR_CODES.FORBIDDEN)) {
    return true;
  }

  // PRIORITY 2: Fallback to pattern matching for external API errors
  // This handles subscription-related errors from various sources
  const errorMessage = typeof error === 'string' ? error : parseError(error);
  if (!errorMessage) return false;

  return matchesErrorPatterns(errorMessage, EXTERNAL_ERROR_PATTERNS.SUBSCRIPTION);
}

/**
 * Get error display configuration
 */
export function getErrorDisplayConfig(error: unknown) {
  const isRateLimit = isRateLimitError(error);
  const isSubscription = isSubscriptionError(error);
  
  if (isSubscription) {
    return {
      isRateLimit: false,
      isSubscription: true,
      icon: '🔒',
      title: 'Subscription Required',
      titleColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      buttonColor: 'bg-blue-500 hover:bg-blue-600',
      description: 'This feature requires an active subscription.',
      explanation: 'Upgrade to a paid plan to access AI-powered repository analysis features.',
      showUpgradeButton: true
    };
  }
  
  return {
    isRateLimit,
    isSubscription: false,
    icon: isRateLimit ? '🚫' : '❌',
    title: isRateLimit ? 'Rate Limit Exceeded' : 'Error',
    titleColor: isRateLimit ? 'text-orange-600' : 'text-red-600',
    bgColor: isRateLimit ? 'bg-orange-50' : 'bg-red-50',
    borderColor: isRateLimit ? 'border-orange-200' : 'border-red-200',
    textColor: isRateLimit ? 'text-orange-800' : 'text-red-800',
    buttonColor: isRateLimit ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600',
    description: isRateLimit 
      ? 'You\'ve hit the Gemini API free tier limits. This is a temporary restriction.'
      : 'An error occurred while processing your request.',
    explanation: isRateLimit
      ? 'The AI analysis service has reached its usage limit for the current period.'
      : 'Please try again or contact support if the problem persists.',
    showUpgradeButton: false
  };
} 