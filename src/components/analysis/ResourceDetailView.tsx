'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MarkdownCardRenderer } from '@/components/MarkdownCardRenderer';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';

export interface ResourceDetailViewProps<TItem, TAnalysis> {
  // Repository info
  user: string;
  repo: string;
  number: number;

  // TRPC hooks (matches TRPC's actual signature)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGetDetails: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGetCachedAnalysis: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAnalyze: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  utils: any;

  // Display configuration
  resourceType: string; // "pull request" or "issue"
  resourceTypePlural: string; // "pulls" or "issues"
  backLinkText: string;
  analyzeButtonText: (isPending: boolean, hasAnalysis: boolean) => string;

  // Data extractors
  getTitle: (item: TItem) => string;
  getNumber: (item: TItem) => number;
  getState: (item: TItem) => string;
  getGitHubUrl: () => string;
  getAnalysisDescription: (analysis: TAnalysis) => string;

  // Render functions for unique parts
  renderHeaderMetadata: (item: TItem) => ReactNode;
  renderDetailsCard: (item: TItem) => ReactNode;
  renderAdditionalCards?: (item: TItem) => ReactNode;
}

export function ResourceDetailView<TItem, TAnalysis>({
  user,
  repo,
  number,
  useGetDetails,
  useGetCachedAnalysis,
  useAnalyze,
  utils,
  resourceType,
  resourceTypePlural,
  backLinkText,
  analyzeButtonText,
  getTitle,
  getNumber,
  getState,
  getGitHubUrl,
  getAnalysisDescription,
  renderHeaderMetadata,
  renderDetailsCard,
  renderAdditionalCards,
}: ResourceDetailViewProps<TItem, TAnalysis>) {
  const { data: item, isLoading, error } = useGetDetails({
    owner: user,
    repo,
    number,
  });

  const { data: cachedAnalysis } = useGetCachedAnalysis({
    owner: user,
    repo,
    number,
  });

  const analyzeMutation = useAnalyze({
    onSuccess: () => {
      toast.success(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} analysis complete!`);
      utils.invalidate();
    },
    onError: (err: Error) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({
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
                <p>Failed to load {resourceType}: {error.message}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </RepoPageLayout>
    );
  }

  if (isLoading || !item) {
    return (
      <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
        <div className="container py-8 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Loading {resourceType}...
              </div>
            </CardContent>
          </Card>
        </div>
      </RepoPageLayout>
    );
  }

  const title = getTitle(item);
  const itemNumber = getNumber(item);
  const state = getState(item);

  return (
    <RepoPageLayout user={user} repo={repo} files={[]} totalFiles={0}>
      <div className="container py-8 max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link href={`/${user}/${repo}/${resourceTypePlural}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {backLinkText}
          </Link>
        </div>

        {/* Resource Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{title}</h1>
                <Badge variant={state === 'open' ? 'default' : 'secondary'}>
                  {state}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <span className="font-mono">#{itemNumber}</span>
                {renderHeaderMetadata(item)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {analyzeButtonText(analyzeMutation.isPending, !!cachedAnalysis)}
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={getGitHubUrl()}
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
          {/* Details Card */}
          {renderDetailsCard(item)}

          {/* AI Analysis */}
          {cachedAnalysis && (
            <MarkdownCardRenderer
              markdown={cachedAnalysis.markdown}
              title="AI Analysis"
              description={getAnalysisDescription(cachedAnalysis)}
            />
          )}

          {/* Additional Cards (e.g., Changed Files for PRs) */}
          {renderAdditionalCards && renderAdditionalCards(item)}
        </div>
      </div>
    </RepoPageLayout>
  );
}
