import { notFound } from "next/navigation"
import { getRepoData, getFileTreeData } from "@/lib/github"
import RepoFileTree from "@/components/repo/repo-file-tree"
import { Card } from "@/components/ui/card"
import SideAdPlaceholders from "@/components/advertising/side-ad-placeholders"
import { AlertCircle } from "lucide-react"

export default async function RepoTreePage({
  params,
}: {
  params: { user: string; repo: string; branch: string }
}) {
  try {
    const repoData = await getRepoData(params.user, params.repo)
    if (!repoData) {
      notFound()
    }

    let treeData = []
    try {
      treeData = await getFileTreeData(params.user, params.repo, params.branch, "")
    } catch (error) {
      console.error("Error fetching file tree:", error)
    }

    return (
      <div className="container py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="hidden lg:block w-[160px] flex-shrink-0">
            <SideAdPlaceholders position="left" />
          </div>

          <div className="flex-1">
            <Card className="bg-black/70 border-border/50 p-4">
              {treeData.length > 0 ? (
                <RepoFileTree
                  username={params.user}
                  reponame={params.repo}
                  branch={params.branch}
                  path=""
                  repoData={repoData}
                  treeData={treeData}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Unable to load repository files</h3>
                  <p className="text-muted-foreground max-w-md">
                    We couldn't load the files for this repository. This could be due to API rate limits or because the
                    repository is empty.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error in repo tree page:", error)
    notFound()
  }
}
