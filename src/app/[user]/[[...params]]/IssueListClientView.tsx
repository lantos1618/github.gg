'use client';

import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
import { CircleDot, ExternalLink, Clock, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ResourceListView } from '@/components/analysis/ResourceListView';

interface IssueListClientViewProps {
  user: string;
  repo: string;
}

interface Issue {
  number: number;
  title: string;
  user: string;
  state: string;
  updatedAt: string;
  comments: number;
  labels: string[];
}

export default function IssueListClientView({ user, repo }: IssueListClientViewProps) {
  return (
    <ResourceListView<Issue>
      user={user}
      repo={repo}
      useQuery={trpc.githubAnalysis.getRepoIssues.useQuery}
      title="Issues"
      icon={CircleDot}
      searchPlaceholder="Search issues..."
      itemKey={(issue) => issue.number}
      filterItem={(issue, search) => {
        const searchLower = search.toLowerCase();
        return (
          issue.title.toLowerCase().includes(searchLower) ||
          issue.user.toLowerCase().includes(searchLower) ||
          issue.number.toString().includes(search)
        );
      }}
      renderItem={(issue, user, repo) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-muted-foreground">#{issue.number}</span>
              <Link href={`/${user}/${repo}/issues/${issue.number}`}>
                <h3 className="font-semibold truncate hover:underline">{issue.title}</h3>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CircleDot className="h-3 w-3" />
                {issue.user}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
              </span>
              {issue.comments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {issue.comments}
                </span>
              )}
            </div>
            {issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {issue.labels.map((label) => (
                  <Badge key={label} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={issue.state === 'open' ? 'default' : 'secondary'}>
              {issue.state}
            </Badge>
            <a
              href={`https://github.com/${user}/${repo}/issues/${issue.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
      emptyStateMessage="No issues found."
      noResultsMessage="No issues found matching your search."
    />
  );
}
