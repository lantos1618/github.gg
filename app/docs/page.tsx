import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = {
  title: "GitHub.GG Documentation",
  description: "Documentation for GitHub.GG - A powerful tool for analyzing GitHub repositories",
}

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-black">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-black/20 px-3 py-1 text-sm text-green-500">
                  Documentation
                </div>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  GitHub.GG
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
                  A powerful tool for analyzing GitHub repositories and providing valuable insights about code quality,
                  dependencies, and more.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-black/90">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1 text-sm text-green-500">
                  <span className="font-medium">How to Use</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Simple and Straightforward</h2>
                <p className="text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Simply visit any GitHub repository using our domain:
                </p>
                <div className="rounded-lg bg-gray-900 p-4">
                  <code className="text-sm text-green-400">https://github.gg/owner/repository</code>
                </div>
                <p className="text-gray-400">For example:</p>
                <div className="rounded-lg bg-gray-900 p-4">
                  <code className="text-sm text-green-400">https://github.gg/lantos1618/inkwell_test</code>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-h-[300px] items-center justify-center rounded-lg border border-gray-800 p-4">
                <div className="flex h-[200px] w-[200px] items-center justify-center rounded-full bg-gray-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100"
                    height="100"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-500"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold">Instant Analysis</h3>
                  <p className="text-sm text-gray-400">Get immediate insights into any GitHub repository</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-black">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl gap-6">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Features</h2>
                <p className="text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  GitHub.GG provides a comprehensive set of features to help you understand and analyze repositories.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 text-green-500"
                        >
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <path d="M12 18v-6" />
                          <path d="m9 15 3 3 3-3" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Code Visualization</h3>
                        <p className="text-gray-400">
                          Visualize code structure and dependencies with interactive diagrams.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 text-green-500"
                        >
                          <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
                          <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                          <path d="M12 2v2" />
                          <path d="M12 22v-2" />
                          <path d="m17 20.66-1-1.73" />
                          <path d="M11 10.27 7 3.34" />
                          <path d="m20.66 17-1.73-1" />
                          <path d="m3.34 7 1.73 1" />
                          <path d="M14 12h8" />
                          <path d="M2 12h2" />
                          <path d="m20.66 7-1.73 1" />
                          <path d="m3.34 17 1.73-1" />
                          <path d="m17 3.34-1 1.73" />
                          <path d="m7 20.66 1-1.73" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Dependency Analysis</h3>
                        <p className="text-gray-400">
                          Identify and analyze dependencies to understand project structure.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 text-green-500"
                        >
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Code Quality Metrics</h3>
                        <p className="text-gray-400">
                          Evaluate code quality with metrics like complexity and maintainability.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 text-green-500"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Security Scanning</h3>
                        <p className="text-gray-400">Identify potential security vulnerabilities in the codebase.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 text-green-500"
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M7 7h10" />
                          <path d="M7 12h10" />
                          <path d="M7 17h10" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Commit History</h3>
                        <p className="text-gray-400">Analyze commit patterns and contributor activity over time.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 text-green-500"
                        >
                          <path d="M2 9a3 3 0 0 1 0 6v-6Z" />
                          <path d="M14 9v6" />
                          <path d="M8 9v6" />
                          <path d="M22 9v6" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">Performance Insights</h3>
                        <p className="text-gray-400">
                          Get insights into code performance and optimization opportunities.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-black/90">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Ready to try GitHub.GG?</h2>
                <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
                  Start analyzing your repositories today and gain valuable insights.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                  <Link href="https://github.gg">Try GitHub.GG</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/docs/getting-started">Read Documentation</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-black">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Contact Us</h2>
              <p className="text-gray-400 md:text-xl">For feature requests, issues, or other questions, contact us:</p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="https://github.com/lantos1618"
                  className="flex items-center space-x-2 text-green-500 hover:text-green-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  <span>@lantos1618</span>
                </Link>
                <Link
                  href="https://github.com/nisten"
                  className="flex items-center space-x-2 text-green-500 hover:text-green-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  <span>@nisten</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
