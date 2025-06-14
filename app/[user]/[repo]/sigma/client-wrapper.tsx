"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import SigmaCodeView from "@/components/repo/sigma-code-view"
import RepoStructureDiagram from "@/components/repo/repo-structure-diagram"
import { getAllRepoFiles } from "@/lib/github"
import { Loader2Icon } from "lucide-react"

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
  branch,
  defaultTab = "code",
}: ClientWrapperProps) {
  const [activeTab, setActiveTab] = useState<"code" | "diagram">(defaultTab)
  const [files, setFiles] = useState<any[]>(initialFiles)
  const [branchName, setBranchName] = useState(branch)
  const [isLoading, setIsLoading] = useState(initialFiles.length === 0)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  const accessToken = session?.accessToken as string | undefined

  // Fetch files if not provided
  useEffect(() => {
    async function fetchFiles() {
      if (initialFiles && initialFiles.length > 0) {
        setFiles(initialFiles)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const { files: fetchedFiles, branch: fetchedBranch } = await getAllRepoFiles(
          owner, 
          repo, 
          branchName,
          accessToken
        )
        setFiles(fetchedFiles)
        setBranchName(fetchedBranch)
      } catch (err) {
        console.error("Error fetching repo files:", err)
        setError("Failed to fetch repository files")
      } finally {
        setIsLoading(false)
      }
    }

    fetchFiles()
  }, [owner, repo, branchName, initialFiles])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin mr-3" />
        <span>Loading repository data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 font-medium">{error}</p>
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
