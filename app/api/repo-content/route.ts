import { NextResponse } from "next/server"
import { getFileContent } from "@/lib/repo-analysis-service"

export async function POST(request: Request) {
  try {
    const { owner, repo, path, accessToken } = await request.json()

    if (!owner || !repo || !path) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log(`Processing content request for ${owner}/${repo}/${path}`)

    try {
      // Get file content directly using the GitHub API
      const { content, isBinary, size } = await getFileContent(owner, repo, path, accessToken)

      return NextResponse.json({
        name: path.split("/").pop(),
        path: path,
        size: size,
        content: isBinary ? "Binary file not shown" : content,
        isBinary: isBinary,
      })
    } catch (error) {
      console.error("Error fetching file content:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch file content",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
