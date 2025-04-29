import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitPullRequestIcon, MessageCircleIcon, ClockIcon } from "lucide-react"
import { getRepoData } from "@/lib/github"

export async function generateMetadata({ params }: { params: { user: string; repo: string } }): Promise<Metadata> {
  return {
    title: `Pull Requests · ${params.user}/${params.repo} - GitHub.GG`,
    description: `AI-powered analysis of pull requests in ${params.user}/${params.repo}`,
  }
}

export default async function RepoPullsPage({
  params,
  searchParams,
}: {
  params: { user: string; repo: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const repoData = await getRepoData(params.user, params.repo)
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const state = typeof searchParams.state === "string" ? searchParams.state : "open"

  // Mock pull requests data
  const pullsData = [
    {
      number: 123,
      title: "Add new feature for user authentication",
      state: "open",
      user: {
        login: "developer1",
        avatar_url: "https://github.com/developer1.png",
      },
      created_at: "2023-05-15T00:00:00Z",
      updated_at: "2023-05-16T00:00:00Z",
      comments: 7,
      base: "main",
      head: "feature/auth",
    },
    {
      number: 122,
      title: "Fix bug in data processing pipeline",
      state: "closed",
      user: {
        login: "developer2",
        avatar_url: "https://github.com/developer2.png",
      },
      created_at: "2023-05-10T00:00:00Z",
      updated_at: "2023-05-12T00:00:00Z",
      comments: 3,
      base: "main",
      head: "bugfix/data-processing",
    },
  ]

  // Filter by state
  const filteredPulls = state === "all" ? pullsData : pullsData.filter((pr) => pr.state === state)

  return (
    <div className="container py-4">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Pull Requests</h1>
          <div className="flex items-center gap-3">
            <Button>New Pull Request</Button>
          </div>
        </div>

        <Tabs defaultValue={state} className="w-full">
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

          <TabsContent value={state} className="mt-6">
            <Card className="bg-black/70 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  {state === "open" ? "Open" : state === "closed" ? "Closed" : "All"} Pull Requests
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
                                {pr.head} into {pr.base}
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
                    No {state === "all" ? "" : state} pull requests found
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
              <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? (
                  <Link href={`/${params.user}/${params.repo}/pulls?page=${page - 1}&state=${state}`}>Previous</Link>
                ) : (
                  "Previous"
                )}
              </Button>
              <span className="text-sm">Page {page}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${params.user}/${params.repo}/pulls?page=${page + 1}&state=${state}`}>Next</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
