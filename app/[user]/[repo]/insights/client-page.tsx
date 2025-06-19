"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitGraphIcon, UsersIcon, CodeIcon, GitCommitIcon, GitPullRequest, AlertCircle, Play } from "lucide-react"
import { ContributorsChart, CommitsChart } from "@/components/insights-charts"
import type { RepoInsightsClientPageProps, ActivityItem, ActivityType, ActivityStatus } from "@/lib/types/insights"
import { ActivityList, ActivityListItem } from "@/components/activity/activity-list-item"
import { formatDistanceToNow } from "date-fns"
import { trpc } from "@/lib/trpc/trpc"

export default function RepoInsightsClientPage({
  params,
  contributorsData,
  commitsData,
  topContributors,
}: RepoInsightsClientPageProps) {
  // Fetch real repository events
  const { data: events, isLoading: eventsLoading } = trpc.github.getEvents.useQuery({
    owner: params.user,
    repo: params.repo,
    perPage: 50,
  })

  // Transform repository events into activity items
  const recentActivity: ActivityItem[] = events?.map((event, index) => {
    const baseActivity = {
      id: event.id,
      author: {
        name: event.actor.login,
        avatarUrl: event.actor.avatar_url,
        url: `/${event.actor.login}`
      },
      timestamp: new Date(event.created_at || Date.now()),
      url: `/${params.user}/${params.repo}`
    }

    switch (event.type) {
      case 'PushEvent':
        return {
          ...baseActivity,
          type: 'commit' as ActivityType,
          title: `Pushed ${event.payload.commits?.length || 0} commits`,
          status: 'success' as ActivityStatus,
          details: event.payload.commits?.[0]?.message || 'Pushed commits',
          url: `/${params.user}/${params.repo}/commits`
        }
      case 'PullRequestEvent':
        return {
          ...baseActivity,
          type: 'pull-request' as ActivityType,
          title: `${event.payload.action} pull request`,
          status: (event.payload.pull_request?.state === 'open' ? 'open' : 'closed') as ActivityStatus,
          details: event.payload.pull_request?.title || 'Pull request activity',
          url: `/${params.user}/${params.repo}/pull/${event.payload.pull_request?.number}`
        }
      case 'IssuesEvent':
        return {
          ...baseActivity,
          type: 'issue' as ActivityType,
          title: `${event.payload.action} issue`,
          status: (event.payload.issue?.state === 'open' ? 'open' : 'closed') as ActivityStatus,
          details: event.payload.issue?.title || 'Issue activity',
          url: `/${params.user}/${params.repo}/issues/${event.payload.issue?.number}`
        }
      case 'CreateEvent':
        return {
          ...baseActivity,
          type: 'commit' as ActivityType,
          title: `Created ${event.payload.ref_type}`,
          status: 'success' as ActivityStatus,
          details: `Created ${event.payload.ref_type} ${event.payload.ref}`,
          url: `/${params.user}/${params.repo}/tree/${event.payload.ref}`
        }
      case 'DeleteEvent':
        return {
          ...baseActivity,
          type: 'commit' as ActivityType,
          title: `Deleted ${event.payload.ref_type}`,
          status: 'failure' as ActivityStatus,
          details: `Deleted ${event.payload.ref_type} ${event.payload.ref}`,
          url: `/${params.user}/${params.repo}`
        }
      case 'WatchEvent':
        return {
          ...baseActivity,
          type: 'commit' as ActivityType,
          title: 'Starred repository',
          status: 'success' as ActivityStatus,
          details: 'Repository was starred',
          url: `/${params.user}/${params.repo}`
        }
      case 'ForkEvent':
        return {
          ...baseActivity,
          type: 'commit' as ActivityType,
          title: 'Forked repository',
          status: 'success' as ActivityStatus,
          details: 'Repository was forked',
          url: `/${params.user}/${params.repo}`
        }
      default:
        return {
          ...baseActivity,
          type: 'commit' as ActivityType,
          title: event.type || 'Repository activity',
          status: 'success' as ActivityStatus,
          details: 'Repository activity occurred',
          url: `/${params.user}/${params.repo}`
        }
    }
  }).slice(0, 10) || [] // Show only the 10 most recent activities

  // Simple line chart component - move to a separate file if reused
  const SimpleLineChart = <T extends string>({ 
    data, 
    dataKey,
    color = '#3b82f6',
    height = 300 
  }: { 
    data: Record<string, string | number>[]; 
    dataKey: T;
    color?: string;
    height?: number;
  }) => (
    <div className="relative h-[300px] w-full">
      <div className="absolute inset-0 flex items-end" aria-hidden="true">
        <div className="h-full w-full rounded-md bg-muted/30" />
      </div>
      <div className="relative flex h-full items-end justify-between">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col items-center">
            <div 
              className="w-2 rounded-t" 
              style={{ 
                height: `${(Number(item[dataKey]) / Math.max(...data.map(d => Number(d[dataKey]))) * 100)}%`,
                backgroundColor: color
              }}
            />
            <span className="mt-1 text-xs text-muted-foreground">
              {item.date || item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="container py-4">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Insights</h1>
        </div>
        
        {/* Recent Activity Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {eventsLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-border/50 pb-4">
                    <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ActivityList>
              {recentActivity.map((activity) => (
                <ActivityListItem key={activity.id} {...activity} />
              ))}
            </ActivityList>
          )}
        </div>

        <Tabs defaultValue="pulse" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="pulse">Pulse</TabsTrigger>
            <TabsTrigger value="contributors">Contributors</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="commits">Commits</TabsTrigger>
          </TabsList>

          <TabsContent value="pulse" className="mt-6">
            <Card className="bg-black/70 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitGraphIcon className="h-5 w-5 text-primary" />
                  Repository Pulse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Activity Overview</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                        <span>Recent events</span>
                        <span className="font-medium">{events?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                        <span>Push events</span>
                        <span className="font-medium">{events?.filter(e => e.type === 'PushEvent').length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                        <span>Pull request events</span>
                        <span className="font-medium">{events?.filter(e => e.type === 'PullRequestEvent').length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                        <span>Issue events</span>
                        <span className="font-medium">{events?.filter(e => e.type === 'IssuesEvent').length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Contribution Activity</h3>
                    <div className="h-[250px]">
                      <ContributorsChart data={contributorsData} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contributors" className="mt-6">
            <Card className="bg-black/70 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-primary" />
                  Contributors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-4 font-medium">Contributor</th>
                          <th className="text-left py-3 px-4 font-medium">Commits</th>
                          <th className="text-left py-3 px-4 font-medium">Additions</th>
                          <th className="text-left py-3 px-4 font-medium">Deletions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topContributors.map((contributor, index) => (
                          <tr key={index} className="border-b border-border/50 last:border-0">
                            <td className="py-3 px-4">
                              <a href={`/${contributor.name}`} className="text-blue-400 hover:underline">
                                {contributor.name}
                              </a>
                            </td>
                            <td className="py-3 px-4">{contributor.commits}</td>
                            <td className="py-3 px-4 text-green-400">+{contributor.additions}</td>
                            <td className="py-3 px-4 text-red-400">-{contributor.deletions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Contribution Timeline</h3>
                    <div className="h-[250px]">
                      <ContributorsChart data={contributorsData} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traffic" className="mt-6">
            <Card className="bg-black/70 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CodeIcon className="h-5 w-5 text-primary" />
                  Traffic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Traffic data requires repository access permissions
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commits" className="mt-6">
            <Card className="bg-black/70 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommitIcon className="h-5 w-5 text-primary" />
                  Commits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <CommitsChart data={commitsData} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
