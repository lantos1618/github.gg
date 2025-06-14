"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2Icon, FolderIcon, FileIcon, ClockIcon, CodeIcon, LockIcon, GithubIcon } from "lucide-react"
import { trpc } from "@/lib/trpc/trpc"
import type { RouterOutputs } from "@/lib/trpc/trpc"

type RepoAnalysisResult = {
  fileCount: number
  directoryCount: number
  analysisTimeMs: number
  languages: Record<string, number>
  readme?: string
}

interface RepoAnalysisResultsProps {
  owner: string
  repo: string
}

type AnalysisResult = RepoAnalysisResult & { authenticated?: boolean }

export default function RepoAnalysisResults({ owner, repo }: RepoAnalysisResultsProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  
  const analyzeMutation = trpc.github.analyzeRepo.useMutation({
    onSuccess: (data: AnalysisResult) => {
      setAnalysis(data)
      setError(null)
      setNeedsAuth(false)
    },
    onError: (error: any) => {
      if (error.data?.code === 'UNAUTHORIZED') {
        setNeedsAuth(true)
        setError("Authentication required to access this repository")
      } else if (error.data?.code === 'TOO_MANY_REQUESTS') {
        setError(`Rate limit exceeded. Please try again later.`)
      } else {
        setError(error.message || "An error occurred while analyzing the repository")
      }
    },
  })

  const analyzeRepo = () => {
    analyzeMutation.mutate({ owner, repo })
  }
  
  const isLoading = analyzeMutation.isPending
  const isAuthenticated = analyzeMutation.data?.authenticated ?? null

  // Helper function to format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Helper function to get top languages
  const getTopLanguages = () => {
    if (!analysis?.languages) return []

    const languages = analysis.languages as Record<string, number>
    const totalSize = getTotalSize()

    return Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, size]) => ({
        language: lang,
        size,
        percentage: ((size / totalSize) * 100).toFixed(1),
      }))
  }

  const getTotalSize = (): number => {
    if (!analysis?.languages) return 0
    const languages = analysis.languages as Record<string, number>
    return Object.values(languages).reduce((sum: number, size: number) => sum + size, 0)
  }

  return (
    <Card className="bg-black/70 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CodeIcon className="h-5 w-5 text-primary" />
          Repository Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!analysis && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Analyze this repository to get detailed insights about its structure, languages, and content.
              {!isAuthenticated && isAuthenticated !== null && (
                <span className="block mt-2 text-sm">
                  You're using GitHub.GG as a guest.{" "}
                  <a href="/api/auth/login" className="text-primary hover:underline">
                    Sign in
                  </a>{" "}
                  for higher rate limits and access to private repositories.
                </span>
              )}
            </p>
            <Button onClick={analyzeRepo}>Analyze Repository</Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <Loader2Icon className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing repository structure...</p>
          </div>
        )}

        {needsAuth && (
          <div className="text-center py-8 bg-gray-900/50 rounded-lg border border-border/50">
            <LockIcon className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg font-medium mb-2">Private Repository</p>
            <p className="text-muted-foreground mb-6">
              This appears to be a private repository. Sign in with GitHub to access it.
            </p>
            <Button asChild>
              <a href="/api/auth/login" className="flex items-center gap-2">
                <GithubIcon className="h-4 w-4" />
                Sign in with GitHub
              </a>
            </Button>
          </div>
        )}

        {error && !needsAuth && (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={analyzeRepo} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50 flex flex-col items-center">
                <FileIcon className="h-8 w-8 text-blue-400 mb-2" />
                <span className="text-2xl font-bold">{analysis.fileCount}</span>
                <span className="text-sm text-muted-foreground">Files</span>
              </div>

              <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50 flex flex-col items-center">
                <FolderIcon className="h-8 w-8 text-yellow-400 mb-2" />
                <span className="text-2xl font-bold">{analysis.directoryCount}</span>
                <span className="text-sm text-muted-foreground">Directories</span>
              </div>

              <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50 flex flex-col items-center">
                <ClockIcon className="h-8 w-8 text-green-400 mb-2" />
                <span className="text-2xl font-bold">{(analysis.analysisTimeMs / 1000).toFixed(2)}s</span>
                <span className="text-sm text-muted-foreground">Clone Time</span>
              </div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
              <h3 className="text-lg font-medium mb-3">Top Languages</h3>
              <div className="space-y-3">
                {getTopLanguages().map(({ language, size, percentage }: { language: string; size: number; percentage: string }) => (
                  <div key={language}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language}</span>
                      <span>
                        {formatSize(size)} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {analysis.readme && (
              <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                <h3 className="text-lg font-medium mb-3">README Preview</h3>
                <div className="max-h-[200px] overflow-y-auto text-sm text-muted-foreground">
                  {analysis.readme
                    .split("\n")
                    .slice(0, 10)
                    .map((line: string, i: number) => (
                      <p key={i}>{line}</p>
                    ))}
                  {analysis.readme.split("\n").length > 10 && <p className="text-primary mt-2">... (truncated)</p>}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
              <div className="text-sm text-muted-foreground">
                {!isAuthenticated && (
                  <span>
                    Guest mode • {rateLimit ? `${rateLimit.remaining} requests remaining` : "Limited access"} •{" "}
                    <a href="/api/auth/login" className="text-primary hover:underline">
                      Sign in for more
                    </a>
                  </span>
                )}
                {isAuthenticated && <span>Authenticated • Full access</span>}
              </div>
              <Button onClick={analyzeRepo} variant="outline" size="sm">
                Refresh Analysis
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
