/**
 * Retry utilities for AI API calls with rate limit handling
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  /** Custom rate limit detector. Return true if the error is a rate limit error. */
  isRateLimitError?: (error: unknown) => boolean;
}

/**
 * Default rate limit error detection for Gemini API
 */
export function isGeminiRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const errorObj = error as Record<string, unknown>;
  const message = String(errorObj?.message || '');

  return (
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.toLowerCase().includes('rate') ||
    errorObj?.status === 'RESOURCE_EXHAUSTED' ||
    (errorObj?.error as Record<string, unknown>)?.status === 'RESOURCE_EXHAUSTED'
  );
}

/**
 * Parse retry delay from error message if available (e.g., "retry in 30s")
 */
function parseRetryDelayFromError(error: unknown): number | null {
  const message = String((error as Record<string, unknown>)?.message || '');
  const retryMatch = message.match(/retry in ([\d.]+)s/i);
  if (retryMatch) {
    return Math.ceil(parseFloat(retryMatch[1]) * 1000);
  }
  return null;
}

/**
 * Retry wrapper with exponential backoff for rate limits
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => generateObject({ model, schema, messages }),
 *   { maxRetries: 3, baseDelay: 2000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 2000,
    isRateLimitError = isGeminiRateLimitError,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isRateLimitError(error) && attempt < maxRetries) {
        // Try to get delay from error, otherwise use exponential backoff
        const parsedDelay = parseRetryDelayFromError(error);
        const retryDelay = parsedDelay ?? baseDelay * Math.pow(2, attempt);

        console.log(`Rate limited (attempt ${attempt + 1}/${maxRetries + 1}), waiting ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Async generator that yields heartbeat pings while waiting for a promise.
 * Useful for keeping SSE connections alive during long operations.
 *
 * @example
 * ```typescript
 * for await (const ping of awaitWithHeartbeat(longRunningPromise)) {
 *   if (ping.type === 'ping') {
 *     yield { type: 'ping' };
 *   }
 * }
 * const result = await longRunningPromise;
 * ```
 */
export async function* awaitWithHeartbeat<T>(
  promise: Promise<T>,
  heartbeatInterval = 2000,
  message?: string
): AsyncGenerator<{ type: 'ping'; message?: string }, T, unknown> {
  let done = false;

  // Wrap promise to catch errors and track completion
  const wrappedPromise = promise
    .then(v => ({ status: 'resolved' as const, value: v }))
    .catch(e => ({ status: 'rejected' as const, error: e }));

  while (!done) {
    const raceResult = await Promise.race([
      wrappedPromise,
      new Promise<{ status: 'timeout' }>(resolve =>
        setTimeout(() => resolve({ status: 'timeout' }), heartbeatInterval)
      ),
    ]);

    if (raceResult.status === 'resolved') {
      return raceResult.value;
    } else if (raceResult.status === 'rejected') {
      throw raceResult.error;
    } else {
      yield { type: 'ping', message };
    }
  }

  throw new Error('Unreachable');
}
