import { analyzeRepositoryWithSocket } from "./socket-api-service"
import { createOctokit, getAllRepoFilesWithTar } from "./github"
import type { RepoItem, RepoFile, RepoDirectory, RepoSymlink, RepoSubmodule } from "@/lib/types/github"
import type { Octokit } from "@octokit/rest"

// Type for GitHub API language data
// (keep this here, it's business logic)
type GitHubLanguages = Record<string, number>

export interface RepoAnalysisResult {
  files: RepoItem[]
  fileCount: number
  directoryCount: number
  languages: GitHubLanguages
  readme?: string
  analysisTimeMs: number
  apiRequestsUsed: number
  isPublic: boolean
  security?: any
  totalSize: number
  mainLanguage: string
}

export async function analyzeRepository(
  owner: string,
  repo: string,
  accessToken?: string,
): Promise<RepoAnalysisResult> {
  const startTime = Date.now()
  const files: RepoItem[] = []
  let readme: string | undefined
  let isPublic = true
  let totalSize = 0
  let mainLanguage = ""

  // Initialize Octokit and await the instance
  const octokit = await createOctokit(accessToken)

  try {
    // Get repository metadata to check visibility
    const { data: repoData } = await octokit.repos.get({ owner, repo })
    isPublic = !repoData.private
    
    // If the repository is private and no access token is provided, throw an error
    if (!isPublic && !accessToken) {
      throw new Error("Authentication required to access private repositories")
    }

    // Get all files in the repository using the efficient recursive tree API
    const { files: repoFiles } = await getAllRepoFilesWithTar(owner, repo)
    files.push(...repoFiles as RepoItem[])

    // Try to find and fetch the README
    const readmeFile = repoFiles.find(file => 
      file.name.match(/^readme(\.(md|txt|markdown))?$/i)
    )
    
    if (readmeFile) {
      try {
        const { content } = await getFileContent(owner, repo, readmeFile.path, accessToken)
        readme = content
      } catch (error) {
        console.error("Error fetching README content:", error)
      }
    }

    // Get languages used in the repository
    const { data: languagesData } = await octokit.repos.listLanguages({
      owner,
      repo,
    })

    // Calculate total size of all files
    totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)

    // Get the main language (language with most bytes of code)
    const languages: GitHubLanguages = languagesData || {}
    const mainLangEntry = Object.entries(languages).reduce<{ lang: string; bytes: number }>(
      (max, [lang, bytes]) => {
        const currentBytes = typeof bytes === 'number' ? bytes : 0
        return currentBytes > max.bytes ? { lang, bytes: currentBytes } : max
      },
      { lang: "", bytes: 0 }
    )
    mainLanguage = mainLangEntry.lang

    const endTime = Date.now()
    const analysisTimeMs = endTime - startTime

    const result: RepoAnalysisResult = {
      files,
      fileCount: files.length,
      directoryCount: 0, // Not tracking directories separately anymore
      languages,
      readme,
      analysisTimeMs,
      apiRequestsUsed: 0, // Not tracking this anymore
      isPublic,
      totalSize,
      mainLanguage,
    }

    // Add Socket security analysis if API key is configured
    if (process.env.NEXT_PUBLIC_SOCKET_API_KEY) {
      try {
        const socketAnalysis = await analyzeRepositoryWithSocket(owner, repo)
        result.security = socketAnalysis
      } catch (error) {
        console.error("Error running Socket security analysis:", error)
      }
    }

    return result
  } catch (error) {
    console.error("Error analyzing repository:", error)
    throw error
  }
}

// Helper function to get file content
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  accessToken?: string,
): Promise<{ content: string; isBinary: boolean; size: number }> {
  const octokit = await createOctokit(accessToken)
  
  try {
    // First try to get the content as text
    const response = await octokit.request({
      method: "GET",
      url: `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      headers: {
        Accept: "application/vnd.github.v3.raw",
      },
    })

    return {
      content: response.data as unknown as string,
      isBinary: false,
      size: (response.data as any).size || 0,
    }
  } catch (error: any) {
    if (error.status === 403 && error.response?.headers?.["x-ratelimit-remaining"] === "0") {
      throw new Error(
        `GitHub API rate limit exceeded. Please try again later or provide a GitHub token.`
      )
    }
    
    // If we get here, the content might be binary
    throw new Error(`Could not fetch file content: ${path} - ${error.message}`)
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
