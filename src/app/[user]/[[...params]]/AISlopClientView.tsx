"use client";
import { trpc } from '@/lib/trpc/client';
import type { AISlopData } from '@/lib/ai/ai-slop';
import { GenericAnalysisView, type AnalysisViewConfig, type AnalysisData } from '@/components/analysis/GenericAnalysisView';

// Helper for TRPC error type checking
interface TRPCError { message: string }
function isTRPCError(err: unknown): err is TRPCError {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string';
}

interface AISlopResponse {
  analysis: AISlopData;
  cached: boolean;
  stale: boolean;
  lastUpdated: Date | string;
}

export default function AISlopClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  const config: AnalysisViewConfig<any, any> = {
    // Display configuration
    title: 'Code Quality Report',
    noDataTitle: 'No AI Slop Analysis Available',
    noDataDescription: 'Detect AI-generated code and identify quality issues commonly associated with AI coding tools.',
    privateRepoMessage: 'Code quality analysis is not available for private repositories.',
    generateButtonText: 'Analyze for AI Slop',
    generatingButtonText: 'Analyzing...',
    loadingMessage: 'Analyzing code quality...',
    generatingMessage: 'Detecting code quality issues...',

    // TRPC hooks
    useVersions: (params) => trpc.aiSlop.getAISlopVersions.useQuery(params),
    usePublicData: (params) => trpc.aiSlop.publicGetAISlop.useQuery(params, { enabled: !!params.user && !!params.repo }),
    useGenerate: () => trpc.aiSlop.generateAISlop.useMutation(),
    usePlan: () => trpc.user.getCurrentPlan.useQuery(),
    useUtils: () => trpc.useUtils(),

    // Data extractors
    extractAnalysisData: (response): AnalysisData | null => {
      const analysis = response?.analysis;
      if (!analysis) return null;

      return {
        markdown: analysis.markdown,
        metrics: analysis.metrics,
        overallScore: analysis.overallScore,
        aiGeneratedPercentage: analysis.aiGeneratedPercentage,
        detectedPatterns: analysis.detectedPatterns,
      };
    },
    extractError: (response) => {
      return (response as { error?: string })?.error || null;
    },

    // Mutation handlers
    onMutationSuccess: (data: AISlopResponse, setData, utils) => {
      setData(data.analysis.markdown);
      utils.aiSlop.publicGetAISlop.invalidate();
      utils.aiSlop.getAISlopVersions.invalidate();
    },
    onMutationError: (err, setError) => {
      if (typeof err === 'string') {
        setError(err);
      } else if (isTRPCError(err)) {
        setError(err.message);
      } else {
        setError('Failed to generate AI slop analysis');
      }
    },

    // Customizations - AI Slop specific features
    showCopyButton: true,
    showMetricsBar: true,
    renderCustomMetrics: (data) => (
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
        {/* Detected Patterns */}
        {data.detectedPatterns && data.detectedPatterns.length > 0 && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
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
    getMetricColor: (score) => score < 60 ? 'bg-red-500' : score < 80 ? 'bg-orange-500' : 'bg-green-500',
    useEffectiveRef: true, // AI Slop uses actualRef from useRepoData
  };

  return <GenericAnalysisView user={user} repo={repo} refName={refName} path={path} config={config} />;
}
