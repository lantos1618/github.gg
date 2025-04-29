import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { user: string; repo: string } }) {
  const { user, repo } = params

  // Mock repository data
  // In a real implementation, this would fetch data from GitHub API
  const repoData = {
    name: repo,
    owner: {
      login: user,
      avatar_url: `https://github.com/${user}.png`,
    },
    description: `This is a mock description for the ${repo} repository.`,
    language: "TypeScript",
    stargazers_count: Math.floor(Math.random() * 10000),
    forks_count: Math.floor(Math.random() * 1000),
    watchers_count: Math.floor(Math.random() * 500),
    open_issues_count: Math.floor(Math.random() * 100),
    created_at: new Date(Date.now() - Math.random() * 31536000000).toISOString(), // Random date within last year
    updated_at: new Date().toISOString(),
    topics: ["typescript", "react", "nextjs", "ai"],
    license: {
      name: "MIT",
    },
    default_branch: "main",
  }

  return NextResponse.json(repoData)
}
