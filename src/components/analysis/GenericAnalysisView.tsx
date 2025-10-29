"use client";
import RepoPageLayout from "@/components/layouts/RepoPageLayout";
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, ReactNode, useMemo } from 'react';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useSelectedFiles } from '@/contexts/SelectedFilesContext';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import { VersionDropdown } from '@/components/VersionDropdown';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownCardRenderer } from '@/components/MarkdownCardRenderer';
import { FileExplorerDrawer } from '@/components/FileExplorerDrawer';

import { trpc } from '@/lib/trpc/client';

// Use tRPC's actual types - don't reinvent the wheel
type TRPCUtils = ReturnType<typeof trpc.useUtils>;

// Type for metrics (compatible with both Scorecard and AI Slop)
interface Metric {
  metric: string;
  score: number;
  reason: string;
}

// Generic analysis data structure
export interface AnalysisData {
  markdown: string;
  metrics?: Metric[];
  overallScore?: number;
  // AI Slop specific fields
  aiGeneratedPercentage?: number;
  detectedPatterns?: string[];
}

// Config for customizing the view
export interface AnalysisViewConfig<TResponse> {
  // Display configuration
  title: string;
  noDataTitle: string;
  noDataDescription: string;
  privateRepoMessage: string;
  generateButtonText: string;
  generatingButtonText: string;
  loadingMessage: string;
  generatingMessage: string;

  // TRPC hooks - accept full tRPC result types
  useVersions: (params: { user: string; repo: string; ref: string }) => unknown;
  usePublicData: (params: { user: string; repo: string; ref: string; version?: number }) => unknown;
  useGenerateSubscription: (input: any, options: any) => void;
  usePlan: () => unknown;
  useUtils: () => TRPCUtils;

  // Data extractors
  extractAnalysisData: (response: TResponse | undefined) => AnalysisData | null;
  extractError: (response: TResponse | undefined) => string | null;

  // Mutation handlers - use tRPC's actual error type
  onMutationSuccess: <TData>(data: TData, setData: (data: string) => void, utils: TRPCUtils) => void;
  onMutationError: (err: { message: string }, setError: (error: string) => void) => void;

  // Optional customizations
  showCopyButton?: boolean;
  showMetricsBar?: boolean;
  renderCustomMetrics?: (data: AnalysisData) => ReactNode;
  getMetricColor?: (score: number) => string;
  useEffectiveRef?: boolean; // If true, uses actualRef from useRepoData
}

interface GenericAnalysisViewProps<TResponse> {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  config: AnalysisViewConfig<TResponse>;
}

interface GenericAnalysisViewInnerProps<TResponse> extends GenericAnalysisViewProps<TResponse> {
  files: any[];
  filesLoading: boolean;
  actualRef: string | undefined;
  totalFiles: number;
}

