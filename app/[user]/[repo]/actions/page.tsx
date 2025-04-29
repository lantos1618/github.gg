import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react"
import { getRepoData } from "@/lib/github"

export async function generateMetadata({ params }: { params: { user: string; repo: string } }): Promise<Metadata> {
  return {
    title: `Actions · ${params.user}/${params.repo} - GitHub.GG`,
    description: `CI/CD workflows and actions for ${params.user}/${params.repo}`,
  }
}

export default async function RepoActionsPage({ params }: { params: { user: string; repo: string } }) {
  const repoData = await getRepoData(params.user, params.repo)

  // Mock workflows data
  const workflows = [
    {
      id: "ci",
      name: "CI",
      description: "Continuous Integration workflow",
      runs: [
        {
          id: "12345",
          status: "success",
          conclusion: "success",
          created_at: "2023-06-01T10:00:00Z",
          updated_at: "2023-06-01T10:15:00Z",
          branch: "main",
          commit: {
            message: "Update dependencies",
            sha: "abc1234",
          },
        },
        {
          id: "12344",
          status: "completed",
          conclusion: "failure",
          created_at: "2023-05-30T14:00:00Z",
          updated_at: "2023-05-30T14:20:00Z",
          branch: "feature/new-api",
          commit: {
            message: "Add new API endpoints",
            sha: "def5678",
          },
        },
      ],
    },
    {
      id: "deploy",
      name: "Deploy",
      description: "Deployment workflow",
      runs: [
        {
          id: "12343",
          status: "completed",
          conclusion: "success",
          created_at: "2023-06-01T11:00:00Z",
          updated_at: "2023-06-01T11:10:00Z",
          branch: "main",
          commit: {
            message: "Update dependencies",
            sha: "abc1234",
          },
        },
      ],
    },
  ]

  return (
    <div className="container py-4">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Actions</h1>
          <div className="flex items-center gap-3">
            <Button>New workflow</Button>
          </div>
        </div>

        <Tabs defaultValue="workflows" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="runs">Workflow runs</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="mt-6">
            <Card className="bg-black/70 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.map((workflow) => (
                    <div key={workflow.id} className="border border-border/50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium">{workflow.name}</h3>
                          <p className="text-sm text-muted-foreground">{workflow.description}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Run workflow
                        </Button>
                      </div>
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium">Recent runs</h4>
                        {workflow.runs.map((run) => (
                          <div key={run.id} className="flex items-center justify-between bg-gray-900/30 p-3 rounded-md">
                            <div className="flex items-center gap-3">
                              {run.conclusion === "success" ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <div className="font-medium">{run.commit.message}</div>
                                <div className="text-xs text-muted-foreground">
                                  {run.branch} • {run.commit.sha.substring(0, 7)}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <ClockIcon className="h-3.5 w-3.5 inline mr-1" />
                              {new Date(run.updated_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs" className="mt-6">
            <Card className="bg-black/70 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Workflow Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.flatMap((workflow) =>
                    workflow.runs.map((run) => (
                      <div key={run.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {run.conclusion === "success" ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{workflow.name}</span>
                              <Badge
                                variant="outline"
                                className={`${
                                  run.conclusion === "success"
                                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                                    : "bg-red-500/10 text-red-400 border-red-500/30"
                                }`}
                              >
                                {run.conclusion}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm">{run.commit.message}</div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-muted-foreground">
                              <span>
                                {run.branch} • {run.commit.sha.substring(0, 7)}
                              </span>
                              <span className="flex items-center gap-1">
                                <ClockIcon className="h-3.5 w-3.5" />
                                {new Date(run.updated_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View run
                          </Button>
                        </div>
                      </div>
                    )),
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
