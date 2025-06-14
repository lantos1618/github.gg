"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

interface CopyAllCodeButtonProps {
  owner: string
  repo: string
  branch: string
  className?: string
}

export function CopyAllCodeButton({ owner, repo, branch, className = "" }: CopyAllCodeButtonProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleCopyAllCode = async () => {
    try {
      setIsLoading(true)
      setIsCopied(false)
      
      // This is a placeholder for the actual implementation
      // In a real implementation, you would fetch the repository content
      // and copy it to the clipboard
      const repoUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`
      
      // Create a temporary link to trigger the download
      const link = document.createElement('a')
      link.href = repoUrl
      link.download = `${repo}-${branch}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Show success feedback
      setIsCopied(true)
      toast.success("Download started!")
      
      // Reset the copied state after 3 seconds
      setTimeout(() => {
        setIsCopied(false)
      }, 3000)
    } catch (error) {
      console.error("Failed to copy repository code:", error)
      toast.error("Failed to start download. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-1 ${className}`}
      onClick={handleCopyAllCode}
      disabled={isLoading}
      aria-label={isCopied ? "Download started!" : "Download repository as ZIP"}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin">↻</span>
      ) : isCopied ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
      <span>{isCopied ? "Downloading..." : "Code"}</span>
    </Button>
  )
}
