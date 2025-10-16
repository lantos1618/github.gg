"use client";
import RepoPageLayout from "@/components/layouts/RepoPageLayout";
import { trpc } from '@/lib/trpc/client';
import { LoadingWave } from '@/components/LoadingWave';
import { useEffect, useState } from 'react';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import type { AISlopData } from '@/lib/ai/ai-slop';
import { VersionDropdown } from '@/components/VersionDropdown';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { MarkdownCardRenderer } from '@/components/MarkdownCardRenderer';

// Define a type for TRPC error responses
interface TRPCError { message: string }
function isTRPCError(err: unknown): err is TRPCError {
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err
  ) {
    const maybeError = err as { message?: unknown };
    return typeof maybeError.message === 'string';
  }
  return false;
}

interface AISlopResponse {
  analysis: AISlopData;
  cached: boolean;
  stale: boolean;
  lastUpdated: Date | string;
}

export default function AISlopClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  const [analysisData, setAnalysisData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const generateAISlopMutation = trpc.aiSlop.generateAISlop.useMutation();
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery();
  const utils = trpc.useUtils();

  // Get repo data first to access actualRef
  const { files, isLoading: filesLoading, totalFiles, actualRef } = useRepoData({ user, repo, ref: refName, path });

  // Use actualRef (after fallback) for all queries
  const effectiveRef = actualRef || refName || 'main';

  const { data: versions, isLoading: versionsLoading } = trpc.aiSlop.getAISlopVersions.useQuery({ user, repo, ref: effectiveRef });

  // Use the public endpoint for cached AI slop analysis (latest or by version)
  const { data: publicAnalysis, isLoading: publicLoading } = trpc.aiSlop.publicGetAISlop.useQuery(
    selectedVersion
      ? { user, repo, ref: effectiveRef, version: selectedVersion }
      : { user, repo, ref: effectiveRef },
    { enabled: !!user && !!repo }
  );

  // Helper to extract analysis data and metadata
  const analysisDataObj = publicAnalysis?.analysis || null;
  const markdownContent = analysisDataObj?.markdown || analysisData;
  const isPrivateRepo = (publicAnalysis as { error?: string })?.error === 'This repository is private';


  // Reset state when user/repo changes
  useEffect(() => {
    if (user || repo) {
      setAnalysisData(null);
      setError(null);
    }
  }, [user, repo]);

  // Add regenerate handler
  const handleRegenerate = () => {
    setIsLoading(true);
    setError(null);
    generateAISlopMutation.mutate(
      {
        user,
        repo,
        ref: effectiveRef,  // Use effectiveRef (after fallback) instead of URL refName
        files: files.map((file: { path: string; content: string; size: number }) => ({
          path: file.path,
          content: file.content,
          size: file.size,
        })),
      },
      {
        onSuccess: (data: AISlopResponse) => {
          setAnalysisData(data.analysis.markdown);
          setIsLoading(false);
          // Invalidate/refetch analysis and version list
          utils.aiSlop.publicGetAISlop.invalidate();
          utils.aiSlop.getAISlopVersions.invalidate();
        },
        onError: (err: TRPCError | string) => {
          if (typeof err === 'string') {
            setError(err);
          } else if (isTRPCError(err)) {
            setError(err.message);
          } else {
            setError('Failed to generate AI slop analysis');
          }
          setIsLoading(false);
        },
      }
    );
  };

  const overallLoading = filesLoading || isLoading;
  const canAccess = currentPlan && currentPlan.plan !== 'free';

  // If repository is private, show appropriate message
  if (isPrivateRepo) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Repository is Private</h2>
          <p className="text-gray-500">Code quality analysis is not available for private repositories.</p>
        </div>
      </RepoPageLayout>
    );
  }

  // If a cached analysis is available, show it
  if (analysisDataObj) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
        <div className="max-w-screen-xl w-full mx-auto px-4 pt-4 pb-8">
          <VersionDropdown
            versions={versions}
            isLoading={versionsLoading}
            selectedVersion={selectedVersion}
            onVersionChange={setSelectedVersion}
          />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Show quality metrics */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Code Slop:</span>
                  <span className={`font-bold ${analysisDataObj.aiGeneratedPercentage > 50 ? 'text-red-600' : analysisDataObj.aiGeneratedPercentage > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                    ~{analysisDataObj.aiGeneratedPercentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Quality Score:</span>
                  <span className={`font-bold ${analysisDataObj.overallScore < 60 ? 'text-red-600' : analysisDataObj.overallScore < 80 ? 'text-orange-600' : 'text-green-600'}`}>
                    {analysisDataObj.overallScore}/100
                  </span>
                </div>
              </div>
            </div>

            {canAccess && (
              <Button
                onClick={handleRegenerate}
                disabled={isLoading || generateAISlopMutation.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Analyzing...' : 'Regenerate'}
              </Button>
            )}
          </div>

          {/* Detected Patterns */}
          {analysisDataObj.detectedPatterns && analysisDataObj.detectedPatterns.length > 0 && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="text-md font-semibold mb-2 text-orange-900">Code Quality Issues Detected</h3>
              <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                {analysisDataObj.detectedPatterns.map((pattern, i) => (
                  <li key={i}>{pattern}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metrics Visualization */}
          {analysisDataObj.metrics && Array.isArray(analysisDataObj.metrics) && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Metrics Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-md bg-background">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Metric</th>
                      <th className="px-4 py-2 text-left">Score</th>
                      <th className="px-4 py-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisDataObj.metrics.map((m, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-medium whitespace-nowrap">{m.metric}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span>{m.score}</span>
                            <div className="w-32 h-2 bg-gray-200 rounded">
                              <div
                                className={`h-2 rounded ${m.score < 60 ? 'bg-red-500' : m.score < 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <MarkdownCardRenderer
            markdown={analysisDataObj.markdown}
            title="Code Quality Report"
          />
        </div>
      </RepoPageLayout>
    );
  }

  // If plan is loading, show spinner
  if (planLoading || publicLoading) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={[]} totalFiles={0}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <LoadingWave />
        </div>
      </RepoPageLayout>
    );
  }

  // If user does not have a paid plan, show upgrade
  if (!canAccess) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={[]} totalFiles={0}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <SubscriptionUpgrade />
        </div>
      </RepoPageLayout>
    );
  }

  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
      <div className="max-w-screen-xl w-full mx-auto px-4 pt-4 pb-8">
        <VersionDropdown
          versions={versions}
          isLoading={versionsLoading}
          selectedVersion={selectedVersion}
          onVersionChange={setSelectedVersion}
        />

        {error && (
          <ErrorDisplay
            error={error}
            isPending={generateAISlopMutation.isPending}
            onRetry={handleRegenerate}
          />
        )}
        {overallLoading && (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingWave />
            <p className="mt-4 text-gray-600">
              {filesLoading ? 'Loading repository files...' : 'Analyzing code quality...'}
            </p>
            {filesLoading && <p className="text-sm text-gray-500 mt-2">Files: {files.length}</p>}
            {!filesLoading && isLoading && <p className="text-sm text-gray-500 mt-2">Detecting code quality issues...</p>}
          </div>
        )}
        {markdownContent && (
          <MarkdownCardRenderer
            markdown={markdownContent}
            title="AI Slop Detection Report"
          />
        )}
        {!markdownContent && !overallLoading && !error && (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No AI Slop Analysis Available</h2>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              Detect AI-generated code and identify quality issues commonly associated with AI coding tools.
            </p>
            <Button
              onClick={handleRegenerate}
              disabled={isLoading || generateAISlopMutation.isPending || filesLoading}
              className="flex items-center gap-2"
              size="lg"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Analyzing Code...' : 'Analyze for AI Slop'}
            </Button>
            <p className="text-sm text-gray-400 mt-4">Files loaded: {files.length}</p>
          </div>
        )}
      </div>
    </RepoPageLayout>
  );
}
