import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || ""

export async function GET(
  request: Request,
  { params }: { params: { user: string } },
) {
  const { user } = params

  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const perPage = Number.parseInt(searchParams.get("per_page") || "10")

  try {
    const octokit = new Octokit({ auth: PUBLIC_GITHUB_TOKEN })

    const { data: userData } = await octokit.rest.users.getByUsername({
      username: user,
    })

    const { data: repos } = await octokit.rest.repos.listForUser({
      username: user,
      per_page: perPage,
      page,
      sort: "updated",
    })

    return NextResponse.json({
      user: userData,
      repositories: repos,
      pagination: {
        page,
        perPage,
      },
    })
  } catch (error: any) {
    console.error("Error fetching repositories:", error)
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 },
    )
  }
}
