import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(request: Request) {
  const { owner, repo, accessToken } = await request.json()

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    console.log(`Analyzing repository ${owner}/${repo} using GitHub API...`)
    const startTime = Date.now()

    // Initialize Octokit with the provided token or the public token
    const octokit = new Octokit({
      auth: accessToken || process.env.PUBLIC_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
    })

    // Get repository information
    const { data: repoData } = await octokit.repos.get({ owner, repo })

    // Get languages data
    const { data: languagesData } = await octokit.repos.listLanguages({ owner, repo })

    // Get the default branch
    const defaultBranch = repoData.default_branch

    // Get the file tree recursively
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "true",
    })

    // Filter out directories and convert to the expected format
    const files = treeData.tree
      .filter((item) => item.type === "blob")
      .map((item) => ({
        path: item.path,
        name: item.path.split("/").pop() || "",
        size: item.size || 0,
        type: "file",
        sha: item.sha,
      }))

    // Try to get README content
    let readme: string | undefined
    try {
      const { data: readmeData } = await octokit.repos.getReadme({
        owner,
        repo,
      })

      // Get the raw content
      const readmeResponse = await fetch(readmeData.download_url)
      readme = await readmeResponse.text()
    } catch (error) {
      // No README found or couldn't fetch it, that's okay
      console.log(`No README found for ${owner}/${repo}`)
    }

    const endTime = Date.now()
    const analysisTimeMs = endTime - startTime

    return NextResponse.json({
      files,
      fileCount: files.length,
      directoryCount: treeData.tree.filter((item) => item.type === "tree").length,
      languages: languagesData,
      readme,
      analysisTimeMs,
      isPublic: !repoData.private,
    })
  } catch (error) {
    console.error(`Error analyzing repository ${owner}/${repo}:`, error)

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    return NextResponse.json(
      {
        error: "Failed to analyze repository",
        message: errorMessage,
        stack: errorStack,
        details: "An error occurred while analyzing the repository using the GitHub API.",
      },
      { status: 500 },
    )
  }
}
