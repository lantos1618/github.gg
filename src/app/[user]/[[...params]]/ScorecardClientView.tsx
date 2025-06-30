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

export default function ScorecardClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  const [scorecardData, setScorecardData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const generateScorecardMutation = trpc.scorecard.generateScorecard.useMutation();
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery();

  // Get repo data
  const { files, isLoading: filesLoading, error: filesError, totalFiles } = useRepoData({ user, repo, ref: refName, path });

  useEffect(() => {
    if (user || repo) {
      setScorecardData(null);
      setError(null);
      setHasGenerated(false);
    }
  }, [user, repo]);

  // Handle scorecard generation when files are loaded
  useEffect(() => {
    if (files.length > 0 && !filesLoading && !isLoading && !hasGenerated) {
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
          onSuccess: (data) => {
            setScorecardData(data.scorecard);
            setIsLoading(false);
          },
          onError: (err) => {
            setError(err.message || 'Failed to generate scorecard');
            setIsLoading(false);
          },
        }
      );
    }
  }, [files, filesLoading, isLoading, hasGenerated, user, repo, refName, generateScorecardMutation]);

  const handleRetry = () => {
    setError(null);
    setHasGenerated(false);
    setIsLoading(false);
  };

  const overallLoading = filesLoading || isLoading;

  // If plan is loading, show nothing or a spinner
  if (planLoading) {
    return (
      <RepoPageLayout user={user} repo={repo} refName={refName} files={[]} totalFiles={0}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <LoadingWave />
        </div>
      </RepoPageLayout>
    );
  }

  // If user does not have a paid plan, show the upgrade component
  if (!currentPlan || currentPlan.plan === 'free') {
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
        {filesError ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Files Loading Failed</h2>
            <p className="text-gray-600">Unable to load repository files.</p>
            <p className="text-sm text-gray-500 mt-2">{String(filesError)}</p>
          </div>
        ) : overallLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingWave />
            <p className="mt-4 text-gray-600">
              {filesLoading ? 'Loading repository files...' : 'Analyzing repository...'}
            </p>
            {filesLoading && <p className="text-sm text-gray-500 mt-2">Files: {files.length}</p>}
            {!filesLoading && isLoading && <p className="text-sm text-gray-500 mt-2">Generating scorecard...</p>}
          </div>
        ) : error ? (
          <ErrorDisplay
            error={error}
            isPending={generateScorecardMutation.isPending}
            onRetry={handleRetry}
          />
        ) : scorecardData ? (
          <MarkdownCardRenderer markdown={scorecardData} />
        ) : (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Scorecard Available</h2>
            <p className="text-gray-500">Unable to generate scorecard for this repository.</p>
            <p className="text-sm text-gray-400 mt-2">Files loaded: {files.length}</p>
            <div className="mt-8">
              <MarkdownCardRenderer markdown={"# Test\nThis is a test markdown render. If you see this, MarkdownViewer works."} />
            </div>
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