import type React from "react"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import RepoHeader from "@/components/repo/repo-header"
import RepoNavigation from "@/components/repo/repo-navigation"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { getRepoData } from "@/lib/github"

export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { user: string; repo: string }
}) {
  try {
    const repoData = await getRepoData(params.user, params.repo)

    return (
      <div className="flex flex-col min-h-screen">
        <RepoHeader username={params.user} reponame={params.repo} repoData={repoData} />
        <RepoNavigation username={params.user} reponame={params.repo} repoData={repoData} />
        <main className="flex-1 bg-background">
          <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
        </main>
      </div>
    )
  } catch (error) {
    console.error("Error fetching repo data for layout:", error)
    notFound()
  }
}
