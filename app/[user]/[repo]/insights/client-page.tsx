"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitGraphIcon, UsersIcon, CodeIcon, GitCommitIcon, GitPullRequest, AlertCircle, Play } from "lucide-react"
import { ContributorsChart, CommitsChart } from "@/components/insights-charts"
import type { RepoInsightsClientPageProps, ActivityItem, ActivityType, ActivityStatus } from "@/lib/types/insights"
import { ActivityList, ActivityListItem } from "@/components/activity/activity-list-item"
import { formatDistanceToNow } from "date-fns"

export default function RepoInsightsClientPage({
  params,
  contributorsData,
  commitsData,
  topContributors,
}: RepoInsightsClientPageProps) {
  // Mock recent activity data - replace with real data from API
  const recentActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'commit',
      title: 'Refactor insights page components',
      author: {
        name: 'dev1',
        avatarUrl: 'https://github.com/dev1.png',
        url: '/dev1'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      status: 'success',
      details: 'Refactored the insights page to use the new ActivityListItem component',
      url: `/${params.user}/${params.repo}/commit/abc123`
    },
    {
      id: '2',
      type: 'pull-request',
      title: 'Add ActivityListItem component',
      author: {
        name: 'dev2',
        avatarUrl: 'https://github.com/dev2.png',
        url: '/dev2'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
      status: 'open',
      details: 'Created a reusable ActivityListItem component for consistent activity feeds',
      url: `/${params.user}/${params.repo}/pull/42`
    },
    {
      id: '3',
      type: 'issue',
      title: 'Fix type errors in commit details',
      author: {
        name: 'dev3',
        avatarUrl: 'https://github.com/dev3.png',
        url: '/dev3'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      status: 'open',
      details: 'TypeScript errors need to be fixed in the commit details component',
      url: `/${params.user}/${params.repo}/issues/123`
    },
    {
      id: '4',
      type: 'run',
      title: 'CI / Build and Test',
      author: {
        name: 'github-actions',
        avatarUrl: 'https://github.com/actions.png',
        url: 'https://github.com/actions'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      status: 'failure',
      details: 'Tests failed in test-utils.tsx',
      url: `/${params.user}/${params.repo}/actions/runs/12345`
    }
  ]

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
          <ActivityList>
            {recentActivity.map((activity) => (
              <ActivityListItem key={activity.id} {...activity} />
            ))}
          </ActivityList>
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
                        <span>Active pull requests</span>
                        <span className="font-medium">7</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                        <span>Active issues</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                        <span>Merged pull requests</span>
                        <span className="font-medium">23</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                        <span>Closed issues</span>
                        <span className="font-medium">18</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Visitors</h3>
                    <div className="h-[250px]">
                      <SimpleLineChart
                        data={[
                          { date: "6/1", visitors: 45 },
                          { date: "6/2", visitors: 52 },
                          { date: "6/3", visitors: 49 },
                          { date: "6/4", visitors: 63 },
                          { date: "6/5", visitors: 58 },
                          { date: "6/6", visitors: 48 },
                          { date: "6/7", visitors: 42 },
                          { date: "6/8", visitors: 39 },
                          { date: "6/9", visitors: 47 },
                          { date: "6/10", visitors: 54 },
                          { date: "6/11", visitors: 59 },
                          { date: "6/12", visitors: 65 },
                          { date: "6/13", visitors: 72 },
                          { date: "6/14", visitors: 68 },
                        ]}
                        dataKey="visitors"
                        color="#3498db"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Clones</h3>
                    <div className="h-[250px]">
                      <SimpleLineChart
                        data={[
                          { date: "6/1", clones: 12 },
                          { date: "6/2", clones: 15 },
                          { date: "6/3", clones: 10 },
                          { date: "6/4", clones: 18 },
                          { date: "6/5", clones: 14 },
                          { date: "6/6", clones: 11 },
                          { date: "6/7", clones: 9 },
                          { date: "6/8", clones: 8 },
                          { date: "6/9", clones: 13 },
                          { date: "6/10", clones: 16 },
                          { date: "6/11", clones: 19 },
                          { date: "6/12", clones: 21 },
                          { date: "6/13", clones: 17 },
                          { date: "6/14", clones: 14 },
                        ]}
                        dataKey="clones"
                        color="#e74c3c"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Popular Content</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-4 font-medium">Content</th>
                          <th className="text-left py-3 px-4 font-medium">Views</th>
                          <th className="text-left py-3 px-4 font-medium">Unique visitors</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4">README.md</td>
                          <td className="py-3 px-4">342</td>
                          <td className="py-3 px-4">187</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4">src/index.ts</td>
                          <td className="py-3 px-4">256</td>
                          <td className="py-3 px-4">143</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4">docs/API.md</td>
                          <td className="py-3 px-4">198</td>
                          <td className="py-3 px-4">112</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4">package.json</td>
                          <td className="py-3 px-4">165</td>
                          <td className="py-3 px-4">94</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Commit Frequency</h3>
                    <div className="h-[250px]">
                      <CommitsChart data={commitsData} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Recent Commits</h3>
                    <div className="space-y-4">
                      {[
                        {
                          sha: "abc1234",
                          message: "Update dependencies",
                          author: "developer1",
                          date: "2023-06-01T10:00:00Z",
                        },
                        {
                          sha: "def5678",
                          message: "Fix bug in authentication flow",
                          author: "developer2",
                          date: "2023-05-30T14:00:00Z",
                        },
                        {
                          sha: "ghi9012",
                          message: "Add new API endpoints for user management",
                          author: "developer3",
                          date: "2023-05-28T09:00:00Z",
                        },
                        {
                          sha: "jkl3456",
                          message: "Improve error handling in data processing pipeline",
                          author: "developer1",
                          date: "2023-05-25T16:00:00Z",
                        },
                        {
                          sha: "mno7890",
                          message: "Update documentation for new features",
                          author: "developer4",
                          date: "2023-05-22T11:00:00Z",
                        },
                      ].map((commit, index) => (
                        <div key={index} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <GitCommitIcon className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <a
                                href={`/${params.user}/${params.repo}/commit/${commit.sha}`}
                                className="font-medium hover:text-blue-400 transition-colors"
                              >
                                {commit.message}
                              </a>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-sm text-muted-foreground">
                                <span>{commit.sha.substring(0, 7)}</span>
                                <span>
                                  by{" "}
                                  <a href={`/${commit.author}`} className="hover:text-blue-400 transition-colors">
                                    {commit.author}
                                  </a>
                                </span>
                                <span>{new Date(commit.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
