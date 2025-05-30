import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitGraphIcon, UsersIcon, CodeIcon, GitCommitIcon } from "lucide-react"
import { getRepoData } from "@/lib/github"

export async function generateMetadata({ params }: { params: { user: string; repo: string } }): Promise<Metadata> {
  return {
    title: `Insights · ${params.user}/${params.repo} - GitHub.GG`,
    description: `Analytics and insights for ${params.user}/${params.repo}`,
  }
}

export default async function RepoInsightsPage({ params }: { params: { user: string; repo: string } }) {
  const repoData = await getRepoData(params.user, params.repo)

  // Mock insights data
  const contributorsData = [
    { name: "Jan", contributions: 45 },
    { name: "Feb", contributions: 32 },
    { name: "Mar", contributions: 67 },
    { name: "Apr", contributions: 89 },
    { name: "May", contributions: 54 },
    { name: "Jun", contributions: 78 },
    { name: "Jul", contributions: 92 },
    { name: "Aug", contributions: 63 },
    { name: "Sep", contributions: 71 },
    { name: "Oct", contributions: 84 },
    { name: "Nov", contributions: 52 },
    { name: "Dec", contributions: 33 },
  ]

  const commitsData = [
    { name: "Jan", commits: 120 },
    { name: "Feb", commits: 98 },
    { name: "Mar", commits: 143 },
    { name: "Apr", commits: 165 },
    { name: "May", commits: 127 },
    { name: "Jun", commits: 150 },
    { name: "Jul", commits: 180 },
    { name: "Aug", commits: 134 },
    { name: "Sep", commits: 162 },
    { name: "Oct", commits: 187 },
    { name: "Nov", commits: 110 },
    { name: "Dec", commits: 85 },
  ]

  const topContributors = [
    { name: "developer1", commits: 342, additions: 15420, deletions: 8753 },
    { name: "developer2", commits: 217, additions: 9876, deletions: 5432 },
    { name: "developer3", commits: 184, additions: 7654, deletions: 3210 },
    { name: "developer4", commits: 156, additions: 6543, deletions: 2987 },
    { name: "developer5", commits: 123, additions: 5432, deletions: 1876 },
  ]

  return (
    <div className="container py-4">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Insights</h1>
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
                      {/* Client-side only chart component */}
                      <div className="w-full h-full bg-gray-800/30 rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Chart loads on client side</p>
                      </div>
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
                      {/* Client-side only chart component */}
                      <div className="w-full h-full bg-gray-800/30 rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Chart loads on client side</p>
                      </div>
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
                      {/* Client-side only chart component */}
                      <div className="w-full h-full bg-gray-800/30 rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Chart loads on client side</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Clones</h3>
                    <div className="h-[250px]">
                      {/* Client-side only chart component */}
                      <div className="w-full h-full bg-gray-800/30 rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Chart loads on client side</p>
                      </div>
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
                      {/* Client-side only chart component */}
                      <div className="w-full h-full bg-gray-800/30 rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Chart loads on client side</p>
                      </div>
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
