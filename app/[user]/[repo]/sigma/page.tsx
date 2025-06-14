import { Suspense } from "react"
import { Loader2Icon } from "lucide-react"
import ClientWrapper from "./client-wrapper"

interface PageProps {
  params: {
    user: string
    repo: string
  }
}

export default async function SigmaPage({ params }: PageProps) {
  const { user, repo } = params

  // We'll pass empty initial files and let the client component fetch them
  const initialFiles: any[] = []
  const repoData = { owner: user, repo }

  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="h-8 w-8 animate-spin mr-3" />
            <span>Loading code...</span>
          </div>
        }
      >
        <ClientWrapper files={initialFiles} repoData={repoData} owner={user} repo={repo} defaultTab="code" />
      </Suspense>
    </div>
  )
}
