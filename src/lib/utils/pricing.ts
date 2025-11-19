/**
 * Shared pricing component utilities
 * Consolidates logic used across both client and server pricing card components
 */

export const getPricingCardClassName = (
  isPro: boolean,
  variant: 'default' | 'compact' | 'hero' = 'default',
  className: string = ''
): string => {
  const baseClasses = 'relative transition-all duration-300';

  if (variant === 'compact') {
    return `${baseClasses} border rounded-lg ${isPro ? 'border-2 border-purple-200 hover:border-purple-300' : 'border hover:shadow-lg'} ${className}`;
  }

  if (variant === 'hero') {
    return `${baseClasses} ${isPro ? 'bg-gradient-to-br from-purple-50 to-blue-50' : ''} ${className}`;
  }

  // default variant
  if (isPro) {
    return `${baseClasses} border-2 border-purple-500/30 scale-105 shadow-xl bg-gradient-to-br from-purple-50/80 to-blue-50/80 backdrop-blur-sm overflow-hidden ${className}`;
  }

  return `${baseClasses} border shadow-md hover:shadow-lg ${className}`;
};

export const getPricingCardStyle = (isPro: boolean) => {
  return isPro ? { zIndex: 2 } : {};
};
