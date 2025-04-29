import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircleIcon, ClockIcon } from "lucide-react"

interface RepoIssueDetailProps {
  username: string
  reponame: string
  issueId: string
  repoData: any
  issueData: any
}

export default function RepoIssueDetail({ username, reponame, issueId, repoData, issueData }: RepoIssueDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/${username}/${reponame}/issues`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to issues
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span>{issueData.title}</span>
            <span className="text-muted-foreground">#{issueId}</span>
          </h1>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`${
                issueData.state === "open"
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-purple-500/10 text-purple-400 border-purple-500/30"
              }`}
            >
              {issueData.state === "open" ? "Open" : "Closed"}
            </Badge>
            <Button variant="outline">Edit</Button>
          </div>
        </div>

        <div className="flex items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            Opened {new Date(issueData.created_at).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircleIcon className="h-3.5 w-3.5" />
            {issueData.comments} comments
          </span>
          <span>
            by{" "}
            <Link href={`/${issueData.user.login}`} className="hover:text-blue-400 transition-colors">
              {issueData.user.login}
            </Link>
          </span>
        </div>
      </div>

      <Card className="bg-black/70 border-border/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={issueData.user.avatar_url || "/placeholder.svg"}
                  alt={issueData.user.login}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
                <div className="prose prose-invert max-w-none">
                  <p>{issueData.body}</p>
                </div>
              </div>
            </div>
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
              This issue appears to be discussing a feature request or bug report related to the repository. Based on
              the content, it seems to be {issueData.state === "open" ? "still under discussion" : "resolved"}. The
              issue was opened by {issueData.user.login} and has received {issueData.comments} comments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Comments section would go here in a real implementation */}
      <Card className="bg-black/70 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Add a comment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50 h-32 flex items-center justify-center">
            <span className="text-muted-foreground">Comment form would go here</span>
          </div>
          <div className="mt-4 flex justify-end">
            <Button>Comment</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
