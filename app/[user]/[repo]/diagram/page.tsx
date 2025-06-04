import { Suspense } from "react"
import { Loader2Icon } from "lucide-react"
import { getAllRepoFiles, getRepoData } from "@/lib/github"
import ClientWrapper from "../sigma/client-wrapper"

interface PageProps {
  params: {
    user: string
    repo: string
  }
}

export default async function DiagramPage({ params }: PageProps) {
  const { user, repo } = params

  // Fetch repo info to determine default branch
  const repoInfo = await getRepoData(user, repo)
  const branch = repoInfo?.default_branch || "main"

  // Fetch files server-side to avoid client-side loading issues
  let files: any[] = []
  try {
    const result = await getAllRepoFiles(user, repo, branch)
    files = result.files
  } catch (error) {
    console.error("Error fetching repo files:", error)
    // We'll continue with empty files and let the client component handle the error
  }

  const repoData = { owner: user, repo }

  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="h-8 w-8 animate-spin mr-3" />
            <span>Loading repository diagram...</span>
          </div>
        }
      >
        <ClientWrapper
          files={files}
          repoData={repoData}
          owner={user}
          repo={repo}
          branch={branch}
          defaultTab="diagram"
        />
      </Suspense>
    </div>
  )
}
