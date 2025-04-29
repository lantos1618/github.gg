import type { Metadata } from "next"
import { notFound } from "next/navigation"
import RepoCommitDetail from "@/components/repo/repo-commit-detail"
import { getRepoData, getCommitData } from "@/lib/github"

export async function generateMetadata({
  params,
}: {
  params: { user: string; repo: string; sha: string }
}): Promise<Metadata> {
  try {
    const commitData = await getCommitData(params.user, params.repo, params.sha)

    return {
      title: `${commitData.message.split("\n")[0]} · ${params.sha.substring(0, 7)} · ${params.user}/${params.repo} - GitHub.GG`,
      description: `AI-powered analysis of commit ${params.sha.substring(0, 7)} in ${params.user}/${params.repo}`,
    }
  } catch (error) {
    return {
      title: `Commit ${params.sha.substring(0, 7)} · ${params.user}/${params.repo} - GitHub.GG`,
      description: `AI-powered analysis of commit ${params.sha.substring(0, 7)} in ${params.user}/${params.repo}`,
    }
  }
}

export default async function RepoCommitPage({
  params,
}: {
  params: { user: string; repo: string; sha: string }
}) {
  try {
    const repoData = await getRepoData(params.user, params.repo)
    const commitData = await getCommitData(params.user, params.repo, params.sha)

    return (
      <div className="container py-4">
        <RepoCommitDetail
          username={params.user}
          reponame={params.repo}
          sha={params.sha}
          repoData={repoData}
          commitData={commitData}
        />
      </div>
    )
  } catch (error) {
    console.error("Error fetching commit data:", error)
    notFound()
  }
}
