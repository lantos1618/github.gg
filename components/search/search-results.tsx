"use client"

import type { SearchResult } from "@/lib/types/search"
import { Badge } from "@/components/ui/badge"
import { StarIcon, FolderOpenIcon as IssueOpenedIcon, GitPullRequestIcon, MessageSquareIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  isLoading: boolean
  onResultClick: () => void
}

export function SearchResults({ results, query, isLoading, onResultClick }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 bg-background border rounded-md shadow-lg mt-1 p-2 max-h-[80vh] overflow-y-auto z-50">
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
          <p>Searching...</p>
        </div>
      </div>
    )
  }

  if (query.trim() === "") {
    return null
  }

  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 bg-background border rounded-md shadow-lg mt-1 p-4 max-h-[80vh] overflow-y-auto z-50">
        <p className="text-center text-muted-foreground">No results found for "{query}"</p>
      </div>
    )
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-background border rounded-md shadow-lg mt-1 p-2 max-h-[80vh] overflow-y-auto z-50">
      <div className="text-sm text-muted-foreground px-3 py-2 border-b">
        {results.length} results for "{query}"
      </div>
      <ul className="divide-y">
        {results.map((result) => (
          <li key={result.id} className="hover:bg-muted/50 rounded-md">
            <Link href={result.url} className="block p-3" onClick={onResultClick}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {result.type === "repository" && (
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <Image src={result.avatar || "/placeholder.svg"} alt={result.owner} width={32} height={32} />
                    </div>
                  )}
                  {result.type === "user" && (
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <Image src={result.avatar || "/placeholder.svg"} alt={result.title} width={32} height={32} />
                    </div>
                  )}
                  {result.type === "issue" && <IssueOpenedIcon className="w-6 h-6 text-yellow-500" />}
                  {result.type === "pull-request" && <GitPullRequestIcon className="w-6 h-6 text-green-500" />}
                  {result.type === "discussion" && <MessageSquareIcon className="w-6 h-6 text-purple-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{result.title}</span>
                    {result.type === "repository" && result.language && (
                      <Badge variant="outline" className="text-xs">
                        {result.language}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{result.description}</p>
                  {result.type === "repository" && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {result.stars !== undefined && (
                        <div className="flex items-center gap-1">
                          <StarIcon className="w-3.5 h-3.5" />
                          <span>{result.stars.toLocaleString()}</span>
                        </div>
                      )}
                      {result.updated && <div>Updated on {result.updated}</div>}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="p-3 border-t">
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          className="text-sm text-primary hover:underline block text-center"
          onClick={onResultClick}
        >
          See all results
        </Link>
      </div>
    </div>
  )
}
