import type { Metadata } from "next"
import { notFound } from "next/navigation"
import RepoFileTree from "@/components/repo/repo-file-tree"
import { getRepoData, getFileTreeData } from "@/lib/github"

export async function generateMetadata({
  params,
}: {
  params: { user: string; repo: string; branch: string; path: string[] }
}): Promise<Metadata> {
  const pathString = params.path.join("/")

  return {
    title: `${params.user}/${params.repo}/${pathString} at ${params.branch} - GitHub.GG`,
    description: `AI-powered analysis of ${pathString} directory in ${params.user}/${params.repo}`,
  }
}

export default async function RepoTreePage({
  params,
}: {
  params: { user: string; repo: string; branch: string; path: string[] }
}) {
  try {
    const repoData = await getRepoData(params.user, params.repo)
    const pathString = params.path.join("/")
    const treeData = await getFileTreeData(params.user, params.repo, params.branch, pathString)

    return (
      <div className="container py-4">
        <RepoFileTree
          username={params.user}
          reponame={params.repo}
          branch={params.branch}
          path={pathString}
          repoData={repoData}
          treeData={treeData}
        />
      </div>
    )
  } catch (error) {
    console.error("Error fetching tree data:", error)
    notFound()
  }
}