// Inner component that uses the context
function GenericAnalysisViewInner<TResponse>({
  user,
  repo,
  refName,
  path,
  config,
  files,
  filesLoading,
  actualRef,
  totalFiles,
}: GenericAnalysisViewInnerProps<TResponse>) {
  const [analysisData, setAnalysisData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [shouldAnalyze, setShouldAnalyze] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const planResult = config.usePlan() as { data: { plan: string } | undefined; isLoading: boolean };
  const { data: currentPlan, isLoading: planLoading } = planResult;
  const utils = config.useUtils();
  const { selectedFilePaths, toggleFile } = useSelectedFiles();

  // Filter files based on selection from context
  const selectedFiles = useMemo(() => {
    return files.filter(f => selectedFilePaths.has(f.path));
  }, [files, selectedFilePaths]);

  // Use actualRef (after fallback) for all queries if configured
  const effectiveRef = config.useEffectiveRef ? (actualRef || refName || 'main') : (refName || 'main');

  const versionsResult = config.useVersions({ user, repo, ref: effectiveRef }) as { data: Array<{ version: number; updatedAt: string }> | undefined; isLoading: boolean };
  const { data: versions, isLoading: versionsLoading } = versionsResult;

  // Use the public endpoint for cached data (latest or by version)
  const publicResult = config.usePublicData(
    selectedVersion
      ? { user, repo, ref: effectiveRef, version: selectedVersion }
      : { user, repo, ref: effectiveRef }
  ) as { data: TResponse | undefined; isLoading: boolean };
  const { data: publicData, isLoading: publicLoading } = publicResult;

  // Extract analysis data and metadata
  const analysisDataObj = config.extractAnalysisData(publicData);
  const markdownContent = analysisDataObj?.markdown || analysisData;
  const isPrivateRepo = config.extractError(publicData) === 'This repository is private';

  // Reset state when user/repo changes
  useEffect(() => {
    if (user || repo) {
      setAnalysisData(null);
      setError(null);
    }
  }, [user, repo]);

  // Subscription for analysis
  config.useGenerateSubscription(
    {
      user,
      repo,
      ref: effectiveRef,
      files: selectedFiles.map((file: { path: string; content: string; size: number }) => ({
        path: file.path,
        content: file.content,
        size: file.size,
      })),
    },
    {
      enabled: shouldAnalyze,
      onData: (event: any) => {
        if (event.type === 'progress') {
          setProgress(event.progress);
          setProgressMessage(event.message);
          setIsLoading(true);
        } else if (event.type === 'complete') {
          config.onMutationSuccess(event.data, setAnalysisData, utils);
          setShouldAnalyze(false);
          setIsLoading(false);
          setProgress(0);
          setProgressMessage('');
        } else if (event.type === 'error') {
          config.onMutationError({ message: event.message }, setError);
          setShouldAnalyze(false);
          setIsLoading(false);
          setProgress(0);
          setProgressMessage('');
        }
      },
    }
  );

  // Add regenerate handler
  const handleRegenerate = () => {
    setError(null);
    setProgress(0);
    setProgressMessage('');
    setShouldAnalyze(true);
  };

  const handleCopyMarkdown = (markdown: string | null | undefined) => {
    if (!markdown) {
      toast.error('No markdown to copy');
      return;
    }
    navigator.clipboard.writeText(markdown).then(() => {
      toast.success('Markdown copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy markdown');
    });
  };

  const overallLoading = filesLoading || isLoading;
  const canAccess = currentPlan && currentPlan.plan !== 'free';

  // If repository is private, show appropriate message
  if (isPrivateRepo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Repository is Private</h2>
        <p className="text-gray-500">{config.privateRepoMessage}</p>
      </div>
    );
  }

  // If a cached analysis is available, show it
  if (analysisDataObj) {
    return (
      <div className="max-w-screen-xl w-full mx-auto px-2 sm:px-4 pt-2 sm:pt-4">
        {/* File Explorer Tab Button */}
        <button
          onClick={() => setIsFileExplorerOpen(true)}
          className="fixed right-0 top-20 z-30 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-l-lg shadow-lg transition-all duration-200 flex items-center gap-2 border border-r-0 border-blue-700"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
          title="Open File Explorer"
        >
          <span className="text-sm font-medium tracking-wider">FILES</span>
          <FolderTree className="h-4 w-4" />
        </button>

        {/* Main Content */}
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <VersionDropdown
              versions={versions}
              isLoading={versionsLoading}
              selectedVersion={selectedVersion}
              onVersionChange={setSelectedVersion}
            />

            <div className="flex items-center gap-2">
              {config.showCopyButton && (
                <Button
                  onClick={() => handleCopyMarkdown(analysisDataObj.markdown)}
                  variant="outline"
                  className="flex items-center gap-2"
                  title="Copy Markdown"
                >
                  <Copy className="h-4 w-4" />
                  Copy Markdown
                </Button>
              )}
              {canAccess && (
                <Button
                  onClick={handleRegenerate}
                  disabled={shouldAnalyze}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${shouldAnalyze ? 'animate-spin' : ''}`} />
                  {shouldAnalyze ? config.generatingButtonText : 'Regenerate'}
                </Button>
              )}
            </div>
          </div>

          {config.showMetricsBar && config.renderCustomMetrics && (
            <div className="mb-4">
              {config.renderCustomMetrics(analysisDataObj)}
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
                    {analysisDataObj.metrics.map((m, i) => {
                      const colorClass = config.getMetricColor ? config.getMetricColor(m.score) : 'bg-blue-500';
                      return (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-2 font-medium whitespace-nowrap">{m.metric}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span>{m.score}</span>
                              <div className="w-32 h-2 bg-gray-200 rounded">
                                <div
                                  className={`h-2 rounded ${colorClass}`}
                                  style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{m.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <MarkdownCardRenderer
            markdown={analysisDataObj.markdown}
            title={config.title}
          />
        </div>

        {/* File Explorer Drawer */}
        <FileExplorerDrawer
          owner={user}
          repo={repo}
          files={files}
          selectedFiles={selectedFilePaths}
          onToggleFile={toggleFile}
          isOpen={isFileExplorerOpen}
          onClose={() => setIsFileExplorerOpen(false)}
        />
      </div>
    );
  }

  // If plan is loading, show spinner
  if (planLoading || publicLoading) {
    return (
      <div className="max-w-screen-xl w-full mx-auto px-4 pt-4 pb-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // If user does not have a paid plan, show upgrade
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <SubscriptionUpgrade />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl w-full mx-auto px-2 sm:px-4 pt-2 sm:pt-4">
      {/* File Explorer Tab Button */}
      <button
        onClick={() => setIsFileExplorerOpen(true)}
        className="fixed right-0 top-20 z-30 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-l-lg shadow-lg transition-all duration-200 flex items-center gap-2 border border-r-0 border-blue-700"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
        }}
        title="Open File Explorer"
      >
        <span className="text-sm font-medium tracking-wider">FILES</span>
        <FolderTree className="h-4 w-4" />
      </button>

      {/* Main Content */}
      <div>
          <VersionDropdown
            versions={versions}
            isLoading={versionsLoading}
            selectedVersion={selectedVersion}
            onVersionChange={setSelectedVersion}
          />

          {error && (
            <ErrorDisplay
              error={error}
              isPending={shouldAnalyze}
              onRetry={handleRegenerate}
            />
          )}
          {progressMessage && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">{progressMessage}</span>
                <span className="text-sm text-blue-700">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-blue-200 rounded">
                <div
                  className="h-2 bg-blue-600 rounded transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {overallLoading && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}
          {markdownContent && (
            <>
              {config.showCopyButton && (
                <div className="flex items-center justify-end mb-3">
                  <Button
                    onClick={() => handleCopyMarkdown(markdownContent)}
                    variant="outline"
                    className="flex items-center gap-2"
                    title="Copy Markdown"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Markdown
                  </Button>
                </div>
              )}
              <MarkdownCardRenderer
                markdown={markdownContent}
                title={config.title}
              />
            </>
          )}
          {!markdownContent && !overallLoading && !error && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <h2 className="text-xl font-semibold text-gray-600 mb-2">{config.noDataTitle}</h2>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                {config.noDataDescription}
              </p>
              <Button
                onClick={handleRegenerate}
                disabled={shouldAnalyze || filesLoading}
                className="flex items-center gap-2"
                size="lg"
              >
                <RefreshCw className={`h-4 w-4 ${shouldAnalyze ? 'animate-spin' : ''}`} />
                {shouldAnalyze ? config.generatingButtonText : config.generateButtonText}
              </Button>
              <p className="text-sm text-gray-400 mt-4">Files selected: {selectedFiles.length} of {files.length}</p>
            </div>
          )}
        </div>

      {/* File Explorer Drawer */}
      <FileExplorerDrawer
        owner={user}
        repo={repo}
        files={files}
        selectedFiles={selectedFilePaths}
        onToggleFile={toggleFile}
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
      />
    </div>
  );
}

// Outer wrapper that provides context
export function GenericAnalysisView<TResponse>(
  props: GenericAnalysisViewProps<TResponse>
) {
  // Fetch files once at the top level
  const { files, isLoading: filesLoading, totalFiles, actualRef } = useRepoData({
    user: props.user,
    repo: props.repo,
    ref: props.refName,
    path: props.path
  });

  return (
    <RepoPageLayout
      user={props.user}
      repo={props.repo}
      refName={props.refName}
      files={files}
      totalFiles={files.length}
    >
      <GenericAnalysisViewInner
        {...props}
        files={files}
        filesLoading={filesLoading}
        actualRef={actualRef}
        totalFiles={totalFiles}
      />
    </RepoPageLayout>
  );
}
