'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CircleDot, ExternalLink, AlertCircle, Clock, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';

interface IssueListClientViewProps {
  user: string;
  repo: string;
}

export default function IssueListClientView({ user, repo }: IssueListClientViewProps) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'open' | 'closed' | 'all'>('open');

  const { data: issues, isLoading, error } = trpc.githubAnalysis.getRepoIssues.useQuery({
    owner: user,
    repo,
    state,
  });

  const filteredIssues = issues?.filter(issue =>
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.user.toLowerCase().includes(search.toLowerCase()) ||
    issue.number.toString().includes(search)
  ) || [];

  if (error) {
    return (
      <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
        <div className="container py-8 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>Failed to load issues: {error.message}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </RepoPageLayout>
    );
  }

  return (
    <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
      <div className="container py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDot className="h-5 w-5" />
            Issues
          </CardTitle>
          <CardDescription>
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={state} onValueChange={(value) => setState(value as 'open' | 'closed' | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Issue List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading issues...
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No issues found matching your search.' : 'No issues found.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div key={issue.number} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RepoPageLayout>
  );
}
