import { Suspense } from "react"
import { Loader2Icon } from "lucide-react"
import { trpcClient } from "@/lib/trpc/trpc"
import ClientWrapper from "../sigma/client-wrapper"

interface PageProps {
  params: {
    user: string
    repo: string
  }
}

export default async function DiagramPage({ params }: PageProps) {
  const { user, repo } = params

  // Fetch files using tRPC (SSR/React Query)
  // Use the vanilla tRPC client for server-side data fetching
  const filesResult = await trpcClient.github.getFiles.query({
    owner: user,
    repo,
    branch: "main", // You can fetch the default branch via another tRPC call if needed
    options: {
      maxFiles: 1000,
      includeContent: true
    }
  })

  const files = filesResult?.files || []
  const branch = filesResult?.branch || "main"
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
