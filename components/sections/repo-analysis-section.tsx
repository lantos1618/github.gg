import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileIcon, FolderIcon, CodeIcon, GitBranchIcon, UsersIcon, ClockIcon, SparklesIcon } from "lucide-react"
import RepoAdSection from "@/components/advertising/repo-ad-section"

export default function RepoAnalysisSection() {
  return (
    <section className="py-16 bg-black/60 backdrop-blur-sm border-y border-border/40">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-10">
          <Badge className="mb-4" variant="outline">
            Repository Analysis
          </Badge>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">Understand Any Codebase Instantly</h2>
          <p className="text-lg text-muted-foreground max-w-[700px] mx-auto">
            Get AI-powered insights into any GitHub repository with just a domain change.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-[1200px] mx-auto">
          {/* Main content - 3/4 width on desktop */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0">
                <Card className="bg-black/70 border-border/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranchIcon className="h-5 w-5 text-primary" />
                      Repository Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="w-full md:w-2/3">
                          <h3 className="text-xl font-semibold mb-3">Next.js</h3>
                          <p className="text-muted-foreground mb-4">
                            Next.js is a React framework that enables server-side rendering, static site generation, and
                            more. It provides a great developer experience with features like file-system routing, API
                            routes, and built-in CSS support.
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <UsersIcon className="h-4 w-4 text-primary" />
                              <span className="text-sm">2.4k contributors</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4 text-primary" />
                              <span className="text-sm">3.2k files</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-4 w-4 text-primary" />
                              <span className="text-sm">Last updated 2d ago</span>
                            </div>
                          </div>

                          <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                            <h4 className="text-sm font-medium mb-2">Key Features</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Server-side rendering and static site generation</li>
                              <li>• File-system based routing</li>
                              <li>• API routes</li>
                              <li>• Built-in CSS and Sass support</li>
                              <li>• Fast refresh for development</li>
                            </ul>
                          </div>
                        </div>

                        <div className="w-full md:w-1/3">
                          <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50 h-full">
                            <h4 className="text-sm font-medium mb-3">Language Breakdown</h4>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>TypeScript</span>
                                  <span>68%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "68%" }}></div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>JavaScript</span>
                                  <span>24%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: "24%" }}></div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>CSS</span>
                                  <span>5%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-500 rounded-full" style={{ width: "5%" }}></div>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Other</span>
                                  <span>3%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-gray-500 rounded-full" style={{ width: "3%" }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                        <h4 className="text-sm font-medium mb-3">AI Summary</h4>
                        <p className="text-sm text-muted-foreground">
                          Next.js is a production-ready React framework focused on developer experience and performance.
                          It simplifies the creation of React applications by providing built-in features like routing,
                          API handling, and various rendering strategies. The codebase is well-structured with clear
                          separation of concerns, making it accessible for contributors. The project is actively
                          maintained with regular updates and a strong community backing.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="files" className="mt-0">
                <Card className="bg-black/80 border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderIcon className="h-5 w-5 text-primary" />
                      File Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FolderIcon className="h-4 w-4 text-blue-400" />
                        <span className="font-medium">packages</span>
                      </div>

                      <div className="ml-6 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FolderIcon className="h-4 w-4 text-blue-400" />
                            <span className="font-medium">next</span>
                          </div>

                          <div className="ml-6 space-y-2">
                            <div className="flex items-center gap-2">
                              <FolderIcon className="h-4 w-4 text-blue-400" />
                              <span>src</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4 text-gray-400" />
                              <span>package.json</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4 text-gray-400" />
                              <span>tsconfig.json</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <FolderIcon className="h-4 w-4 text-blue-400" />
                            <span>create-next-app</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <FolderIcon className="h-4 w-4 text-blue-400" />
                            <span>font</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                      <h4 className="text-sm font-medium mb-3">AI Analysis</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        The Next.js repository follows a monorepo structure using Turborepo. The main package is in
                        packages/next, which contains the core framework code. Other packages include tools like
                        create-next-app for project scaffolding and specialized packages for features like font
                        optimization.
                      </p>
                      <p className="text-sm text-muted-foreground">Key directories in the main package include:</p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>
                          • <span className="text-blue-400">src/server</span>: Server-side rendering logic
                        </li>
                        <li>
                          • <span className="text-blue-400">src/client</span>: Client-side runtime
                        </li>
                        <li>
                          • <span className="text-blue-400">src/build</span>: Build-time optimization
                        </li>
                        <li>
                          • <span className="text-blue-400">src/shared</span>: Shared utilities
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dependencies" className="mt-0">
                <Card className="bg-black/80 border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CodeIcon className="h-5 w-5 text-primary" />
                      Dependencies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                          <h4 className="text-sm font-medium mb-3">Production Dependencies</h4>
                          <ul className="text-sm space-y-2">
                            <li className="flex justify-between">
                              <span className="text-blue-400">react</span>
                              <span className="text-gray-400">^18.2.0</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-blue-400">react-dom</span>
                              <span className="text-gray-400">^18.2.0</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-blue-400">styled-jsx</span>
                              <span className="text-gray-400">5.1.1</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-blue-400">@opentelemetry/api</span>
                              <span className="text-gray-400">1.4.1</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-blue-400">postcss</span>
                              <span className="text-gray-400">8.4.14</span>
                            </li>
                          </ul>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                          <h4 className="text-sm font-medium mb-3">Development Dependencies</h4>
                          <ul className="text-sm space-y-2">
                            <li className="flex justify-between">
                              <span className="text-purple-400">@types/react</span>
                              <span className="text-gray-400">^18.2.0</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-purple-400">@types/react-dom</span>
                              <span className="text-gray-400">^18.2.0</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-purple-400">typescript</span>
                              <span className="text-gray-400">^5.1.6</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-purple-400">eslint</span>
                              <span className="text-gray-400">8.42.0</span>
                            </li>
                            <li className="flex justify-between">
                              <span className="text-purple-400">jest</span>
                              <span className="text-gray-400">^29.5.0</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                        <h4 className="text-sm font-medium mb-3">AI Dependency Analysis</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Next.js maintains a minimal set of core dependencies, with React being the primary one. The
                          framework uses styled-jsx for CSS-in-JS styling by default, though it supports various styling
                          approaches.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          The project has strong TypeScript support with comprehensive type definitions. Development
                          tooling includes ESLint for code quality and Jest for testing. The dependency management is
                          well-maintained with regular updates to keep dependencies secure and up-to-date.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="mt-0">
                <Card className="bg-black/80 border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-primary" />
                      AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                        <h4 className="text-sm font-medium mb-3">Architecture Overview</h4>
                        <p className="text-sm text-muted-foreground">
                          Next.js follows a hybrid architecture that combines client and server rendering capabilities.
                          The framework is built around a series of compilation steps that transform React components
                          into optimized bundles. The core architecture includes:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-3 space-y-1">
                          <li>• A custom webpack configuration for optimized builds</li>
                          <li>• A server-side rendering engine</li>
                          <li>• A router for handling client-side navigation</li>
                          <li>• A data fetching layer for server components and API routes</li>
                          <li>• Various optimization plugins for images, fonts, and scripts</li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                          <h4 className="text-sm font-medium mb-3">Code Quality</h4>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium">Excellent</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            The codebase maintains high quality with comprehensive tests, consistent coding standards,
                            and thorough documentation. TypeScript is used throughout, providing strong type safety.
                          </p>
                        </div>

                        <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                          <h4 className="text-sm font-medium mb-3">Maintenance Activity</h4>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium">Very Active</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            The repository shows consistent activity with regular commits, prompt issue responses, and
                            frequent releases. The maintainers are actively engaged with the community.
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                        <h4 className="text-sm font-medium mb-3">Key Insights</h4>
                        <ul className="text-sm text-muted-foreground space-y-3">
                          <li className="flex gap-3">
                            <span className="text-yellow-400 font-bold">→</span>
                            <span>
                              The App Router introduced in Next.js 13 represents a significant architectural shift
                              toward React Server Components.
                            </span>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-yellow-400 font-bold">→</span>
                            <span>
                              The codebase shows a strong focus on performance optimization, particularly in areas like
                              image processing and JavaScript bundling.
                            </span>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-yellow-400 font-bold">→</span>
                            <span>
                              Next.js maintains backward compatibility while introducing new features, showing careful
                              consideration for developer experience.
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 1/4 width on desktop */}
          <div className="lg:col-span-1">
            <RepoAdSection />

            <div className="mt-6 bg-black/70 border-border/50 backdrop-blur-sm rounded-lg border p-4">
              <h3 className="text-lg font-medium mb-4">Similar Repositories</h3>
              <div className="space-y-4">
                {[
                  { name: "remix-run/remix", desc: "Full stack React framework" },
                  { name: "sveltejs/kit", desc: "Svelte application framework" },
                  { name: "nuxt/nuxt", desc: "Vue.js framework" },
                ].map((repo, i) => (
                  <div key={i} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <h4 className="font-medium text-sm text-blue-400 mb-1">{repo.name}</h4>
                    <p className="text-xs text-muted-foreground">{repo.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
