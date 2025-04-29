// GitHub API utility functions

/**
 * Fetches repository data from GitHub API
 */
export async function fetchRepoData(owner: string, repo: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching GitHub repo data:", error)
    return {
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
    }
  }
}
