import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CircleIcon, MessageCircleIcon, ClockIcon } from "lucide-react"

interface RepoIssuesListProps {
  username: string
  reponame: string
  repoData: any
  issuesData: any[]
  currentPage: number
  currentState: "open" | "closed" | "all"
}

export default function RepoIssuesList({
  username,
  reponame,
  repoData,
  issuesData,
  currentPage,
  currentState,
}: RepoIssuesListProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Issues</h1>
        <div className="flex items-center gap-3">
          <Button>New Issue</Button>
        </div>
      </div>

      <Tabs defaultValue={currentState} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="open" asChild>
            <Link href={`/${username}/${reponame}/issues?state=open`}>
              <CircleIcon className="h-4 w-4 mr-2" />
              Open
            </Link>
          </TabsTrigger>
          <TabsTrigger value="closed" asChild>
            <Link href={`/${username}/${reponame}/issues?state=closed`}>
              <CircleIcon className="h-4 w-4 mr-2" />
              Closed
            </Link>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <Link href={`/${username}/${reponame}/issues?state=all`}>All</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={currentState} className="mt-6">
          <Card className="bg-black/70 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                {currentState === "open" ? "Open" : currentState === "closed" ? "Closed" : "All"} Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issuesData.length > 0 ? (
                <div className="space-y-4">
                  {issuesData.map((issue) => (
                    <div key={issue.number} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <CircleIcon
                            className={`h-5 w-5 ${issue.state === "open" ? "text-green-500" : "text-purple-500"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <Link
                            href={`/${username}/${reponame}/issues/${issue.number}`}
                            className="text-lg font-medium hover:text-blue-400 transition-colors"
                          >
                            {issue.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-sm text-muted-foreground">
                            <span>#{issue.number}</span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5" />
                              Opened {new Date(issue.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircleIcon className="h-3.5 w-3.5" />
                              {issue.comments} comments
                            </span>
                            <span>
                              by{" "}
                              <Link href={`/${issue.user.login}`} className="hover:text-blue-400 transition-colors">
                                {issue.user.login}
                              </Link>
                            </span>
                          </div>
                        </div>
                        {issue.state === "closed" && (
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
                  No {currentState === "all" ? "" : currentState} issues found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {issuesData.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} asChild={currentPage > 1}>
              {currentPage > 1 ? (
                <Link href={`/${username}/${reponame}/issues?page=${currentPage - 1}&state=${currentState}`}>
                  Previous
                </Link>
              ) : (
                "Previous"
              )}
            </Button>
            <span className="text-sm">Page {currentPage}</span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${username}/${reponame}/issues?page=${currentPage + 1}&state=${currentState}`}>Next</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
