/**
 * Parse Gemini API error to extract user-friendly message
 */
export function parseGeminiError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    console.log('🔍 Parsing error:', message); // Debug log
    
    // Check for 429 rate limit error - more comprehensive detection
    if (message.includes('429') || 
        message.includes('RESOURCE_EXHAUSTED') || 
        message.includes('quota') ||
        message.includes('rate limit') ||
        message.includes('Rate limit') ||
        message.includes('exceeded') ||
        message.includes('Too Many Requests') ||
        message.includes('Too many requests')) {
      
      console.log('🚫 Rate limit detected!'); // Debug log
      
      try {
        // Try to parse the JSON error message
        const errorMatch = message.match(/\{[\s\S]*\}/);
        if (errorMatch) {
          const parsedError = JSON.parse(errorMatch[0]);
          if (parsedError.error?.details) {
            const retryInfo = parsedError.error.details.find((detail: { '@type'?: string }) => 
              detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
            );
            const retryDelay = retryInfo?.retryDelay || '50s';
            return `Rate limit exceeded. Please try again in ${retryDelay}. You've hit the Gemini API free tier limits.`;
          }
        }
      } catch {
        // If JSON parsing fails, return a generic rate limit message
      }
      return 'Rate limit exceeded. You\'ve hit the Gemini API free tier limits. Please try again in a few minutes.';
    }
    
    // Check for other common errors
    if (message.includes('API_KEY_INVALID') || message.includes('authentication')) {
      return 'Authentication error with Gemini API. Please check your API key configuration.';
    }
    
    if (message.includes('MODEL_NOT_FOUND')) {
      return 'Gemini model not found. Please check the model configuration.';
    }
    
    return message;
  }
  
  if (typeof error === 'string') {
    console.log('🔍 String error:', error); // Debug log
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    console.log('🔍 Object error:', error); // Debug log
    return String(error.message);
  }
  
  return 'An unexpected error occurred with the Gemini API.';
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