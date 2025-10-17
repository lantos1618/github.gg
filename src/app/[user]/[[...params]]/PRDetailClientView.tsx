'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitPullRequest, ExternalLink, AlertCircle, Clock, FileCode, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { MarkdownCardRenderer } from '@/components/MarkdownCardRenderer';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';

interface PRDetailClientViewProps {
  user: string;
  repo: string;
  number: number;
}

export default function PRDetailClientView({ user, repo, number }: PRDetailClientViewProps) {
  const utils = trpc.useUtils();

  const { data: pr, isLoading, error } = trpc.githubAnalysis.getPRDetails.useQuery({
    owner: user,
    repo,
    number,
  });

  const { data: cachedAnalysis } = trpc.githubAnalysis.getCachedPRAnalysis.useQuery({
    owner: user,
    repo,
    number,
  });

  const analyzePR = trpc.githubAnalysis.analyzePR.useMutation({
    onSuccess: () => {
      toast.success('PR analysis complete!');
      // Invalidate and refetch the cached analysis
      utils.githubAnalysis.getCachedPRAnalysis.invalidate();
    },
    onError: (err) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });

  const handleAnalyze = () => {
    analyzePR.mutate({
      owner: user,
      repo,
      number,
    });
  };

  if (error) {
    return (
      <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
        <div className="container py-8 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>Failed to load pull request: {error.message}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </RepoPageLayout>
    );
  }

  if (isLoading || !pr) {
    return (
      <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
        <div className="container py-8 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Loading pull request...
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
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href={`/${user}/${repo}/pulls`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Pull Requests
        </Link>
      </div>

      {/* PR Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{pr.title}</h1>
              <Badge variant={pr.state === 'open' ? 'default' : 'secondary'}>
                {pr.state}
              </Badge>
              {pr.draft && (
                <Badge variant="outline">Draft</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="font-mono">#{pr.number}</span>
              <span className="flex items-center gap-1">
                <GitPullRequest className="h-4 w-4" />
                {pr.user}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated {formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={analyzePR.isPending}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {analyzePR.isPending ? 'Analyzing...' : cachedAnalysis ? 'Regenerate Analysis' : 'Analyze PR'}
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`https://github.com/${user}/${repo}/pull/${number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* PR Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Pull Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Files Changed</div>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <FileCode className="h-5 w-5" />
                  {pr.changedFiles}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Additions</div>
                <div className="text-2xl font-bold text-green-600">
                  +{pr.additions}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Deletions</div>
                <div className="text-2xl font-bold text-red-600">
                  -{pr.deletions}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Net Changes</div>
                <div className="text-2xl font-bold">
                  {pr.additions - pr.deletions > 0 ? '+' : ''}{pr.additions - pr.deletions}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">Branches</div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{pr.headBranch}</Badge>
                <span>→</span>
                <Badge variant="secondary">{pr.baseBranch}</Badge>
              </div>
            </div>

            {pr.labels.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Labels</div>
                <div className="flex flex-wrap gap-2">
                  {pr.labels.map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PR Description */}
        {pr.body && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-input bg-background p-6 overflow-y-auto max-h-[400px]">
                <MarkdownRenderer content={pr.body} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis */}
        {cachedAnalysis && (
          <MarkdownCardRenderer
            markdown={cachedAnalysis.markdown}
            title="AI Analysis"
            description={`Overall Score: ${cachedAnalysis.overallScore}/100 | Version: ${cachedAnalysis.version}`}
          />
        )}

        {/* Changed Files */}
        <Card>
          <CardHeader>
            <CardTitle>Changed Files ({pr.files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pr.files.map((file) => (
                <div key={file.filename} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-mono text-sm truncate flex-1">{file.filename}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">+{file.additions}</span>
                    <span className="text-red-600">-{file.deletions}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </RepoPageLayout>
  );
}
