import type { Metadata } from "next"
import RepoIssuesList from "@/components/repo/repo-issues-list"
import { getRepoData, getRepoIssues } from "@/lib/github"

export async function generateMetadata({
  params,
}: {
  params: { user: string; repo: string }
}): Promise<Metadata> {
  return {
    title: `Issues · ${params.user}/${params.repo} - GitHub.GG`,
    description: `AI-powered analysis of issues in ${params.user}/${params.repo}`,
  }
}

export default async function RepoIssuesPage({
  params,
  searchParams,
}: {
  params: { user: string; repo: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const repoData = await getRepoData(params.user, params.repo)
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const state = typeof searchParams.state === "string" ? searchParams.state : "open"

  const issuesData = await getRepoIssues(params.user, params.repo, {
    page,
    state: state as "open" | "closed" | "all",
  })

  return (
    <div className="container py-4">
      <RepoIssuesList
        username={params.user}
        reponame={params.repo}
        repoData={repoData}
        issuesData={issuesData}
        currentPage={page}
        currentState={state as "open" | "closed" | "all"}
      />
    </div>
  )
}
