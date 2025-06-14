import { GitCommit, GitPullRequest, AlertCircle, Play } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import type { ActivityType, ActivityStatus } from "@/lib/types/insights"

export interface ActivityListItemProps {
  id: string
  type: ActivityType
  title: string
  author: {
    name: string
    avatarUrl?: string
    url: string
  }
  timestamp: Date
  status?: ActivityStatus
  details?: string
  url: string
  metadata?: Record<string, unknown>
}

const typeIcons = {
  commit: GitCommit,
  "pull-request": GitPullRequest,
  issue: AlertCircle,
  run: Play,
}

const statusVariants = {
  success: {
    variant: "default" as const,
    label: "Success",
  },
  failure: {
    variant: "destructive" as const,
    label: "Failed",
  },
  pending: {
    variant: "outline" as const,
    label: "Pending",
  },
  open: {
    variant: "outline" as const,
    label: "Open",
  },
  closed: {
    variant: "secondary" as const,
    label: "Closed",
  },
  merged: {
    variant: "default" as const,
    label: "Merged",
  },
}

export function ActivityListItem({
  type,
  title,
  author,
  timestamp,
  status,
  details,
  url,
  metadata,
}: ActivityListItemProps) {
  const Icon = typeIcons[type] || GitCommit
  
  return (
    <div className="flex items-start gap-4 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 mt-1">
        <Avatar className="h-8 w-8">
          {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt={author.name} />}
          <AvatarFallback>
            {author.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link 
            href={url}
            className="font-medium text-foreground hover:underline truncate"
            title={title}
          >
            {title}
          </Link>
          {status && statusVariants[status] && (
            <Badge variant={statusVariants[status].variant}>
              {statusVariants[status].label}
            </Badge>
          )}
        </div>
        
        {details && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {details}
          </p>
        )}
        
        <div className="mt-2 flex items-center text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5 mr-1" />
          <span className="capitalize">{type.replace('-', ' ')}</span>
          <span className="mx-1">•</span>
          <Link 
            href={author.url} 
            className="hover:text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {author.name}
          </Link>
          <span className="mx-1">•</span>
          <time dateTime={timestamp.toISOString()}>
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </time>
        </div>
      </div>
    </div>
  )
}

export function ActivityList({ children }: { children: React.ReactNode }) {
  return (
    <div className="border rounded-lg overflow-hidden divide-y divide-border/50">
      {children}
    </div>
  )
}
