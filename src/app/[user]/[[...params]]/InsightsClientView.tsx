"use client";

import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import { trpc } from '@/lib/trpc/client';
import ReactMarkdown from 'react-markdown';
import { LoadingWave } from '@/components/LoadingWave';
import { useEffect, useState } from 'react';

export default function InsightsClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  const { files, totalFiles, isLoading: filesLoading } = useRepoData({ user, repo });
  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files);
  
  const [insightsData, setInsightsData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use mutation instead of query to avoid batching issues
  const generateInsightsMutation = trpc.insights.generateInsights.useMutation();

  useEffect(() => {
    if (files.length > 0 && !filesLoading && !insightsData && !isLoading) {
      setIsLoading(true);
      setError(null);
      
      generateInsightsMutation.mutate(
        {
          user,
          repo,
          ref: refName || 'main',
          files: files.map(file => ({
            path: file.path,
            content: file.content,
            size: file.size,
          })),
        },
        {
          onSuccess: (data) => {
            setInsightsData(data.insights);
            setIsLoading(false);
          },
          onError: (err) => {
            setError(err.message || 'Failed to generate insights');
            setIsLoading(false);
          },
        }
      );
    }
  }, [files, filesLoading, insightsData, isLoading, user, repo, refName, generateInsightsMutation]);

  const overallLoading = filesLoading || isLoading;

  return (
    <>
      <RepoHeader
        user={user}
        repo={repo}
        onCopyAll={copyAllContent}
        isCopying={isCopying}
        copied={copied}
        fileCount={totalFiles}
      />
      <RepoTabsBar user={user} repo={repo} refName={refName} path={path} />
      
      <div className="max-w-screen-xl w-full mx-auto px-4 py-8">
        {overallLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingWave />
            <p className="mt-4 text-gray-600">Analyzing repository...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Analysis Failed</h2>
            <p className="text-gray-600">Unable to generate insights for this repository.</p>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
          </div>
        ) : insightsData ? (
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{insightsData}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Insights Available</h2>
            <p className="text-gray-500">Unable to generate insights for this repository.</p>
          </div>
        )}
      </div>
    </>
  );
} 