import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { user: string; repo: string; id: string } }) {
  const { user, repo, id } = params
  const issueId = Number.parseInt(id)

  // Mock issue data
  const isOpen = issueId % 2 === 0 // Even numbers are open, odd are closed

  const issueData = {
    id: issueId,
    number: issueId,
    title: `Issue #${issueId}: ${isOpen ? "Open" : "Closed"} issue in ${repo}`,
    state: isOpen ? "open" : "closed",
    user: {
      login: issueId % 3 === 0 ? user : `contributor-${(issueId % 5) + 1}`,
      avatar_url:
        issueId % 3 === 0
          ? `https://github.com/${user}.png`
          : `https://github.com/contributor-${(issueId % 5) + 1}.png`,
    },
    created_at: new Date(Date.now() - issueId * 86400000).toISOString(),
    updated_at: new Date(Date.now() - issueId * 43200000).toISOString(),
    closed_at: isOpen ? null : new Date(Date.now() - issueId * 21600000).toISOString(),
    comments: Math.floor(Math.random() * 10),
    body: `This is the body of issue #${issueId} in the ${repo} repository.

It contains a detailed description of the issue with multiple paragraphs.

## Steps to reproduce
1. Clone the repository
2. Run \`npm install\`
3. Start the application with \`npm start\`
4. Observe the issue

## Expected behavior
The application should work correctly.

## Actual behavior
The application crashes with an error.`,
    labels: [
      { name: "bug", color: "d73a4a" },
      { name: "enhancement", color: "a2eeef" },
    ],
  }

  // Mock comments
  const comments = Array.from({ length: issueData.comments }, (_, i) => {
    return {
      id: i + 1,
      user: {
        login: i % 2 === 0 ? user : `contributor-${(i % 5) + 1}`,
        avatar_url:
          i % 2 === 0 ? `https://github.com/${user}.png` : `https://github.com/contributor-${(i % 5) + 1}.png`,
      },
      created_at: new Date(Date.now() - (issueId + i) * 3600000).toISOString(),
      body: `This is comment #${i + 1} on issue #${issueId}.

It contains some text that discusses the issue.`,
    }
  })

  return NextResponse.json({
    issue: issueData,
    comments,
  })
}
