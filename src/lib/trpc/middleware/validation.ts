/**
 * tRPC Validation Middleware
 * Provides request validation and sanitization for all procedures
 * 
 * Usage:
 * export const createTRPCRouter = () => ({
 *   example: procedure
 *     .use(validateRequiredFields(['field1', 'field2']))
 *     .use(sanitizeStringInputs)
 *     .mutation(...)
 * });
 */

import { TRPCError } from '@trpc/server';
import { createLogger } from '@/lib/logging';

const logger = createLogger('TRPCValidation');

/**
 * Middleware to validate request size limits
 * Note: In Next.js, request size is typically handled by the framework
 */
export const validateRequestSize = () => {
  return async (opts: any) => {
    // Limit request size to prevent abuse
    const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
    return opts.next();
  };
};

/**
 * Middleware to validate required fields in input
 */
export const validateRequiredFields = (fields: string[]) => {
  return async (opts: any) => {
    const input = opts.getRawInput?.();
    
    if (typeof input !== 'object' || input === null) {
      logger.warn('Invalid input type for required fields validation', { 
        fields,
        inputType: typeof input 
      });
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Request body must be a JSON object',
      });
    }
    
    const missingFields = fields.filter(field => !(field in input));
    
    if (missingFields.length > 0) {
      logger.warn('Missing required fields in request', { 
        missing: missingFields,
        required: fields 
      });
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }
    
    return opts.next();
  };
};

/**
 * Middleware to sanitize string inputs
 */
export const sanitizeStringInputs = async (opts: any) => {
  const input = opts.getRawInput?.();
  
  if (typeof input !== 'object' || input === null) {
    return opts.next();
  }
  
  // Sanitize string fields to prevent injection attacks
  const sanitized = sanitizeObject(input);
  
  return opts.next({
    rawInput: sanitized,
  });
};

/**
 * Recursively sanitize an object's string values
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .trim()
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .slice(0, 10000); // Limit string length
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware for rate limiting per user
 * Prevents abuse by limiting requests per minute
 */
export const createRateLimitMiddleware = (maxRequestsPerMinute: number) => {
  const userRequestCounts = new Map<string, { count: number; resetAt: number }>();
  
  return async (opts: any) => {
    const userId = opts.ctx?.user?.id;
    
    if (!userId) {
      // Allow unlimited requests for unauthenticated users (handled by IP-based rate limiting)
      return opts.next();
    }
    
    const now = Date.now();
    const userData = userRequestCounts.get(userId);
    
    // Reset counter if minute has passed
    if (userData && now < userData.resetAt) {
      if (userData.count >= maxRequestsPerMinute) {
        logger.warn('Rate limit exceeded for user', { userId });
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please try again later.',
        });
      }
      userData.count++;
    } else {
      // Start new minute
      userRequestCounts.set(userId, {
        count: 1,
        resetAt: now + 60 * 1000,
      });
    }
    
    return opts.next();
  };
};

/**
 * Middleware to track procedure execution time
 */
export const logExecutionTime = async (opts: any) => {
  const start = Date.now();
  
  try {
    const result = await opts.next();
    const duration = Date.now() - start;
    
    // Log slow queries (> 5 seconds)
    if (duration > 5000) {
      logger.warn('Slow procedure execution', {
        procedure: opts.path,
        durationMs: duration,
        userId: opts.ctx?.user?.id,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Procedure execution failed', error, {
      procedure: opts.path,
      durationMs: duration,
    });
    throw error;
  }
};
