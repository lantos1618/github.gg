"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CircleIcon,
  GitPullRequestIcon,
  PlayIcon,
  ShieldIcon,
  GitGraphIcon as GraphIcon,
  GemIcon as GearIcon,
  SigmaIcon,
  GitBranchIcon,
} from "lucide-react"

interface RepoNavigationProps {
  username: string
  reponame: string
  repoData: any
}

export default function RepoNavigation({ username, reponame, repoData }: RepoNavigationProps) {
  const pathname = usePathname()
  const basePath = `/${username}/${reponame}`
  const sigmaPath = `${basePath}/sigma`

  const isActive = (path: string) => {
    if (path === sigmaPath) {
      return (
        pathname === basePath ||
        pathname === sigmaPath ||
        pathname.startsWith(`${basePath}/tree`) ||
        pathname.startsWith(`${basePath}/blob`)
      )
    }
    return pathname.startsWith(path)
  }

  const navItems = [
    {
      name: "Code",
      path: sigmaPath,
      icon: <SigmaIcon className="h-4 w-4" />,
    },
    {
      name: "Diagram",
      path: `${basePath}/diagram`,
      icon: <GitBranchIcon className="h-4 w-4" />,
    },
    {
      name: "Issues",
      path: `${basePath}/issues`,
      icon: <CircleIcon className="h-4 w-4" />,
    },
    {
      name: "Pull Requests",
      path: `${basePath}/pulls`,
      icon: <GitPullRequestIcon className="h-4 w-4" />,
    },
    {
      name: "Actions",
      path: `${basePath}/actions`,
      icon: <PlayIcon className="h-4 w-4" />,
    },
    {
      name: "Security",
      path: `${basePath}/security`,
      icon: <ShieldIcon className="h-4 w-4" />,
    },
    {
      name: "Insights",
      path: `${basePath}/insights`,
      icon: <GraphIcon className="h-4 w-4" />,
    },
    {
      name: "Settings",
      path: `${basePath}/settings`,
      icon: <GearIcon className="h-4 w-4" />,
    },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container">
        <div className="flex items-center overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 ${
                isActive(item.path)
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              }`}
              prefetch={true}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
