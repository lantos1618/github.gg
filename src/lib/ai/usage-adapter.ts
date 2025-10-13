/**
 * Adapter for AI SDK v5 usage API changes
 *
 * AI SDK v5 changed from:
 * - promptTokens → inputTokens
 * - completionTokens → outputTokens
 * - totalTokens → (removed, calculate from input + output)
 *
 * This adapter provides a clean conversion layer instead of using 'as any'
 */

export interface LegacyUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AISDKv5Usage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Convert AI SDK v5 usage format to our internal format
 * Also handles already-converted legacy format (for cached data)
 */
export function convertAIUsage(usage: AISDKv5Usage | LegacyUsage): LegacyUsage {
  // If it's already in legacy format, return as-is
  if ('promptTokens' in usage && 'completionTokens' in usage && 'totalTokens' in usage) {
    return usage as LegacyUsage;
  }

  // Otherwise, convert from AI SDK v5 format
  const v5Usage = usage as AISDKv5Usage;
  const inputTokens = v5Usage.inputTokens || 0;
  const outputTokens = v5Usage.outputTokens || 0;

  return {
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

/**
 * Type guard to check if usage object has the new format
 */
export function isAISDKv5Usage(usage: unknown): usage is AISDKv5Usage {
  return (
    typeof usage === 'object' &&
    usage !== null &&
    'inputTokens' in usage &&
    'outputTokens' in usage
  );
}
