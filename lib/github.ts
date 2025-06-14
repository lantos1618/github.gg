import { Octokit } from "@octokit/rest"

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || ""

// Create an Octokit instance with the public token
export function createOctokit(token?: string): Octokit {
  return new Octokit({
    auth: token || PUBLIC_GITHUB_TOKEN,
    request: {
      timeout: 10000, // 10 second timeout
    },
  })
}

export async function getUserData(user: string, accessToken?: string) {
  // Validate username format to avoid unnecessary API calls
  if (!user || !isValidGitHubUsername(user)) {
    throw new Error("Invalid GitHub username format")
  }

  try {
    const octokit = createOctokit(accessToken)
    const { data } = await octokit.rest.users.getByUsername({
      username: user,
    })

    // Fetch public repos data
    const public_repos_data = await getPublicRepos(user, accessToken)

    return {
      ...data,
      public_repos_data,
    }
  } catch (error) {
    console.error("Error fetching user data:", error)
    return null
  }
}

// Helper function to validate GitHub username format
function isValidGitHubUsername(username: string): boolean {
  // GitHub usernames can only contain alphanumeric characters and hyphens
  // They cannot have multiple consecutive hyphens
  // They cannot begin or end with a hyphen
  // They can be up to 39 characters long
  const validUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/
  return validUsernameRegex.test(username)
}

async function getPublicRepos(user: string, accessToken?: string) {
  try {
    const octokit = createOctokit(accessToken)
    const { data } = await octokit.rest.repos.listForUser({
      username: user,
      type: "owner",
      sort: "updated",
      direction: "desc",
      per_page: 5,
    })
    return data
  } catch (error) {
    console.error("Error fetching public repos:", error)
    return []
  }
}

export async function getRepoData(user: string, repo: string) {
  try {
    const octokit = createOctokit()
    const { data } = await octokit.rest.repos.get({
      owner: user,
      repo: repo,
    })
    return data
  } catch (error) {
    console.error("Error fetching repo data:", error)
    throw error
  }
}

export async function getRepoIssues(
  username: string,
  reponame: string,
  options: { page?: number; state?: "open" | "closed" | "all" } = {},
) {
  const { page = 1, state = "open" } = options

  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/${reponame}/issues?page=${page}&state=${state}&per_page=10`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching repo issues:", error)
    return []
  }
}

export async function getIssueData(username: string, reponame: string, issueId: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${username}/${reponame}/issues/${issueId}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch issue: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching issue data:", error)
    throw error
  }
}

export async function getAllRepoFiles(
  user: string,
  repo: string,
  branch?: string,
): Promise<{ files: any[]; branch: string }> {
  try {
    const octokit = createOctokit()

    // Determine which branch to use. If not provided, use the repository's
    // default branch to avoid failures on repos that don't use "main".
    let branchToUse = branch
    if (!branchToUse) {
      const { data: repoData } = await octokit.rest.repos.get({
        owner: user,
        repo: repo,
      })
      branchToUse = repoData.default_branch
    }

    // For large repositories, we need to handle pagination and potential timeouts
    const maxFilesToFetch = 1000 // Limit to prevent overwhelming the browser

    try {
      // First try the recursive approach which is faster but may fail for large repos
      const { data: treeData } = await octokit.rest.git.getTree({
        owner: user,
        repo: repo,
        tree_sha: branchToUse,
        recursive: "true",
      })

      // If we have truncated results, it means the repo is too large
      if (treeData.truncated) {
        console.warn("Repository tree is truncated. Showing partial results.")
      }

      const files = treeData.tree
        .filter((item) => item.type === "blob")
        .slice(0, maxFilesToFetch) // Limit number of files
        .map((item) => ({
          path: item.path,
          name: item.path.split("/").pop() || "",
          size: item.size || 0,
          type: "file",
          content: "", // Content will be fetched separately if needed
        }))
      return { files, branch: branchToUse }
    } catch (error) {
      // If recursive approach fails, fall back to non-recursive for top-level
      console.warn("Recursive tree fetch failed, falling back to top-level only:", error)

      const { data: treeData } = await octokit.rest.git.getTree({
        owner: user,
        repo: repo,
        tree_sha: branchToUse,
      })

      const files = treeData.tree
        .filter((item) => item.type === "blob")
        .map((item) => ({
          path: item.path,
          name: item.path.split("/").pop() || "",
          size: item.size || 0,
          type: "file",
          content: "",
        }))
      return { files, branch: branchToUse }
    }
  } catch (error) {
    console.error("Error fetching all repo files:", error)
    throw error
  }
}

export async function getCommitData(user: string, repo: string, sha: string) {
  try {
    const octokit = createOctokit()
    const { data } = await octokit.rest.git.getCommit({
      owner: user,
      repo: repo,
      commit_sha: sha,
    })
    return data
  } catch (error) {
    console.error("Error fetching commit data:", error)
    throw error
  }
}

export async function getCompareData(user: string, repo: string, base: string, head: string) {
  try {
    const octokit = createOctokit()
    const { data } = await octokit.rest.repos.compareCommits({
      owner: user,
      repo: repo,
      base: base,
      head: head,
    })
    return data
  } catch (error) {
    console.error("Error fetching compare data:", error)
    throw error
  }
}

export async function getFileTreeData(user: string, repo: string, branch: string, path: string) {
  try {
    const octokit = createOctokit()
    const { data } = await octokit.rest.git.getTree({
      owner: user,
      repo: repo,
      tree_sha: branch,
      recursive: "false",
    })

    const treeData = data.tree.map((item) => ({
      path: path ? `${path}/${item.path}` : item.path,
      name: item.path,
      type: item.type,
    }))

    return treeData
  } catch (error) {
    console.error("Error fetching file tree data:", error)
    return []
  }
}

export async function getFileContent(user: string, repo: string, branch: string, path: string) {
  try {
    const octokit = createOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner: user,
      repo: repo,
      path: path,
      ref: branch,
    })

    if (Array.isArray(data)) {
      throw new Error("Expected a file, but got a directory")
    }

    if (data.type !== "file") {
      throw new Error("Expected a file, but got a different type")
    }

    // Get the filename and extension
    const filename = path.split("/").pop() || ""

    // Always attempt to decode as text first
    try {
      const content = Buffer.from(data.content, "base64").toString("utf-8")

      // Check if content appears to be binary by looking for null bytes or high concentration of non-printable characters
      const isBinary = content.includes("\0") || countNonPrintableChars(content) / content.length > 0.1

      if (isBinary) {
        return {
          name: data.name,
          path: data.path,
          size: data.size,
          content: "Binary file not shown",
          isBinary: true,
        }
      }

      return {
        name: data.name,
        path: data.path,
        size: data.size,
        content: content,
        isBinary: false,
      }
    } catch (e) {
      // If decoding fails, treat as binary
      console.warn(`Failed to decode ${path} as text:`, e)
      return {
        name: data.name,
        path: data.path,
        size: data.size,
        content: "Binary file not shown",
        isBinary: true,
      }
    }
  } catch (error) {
    console.error("Error fetching file content:", error)
    throw error
  }
}

// Helper function to count non-printable characters
function countNonPrintableChars(str: string): number {
  let count = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    // Count control characters (except common whitespace) and other non-printable chars
    if ((code < 32 && ![9, 10, 13].includes(code)) || (code >= 127 && code <= 159)) {
      count++
    }
  }
  return count
}
