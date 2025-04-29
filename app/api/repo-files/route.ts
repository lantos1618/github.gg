import { NextResponse } from "next/server"
import { Volume } from "memfs"
import { analyzeRepository } from "@/lib/repo-analysis-service"

// In-memory filesystem
const vol = new Volume()
const memFs = vol

export async function POST(request: Request) {
  try {
    const { owner, repo, accessToken } = await request.json()

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Clone and analyze the repository
    try {
      const analysis = await analyzeRepository(owner, repo, accessToken)
      const repoPath = analysis.repoPath

      // Get all files in the repository
      const files = await getAllFiles(repoPath)

      return NextResponse.json({
        files,
        repoStats: {
          fileCount: analysis.fileCount,
          directoryCount: analysis.directoryCount,
          languages: analysis.languages,
          cloneTimeMs: analysis.cloneTimeMs,
        },
      })
    } catch (error) {
      console.error("Error analyzing repository:", error)
      return NextResponse.json({ error: "Failed to analyze repository", message: error.message }, { status: 500 })
    }
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 })
  }
}

// Helper function to get all files in a directory recursively
async function getAllFiles(dir: string, basePath = ""): Promise<any[]> {
  const files: any[] = []

  try {
    const entries = memFs.readdirSync(dir)

    for (const entry of entries) {
      const fullPath = `${dir}/${entry}`
      const relativePath = basePath ? `${basePath}/${entry}` : entry

      try {
        const stats = memFs.statSync(fullPath)

        if (stats.isDirectory()) {
          // Recursively get files from subdirectory
          const subFiles = await getAllFiles(fullPath, relativePath)
          files.push(...subFiles)
        } else {
          // Add file to the list
          files.push({
            name: entry,
            path: relativePath,
            size: stats.size,
            type: "file",
          })
        }
      } catch (error) {
        console.warn(`Error processing ${fullPath}:`, error)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }

  return files
}
