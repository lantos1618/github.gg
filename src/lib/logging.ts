/**
 * Centralized logging utility
 * Replaces console.log/error/warn/debug with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugEnabled = process.env.DEBUG === 'true';

/**
 * Format log message with context
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Log debug messages (only in development or when DEBUG=true)
 */
export function logDebug(message: string, context?: LogContext): void {
  if (!isDevelopment && !isDebugEnabled) return;
  
  const formatted = formatLog('debug', message, context);
  // In development, use console.debug
  if (isDevelopment) {
    console.debug(formatted);
  }
  // Send to analytics/monitoring in production
  sendToMonitoring('debug', message, context);
}

/**
 * Log info messages
 */
export function logInfo(message: string, context?: LogContext): void {
  const formatted = formatLog('info', message, context);
  console.info(formatted);
  sendToMonitoring('info', message, context);
}

/**
 * Log warning messages
 */
export function logWarn(message: string, context?: LogContext): void {
  const formatted = formatLog('warn', message, context);
  console.warn(formatted);
  sendToMonitoring('warn', message, context);
}

/**
 * Log error messages
 */
export function logError(message: string, error?: Error | unknown, context?: LogContext): void {
  const baseContext = context || {};
  const errorContext = error instanceof Error 
    ? {
        ...baseContext,
        errorMessage: error.message,
        errorStack: error.stack,
      }
    : baseContext;
  
  const formatted = formatLog('error', message, errorContext);
  console.error(formatted);
  sendToMonitoring('error', message, errorContext);
}

/**
 * Send logs to monitoring service (PostHog, Sentry, etc.)
 * Currently a no-op, can be expanded to integrate with monitoring tools
 */
function sendToMonitoring(level: LogLevel, message: string, context?: LogContext): void {
  // TODO: Integrate with PostHog or Sentry for production logging
  // For now, this is a placeholder for future monitoring integration
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY && level === 'error') {
    // Could send to PostHog in the future
    // posthog.capture('error_logged', { message, context });
  }
}

/**
 * Create a logger with a specific prefix/context
 * Useful for module-specific logging
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, context?: LogContext) => 
      logDebug(`[${prefix}] ${message}`, context),
    info: (message: string, context?: LogContext) => 
      logInfo(`[${prefix}] ${message}`, context),
    warn: (message: string, context?: LogContext) => 
      logWarn(`[${prefix}] ${message}`, context),
    error: (message: string, error?: Error | unknown, context?: LogContext) => 
      logError(`[${prefix}] ${message}`, error, context),
  } as const;
}
