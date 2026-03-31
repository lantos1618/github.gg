'use client';

import { trpc } from '@/lib/trpc/client';
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
        const s = search.toLowerCase();
        return issue.title.toLowerCase().includes(s) || issue.user.toLowerCase().includes(s) || issue.number.toString().includes(search);
      }}
      renderItem={(issue, user, repo) => (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-base text-[#aaa]">#{issue.number}</span>
              <Link href={`/${user}/${repo}/issues/${issue.number}`}>
                <h3 className="text-base font-medium text-[#111] hover:text-[#666] transition-colors truncate">{issue.title}</h3>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-base text-[#888]">
              <span className="flex items-center gap-1"><CircleDot className="h-3 w-3" />{issue.user}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}</span>
              {issue.comments > 0 && (
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{issue.comments}</span>
              )}
            </div>
            {issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {issue.labels.map((label) => (
                  <span key={label} className="px-2 py-0.5 bg-[#f8f9fa] text-[13px] text-[#888] border border-[#eee] rounded">{label}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[13px] font-semibold uppercase tracking-[0.5px] ${issue.state === 'open' ? 'text-[#34a853]' : 'text-[#888]'}`}>
              {issue.state}
            </span>
            <a href={`https://github.com/${user}/${repo}/issues/${issue.number}`} target="_blank" rel="noopener noreferrer" className="text-[#ccc] hover:text-[#111] transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
      emptyStateMessage="No issues found."
      noResultsMessage="No issues found matching your search."
    />
  );
}
