import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GitCommitIcon, UserIcon, CalendarIcon, FileIcon, PlusIcon, MinusIcon } from "lucide-react"

interface RepoCommitDetailProps {
  username: string
  reponame: string
  sha: string
  repoData: any
  commitData: any
}

export default function RepoCommitDetail({ username, reponame, sha, repoData, commitData }: RepoCommitDetailProps) {
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
          <h1 className="text-xl font-bold">{commitData.message.split("\n")[0]}</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              Browse Files
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <GitCommitIcon className="h-3.5 w-3.5" />
            Commit {sha.substring(0, 7)}
          </span>
          <span className="flex items-center gap-1">
            <UserIcon className="h-3.5 w-3.5" />
            {commitData.author.name}
          </span>
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            Committed on {new Date(commitData.author.date).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Card className="bg-black/70 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Commit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
              <h3 className="font-medium mb-2">Commit Message</h3>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{commitData.message}</div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
              <h3 className="font-medium mb-2">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                This commit appears to be making changes related to the repository's functionality. The commit was
                authored by {commitData.author.name} and includes modifications to several files. Based on the commit
                message, it seems to be addressing a specific feature or bug fix.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/70 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Changed Files</CardTitle>
        </CardHeader>
        <CardContent>
          {/* This would be populated with actual changed files in a real implementation */}
          <div className="space-y-4">
            <div className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4 text-blue-400" />
                  <Link
                    href={`/${username}/${reponame}/blob/${sha}/src/index.ts`}
                    className="text-blue-400 hover:underline"
                  >
                    src/index.ts
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-green-400">
                    <PlusIcon className="h-3.5 w-3.5" />
                    10
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <MinusIcon className="h-3.5 w-3.5" />5
                  </span>
                </div>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-border/50 text-xs font-mono whitespace-pre overflow-x-auto">
                {`@@ -1,5 +1,10 @@
// Mock diff patch`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
