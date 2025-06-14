import Link from "next/link"
import { StarIcon, GitForkIcon, EyeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CopyAllCodeButton } from "@/components/repo/copy-all-code-button"

interface RepoHeaderProps {
  username: string
  reponame: string
  repoData: any
}

export default function RepoHeader({ username, reponame, repoData }: RepoHeaderProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Link href={`/${username}/${reponame}`} className="text-lg font-semibold hover:underline" prefetch={true}>
                {reponame}
              </Link>
              <Badge variant="outline" className="ml-2">
                Public
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground max-w-2xl">
              {repoData.description || "No description provided."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CopyAllCodeButton 
              owner={username} 
              repo={reponame} 
              branch={repoData.default_branch}
              className="mr-2"
            />
            <div className="flex items-center gap-1 text-sm">
              <Button variant="outline" size="sm" className="gap-1">
                <StarIcon className="h-4 w-4" />
                Star
                <Badge variant="secondary" className="ml-1">
                  {repoData.stargazers_count.toLocaleString()}
                </Badge>
              </Button>
            </div>

            <div className="flex items-center gap-1 text-sm">
              <Button variant="outline" size="sm" className="gap-1">
                <GitForkIcon className="h-4 w-4" />
                Fork
                <Badge variant="secondary" className="ml-1">
                  {repoData.forks_count.toLocaleString()}
                </Badge>
              </Button>
            </div>

            <div className="flex items-center gap-1 text-sm">
              <Button variant="outline" size="sm" className="gap-1">
                <EyeIcon className="h-4 w-4" />
                Watch
                <Badge variant="secondary" className="ml-1">
                  {repoData.watchers_count.toLocaleString()}
                </Badge>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
