'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleDot, Clock, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { ResourceDetailView } from '@/components/analysis/ResourceDetailView';

interface IssueDetailClientViewProps {
  user: string;
  repo: string;
  number: number;
}

interface Issue {
  number: number;
  title: string;
  state: string;
  user: string;
  createdAt: string;
  updatedAt: string;
  comments: number;
  labels: string[];
  body: string | null;
}

interface IssueAnalysis {
  markdown: string;
  overallScore: number;
  slopRanking: number;
  suggestedPriority: string;
  version: number;
}

export default function IssueDetailClientView({ user, repo, number }: IssueDetailClientViewProps) {
  const utils = trpc.useUtils();

  return (
    <ResourceDetailView<Issue, IssueAnalysis>
      user={user}
      repo={repo}
      number={number}
      useGetDetails={trpc.githubAnalysis.getIssueDetails.useQuery}
      useGetCachedAnalysis={trpc.githubAnalysis.getCachedIssueAnalysis.useQuery}
      useAnalyze={trpc.githubAnalysis.analyzeIssueEndpoint.useMutation}
      useAnalyzeSubscription={trpc.githubAnalysis.analyzeIssueEndpoint.useSubscription}
      utils={utils}
      resourceType="issue"
      resourceTypePlural="issues"
      backLinkText="Back to Issues"
      analyzeButtonText={(isPending, hasAnalysis) =>
        isPending ? 'Analyzing...' : hasAnalysis ? 'Regenerate Analysis' : 'Analyze Issue'
      }
      getTitle={(issue) => issue.title}
      getNumber={(issue) => issue.number}
      getState={(issue) => issue.state}
      getGitHubUrl={() => `https://github.com/${user}/${repo}/issues/${number}`}
      getAnalysisDescription={(analysis) =>
        `Overall Score: ${analysis.overallScore}/100 | Slop Ranking: ${analysis.slopRanking}/100 | Priority: ${analysis.suggestedPriority} | Version: ${analysis.version}`
      }
      renderHeaderMetadata={(issue) => (
        <>
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
        </>
      )}
      renderDetailsCard={(issue) => (
        <>
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

          {issue.body && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-input bg-background p-6 overflow-y-auto max-h-[400px]">
                  <MarkdownRenderer content={issue.body} />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    />
  );
}
