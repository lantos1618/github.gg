'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitPullRequest, ExternalLink, AlertCircle, Clock, FileCode, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface PRDetailClientViewProps {
  user: string;
  repo: string;
  number: number;
}

export default function PRDetailClientView({ user, repo, number }: PRDetailClientViewProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const { data: pr, isLoading, error } = trpc.githubAnalysis.getPRDetails.useQuery({
    owner: user,
    repo,
    number,
  });

  const analyzePR = trpc.githubAnalysis.analyzePR.useMutation({
    onSuccess: () => {
      setShowAnalysis(true);
      toast.success('PR analysis complete!');
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
    );
  }

  if (isLoading || !pr) {
    return (
      <div className="container py-8 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              Loading pull request...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
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
              {analyzePR.isPending ? 'Analyzing...' : 'Analyze PR'}
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
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{pr.body}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis */}
        {showAnalysis && analyzePR.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                Overall Score: {analyzePR.data.analysis.overallScore}/100
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{analyzePR.data.markdown}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
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
  );
}
