'use client';

import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
import { GitPullRequest, ExternalLink, Clock, FileCode } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ResourceListView } from '@/components/analysis/ResourceListView';

interface PRListClientViewProps {
  user: string;
  repo: string;
}

interface PR {
  number: number;
  title: string;
  user: string;
  state: string;
  draft: boolean;
  updatedAt: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  labels: string[];
}

export default function PRListClientView({ user, repo }: PRListClientViewProps) {
  return (
    <ResourceListView<PR>
      user={user}
      repo={repo}
      useQuery={trpc.githubAnalysis.getRepoPRs.useQuery}
      title="Pull Requests"
      icon={GitPullRequest}
      searchPlaceholder="Search PRs..."
      itemKey={(pr) => pr.number}
      filterItem={(pr, search) => {
        const searchLower = search.toLowerCase();
        return (
          pr.title.toLowerCase().includes(searchLower) ||
          pr.user.toLowerCase().includes(searchLower) ||
          pr.number.toString().includes(search)
        );
      }}
      renderItem={(pr, user, repo) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-muted-foreground">#{pr.number}</span>
              <Link href={`/${user}/${repo}/pulls/${pr.number}`}>
                <h3 className="font-semibold truncate hover:underline">{pr.title}</h3>
              </Link>
              {pr.draft && (
                <Badge variant="outline" className="text-xs">Draft</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <GitPullRequest className="h-3 w-3" />
                {pr.user}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <FileCode className="h-3 w-3" />
                {pr.changedFiles} file{pr.changedFiles !== 1 ? 's' : ''}
              </span>
              <span className="text-green-600">+{pr.additions}</span>
              <span className="text-red-600">-{pr.deletions}</span>
            </div>
            {pr.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {pr.labels.map((label: string) => (
                  <Badge key={label} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pr.state === 'open' ? 'default' : 'secondary'}>
              {pr.state}
            </Badge>
            <a
              href={`https://github.com/${user}/${repo}/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
      emptyStateMessage="No pull requests found."
      noResultsMessage="No pull requests found matching your search."
    />
  );
}
