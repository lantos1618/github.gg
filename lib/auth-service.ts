import { Octokit } from "@octokit/rest"

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ""
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || ""
const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || ""
const REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`
  : "http://localhost:3000/api/auth/callback"

// Scopes we need for repository access
const GITHUB_SCOPES = ["repo", "read:user", "user:email"].join(" ")

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

export interface AuthSession {
  user: GitHubUser
  accessToken: string
  expiresAt?: number
}

// Generate the GitHub OAuth URL
export function getGitHubAuthURL(state: string): string {
  if (!GITHUB_CLIENT_ID) {
    throw new Error("GitHub Client ID is not configured")
  }

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: GITHUB_SCOPES,
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

// Exchange code for access token
export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error("GitHub OAuth credentials are not configured")
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
    }

    return data.access_token
  } catch (error) {
    console.error("Error exchanging code for token:", error)
    throw new Error(`Failed to exchange code for token: ${error.message}`)
  }
}

// Get user information using the access token
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  try {
    const octokit = new Octokit({ auth: accessToken })
    const { data } = await octokit.users.getAuthenticated()

    return {
      id: data.id,
      login: data.login,
      name: data.name,
      email: data.email,
      avatar_url: data.avatar_url,
    }
  } catch (error) {
    console.error("Error getting GitHub user:", error)
    throw new Error(`Failed to get GitHub user: ${error.message}`)
  }
}

// Create an Octokit instance with the user's access token or public token
export function createOctokit(accessToken?: string): Octokit {
  // Use the provided access token, or fall back to the public token
  const token = accessToken || PUBLIC_GITHUB_TOKEN

  if (!token) {
    console.warn("No GitHub token provided and no PUBLIC_GITHUB_TOKEN available")
  }

  return new Octokit({ auth: token })
}

// Check if the repository is public
export async function isPublicRepository(owner: string, repo: string): Promise<boolean> {
  try {
    // Use the public token to check if the repository is public
    const octokit = createOctokit(PUBLIC_GITHUB_TOKEN)
    const { data } = await octokit.repos.get({ owner, repo })
    return !data.private
  } catch (error) {
    // If we get a 404, the repo doesn't exist or is private
    if (error.status === 404) {
      return false
    }
    console.error(`Error checking if repository ${owner}/${repo} is public:`, error)
    throw error
  }
}

// Get the remaining rate limit for the given token
export async function getRateLimit(accessToken?: string): Promise<number> {
  try {
    const octokit = createOctokit(accessToken)
    const response = await octokit.rest.rateLimit.get()
    const remaining = response.data.resources?.core?.remaining ?? response.data.rate?.remaining

    if (remaining === undefined || remaining === null) {
      console.warn("Rate limit 'remaining' count not found in response")
      return 5000 // Default to GitHub's standard limit
    }

    return remaining
  } catch (error) {
    console.error("Error fetching rate limit:", error)
    return 5000 // Default to GitHub's standard limit on error
  }
}
