/**
 * Centralized configuration management
 * Consolidates all hardcoded values and magic numbers
 */

// Pagination & Limits
export const PAGINATION_CONFIG = {
  DEFAULT_REPOS_LIMIT: 100,
  DEFAULT_PRS_LIMIT: 10,
  DEFAULT_ISSUES_LIMIT: 10,
  DEFAULT_ACTIVITY_PAGE_SIZE: 10,
  MAX_ACTIVITY_PAGES: 5,
  DEFAULT_PAGINATION_LIMIT: 20,
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 32000, // 32 seconds
  BACKOFF_MULTIPLIER: 2,
  WIKI_GEN_MAX_RETRIES: 3,
  REPO_DATA_RETRIES: 2,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  PROFILE_STALE_AFTER_MS: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT_CACHE_TTL_MS: 60 * 60 * 1000, // 1 hour
  SHORT_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

// Analysis Configuration
export const ANALYSIS_CONFIG = {
  DEFAULT_MAX_FILE_SIZE: 1024 * 1024, // 1MB
  DEFAULT_TOKEN_LIMIT: 100000,
  RETRY_SUBSCRIPTION_CHECK_DELAY_MS: 2000,
} as const;

// Rate Limiting
export const RATE_LIMIT_CONFIG = {
  // Webhook rate limits
  WEBHOOK_RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  WEBHOOK_RATE_LIMIT_MAX_REQUESTS: 100,
  
  // API rate limits
  API_RATE_LIMIT_WINDOW_MS: 60 * 1000,
  API_RATE_LIMIT_MAX_REQUESTS: 100,
  
  // GitHub API rate limit threshold (remaining calls before warning)
  GITHUB_API_RATE_LIMIT_THRESHOLD: 100,
} as const;

// Timeouts
export const TIMEOUT_CONFIG = {
  // Maximum duration for serverless functions
  FUNCTION_MAX_DURATION_SEC: 300, // 5 minutes
  
  // HTTP request timeouts
  HTTP_REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  
  // Database query timeout
  DB_QUERY_TIMEOUT_MS: 60000, // 1 minute
} as const;

// Arena/Battle Configuration
export const ARENA_CONFIG = {
  DEFAULT_BATTLE_CRITERIA: ['commits', 'stars', 'prs', 'issues', 'followers'],
  CRITERIA_WEIGHTS: {
    commits: 0.3,
    stars: 0.2,
    prs: 0.2,
    issues: 0.15,
    followers: 0.15,
  },
  BATTLE_TIMEOUT_MS: 120000, // 2 minutes
} as const;

// File & Repository Configuration
export const REPO_CONFIG = {
  // Default branch to analyze
  DEFAULT_BRANCH: 'main',
  
  // Maximum number of files to process in analysis
  MAX_FILES_FOR_ANALYSIS: 500,
  
  // File types to exclude from analysis
  EXCLUDED_EXTENSIONS: [
    '.min.js',
    '.min.css',
    '.lock',
    '.log',
    '.tmp',
    '.cache',
  ],
  
  // Maximum file count before using sampling
  FILE_SAMPLING_THRESHOLD: 1000,
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Animation/transition timing
  TRANSITION_DURATION_MS: 300,
  
  // Skeleton loading duration
  SKELETON_ANIMATION_DURATION_MS: 2000,
  
  // Toast notification duration
  TOAST_DURATION_MS: 5000,
} as const;

// Email Configuration
export const EMAIL_CONFIG = {
  FROM_EMAIL: process.env.DEV_ENV_FROM_EMAIL || 'noreply@github.gg',
  SUPPORT_EMAIL: 'support@github.gg',
  
  // Email rate limiting (emails per minute per user)
  RATE_LIMIT_PER_MINUTE: 5,
} as const;

// GitHub Integration Configuration
export const GITHUB_CONFIG = {
  // OAuth scopes
  OAUTH_SCOPES: [
    'read:user',
    'user:email',
    'public_repo',
    'repo',
  ],
  
  // GraphQL query depth limit
  GRAPHQL_MAX_DEPTH: 10,
  
  // API version
  API_VERSION: '2022-11-28',
} as const;

/**
 * Get config value with type safety
 * Usage: const limit = getConfig('PAGINATION_CONFIG.DEFAULT_REPOS_LIMIT')
 */
export function getConfig<T = any>(path: string): T {
  const [section, key] = path.split('.');
  const config = ({
    PAGINATION_CONFIG,
    RETRY_CONFIG,
    CACHE_CONFIG,
    ANALYSIS_CONFIG,
    RATE_LIMIT_CONFIG,
    TIMEOUT_CONFIG,
    ARENA_CONFIG,
    REPO_CONFIG,
    UI_CONFIG,
    EMAIL_CONFIG,
    GITHUB_CONFIG,
  } as Record<string, any>)[section];
  
  if (!config) {
    throw new Error(`Configuration section not found: ${section}`);
  }
  
  const value = config[key];
  if (value === undefined) {
    throw new Error(`Configuration key not found: ${path}`);
  }
  
  return value;
}
