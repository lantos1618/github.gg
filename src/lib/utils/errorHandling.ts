import { parseError } from '../types/errors';

/**
 * Parse Gemini API error to extract user-friendly message
 */
export function parseGeminiError(error: unknown): string {
  return parseError(error);
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: string | null): boolean {
  if (!error) return false;
  
  const lowerError = error.toLowerCase();
  const isRateLimit = lowerError.includes('rate limit') || 
                     lowerError.includes('429') || 
                     lowerError.includes('quota') ||
                     lowerError.includes('exceeded') ||
                     lowerError.includes('too many requests') ||
                     lowerError.includes('resource_exhausted');
  
  console.log('🔍 Rate limit check:', { error, isRateLimit }); // Debug log
  return isRateLimit;
}

/**
 * Get error display configuration
 */
export function getErrorDisplayConfig(error: string | null) {
  const isRateLimit = isRateLimitError(error);
  
  console.log('🎨 Error display config:', { error, isRateLimit }); // Debug log
  
  return {
    isRateLimit,
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
      : 'Please try again or contact support if the problem persists.'
  };
} 