import { trpc } from '@/lib/trpc/client';
import type { AnalysisViewConfig, AnalysisData } from '@/components/analysis/GenericAnalysisView';
import { isTRPCError } from '@/lib/utils';

export type AnalysisType = 'scorecard' | 'ai-slop';

// Type for TRPC utils
type TRPCUtils = ReturnType<typeof trpc.useUtils>;

// Response types for different analysis endpoints
type ScorecardResponse = {
  scorecard?: AnalysisData;
  error?: string;
};

type AISlopResponse = {
  analysis?: AnalysisData;
  error?: string;
};

type AnalysisResponse = ScorecardResponse | AISlopResponse;

interface AnalysisTypeConfig {
  title: string;
  noDataTitle: string;
  noDataDescription: string;
  privateRepoMessage: string;
  generateButtonText: string;
  generatingButtonText: string;
  loadingMessage: string;
  generatingMessage: string;
  errorMessage: string;
  showCopyButton: boolean;
  showMetricsBar: boolean;
  useEffectiveRef: boolean;
  // Custom metrics renderer for types that need it
  renderCustomMetrics?: (data: AnalysisData) => React.ReactNode;
  getMetricColor?: (score: number) => string;
}

const ANALYSIS_CONFIGS: Record<AnalysisType, AnalysisTypeConfig> = {
  'scorecard': {
    title: 'Repository Scorecard',
    noDataTitle: 'No Scorecard Available',
    noDataDescription: 'Click below to generate an AI-powered scorecard for this repository.',
    privateRepoMessage: 'Scorecards are not available for private repositories.',
    generateButtonText: 'Generate Scorecard',
    generatingButtonText: 'Generating...',
    loadingMessage: 'Analyzing repository...',
    generatingMessage: 'Generating scorecard...',
    errorMessage: 'Failed to generate scorecard',
    showCopyButton: false,
    showMetricsBar: false,
    useEffectiveRef: false,
    getMetricColor: () => 'bg-blue-500',
  },
  'ai-slop': {
    title: 'Code Quality Report',
    noDataTitle: 'No AI Slop Analysis Available',
    noDataDescription: 'Detect AI-generated code and identify quality issues commonly associated with AI coding tools.',
    privateRepoMessage: 'Code quality analysis is not available for private repositories.',
    generateButtonText: 'Analyze for AI Slop',
    generatingButtonText: 'Analyzing...',
    loadingMessage: 'Analyzing code quality...',
    generatingMessage: 'Detecting code quality issues...',
    errorMessage: 'Failed to generate AI slop analysis',
    showCopyButton: true,
    showMetricsBar: true,
    useEffectiveRef: true,
    getMetricColor: (score) => score < 60 ? 'bg-red-500' : score < 80 ? 'bg-orange-500' : 'bg-green-500',
    renderCustomMetrics: (data) => (
      <div className="space-y-4">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Code Slop:</span>
            <span className={`font-bold ${
              (data.aiGeneratedPercentage || 0) > 50 ? 'text-red-600' :
              (data.aiGeneratedPercentage || 0) > 30 ? 'text-orange-600' :
              'text-green-600'
            }`}>
              ~{data.aiGeneratedPercentage}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Quality Score:</span>
            <span className={`font-bold ${
              (data.overallScore || 0) < 60 ? 'text-red-600' :
              (data.overallScore || 0) < 80 ? 'text-orange-600' :
              'text-green-600'
            }`}>
              {data.overallScore}/100
            </span>
          </div>
        </div>
        {/* Detected Patterns */}
        {data.detectedPatterns && data.detectedPatterns.length > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h3 className="text-md font-semibold mb-2 text-orange-900">Code Quality Issues Detected</h3>
            <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
              {data.detectedPatterns.map((pattern, i) => (
                <li key={i}>{pattern}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
  },
};

/**
 * Factory function to create analysis view configs
 * Eliminates duplication between different analysis types (scorecard, ai-slop, etc.)
 */
export function createAnalysisConfig(type: AnalysisType): AnalysisViewConfig<AnalysisResponse, ReturnType<typeof trpc.scorecard.generateScorecard.useMutation>> {
  const typeConfig = ANALYSIS_CONFIGS[type];

  // Map type to TRPC router endpoints
  const routerMap = {
    'scorecard': {
      useVersions: (params: { user: string; repo: string; ref: string }) =>
        trpc.scorecard.getScorecardVersions.useQuery(params),
      usePublicData: (params: { user: string; repo: string; ref: string; version?: number }) =>
        trpc.scorecard.publicGetScorecard.useQuery(params, { enabled: !!params.user && !!params.repo }),
      useGenerate: () => trpc.scorecard.generateScorecard.useMutation(),
      extractDataField: 'scorecard' as const,
      invalidateKeys: ['scorecard', 'publicGetScorecard', 'getScorecardVersions'] as const,
    },
    'ai-slop': {
      useVersions: (params: { user: string; repo: string; ref: string }) =>
        trpc.aiSlop.getAISlopVersions.useQuery(params),
      usePublicData: (params: { user: string; repo: string; ref: string; version?: number }) =>
        trpc.aiSlop.publicGetAISlop.useQuery(params, { enabled: !!params.user && !!params.repo }),
      useGenerate: () => trpc.aiSlop.generateAISlop.useMutation(),
      extractDataField: 'analysis' as const,
      invalidateKeys: ['aiSlop', 'publicGetAISlop', 'getAISlopVersions'] as const,
    },
  };

  const router = routerMap[type];

  return {
    // Display configuration
    ...typeConfig,

    // TRPC hooks
    useVersions: router.useVersions,
    usePublicData: router.usePublicData,
    useGenerate: router.useGenerate,
    usePlan: () => trpc.user.getCurrentPlan.useQuery(),
    useUtils: () => trpc.useUtils(),

    // Data extractors
    extractAnalysisData: (response: AnalysisResponse | undefined): AnalysisData | null => {
      if (!response) return null;
      const data = type === 'scorecard'
        ? (response as ScorecardResponse).scorecard
        : (response as AISlopResponse).analysis;
      if (!data) return null;

      return {
        markdown: data.markdown,
        metrics: data.metrics,
        overallScore: data.overallScore,
        aiGeneratedPercentage: data.aiGeneratedPercentage,
        detectedPatterns: data.detectedPatterns,
      };
    },
    extractError: (response: AnalysisResponse | undefined) => {
      return response?.error || null;
    },

    // Mutation handlers
    onMutationSuccess: (data: unknown, setData: (data: string) => void, utils: TRPCUtils) => {
      const analysisData = type === 'scorecard'
        ? (data as { scorecard: AnalysisData }).scorecard
        : (data as { analysis: AnalysisData }).analysis;
      setData(analysisData.markdown);
      // Invalidate based on type
      const [router1, endpoint1, endpoint2] = router.invalidateKeys;
      const routerUtils = utils[router1 as keyof typeof utils] as Record<string, { invalidate: () => void }>;
      routerUtils[endpoint1].invalidate();
      routerUtils[endpoint2].invalidate();
    },
    onMutationError: (err: { message: string }, setError: (error: string) => void) => {
      if (typeof err === 'string') {
        setError(err);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError(typeConfig.errorMessage);
      }
    },
  };
}
