// Add this polyfill for async-lock
// This creates a mock implementation that will be used when the real module can't be loaded
if (typeof window !== "undefined") {
  // Only add this in browser environments
  window.AsyncLock = class AsyncLock {
    acquire(key, fn, cb) {
      // Simple implementation that just runs the function
      Promise.resolve()
        .then(() => fn())
        .then((result) => {
          if (cb) cb(null, result)
          return result
        })
        .catch((err) => {
          if (cb) cb(err)
          throw err
        })
    }
  }
}

// Add this import at the top of the file
import { analyzeRepositoryWithSocket } from "./socket-api-service"

// Replace the entire file with this implementation that uses GitHub API directly instead of isomorphic-git

import { Octokit } from "@octokit/rest"

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || ""

// Create an Octokit instance with the public token
function createOctokit(token?: string): Octokit {
  return new Octokit({ auth: token || PUBLIC_GITHUB_TOKEN })
}

export interface RepoAnalysisResult {
  files: Array<{
    path: string
    name: string
    size: number
    type: string
    sha: string
  }>
  fileCount: number
  directoryCount: number
  languages: Record<string, number> // language -> byte count
  readme?: string
  analysisTimeMs: number
  apiRequestsUsed: number
  isPublic: boolean
  security?: any // Add security property
}

export async function analyzeRepository(
  owner: string,
  repo: string,
  accessToken?: string,
): Promise<RepoAnalysisResult> {
  const startTime = Date.now()
  const octokit = createOctokit(accessToken)

  // Check if the repository is public
  let isPublic = true
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo })
    isPublic = !repoData.private
  } catch (error) {
    console.error("Error checking repository visibility:", error)
    throw new Error(`Failed to access repository ${owner}/${repo}. It may be private or not exist.`)
  }

  // If the repository is private and no access token is provided, throw an error
  if (!isPublic && !accessToken) {
    throw new Error("Authentication required to access private repositories")
  }

  // Get repository contents (root directory)
  const { data: rootContents } = await octokit.repos.getContent({
    owner,
    repo,
    path: "",
  })

  // Get languages used in the repository
  const { data: languagesData } = await octokit.repos.listLanguages({
    owner,
    repo,
  })

  // Process files and directories
  const files: RepoAnalysisResult["files"] = []
  let directoryCount = 0
  let readme: string | undefined

  // Process the root contents
  if (Array.isArray(rootContents)) {
    await processContents(rootContents, "")
  }

  // Function to recursively process contents
  async function processContents(contents: any[], parentPath: string) {
    for (const item of contents) {
      const itemPath = parentPath ? `${parentPath}/${item.name}` : item.name

      if (item.type === "dir") {
        directoryCount++

        // Skip .git directory
        if (item.name === ".git") continue

        // Get contents of this directory
        try {
          const { data: dirContents } = await octokit.repos.getContent({
            owner,
            repo,
            path: itemPath,
          })

          if (Array.isArray(dirContents)) {
            await processContents(dirContents, itemPath)
          }
        } catch (error) {
          console.warn(`Error fetching contents of directory ${itemPath}:`, error)
        }
      } else if (item.type === "file") {
        files.push({
          path: itemPath,
          name: item.name,
          size: item.size,
          type: "file",
          sha: item.sha,
        })

        // Check for README
        if (item.name.toLowerCase() === "readme.md") {
          try {
            const { data: readmeData } = await octokit.repos.getContent({
              owner,
              repo,
              path: itemPath,
            })

            if (!Array.isArray(readmeData) && readmeData.content) {
              readme = Buffer.from(readmeData.content, "base64").toString("utf8")
            }
          } catch (error) {
            console.warn(`Error fetching README content:`, error)
          }
        }
      }
    }
  }

  const endTime = Date.now()
  const analysisTimeMs = endTime - startTime

  const analysis: RepoAnalysisResult = {
    files,
    fileCount: files.length,
    directoryCount,
    languages: languagesData,
    readme,
    analysisTimeMs,
    apiRequestsUsed: 0, // We don't track this anymore
    isPublic,
  }

  // Add Socket security analysis
  const securityAnalysis = await analyzeRepositoryWithSocket(owner, repo)
  // Merge the security analysis with the existing analysis results
  // This would depend on your existing implementation, but might look like:
  analysis.security = securityAnalysis

  return analysis
}

// Helper function to get file content
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  accessToken?: string,
): Promise<{ content: string; isBinary: boolean; size: number }> {
  const octokit = createOctokit(accessToken)

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })

    if (Array.isArray(data)) {
      throw new Error("Path points to a directory, not a file")
    }

    if (!data.content) {
      throw new Error("No content available for this file")
    }

    // Decode content
    const content = Buffer.from(data.content, "base64").toString("utf8")

    // Check if content appears to be binary
    const isBinary = detectBinaryContent(content)

    return {
      content: isBinary ? "Binary file not shown" : content,
      isBinary,
      size: data.size || 0,
    }
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error)
    throw error
  }
}

// Helper function to detect binary content
function detectBinaryContent(content: string): boolean {
  // Check for null bytes (a clear indicator of binary content)
  if (content.includes("\0")) {
    return true
  }

  // Count non-printable characters
  let nonPrintableCount = 0
  const sampleSize = Math.min(content.length, 1000) // Check first 1000 chars

  for (let i = 0; i < sampleSize; i++) {
    const code = content.charCodeAt(i)
    // Count control characters (except common whitespace) and other non-printable chars
    if ((code < 32 && ![9, 10, 13].includes(code)) || (code >= 127 && code <= 159)) {
      nonPrintableCount++
    }
  }

  // If more than 5% of characters are non-printable, consider it binary
  return nonPrintableCount / sampleSize > 0.05
}
