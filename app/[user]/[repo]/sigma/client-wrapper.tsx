"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import SigmaCodeView from "@/components/repo/sigma-code-view"
import RepoStructureDiagram from "@/components/repo/repo-structure-diagram"
import { Loader2Icon } from "lucide-react"
import { trpc } from "@/lib/trpc/trpc"

interface ClientWrapperProps {
  files: any[]
  repoData: {
    owner: string
    repo: string
  }
  owner: string
  repo: string
  branch?: string
  defaultTab?: "code" | "diagram"
}

export default function ClientWrapper({
  files: initialFiles,
  repoData,
  owner,
  repo,
  branch: initialBranch,
  defaultTab = "code",
}: ClientWrapperProps) {
  const [activeTab, setActiveTab] = useState<"code" | "diagram">(defaultTab)
  const [branch, setBranch] = useState(initialBranch)
  
  // Use tRPC query to fetch repository files
  const { data, isLoading, error, isFetching } = trpc.github.getFiles.useQuery(
    { 
      owner, 
      repo, 
      branch: branch,
      options: {
        maxFileSize: 1024 * 1024, // 1MB
        maxFiles: 1000,
        includeContent: true,
        includeExtensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.md'],
        excludePaths: ['**/node_modules/**', '**/dist/**', '**/build/**']
      }
    },
    {
      // Only fetch if we don't have initial files
      enabled: !initialFiles?.length,
      // Don't retry on 404 (repo not found)
      retry: (failureCount: number, error: any) => 
        error?.data?.code !== 'NOT_FOUND' && failureCount < 3,
      // Don't refetch on window focus to reduce API calls
      refetchOnWindowFocus: false,
      // Use placeholder data while fetching
      placeholderData: (previousData: any) => previousData || { files: [], branch: branch || 'main' }
    }
  )

  // Use either the initial files or the data from tRPC
  const files = initialFiles?.length ? initialFiles : data?.files || []
  const branchName = data?.branch || branch || 'main'
  
  // Combine loading states
  const isDataLoading = isLoading || isFetching

  // Handle error state
  const errorMessage = error ? 
    error.message || 'Failed to fetch repository files' : 
    null

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin mr-3" />
        <span>Loading repository data...</span>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 font-medium">{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activeTab === "code" ? (
        <SigmaCodeView files={files} repoData={repoData} owner={owner} repo={repo} branch={branchName} />
      ) : (
        <RepoStructureDiagram files={files} owner={owner} repo={repo} branch={branchName} />
      )}
    </div>
  )
}
