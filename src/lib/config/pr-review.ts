/**
 * Configuration for PR review analysis
 */
export const PR_REVIEW_CONFIG = {
  /**
   * File extensions to skip during analysis
   */
  skipExtensions: ['lock', 'json', 'md', 'txt', 'svg', 'png', 'jpg', 'gif', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'pdf', 'zip', 'tar', 'gz'],

  /**
   * Directory paths to skip during analysis
   */
  skipPaths: ['node_modules/', 'dist/', 'build/', '.next/', 'coverage/', 'out/', '.turbo/', '.cache/', 'vendor/', '__pycache__/', '.git/'],

  /**
   * Maximum number of files to analyze per PR (can be overridden via env)
   */
  maxFilesToAnalyze: parseInt(process.env.PR_REVIEW_MAX_FILES || '20', 10),

  /**
   * Maximum number of files to fetch per page from GitHub API
   */
  filesPerPage: 100,

  /**
   * AI model to use for analysis (can be overridden via env)
   */
  aiModel: (process.env.PR_REVIEW_AI_MODEL || 'gemini-3-pro-preview'),

  /**
   * GitHub comment marker for identifying our AI reviews
   */
  commentMarker: '<!-- github.gg-ai-review -->' as const,

  /**
   * Timeout for API calls in milliseconds
   */
  apiTimeout: 60000, // 60 seconds

  /**
   * Maximum retries for failed operations
   */
  maxRetries: 3,
} as const;
