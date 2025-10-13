'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, GitPullRequest, ExternalLink, AlertCircle, Clock, FileCode } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';

interface PRListClientViewProps {
  user: string;
  repo: string;
}

export default function PRListClientView({ user, repo }: PRListClientViewProps) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'open' | 'closed' | 'all'>('open');

  const { data: prs, isLoading, error } = trpc.githubAnalysis.getRepoPRs.useQuery({
    owner: user,
    repo,
    state,
  });

  const filteredPRs = prs?.filter(pr =>
    pr.title.toLowerCase().includes(search.toLowerCase()) ||
    pr.user.toLowerCase().includes(search.toLowerCase()) ||
    pr.number.toString().includes(search)
  ) || [];

  if (error) {
    return (
      <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
        <div className="container py-8 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>Failed to load pull requests: {error.message}</p>
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
            <GitPullRequest className="h-5 w-5" />
            Pull Requests
          </CardTitle>
          <CardDescription>
            {filteredPRs.length} pull request{filteredPRs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PRs..."
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

          {/* PR List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading pull requests...
            </div>
          ) : filteredPRs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No pull requests found matching your search.' : 'No pull requests found.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPRs.map((pr) => (
                <div key={pr.number} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
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
