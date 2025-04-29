import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || ""

export async function GET(request: Request, { params }: { params: { user: string; repo: string } }) {
  const { user, repo } = params
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")
  const ref = searchParams.get("ref") || "main"

  if (!path) {
    return NextResponse.json({ error: "Path parameter is required" }, { status: 400 })
  }

  try {
    const octokit = new Octokit({ auth: PUBLIC_GITHUB_TOKEN })
    const { data } = await octokit.rest.repos.getContent({
      owner: user,
      repo: repo,
      path: path,
      ref: ref,
    })

    if (Array.isArray(data)) {
      return NextResponse.json({ error: "Path points to a directory, not a file" }, { status: 400 })
    }

    if (data.type !== "file") {
      return NextResponse.json({ error: "Path does not point to a file" }, { status: 400 })
    }

    // Get the content
    const content = Buffer.from(data.content, "base64").toString("utf-8")

    // Check if content appears to be binary
    const isBinary = detectBinaryContent(content)

    return NextResponse.json({
      name: data.name,
      path: data.path,
      size: data.size,
      content: isBinary ? "Binary file not shown" : content,
      isBinary: isBinary,
      sha: data.sha,
      url: data.html_url,
    })
  } catch (error) {
    console.error("Error fetching file content:", error)
    return NextResponse.json({ error: "Failed to fetch file content", message: error.message }, { status: 500 })
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
