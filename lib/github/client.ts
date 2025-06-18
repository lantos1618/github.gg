import { Octokit } from "@octokit/rest";

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || "";

// Custom error class for GitHub service errors
export class GitHubServiceError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'GitHubServiceError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, GitHubServiceError.prototype);
  }
}

// Create an Octokit instance with the public token
export function createOctokit(token?: string): Octokit {
  return new Octokit({
    auth: token || PUBLIC_GITHUB_TOKEN,
    request: {
      timeout: 10000, // 10 second timeout
    },
  });
}
