"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchIcon, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/trpc"
import { SearchRepositoryResult } from "@/lib/types/github"
import Image from "next/image"
import Link from "next/link"

type Repository = SearchRepositoryResult

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [searchInput, setSearchInput] = useState(query)
  const [results, setResults] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Initialize tRPC query
  const searchQuery = trpc.github.search.useQuery(
    {
      query,
      page: 1,
      perPage: 10,
    },
    {
      enabled: false, // Disable automatic fetch on mount
      retry: 2,
      refetchOnWindowFocus: false,
    }
  )

  // Handle search when query changes
  useEffect(() => {
    if (query) {
      const search = async () => {
        setIsLoading(true)
        try {
          const result = await searchQuery.refetch()
          if (result.data?.data?.items) {
            setResults(result.data.data.items)
          } else {
            setResults([])
          }
        } catch (error) {
          console.error('Search failed:', error)
          setResults([])
        } finally {
          setIsLoading(false)
        }
      }

      const timeoutId = setTimeout(search, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setResults([])
    }
  }, [query, searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          {query ? `Search results for "${query}"` : "Search GitHub.GG"}
        </h1>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search repositories..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Search
            </Button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <p className="text-lg">Searching repositories...</p>
          </div>
        ) : query && results.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-lg mb-2">No repositories found for "{query}"</p>
            <p className="text-muted-foreground">Try different keywords or check your spelling</p>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((repo) => (
              <div key={repo.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <Link href={repo.html_url} className="block">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Image
                        src={repo.owner?.avatar_url || "/placeholder.svg"}
                        alt={`${repo.owner?.login}'s avatar`}
                        width={40}
                        height={40}
                        className="rounded-full h-10 w-10"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg hover:underline truncate">
                        {repo.full_name}
                      </h3>
                      {repo.description && (
                        <p className="text-muted-foreground mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        {repo.language && (
                          <span>{repo.language}</span>
                        )}
                        <span>★ {repo.stargazers_count.toLocaleString()}</span>
                        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                      </div>
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
