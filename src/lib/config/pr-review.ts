/**
 * Configuration for PR review analysis
 */
export const PR_REVIEW_CONFIG = {
  /**
   * File extensions to skip during analysis
   */
  skipExtensions: ['lock', 'json', 'md', 'txt', 'svg', 'png', 'jpg', 'gif', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'eot'],

  /**
   * Directory paths to skip during analysis
   */
  skipPaths: ['node_modules/', 'dist/', 'build/', '.next/', 'coverage/', 'out/', '.turbo/', '.cache/'],

  /**
   * Maximum number of files to analyze per PR
   */
  maxFilesToAnalyze: 20,

  /**
   * Maximum number of files to fetch per page from GitHub API
   */
  filesPerPage: 100,

  /**
   * AI model to use for analysis
   */
  aiModel: 'gemini-2.5-pro' as const,

  /**
   * GitHub comment marker for identifying our AI reviews
   */
  commentMarker: '<!-- github.gg-ai-review -->' as const,
} as const;
