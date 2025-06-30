import { parseError } from '@/lib/types/errors';

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
                     lowerError.includes('resource_exhausted') ||
                     lowerError.includes('resource exhausted');
  
  console.log('🔍 Rate limit check:', { error, isRateLimit }); // Debug log
  return isRateLimit;
}

/**
 * Check if an error is a subscription error
 */
export function isSubscriptionError(error: string | null): boolean {
  if (!error) return false;
  
  const lowerError = error.toLowerCase();
  const isSubscription = lowerError.includes('active subscription required') || 
                        lowerError.includes('subscription required') ||
                        lowerError.includes('forbidden') ||
                        lowerError.includes('403') ||
                        lowerError.includes('please add your gemini api key') ||
                        lowerError.includes('need a subscription') ||
                        lowerError.includes('requires a paid plan') ||
                        lowerError.includes('paid plan');
  
  console.log('🔍 Subscription check:', { error, isSubscription }); // Debug log
  return isSubscription;
}

/**
 * Get error display configuration
 */
export function getErrorDisplayConfig(error: string | null) {
  const isRateLimit = isRateLimitError(error);
  const isSubscription = isSubscriptionError(error);
  
  console.log('🎨 Error display config:', { error, isRateLimit, isSubscription }); // Debug log
  
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