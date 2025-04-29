import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { user: string } }) {
  const { user } = params

  // Get query parameters
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const perPage = Number.parseInt(searchParams.get("per_page") || "10")

  // Mock user data
  // In a real implementation, this would fetch data from GitHub API
  const userData = {
    login: user,
    name: user.charAt(0).toUpperCase() + user.slice(1),
    avatar_url: `https://github.com/${user}.png`,
    bio: `This is a mock bio for ${user}.`,
    company: "GitHub.GG",
    location: "San Francisco, CA",
    email: `${user}@example.com`,
    public_repos: 30,
    followers: Math.floor(Math.random() * 1000),
    following: Math.floor(Math.random() * 500),
    created_at: new Date(Date.now() - Math.random() * 157680000000).toISOString(), // Random date within last 5 years
  }

  // Generate mock repositories
  const repos = Array.from({ length: perPage }, (_, i) => {
    const repoIndex = (page - 1) * perPage + i + 1
    return {
      id: repoIndex,
      name: `repo-${repoIndex}`,
      full_name: `${user}/repo-${repoIndex}`,
      owner: {
        login: user,
        avatar_url: `https://github.com/${user}.png`,
      },
      description: `This is repository #${repoIndex} for ${user}.`,
      language: ["TypeScript", "JavaScript", "Python", "Go", "Rust"][Math.floor(Math.random() * 5)],
      stargazers_count: Math.floor(Math.random() * 1000),
      forks_count: Math.floor(Math.random() * 100),
      created_at: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
      updated_at: new Date().toISOString(),
    }
  })

  return NextResponse.json({
    user: userData,
    repositories: repos,
    pagination: {
      page,
      perPage,
      totalRepos: userData.public_repos,
      totalPages: Math.ceil(userData.public_repos / perPage),
    },
  })
}
