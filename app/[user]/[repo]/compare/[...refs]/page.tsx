import type { Metadata } from "next"
import { notFound } from "next/navigation"
import RepoCompare from "@/components/repo/repo-compare"
import { getRepoData, getCompareData } from "@/lib/github"

export async function generateMetadata({
  params,
}: {
  params: { user: string; repo: string; refs: string[] }
}): Promise<Metadata> {
  const compareString = params.refs.join("...")

  return {
    title: `Comparing ${compareString} · ${params.user}/${params.repo} - GitHub.GG`,
    description: `AI-powered analysis of changes between ${compareString} in ${params.user}/${params.repo}`,
  }
}

export default async function RepoComparePage({
  params,
}: {
  params: { user: string; repo: string; refs: string[] }
}) {
  try {
    const repoData = await getRepoData(params.user, params.repo)

    // Handle different compare formats (base...head or base..head)
    let base: string, head: string

    if (params.refs.length === 1) {
      // Handle the case where it's passed as a single string with ... or .. in it
      const parts = params.refs[0].split(/\.\.\.|\.\./)
      base = parts[0]
      head = parts[1] || "HEAD"
    } else if (params.refs.length === 2) {
      base = params.refs[0]
      head = params.refs[1]
    } else {
      throw new Error("Invalid compare format")
    }

    const compareData = await getCompareData(params.user, params.repo, base, head)

    return (
      <div className="container py-4">
        <RepoCompare
          username={params.user}
          reponame={params.repo}
          base={base}
          head={head}
          repoData={repoData}
          compareData={compareData}
        />
      </div>
    )
  } catch (error) {
    console.error("Error fetching compare data:", error)
    notFound()
  }
}
