import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || ""

export async function GET(
  _request: Request,
  { params }: { params: { user: string; repo: string } },
) {
  const { user, repo } = params

  try {
    const octokit = new Octokit({ auth: PUBLIC_GITHUB_TOKEN })
    const { data } = await octokit.rest.repos.get({ owner: user, repo })
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error fetching repository data:", error)
    return NextResponse.json(
      { error: "Failed to fetch repository" },
      { status: 500 },
    )
  }
}
