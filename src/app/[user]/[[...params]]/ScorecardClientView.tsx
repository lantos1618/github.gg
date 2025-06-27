"use client";

import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import { trpc } from '@/lib/trpc/client';
import { LoadingWave } from '@/components/LoadingWave';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Main Scorecard Client View
export default function ScorecardClientView({ user, repo, refName,  path }: { user: string; repo: string; refName?: string; path?: string }) {
  const { files, totalFiles, isLoading: filesLoading, error: filesError } = useRepoData({ user, repo, ref: refName, path });
  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files);
  const [scorecardData, setScorecardData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const generateScorecardMutation = trpc.scorecard.generateScorecard.useMutation();

  // Debug logging
  console.log('ScorecardClientView Debug:', { 
    user, 
    repo, 
    refName, 
    path, 
    filesLength: files.length, 
    filesLoading, 
    filesError,
    scorecardData: !!scorecardData, 
    isLoading,
    mutationLoading: generateScorecardMutation.isPending,
    mutationError: generateScorecardMutation.error
  });

  useEffect(() => {
    // Reset state when user/repo changes
    if (user || repo) {
      setScorecardData(null);
      setError(null);
      setHasGenerated(false);
    }
  }, [user, repo]);

  useEffect(() => {
    console.log('useEffect triggered:', { 
      filesLength: files.length, 
      filesLoading, 
      isLoading,
      hasGenerated,
      shouldTrigger: files.length > 0 && !filesLoading && !isLoading && !hasGenerated 
    });
    
    if (files.length > 0 && !filesLoading && !isLoading && !hasGenerated) {
      console.log('Triggering scorecard generation for:', { user, repo, filesCount: files.length });
      setIsLoading(true);
      setError(null);
      setHasGenerated(true);
      generateScorecardMutation.mutate(
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
            console.log('Scorecard generated successfully', data.scorecard);
            setScorecardData(data.scorecard);
            setIsLoading(false);
          },
          onError: (err) => {
            console.error('Scorecard generation failed:', err);
            setError(err.message || 'Failed to generate scorecard');
            setIsLoading(false);
          },
        }
      );
    }
  }, [files, filesLoading, isLoading, hasGenerated, user, repo, refName, generateScorecardMutation]);

  const overallLoading = filesLoading || isLoading;

  // Debug: Log state before rendering
  console.log('RENDER', { scorecardData, isLoading, filesLoading, error });

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
      <RepoTabsBar  />
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
        ) : scorecardData ? (
          <MarkdownCardRenderer markdown={scorecardData} />
        ) : error ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Analysis Failed</h2>
            <p className="text-gray-600">Unable to generate scorecard for this repository.</p>
            <p className="text-sm text-gray-500 mt-2">
              {error.toLowerCase().includes('quota') || error.includes('429')
                ? 'The AI analysis quota has been exceeded. Please try again later or check your Gemini API plan.'
                : error}
            </p>
          </div>
        ) : (
          // Debug: Render static markdown if scorecardData is empty
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
    </>
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
              code({node, inline, className, children, ...props}: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow as any}
                    language={match[1]}
                    PreTag="div"
                    {...props}
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