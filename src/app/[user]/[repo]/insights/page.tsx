'use client';

import { useState } from 'react';
import { RepoInsights } from '@/lib/analysis/insights';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { RepoLayout } from '@/components/RepoLayout';
import { RepoHeader } from '@/components/RepoHeader';
import { RepoStatus } from '@/components/RepoStatus';
import { InsightsOverview } from '@/components/insights/InsightsOverview';
import { LanguageBreakdown } from '@/components/insights/LanguageBreakdown';
import { QualityMetrics } from '@/components/insights/QualityMetrics';
import { RecommendationsList } from '@/components/insights/RecommendationsList';
import { InsightsRefreshButton } from '@/components/insights/InsightsRefreshButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

export default function InsightsPage() {
  const { 
    params,
    isLoading: repoLoading, 
    error: repoError, 
    files, 
    totalFiles, 
    copyAllContent, 
    isCopying, 
    copied 
  } = useRepoData();

  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get cached insights
  const { 
    data: insightsData, 
    isLoading: insightsLoading, 
    error: insightsError,
    refetch: refetchInsights 
  } = trpc.insights.getInsights.useQuery({
    user: params.user,
    repo: params.repo,
    ref: params.ref || 'main',
  }, {
    enabled: !!params.user && !!params.repo,
  });

  // Cache insights mutation
  const cacheInsightsMutation = trpc.insights.cacheInsights.useMutation();
  const clearCacheMutation = trpc.insights.clearCache.useMutation();

  const triggerAnalysis = async () => {
    if (!files || files.length === 0) return;

    setIsRefreshing(true);
    
    try {
      // Clear existing cache first
      await clearCacheMutation.mutateAsync({
        user: params.user,
        repo: params.repo,
        ref: params.ref || 'main',
      });

      // TODO: Implement AI analysis here
      // For now, we'll create a basic insights object
      const basicInsights: RepoInsights = {
        overview: {
          totalFiles: files.length,
          summary: `Repository with ${files.length} files`,
          totalSize: `${files.reduce((sum, f) => sum + f.content.length, 0).toLocaleString()} characters`,
          mainLanguage: 'Mixed',
          complexity: 'medium',
        },
        languages: [
          {
            name: 'Mixed',
            files: files.length,
            percentage: 100,
            lines: files.reduce((sum, f) => sum + f.content.split('\n').length, 0),
          }
        ],
        architecture: {
          patterns: [],
          dependencies: [],
          structure: {
            type: 'monolith',
            description: 'Standard repository structure',
          },
        },
        quality: {
          score: 75,
          metrics: {
            maintainability: 70,
            testCoverage: 60,
            documentation: 50,
            complexity: 65,
          },
          issues: [],
        },
        recommendations: [
          {
            title: 'Implement comprehensive testing',
            description: 'Add unit tests and integration tests',
            priority: 'medium' as const,
            category: 'maintainability' as const,
            action: 'Create test files for each module',
          }
        ],
        security: {
          vulnerabilities: [],
          dependencies: {
            outdated: [],
            vulnerable: [],
          },
        },
        performance: {
          bottlenecks: [],
          optimization: [],
        },
      };

      // Cache the insights
      await cacheInsightsMutation.mutateAsync({
        user: params.user,
        repo: params.repo,
        ref: params.ref || 'main',
        insights: basicInsights,
      });

      // Refetch to get the cached data
      await refetchInsights();
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    triggerAnalysis();
  };

  // Use cached insights if available
  const insights = insightsData?.insights as RepoInsights | null;
  const aiLoading = insightsLoading;
  const aiError = insightsError;

  if (repoLoading) {
    return (
      <RepoLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </RepoLayout>
    );
  }

  if (repoError) {
    return (
      <RepoLayout>
        <RepoStatus error={repoError} />
      </RepoLayout>
    );
  }

  return (
    <RepoLayout>
      <RepoHeader
        user={params.user}
        repo={params.repo}
        onCopyAll={copyAllContent}
        isCopying={isCopying}
        copied={copied}
        fileCount={totalFiles}
      />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Repository Insights</h1>
          </div>
          <InsightsRefreshButton 
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing || aiLoading}
            lastUpdated={lastUpdated || (insightsData?.lastUpdated ? new Date(insightsData.lastUpdated) : undefined)}
          />
        </div>

        {aiError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span>Analysis failed: {aiError.message || 'Unknown error'}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!insights && (aiLoading || isRefreshing) && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold mb-2">Analyzing Repository</h3>
              <p className="text-gray-600">
                Our AI is analyzing {files?.length || 0} files to provide insights...
              </p>
            </div>
          </div>
        )}

        {insights && (
          <div className="space-y-8">
            <InsightsOverview overview={insights.overview} />
            <LanguageBreakdown languages={insights.languages} />
            <QualityMetrics quality={insights.quality} />
            <RecommendationsList recommendations={insights.recommendations} />
          </div>
        )}
      </div>
    </RepoLayout>
  );
} 