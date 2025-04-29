import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { user: string; repo: string } }) {
  const { user, repo } = params

  // Get query parameters
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const perPage = Number.parseInt(searchParams.get("per_page") || "10")
  const state = searchParams.get("state") || "open"

  // Generate mock issues
  const totalIssues = 42 // Mock total number of issues
  const openIssues = 28 // Mock number of open issues
  const closedIssues = totalIssues - openIssues

  const issueCount = state === "open" ? openIssues : state === "closed" ? closedIssues : totalIssues

  // Calculate pagination
  const totalPages = Math.ceil(issueCount / perPage)
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * perPage
  const endIndex = Math.min(startIndex + perPage, issueCount)

  // Generate issues for the current page
  const issues = Array.from({ length: endIndex - startIndex }, (_, i) => {
    const issueIndex = startIndex + i + 1
    const isOpen = state === "open" ? true : state === "closed" ? false : issueIndex <= openIssues

    return {
      id: issueIndex,
      number: issueIndex,
      title: `Issue #${issueIndex}: ${isOpen ? "Open" : "Closed"} issue in ${repo}`,
      state: isOpen ? "open" : "closed",
      user: {
        login: issueIndex % 3 === 0 ? user : `contributor-${(issueIndex % 5) + 1}`,
        avatar_url:
          issueIndex % 3 === 0
            ? `https://github.com/${user}.png`
            : `https://github.com/contributor-${(issueIndex % 5) + 1}.png`,
      },
      created_at: new Date(Date.now() - issueIndex * 86400000).toISOString(), // Each issue is a day older
      updated_at: new Date(Date.now() - issueIndex * 43200000).toISOString(), // Each issue was updated 12 hours after creation
      comments: Math.floor(Math.random() * 10),
      body: `This is the body of issue #${issueIndex} in the ${repo} repository. It contains a detailed description of the issue.`,
      labels: [
        { name: "bug", color: "d73a4a" },
        { name: "enhancement", color: "a2eeef" },
      ],
    }
  })

  return NextResponse.json({
    issues,
    pagination: {
      page: currentPage,
      perPage,
      totalIssues: issueCount,
      totalPages,
    },
    stats: {
      openIssues,
      closedIssues,
      totalIssues,
    },
  })
}
