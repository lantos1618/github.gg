/**
 * Common error types used throughout the application
 */

export interface ApiError {
  status?: number;
  message: string;
  response?: {
    data?: unknown;
  };
  request?: unknown;
}

export interface GitHubError extends ApiError {
  documentation_url?: string;
  errors?: Array<{
    code: string;
    field: string;
    resource: string;
    message: string;
  }>;
}

export interface StripeError {
  type: string;
  code: string;
  message: string;
  param?: string;
  decline_code?: string;
}

export interface SessionData {
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

export interface DiagramOptions {
  theme?: 'default' | 'dark' | 'forest';
  flowchart?: {
    useMaxWidth?: boolean;
    htmlLabels?: boolean;
  };
  [key: string]: unknown;
}

// Type guards
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'message' in error)
  );
}

export function isGitHubError(error: unknown): error is GitHubError {
  return isApiError(error) && 'documentation_url' in error;
}

export function isStripeError(error: unknown): error is StripeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'code' in error &&
    'message' in error
  );
}

export function isSessionData(data: unknown): data is SessionData {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('user' in data || 'accessToken' in data)
  );
}

// Error parsing utilities
export function parseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (isApiError(error)) {
    return error.message;
  }
  
  if (isStripeError(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

export function parseGitHubError(error: unknown): string {
  if (isGitHubError(error)) {
    if (error.errors && error.errors.length > 0) {
      return error.errors.map(e => e.message).join(', ');
    }
    return error.message;
  }
  
  return parseError(error);
} 