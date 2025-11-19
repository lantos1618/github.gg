/**
 * Rate limiter for webhook endpoints
 * Prevents abuse and ensures fair usage
 */

import { createLogger } from '@/lib/logging';
import { RATE_LIMIT_CONFIG } from '@/lib/config';

const logger = createLogger('WebhookRateLimiter');

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */
class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Check if a request should be allowed
   * Returns true if under limit, false otherwise
   */
  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    // If no entry or window has expired, create new entry
    if (!entry || now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }
    
    // Check if under limit
    if (entry.count < maxRequests) {
      entry.count++;
      return true;
    }
    
    logger.warn('Rate limit exceeded', {
      key,
      maxRequests,
      windowMs,
      count: entry.count,
    });
    
    return false;
  }
  
  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, maxRequests: number): number {
    const entry = this.limits.get(key);
    if (!entry) return maxRequests;
    
    const now = Date.now();
    if (now >= entry.resetAt) return maxRequests;
    
    return Math.max(0, maxRequests - entry.count);
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { entriesRemoved: cleaned });
    }
  }
  
  /**
   * Reset all limits (useful for testing)
   */
  reset(): void {
    this.limits.clear();
  }
  
  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.limits.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * GitHub Webhook Rate Limiter
 * Limits by GitHub installation ID
 */
export function checkGitHubWebhookRateLimit(installationId: number): { allowed: boolean; remaining: number } {
  const key = `github:webhook:${installationId}`;
  const allowed = rateLimiter.isAllowed(
    key,
    RATE_LIMIT_CONFIG.WEBHOOK_RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_CONFIG.WEBHOOK_RATE_LIMIT_WINDOW_MS
  );
  
  const remaining = rateLimiter.getRemaining(
    key,
    RATE_LIMIT_CONFIG.WEBHOOK_RATE_LIMIT_MAX_REQUESTS
  );
  
  return { allowed, remaining };
}

/**
 * Stripe Webhook Rate Limiter
 * Limits by IP address or global limit
 */
export function checkStripeWebhookRateLimit(ipAddress?: string): { allowed: boolean; remaining: number } {
  const key = `stripe:webhook:${ipAddress || 'global'}`;
  const allowed = rateLimiter.isAllowed(
    key,
    RATE_LIMIT_CONFIG.WEBHOOK_RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_CONFIG.WEBHOOK_RATE_LIMIT_WINDOW_MS
  );
  
  const remaining = rateLimiter.getRemaining(
    key,
    RATE_LIMIT_CONFIG.WEBHOOK_RATE_LIMIT_MAX_REQUESTS
  );
  
  return { allowed, remaining };
}

/**
 * User API Rate Limiter
 * Limits by user ID
 */
export function checkUserAPIRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const key = `api:user:${userId}`;
  const allowed = rateLimiter.isAllowed(
    key,
    RATE_LIMIT_CONFIG.API_RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_CONFIG.API_RATE_LIMIT_WINDOW_MS
  );
  
  const remaining = rateLimiter.getRemaining(
    key,
    RATE_LIMIT_CONFIG.API_RATE_LIMIT_MAX_REQUESTS
  );
  
  return { allowed, remaining };
}

/**
 * IP-based API Rate Limiter
 * Limits by IP address
 */
export function checkIPRateLimit(ipAddress: string): { allowed: boolean; remaining: number } {
  const key = `api:ip:${ipAddress}`;
  const allowed = rateLimiter.isAllowed(
    key,
    Math.max(10, RATE_LIMIT_CONFIG.API_RATE_LIMIT_MAX_REQUESTS / 10), // Lower limit for unauthenticated
    RATE_LIMIT_CONFIG.API_RATE_LIMIT_WINDOW_MS
  );
  
  const remaining = rateLimiter.getRemaining(
    key,
    Math.max(10, RATE_LIMIT_CONFIG.API_RATE_LIMIT_MAX_REQUESTS / 10)
  );
  
  return { allowed, remaining };
}

export { rateLimiter };
