"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchIcon } from "lucide-react"
import { searchMockData } from "@/lib/mock/search-data"
import type { SearchResult } from "@/lib/types/search"
import Image from "next/image"
import Link from "next/link"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [searchInput, setSearchInput] = useState(query)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Perform search when query changes
  useEffect(() => {
    if (query) {
      setIsLoading(true)
      // Simulate API call with timeout
      const timeoutId = setTimeout(() => {
        const searchResults = searchMockData(query)
        setResults(searchResults)
        setIsLoading(false)
      }, 500)

      return () => clearTimeout(timeoutId)
    } else {
      setResults([])
    }
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      // Update URL with search query
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{query ? `Search results for "${query}"` : "Search GitHub.GG"}</h1>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search repositories, users, issues..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mr-3"></div>
            <p className="text-lg">Searching...</p>
          </div>
        ) : query && results.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-lg mb-2">No results found for "{query}"</p>
            <p className="text-muted-foreground">Try different keywords or check your spelling</p>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((result) => (
              <div key={result.id} className="border rounded-lg p-4 hover:bg-muted/50">
                <Link href={result.url} className="block">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Image
                        src={result.avatar || "/placeholder.svg"}
                        alt={result.type === "user" ? result.title : result.owner}
                        width={40}
                        height={40}
                        className={result.type === "user" ? "rounded-full" : "rounded-md"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-lg">{result.title}</h3>
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">
                          {result.type === "repository"
                            ? "Repo"
                            : result.type === "user"
                              ? "User"
                              : result.type === "issue"
                                ? "Issue"
                                : result.type === "pull-request"
                                  ? "PR"
                                  : "Discussion"}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">{result.description}</p>
                      {result.type === "repository" && (
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {result.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-primary"></span>
                              {result.language}
                            </span>
                          )}
                          {result.stars !== undefined && (
                            <span className="flex items-center gap-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              {result.stars.toLocaleString()}
                            </span>
                          )}
                          {result.updated && <span>Updated on {result.updated}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
