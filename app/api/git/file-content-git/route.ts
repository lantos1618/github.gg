import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: Request) {
  const { owner, repo, path, accessToken } = await request.json()

  if (!owner || !repo || !path) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    console.log(`Fetching file content for ${owner}/${repo}/${path}...`)

    // Use GitHub API to get file content
    const octokit = new Octokit({
      auth: accessToken || process.env.GITHUB_TOKEN || process.env.PUBLIC_GITHUB_TOKEN,
    })

    // Get the file content
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })

    if (Array.isArray(data)) {
      return NextResponse.json({ error: "Path is a directory, not a file" }, { status: 400 })
    }

    // Check if the file is binary
    const isBinary = !data.content || data.encoding !== "base64" || isBinaryPath(path)

    let content = ""
    if (!isBinary && data.content) {
      content = Buffer.from(data.content, "base64").toString("utf8")
    }

    return NextResponse.json({
      content,
      isBinary,
      size: data.size || 0,
      sha: data.sha || "",
      path,
    })
  } catch (error) {
    console.error(`Error fetching file content for ${owner}/${repo}/${path}:`, error)

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    return NextResponse.json(
      {
        error: "Failed to fetch file content",
        message: errorMessage,
        stack: errorStack,
        details: "An error occurred while fetching the file content.",
      },
      { status: 500 },
    )
  }
}

// Helper function to check if a file is likely binary based on its extension
function isBinaryPath(path: string): boolean {
  const binaryExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
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
    ".pyc",
    ".pyo",
    ".o",
    ".obj",
    ".class",
  ]

  const extension = path.substring(path.lastIndexOf(".")).toLowerCase()
  return binaryExtensions.includes(extension)
}
