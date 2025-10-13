'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CircleDot, ExternalLink, AlertCircle, Clock, MessageSquare, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface IssueDetailClientViewProps {
  user: string;
  repo: string;
  number: number;
}

export default function IssueDetailClientView({ user, repo, number }: IssueDetailClientViewProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const { data: issue, isLoading, error } = trpc.githubAnalysis.getIssueDetails.useQuery({
    owner: user,
    repo,
    number,
  });

  const analyzeIssue = trpc.githubAnalysis.analyzeIssueEndpoint.useMutation({
    onSuccess: () => {
      setShowAnalysis(true);
      toast.success('Issue analysis complete!');
    },
    onError: (err) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });

  const handleAnalyze = () => {
    analyzeIssue.mutate({
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
              <p>Failed to load issue: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !issue) {
    return (
      <div className="container py-8 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              Loading issue...
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
        <Link href={`/${user}/${repo}/issues`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Issues
        </Link>
      </div>

      {/* Issue Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{issue.title}</h1>
              <Badge variant={issue.state === 'open' ? 'default' : 'secondary'}>
                {issue.state}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="font-mono">#{issue.number}</span>
              <span className="flex items-center gap-1">
                <CircleDot className="h-4 w-4" />
                {issue.user}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
              </span>
              {issue.comments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {issue.comments} comments
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={analyzeIssue.isPending}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {analyzeIssue.isPending ? 'Analyzing...' : 'Analyze Issue'}
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`https://github.com/${user}/${repo}/issues/${number}`}
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
        {/* Issue Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-lg font-semibold capitalize">{issue.state}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Comments</div>
                <div className="text-lg font-semibold flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {issue.comments}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-lg font-semibold">
                  {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>

            {issue.labels.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Labels</div>
                <div className="flex flex-wrap gap-2">
                  {issue.labels.map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issue Description */}
        {issue.body && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{issue.body}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis */}
        {showAnalysis && analyzeIssue.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                Overall Score: {analyzeIssue.data.analysis.overallScore}/100 |
                Slop Ranking: {analyzeIssue.data.analysis.slopRanking}/100 |
                Priority: {analyzeIssue.data.analysis.suggestedPriority}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{analyzeIssue.data.markdown}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
