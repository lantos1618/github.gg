'use client';

import { trpc } from '@/lib/trpc/client';
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
        const s = search.toLowerCase();
        return pr.title.toLowerCase().includes(s) || pr.user.toLowerCase().includes(s) || pr.number.toString().includes(search);
      }}
      renderItem={(pr, user, repo) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[13px] text-[#aaa]">#{pr.number}</span>
              <Link href={`/${user}/${repo}/pulls/${pr.number}`}>
                <h3 className="text-[14px] font-medium text-[#111] hover:text-[#666] transition-colors truncate">{pr.title}</h3>
              </Link>
              {pr.draft && (
                <span className="text-[11px] text-[#aaa] font-semibold uppercase tracking-[0.5px]">Draft</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#888]">
              <span className="flex items-center gap-1"><GitPullRequest className="h-3 w-3" />{pr.user}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}</span>
              <span className="flex items-center gap-1"><FileCode className="h-3 w-3" />{pr.changedFiles} files</span>
              <span className="text-[#34a853]">+{pr.additions}</span>
              <span className="text-[#ea4335]">-{pr.deletions}</span>
            </div>
            {pr.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {pr.labels.map((label: string) => (
                  <span key={label} className="px-2 py-0.5 bg-[#f8f9fa] text-[12px] text-[#888] border border-[#eee] rounded">{label}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[12px] font-semibold uppercase tracking-[0.5px] ${pr.state === 'open' ? 'text-[#34a853]' : 'text-[#888]'}`}>
              {pr.state}
            </span>
            <a href={`https://github.com/${user}/${repo}/pull/${pr.number}`} target="_blank" rel="noopener noreferrer" className="text-[#ccc] hover:text-[#111] transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
      emptyStateMessage="No pull requests found."
      noResultsMessage="No pull requests found matching your search."
    />
  );
}
