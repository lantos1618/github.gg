"use client"

import { useState, useEffect } from "react"
import { StarIcon } from "lucide-react"
import { fetchRepoData } from "@/lib/github"

interface GitHubStarButtonProps {
  owner: string
  repo: string
  className?: string
}

export function GitHubStarButton({ owner, repo, className = "" }: GitHubStarButtonProps) {
  const [starCount, setStarCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadRepoData() {
      setIsLoading(true)
      try {
        const data = await fetchRepoData(owner, repo)
        setStarCount(data.stargazers_count)
      } catch (error) {
        console.error("Error loading repo data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRepoData()
  }, [owner, repo])

  return (
    <a
      href={`https://github.com/${owner}/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      <StarIcon className="h-4 w-4" />
      <span>Star</span>
      {isLoading ? (
        <span className="px-1 py-0.5 ml-1 text-xs bg-muted rounded-full animate-pulse w-4"></span>
      ) : (
        <span className="px-1 py-0.5 ml-1 text-xs bg-muted rounded-full">{starCount}</span>
      )}
    </a>
  )
}
