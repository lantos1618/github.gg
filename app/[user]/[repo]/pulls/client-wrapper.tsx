"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitPullRequestIcon, MessageCircleIcon, ClockIcon } from "lucide-react"
import { trpc } from "@/lib/trpc/trpc"

interface PullsClientWrapperProps {
  params: {
    user: string
    repo: string
  }
  searchParams: {
    page: number
    state: string
  }
}

export function PullsClientWrapper({ params, searchParams }: PullsClientWrapperProps) {
  const { data: pulls, isLoading } = trpc.github.getPullRequests.useQuery({
    owner: params.user,
    repo: params.repo,
    page: searchParams.page,
    state: searchParams.state as 'open' | 'closed' | 'all',
    perPage: 30,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-border/50 pb-4">
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const filteredPulls = pulls || []

  return (
    <>
      <Tabs defaultValue={searchParams.state} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="open" asChild>
            <Link href={`/${params.user}/${params.repo}/pulls?state=open`}>
              <GitPullRequestIcon className="h-4 w-4 mr-2" />
              Open
            </Link>
          </TabsTrigger>
          <TabsTrigger value="closed" asChild>
            <Link href={`/${params.user}/${params.repo}/pulls?state=closed`}>
              <GitPullRequestIcon className="h-4 w-4 mr-2" />
              Closed
            </Link>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <Link href={`/${params.user}/${params.repo}/pulls?state=all`}>All</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={searchParams.state} className="mt-6">
          <Card className="bg-black/70 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                {searchParams.state === "open" ? "Open" : searchParams.state === "closed" ? "Closed" : "All"} Pull Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPulls.length > 0 ? (
                <div className="space-y-4">
                  {filteredPulls.map((pr) => (
                    <div key={pr.number} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <GitPullRequestIcon
                            className={`h-5 w-5 ${pr.state === "open" ? "text-green-500" : "text-purple-500"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <Link
                            href={`/${params.user}/${params.repo}/pull/${pr.number}`}
                            className="text-lg font-medium hover:text-blue-400 transition-colors"
                          >
                            {pr.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-sm text-muted-foreground">
                            <span>#{pr.number}</span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5" />
                              Opened {new Date(pr.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircleIcon className="h-3.5 w-3.5" />
                              {pr.comments} comments
                            </span>
                            <span>
                              by{" "}
                              <Link href={`/${pr.user.login}`} className="hover:text-blue-400 transition-colors">
                                {pr.user.login}
                              </Link>
                            </span>
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">
                              {pr.head?.ref} into {pr.base?.ref}
                            </span>
                          </div>
                        </div>
                        {pr.state === "closed" && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                            Closed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No {searchParams.state === "all" ? "" : searchParams.state} pull requests found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {filteredPulls.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={searchParams.page <= 1} asChild={searchParams.page > 1}>
              {searchParams.page > 1 ? (
                <Link href={`/${params.user}/${params.repo}/pulls?page=${searchParams.page - 1}&state=${searchParams.state}`}>Previous</Link>
              ) : (
                "Previous"
              )}
            </Button>
            <span className="text-sm">Page {searchParams.page}</span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${params.user}/${params.repo}/pulls?page=${searchParams.page + 1}&state=${searchParams.state}`}>Next</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  )
} 