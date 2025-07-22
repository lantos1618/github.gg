"use client";
import RepoPageLayout from "@/components/layouts/RepoPageLayout";
import { trpc } from '@/lib/trpc/client';
import { LoadingWave } from '@/components/LoadingWave';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import type { ScorecardResponse } from '@/lib/types/scorecard';
import { VersionDropdown } from '@/components/VersionDropdown';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// Define a type for TRPC error responses
interface TRPCError { message: string }
function isTRPCError(err: unknown): err is TRPCError {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string';
}

export default function ScorecardClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  const [scorecardData, setScorecardData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  const { data: versions, isLoading: versionsLoading } = trpc.scorecard.getScorecardVersions.useQuery({ user, repo, ref: refName || 'main' });
  const generateScorecardMutation = trpc.scorecard.generateScorecard.useMutation();
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery();
  const utils = trpc.useUtils();

  // Use the public endpoint for cached scorecard (latest or by version)
  const { data: publicScorecard, isLoading: publicLoading } = trpc.scorecard.publicGetScorecard.useQuery(
    selectedVersion
      ? { user, repo, ref: refName || 'main', version: selectedVersion }
      : { user, repo, ref: refName || 'main' },
    { enabled: !!user && !!repo }
  );

  // Helper to extract scorecard data and metadata
  const scorecardDataObj = publicScorecard?.scorecard || null;
  const markdownContent = scorecardDataObj?.markdown || scorecardData;
  
  // Add client-side debug log for markdown content
  console.log('CLIENT DEBUG:', markdownContent);
  
  // Get repo data
  const { files, isLoading: filesLoading, totalFiles } = useRepoData({ user, repo, ref: refName, path });

  // Reset state when user/repo changes
  useEffect(() => {
    if (user || repo) {
      setScorecardData(null);
      setError(null);
      setHasGenerated(false);
    }
  }, [user, repo]);

  // Add regenerate handler
  const handleRegenerate = () => {
    setIsLoading(true);
    setError(null);
    setHasGenerated(true);
    generateScorecardMutation.mutate(
      {
        user,
        repo,
        ref: refName || 'main',
        files: files.map((file: { path: string; content: string; size: number }) => ({
          path: file.path,
          content: file.content,
          size: file.size,
        })),
      },
      {
        onSuccess: (data: ScorecardResponse) => {
          setScorecardData(data.scorecard.markdown);
          setIsLoading(false);
          // Invalidate/refetch scorecard and version list
          utils.scorecard.publicGetScorecard.invalidate();
          utils.scorecard.getScorecardVersions.invalidate();
        },
        onError: (err: TRPCError | string) => {
          if (typeof err === 'string') {
            setError(err);
          } else if (isTRPCError(err)) {
            setError(err.message);
          } else {
            setError('Failed to generate scorecard');
          }
          setIsLoading(false);
        },
      }
    );
  };

  // Auto-generate if no cached data
  useEffect(() => {
    if (files.length > 0 && !filesLoading && !isLoading && !hasGenerated && !scorecardDataObj) {
      setIsLoading(true);
      setError(null);
      setHasGenerated(true);
      generateScorecardMutation.mutate(
        {
          user,
          repo,
          ref: refName || 'main',
          files: files.map((file: { path: string; content: string; size: number }) => ({
            path: file.path,
            content: file.content,
            size: file.size,
          })),
        },
        {
          onSuccess: (data: ScorecardResponse) => {
            setScorecardData(data.scorecard.markdown);
            setIsLoading(false);
          },
          onError: (err: TRPCError | string) => {
            if (typeof err === 'string') {
              setError(err);
            } else if (isTRPCError(err)) {
              setError(err.message);
            } else {
              setError('Failed to generate scorecard');
            }
            setIsLoading(false);
          },
        }
      );
    }
  }, [files, filesLoading, isLoading, hasGenerated, user, repo, refName, generateScorecardMutation, scorecardDataObj]);

  const overallLoading = filesLoading || isLoading;
  const canAccess = currentPlan && currentPlan.plan !== 'free';

  // If a cached scorecard is available, show it
  if (scorecardDataObj) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
        <div className="max-w-screen-xl w-full mx-auto px-4 py-8">
          <VersionDropdown
            versions={versions}
            isLoading={versionsLoading}
            selectedVersion={selectedVersion}
            onVersionChange={setSelectedVersion}
          />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Removed last updated and cached status display */}
            </div>
            
            {canAccess && (
              <Button
                onClick={handleRegenerate}
                disabled={isLoading || generateScorecardMutation.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Generating...' : 'Regenerate'}
              </Button>
            )}
          </div>
          
          {/* Metrics Visualization */}
          {scorecardDataObj.metrics && Array.isArray(scorecardDataObj.metrics) && (
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
                    {scorecardDataObj.metrics.map((m: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-medium whitespace-nowrap">{m.metric}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span>{m.score}</span>
                            <div className="w-32 h-2 bg-gray-200 rounded">
                              <div
                                className="h-2 rounded bg-blue-500"
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
          <MarkdownCardRenderer markdown={scorecardDataObj.markdown} />
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
      <div className="max-w-screen-xl w-full mx-auto px-4 py-8">
        <VersionDropdown
          versions={versions}
          isLoading={versionsLoading}
          selectedVersion={selectedVersion}
          onVersionChange={setSelectedVersion}
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Removed last updated and cached status display */}
          </div>
          
          <Button
            onClick={handleRegenerate}
            disabled={isLoading || generateScorecardMutation.isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Generating...' : 'Regenerate'}
          </Button>
        </div>
        
        {error && (
          <ErrorDisplay
            error={error}
            isPending={generateScorecardMutation.isPending}
            onRetry={handleRegenerate}
          />
        )}
        {overallLoading && (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingWave />
            <p className="mt-4 text-gray-600">
              {filesLoading ? 'Loading repository files...' : 'Analyzing repository...'}
            </p>
            {filesLoading && <p className="text-sm text-gray-500 mt-2">Files: {files.length}</p>}
            {!filesLoading && isLoading && <p className="text-sm text-gray-500 mt-2">Generating scorecard...</p>}
          </div>
        )}
        {markdownContent && <MarkdownCardRenderer markdown={markdownContent} />}
        {!markdownContent && !overallLoading && !error && (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Scorecard Available</h2>
            <p className="text-gray-500">Unable to generate scorecard for this repository.</p>
            <p className="text-sm text-gray-400 mt-2">Files loaded: {files.length}</p>
          </div>
        )}
      </div>
    </RepoPageLayout>
  );
}

function MarkdownCardRenderer({ markdown }: { markdown: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Scorecard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="markdown-content min-h-[400px] rounded-md border border-input bg-background p-6 overflow-y-auto">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
                const match = /language-(\w+)/.exec(className || '');

                return !props.inline && match ? (
                  <SyntaxHighlighter
                    language={match[1]}
                    PreTag="div"
                    {...props}
                    style={tomorrow}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
} 