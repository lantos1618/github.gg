import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GitCommitIcon, UserIcon, CalendarIcon, FileIcon, PlusIcon, MinusIcon } from "lucide-react"

interface RepoCompareProps {
  username: string
  reponame: string
  base: string
  head: string
  repoData: any
  compareData: any
}

export default function RepoCompare({ username, reponame, base, head, repoData, compareData }: RepoCompareProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/${username}/${reponame}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to repository
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Comparing changes</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              Create Pull Request
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Base:</span>
          <span className="bg-gray-800 px-2 py-1 rounded">{base}</span>
          <span className="mx-2">...</span>
          <span className="font-medium">Compare:</span>
          <span className="bg-gray-800 px-2 py-1 rounded">{head}</span>
        </div>
      </div>

      <Card className="bg-black/70 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Commits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {compareData.commits.map((commit: any, index: number) => (
              <div key={index} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <GitCommitIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/${username}/${reponame}/commit/${commit.sha}`}
                      className="font-medium hover:text-blue-400 transition-colors"
                    >
                      {commit.message.split("\n")[0]}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5" />
                        {commit.author.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Committed on {new Date(commit.author.date).toLocaleDateString()}
                      </span>
                      <span>{commit.sha.substring(0, 7)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/70 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Files Changed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {compareData.files.map((file: any, index: number) => (
              <div key={index} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-blue-400" />
                    <Link
                      href={`/${username}/${reponame}/blob/${head}/${file.filename}`}
                      className="text-blue-400 hover:underline"
                    >
                      {file.filename}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex items-center gap-1 text-green-400">
                      <PlusIcon className="h-3.5 w-3.5" />
                      {file.additions}
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <MinusIcon className="h-3.5 w-3.5" />
                      {file.deletions}
                    </span>
                  </div>
                </div>
                {file.patch && (
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-border/50 text-xs font-mono whitespace-pre overflow-x-auto">
                    {file.patch}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/70 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">AI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground">
              This comparison shows changes between {base} and {head}. There are {compareData.commits.length} commits
              with {compareData.files.length} files changed, including{" "}
              {compareData.files.reduce((sum: number, file: any) => sum + file.additions, 0)} additions and{" "}
              {compareData.files.reduce((sum: number, file: any) => sum + file.deletions, 0)} deletions. The changes
              appear to focus on {compareData.files[0]?.filename.split("/")[0] || "various"} components of the codebase.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
