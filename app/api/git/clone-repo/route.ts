import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: Request) {
  const { owner, repo, accessToken } = await request.json()

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    console.log(`Fetching repository ${owner}/${repo} using GitHub API...`)

    // Use GitHub API instead of Git clone to avoid file system issues
    const octokit = new Octokit({
      auth: accessToken || process.env.GITHUB_TOKEN || process.env.PUBLIC_GITHUB_TOKEN,
    })

    // Get repository information
    const repoInfo = await octokit.repos.get({
      owner,
      repo,
    })

    // Get the default branch
    const defaultBranch = repoInfo.data.default_branch

    // Get the tree of the repository
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "1",
    })

    // Transform the tree into our file format
    const files = tree.tree
      .filter((item) => item.type === "blob")
      .map((item) => ({
        path: item.path || "",
        name: item.path ? item.path.split("/").pop() || "" : "",
        size: item.size || 0,
        type: "file",
        sha: item.sha || "",
      }))

    // Get README content if it exists
    let readme = undefined
    const readmeFile = files.find((file) => file.path.toLowerCase().match(/^readme(\.md|\.txt|\.markdown|\.mdx|)$/i))

    if (readmeFile && readmeFile.sha) {
      try {
        const { data: readmeData } = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: readmeFile.sha,
        })

        if (readmeData.encoding === "base64") {
          readme = Buffer.from(readmeData.content, "base64").toString("utf8")
        }
      } catch (error) {
        console.error("Error fetching README:", error)
      }
    }

    return NextResponse.json({
      files,
      fileCount: files.length,
      directoryCount: 0,
      defaultBranch,
      readme,
      analysisTimeMs: 0,
      isPublic: repoInfo.data.private === false,
    })
  } catch (error) {
    console.error(`Error fetching repository ${owner}/${repo}:`, error)

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    return NextResponse.json(
      {
        error: "Failed to fetch repository",
        message: errorMessage,
        stack: errorStack,
        details: "An error occurred while fetching the repository data.",
      },
      { status: 500 },
    )
  }
}
