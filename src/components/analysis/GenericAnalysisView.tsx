"use client";
import RepoPageLayout from "@/components/layouts/RepoPageLayout";
import { useEffect, useState, ReactNode, useMemo, useCallback, useRef } from 'react';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useSelectedFiles } from '@/contexts/SelectedFilesContext';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import { FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { FileExplorerDrawer } from '@/components/FileExplorerDrawer';

import { AnalysisHeader } from './AnalysisHeader';
import { AnalysisContent } from './AnalysisContent';
import { AnalysisStateHandler } from './AnalysisStateHandler';

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
  const toastIdRef = useRef<string | number | null>(null);

  const planResult = config.usePlan() as { data: { plan: string } | undefined; isLoading: boolean };
  const { data: currentPlan, isLoading: planLoading } = planResult;
  const utils = config.useUtils();
  const { selectedFilePaths, toggleFile } = useSelectedFiles();

  // Filter files based on selection from context
  const selectedFiles = useMemo(() => {
    return files.filter(f => selectedFilePaths.has(f.path));
  }, [files, selectedFilePaths]);

  // Memoize file paths array to prevent recreating on every render
  const filePaths = useMemo(() => {
    return selectedFiles.map((file: { path: string }) => file.path);
  }, [selectedFiles]);

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

  // Memoize the subscription data handler to prevent recreating on every render
  const handleSubscriptionData = useCallback((event: any) => {
    if (event.type === 'progress') {
      const progress = event.progress || 0;
      const message = event.message || '';
      setIsLoading(true);

      // Update or create toast with progress
      if (toastIdRef.current) {
        toast.loading(`${message} (${progress}%)`, { id: toastIdRef.current });
      } else {
        const id = toast.loading(`${message} (${progress}%)`);
        toastIdRef.current = id;
      }
    } else if (event.type === 'complete') {
      config.onMutationSuccess(event.data, setAnalysisData, utils);
      setShouldAnalyze(false);
      setIsLoading(false);

      // Replace loading toast with success
      if (toastIdRef.current) {
        toast.success('Analysis complete!', { id: toastIdRef.current });
        toastIdRef.current = null;
      } else {
        toast.success('Analysis complete!');
      }
    } else if (event.type === 'error') {
      config.onMutationError({ message: event.message }, setError);
      setShouldAnalyze(false);
      setIsLoading(false);

      // Replace loading toast with error (error toast will be shown by onMutationError)
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [config, utils]);

  // Subscription for analysis
  config.useGenerateSubscription(
    {
      user,
      repo,
      ref: effectiveRef,
      filePaths,
    },
    {
      enabled: shouldAnalyze,
      onData: handleSubscriptionData,
    }
  );

  // Add regenerate handler
  const handleRegenerate = () => {
    setError(null);
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
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

  // Determine the current state
  let currentState: 'loading' | 'error' | 'no-data' | 'ready' | 'private' | 'upgrade' = 'loading';
  
  if (isPrivateRepo) {
    currentState = 'private';
  } else if (planLoading || publicLoading) {
    currentState = 'loading';
  } else if (!canAccess) {
    currentState = 'upgrade';
  } else if (error) {
    currentState = 'error';
  } else if (analysisDataObj || markdownContent) {
    currentState = 'ready';
  } else if (!overallLoading) {
    currentState = 'no-data';
  }

  const renderContent = () => {
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
          <AnalysisHeader
            versions={versions || []}
            isLoadingVersions={versionsLoading}
            selectedVersion={selectedVersion}
            onVersionChange={setSelectedVersion}
            onRegenerate={handleRegenerate}
            onCopyMarkdown={handleCopyMarkdown}
            markdown={analysisDataObj?.markdown || markdownContent}
            isRegenerating={shouldAnalyze}
            canAccess={canAccess}
            showCopyButton={config.showCopyButton === true}
          />

          {analysisDataObj && (
            <AnalysisContent
              data={analysisDataObj}
              title={config.title}
              showMetricsBar={config.showMetricsBar}
              renderCustomMetrics={config.renderCustomMetrics}
              getMetricColor={config.getMetricColor}
            />
          )}

          {markdownContent && !analysisDataObj && (
            <AnalysisContent
              data={{ markdown: markdownContent }}
              title={config.title}
            />
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
  };

  return (
    <AnalysisStateHandler
      state={currentState}
      error={error ?? undefined}
      isRegenerating={shouldAnalyze || overallLoading}
      onRegenerate={handleRegenerate}
      message={
        currentState === 'loading'
          ? config.loadingMessage
          : currentState === 'error'
          ? error ?? 'An error occurred'
          : undefined
      }
      title={
        currentState === 'private'
          ? 'Repository is Private'
          : currentState === 'no-data'
          ? config.noDataTitle
          : undefined
      }
      description={
        currentState === 'private'
          ? config.privateRepoMessage
          : currentState === 'no-data'
          ? config.noDataDescription
          : undefined
      }
      filesSelected={
        currentState === 'no-data'
          ? { selected: selectedFiles.length, total: files.length }
          : undefined
      }
    >
      {currentState === 'upgrade' ? <SubscriptionUpgrade /> : renderContent()}
    </AnalysisStateHandler>
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
