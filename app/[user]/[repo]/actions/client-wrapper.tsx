"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "lucide-react"
import { trpc } from "@/lib/trpc/trpc"

interface ActionsClientWrapperProps {
  params: {
    user: string
    repo: string
  }
}

export function ActionsClientWrapper({ params }: ActionsClientWrapperProps) {
  const { data: workflows, isLoading: workflowsLoading } = trpc.github.getWorkflows.useQuery({
    owner: params.user,
    repo: params.repo,
  })

  const { data: workflowRuns, isLoading: runsLoading } = trpc.github.getWorkflowRuns.useQuery({
    owner: params.user,
    repo: params.repo,
    perPage: 50,
  })

  if (workflowsLoading || runsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border/50 rounded-lg p-4">
                <div className="h-6 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const workflowsWithRuns = workflows?.map(workflow => {
    const runs = workflowRuns?.workflow_runs.filter(run => run.workflow_id === workflow.id) || []
    return {
      ...workflow,
      runs: runs.slice(0, 5) // Show only recent 5 runs per workflow
    }
  }) || []

  const allRuns = workflowRuns?.workflow_runs || []

  return (
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
            {workflowsWithRuns.length > 0 ? (
              <div className="space-y-4">
                {workflowsWithRuns.map((workflow) => (
                  <div key={workflow.id} className="border border-border/50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium">{workflow.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {workflow.state === 'active' ? 'Active workflow' : `State: ${workflow.state}`}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Run workflow
                      </Button>
                    </div>
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium">Recent runs</h4>
                      {workflow.runs.length > 0 ? (
                        workflow.runs.map((run) => (
                          <div key={run.id} className="flex items-center justify-between bg-gray-900/30 p-3 rounded-md">
                            <div className="flex items-center gap-3">
                              {run.conclusion === "success" ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              ) : run.conclusion === "failure" ? (
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                              ) : (
                                <ClockIcon className="h-5 w-5 text-yellow-500" />
                              )}
                              <div>
                                <div className="font-medium">{run.head_commit?.message || 'No commit message'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {run.head_branch} • {run.head_sha.substring(0, 7)}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <ClockIcon className="h-3.5 w-3.5 inline mr-1" />
                              {new Date(run.updated_at).toLocaleString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground p-3">
                          No recent runs
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No workflows found
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="runs" className="mt-6">
        <Card className="bg-black/70 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Workflow Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {allRuns.length > 0 ? (
              <div className="space-y-4">
                {allRuns.map((run) => (
                  <div key={run.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {run.conclusion === "success" ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : run.conclusion === "failure" ? (
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{run.name || 'Unknown workflow'}</span>
                          <Badge
                            variant="outline"
                            className={`${
                              run.conclusion === "success"
                                ? "bg-green-500/10 text-green-400 border-green-500/30"
                                : run.conclusion === "failure"
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                            }`}
                          >
                            {run.conclusion || run.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm">{run.head_commit?.message || 'No commit message'}</div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-muted-foreground">
                          <span>
                            {run.head_branch} • {run.head_sha.substring(0, 7)}
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
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No workflow runs found
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
} 