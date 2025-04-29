import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: Request) {
  const { owner, repo, path, accessToken } = await request.json()

  if (!owner || !repo || !path) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    // Initialize Octokit with the provided token or the public token
    const octokit = new Octokit({
      auth: accessToken || process.env.PUBLIC_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
    })

    // Get repository information to get the default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo })
    const defaultBranch = repoData.default_branch

    // Get the file content
    const { data: contentData } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: defaultBranch,
    })

    // Check if it's a file (not a directory)
    if (Array.isArray(contentData)) {
      return NextResponse.json({ error: "Path is a directory, not a file" }, { status: 400 })
    }

    // Check if it's a binary file
    const isBinary = contentData.encoding === "base64" && isBinaryContent(contentData.content, contentData.name)

    // Decode content if it's not binary
    let content = ""
    if (!isBinary) {
      // GitHub API returns base64 encoded content
      content = Buffer.from(contentData.content, "base64").toString("utf-8")
    }

    return NextResponse.json({
      content,
      isBinary,
      size: contentData.size,
      sha: contentData.sha,
      name: contentData.name,
    })
  } catch (error) {
    console.error(`Error fetching file content for ${path} in ${owner}/${repo}:`, error)

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      {
        error: "Failed to fetch file content",
        message: errorMessage,
        details: `An error occurred while fetching content for ${path}`,
      },
      { status: 500 },
    )
  }
}

// Helper function to detect binary content
function isBinaryContent(base64Content: string, fileName: string): boolean {
  // Check file extension first
  const binaryExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".ico",
    ".webp",
    ".mp3",
    ".mp4",
    ".wav",
    ".ogg",
    ".avi",
    ".mov",
    ".wmv",
    ".zip",
    ".tar",
    ".gz",
    ".rar",
    ".7z",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".ttf",
    ".otf",
    ".woff",
    ".woff2",
  ]

  if (binaryExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))) {
    return true
  }

  // Sample the content to check for binary data
  try {
    // Decode a small sample of the base64 content
    const sampleSize = Math.min(1000, base64Content.length)
    const sample = Buffer.from(base64Content.slice(0, sampleSize), "base64")

    // Check for null bytes and control characters
    let controlCharCount = 0
    for (let i = 0; i < sample.length; i++) {
      // Null byte is a strong indicator of binary content
      if (sample[i] === 0) return true

      // Count control characters (except common ones like newline, tab)
      if (sample[i] < 9 || (sample[i] > 13 && sample[i] < 32)) {
        controlCharCount++
      }
    }

    // If more than 10% of the sample is control characters, consider it binary
    return controlCharCount > sample.length * 0.1
  } catch (e) {
    // If we can't analyze the content, assume it's binary to be safe
    return true
  }
}
