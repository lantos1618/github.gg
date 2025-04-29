import type { Metadata } from "next"
import { notFound } from "next/navigation"
import RepoIssueDetail from "@/components/repo/repo-issue-detail"
import { getRepoData, getIssueData } from "@/lib/github"

export async function generateMetadata({
  params,
}: {
  params: { user: string; repo: string; id: string }
}): Promise<Metadata> {
  try {
    const issueData = await getIssueData(params.user, params.repo, params.id)

    return {
      title: `${issueData.title} · Issue #${params.id} · ${params.user}/${params.repo} - GitHub.GG`,
      description: `AI-powered analysis of issue #${params.id} in ${params.user}/${params.repo}`,
    }
  } catch (error) {
    return {
      title: `Issue #${params.id} · ${params.user}/${params.repo} - GitHub.GG`,
      description: `AI-powered analysis of issue #${params.id} in ${params.user}/${params.repo}`,
    }
  }
}

export default async function RepoIssuePage({
  params,
}: {
  params: { user: string; repo: string; id: string }
}) {
  try {
    const repoData = await getRepoData(params.user, params.repo)
    const issueData = await getIssueData(params.user, params.repo, params.id)

    return (
      <div className="container py-4">
        <RepoIssueDetail
          username={params.user}
          reponame={params.repo}
          issueId={params.id}
          repoData={repoData}
          issueData={issueData}
        />
      </div>
    )
  } catch (error) {
    console.error("Error fetching issue data:", error)
    notFound()
  }
}
