"use client";
import { trpc } from '@/lib/trpc/client';
import type { ScorecardResponse } from '@/lib/types/scorecard';
import { GenericAnalysisView, type AnalysisViewConfig, type AnalysisData } from '@/components/analysis/GenericAnalysisView';
import { isTRPCError } from '@/lib/utils';

export default function ScorecardClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: AnalysisViewConfig<any, any> = {
    // Display configuration
    title: 'Repository Scorecard',
    noDataTitle: 'No Scorecard Available',
    noDataDescription: 'Click below to generate an AI-powered scorecard for this repository.',
    privateRepoMessage: 'Scorecards are not available for private repositories.',
    generateButtonText: 'Generate Scorecard',
    generatingButtonText: 'Generating...',
    loadingMessage: 'Analyzing repository...',
    generatingMessage: 'Generating scorecard...',

    // TRPC hooks
    useVersions: (params) => trpc.scorecard.getScorecardVersions.useQuery(params),
    usePublicData: (params) => trpc.scorecard.publicGetScorecard.useQuery(params, { enabled: !!params.user && !!params.repo }),
    useGenerate: () => trpc.scorecard.generateScorecard.useMutation(),
    usePlan: () => trpc.user.getCurrentPlan.useQuery(),
    useUtils: () => trpc.useUtils(),

    // Data extractors
    extractAnalysisData: (response): AnalysisData | null => {
      const scorecard = response?.scorecard;
      if (!scorecard) return null;

      return {
        markdown: scorecard.markdown,
        metrics: scorecard.metrics,
        overallScore: scorecard.overallScore,
      };
    },
    extractError: (response) => {
      return (response as { error?: string })?.error || null;
    },

    // Mutation handlers
    onMutationSuccess: (data: ScorecardResponse, setData, utils) => {
      setData(data.scorecard.markdown);
      utils.scorecard.publicGetScorecard.invalidate();
      utils.scorecard.getScorecardVersions.invalidate();
    },
    onMutationError: (err, setError) => {
      if (typeof err === 'string') {
        setError(err);
      } else if (isTRPCError(err)) {
        setError(err.message);
      } else {
        setError('Failed to generate scorecard');
      }
    },

    // Customizations
    showCopyButton: false,
    showMetricsBar: false,
    getMetricColor: () => 'bg-blue-500',
    useEffectiveRef: false,
  };

  return <GenericAnalysisView user={user} repo={repo} refName={refName} path={path} config={config} />;
}
