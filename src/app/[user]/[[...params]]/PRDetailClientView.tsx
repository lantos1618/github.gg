'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitPullRequest, Clock, FileCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { ResourceDetailView } from '@/components/analysis/ResourceDetailView';

interface PRDetailClientViewProps {
  user: string;
  repo: string;
  number: number;
}

interface PR {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  user: string;
  updatedAt: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  headBranch: string;
  baseBranch: string;
  labels: string[];
  body: string | null;
  files: Array<{
    filename: string;
    additions: number;
    deletions: number;
  }>;
}

interface PRAnalysis {
  markdown: string;
  overallScore: number;
  version: number;
}

export default function PRDetailClientView({ user, repo, number }: PRDetailClientViewProps) {
  const utils = trpc.useUtils();

  return (
    <ResourceDetailView<PR, PRAnalysis>
      user={user}
      repo={repo}
      number={number}
      useGetDetails={trpc.githubAnalysis.getPRDetails.useQuery}
      useGetCachedAnalysis={trpc.githubAnalysis.getCachedPRAnalysis.useQuery}
      useAnalyze={trpc.githubAnalysis.analyzePR.useMutation}
      utils={utils}
      resourceType="pull request"
      resourceTypePlural="pulls"
      backLinkText="Back to Pull Requests"
      analyzeButtonText={(isPending, hasAnalysis) =>
        isPending ? 'Analyzing...' : hasAnalysis ? 'Regenerate Analysis' : 'Analyze PR'
      }
      getTitle={(pr) => pr.title}
      getNumber={(pr) => pr.number}
      getState={(pr) => pr.state}
      getGitHubUrl={() => `https://github.com/${user}/${repo}/pull/${number}`}
      getAnalysisDescription={(analysis) =>
        `Overall Score: ${analysis.overallScore}/100 | Version: ${analysis.version}`
      }
      renderHeaderMetadata={(pr) => (
        <>
          <span className="flex items-center gap-1">
            <GitPullRequest className="h-4 w-4" />
            {pr.user}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Updated {formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}
          </span>
          {pr.draft && <Badge variant="outline">Draft</Badge>}
        </>
      )}
      renderDetailsCard={(pr) => (
        <>
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
        </>
      )}
      renderAdditionalCards={(pr) => (
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
      )}
    />
  );
}
