"use client";

import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';
import { trpc } from '@/lib/trpc/client';
import { LoadingWave } from '@/components/LoadingWave';
import { useEffect, useState } from 'react';
// Lexical imports for shadcn-editor markdown rendering
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { OverflowNode } from '@lexical/overflow';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { useEffect as useLexicalEffect } from 'react';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';

// No-op error boundary for Lexical
function NoopErrorBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Read-only Markdown viewer using Lexical
function MarkdownViewer({ markdown }: { markdown: string }) {
  const initialConfig = {
    namespace: 'ScorecardMarkdownViewer',
    theme: {},
    editable: false,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      LinkNode,
      AutoLinkNode,
      OverflowNode,
    ],
    onError: (error: Error) => {
      console.error(error);
    },
  };

  // Load markdown into Lexical editor
  function MarkdownContentLoader({ markdown }: { markdown: string }) {
    const [editor] = useLexicalComposerContext();
    useLexicalEffect(() => {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      });
    }, [editor, markdown]);
    return null;
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <MarkdownContentLoader markdown={markdown} />
      <RichTextPlugin
        contentEditable={<ContentEditable className="markdown-content prose prose-lg max-w-none" />}
        placeholder={null}
        ErrorBoundary={NoopErrorBoundary}
      />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
    </LexicalComposer>
  );
}

// Main Scorecard Client View
export default function ScorecardClientView({ user, repo, refName,  path }: { user: string; repo: string; refName?: string; path?: string }) {
  const { files, totalFiles, isLoading: filesLoading } = useRepoData({ user, repo, ref: refName, path });
  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files);
  const [scorecardData, setScorecardData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateScorecardMutation = trpc.scorecard.generateScorecard.useMutation();

  useEffect(() => {
    if (files.length > 0 && !filesLoading && !scorecardData && !isLoading) {
      setIsLoading(true);
      setError(null);
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
  }, [files, filesLoading, scorecardData, isLoading, user, repo, refName, generateScorecardMutation]);

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
      <RepoTabsBar  />
      <div className="max-w-screen-xl w-full mx-auto px-4 py-8">
        {overallLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingWave />
            <p className="mt-4 text-gray-600">Analyzing repository...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Analysis Failed</h2>
            <p className="text-gray-600">Unable to generate scorecard for this repository.</p>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
          </div>
        ) : scorecardData ? (
          <MarkdownViewer markdown={scorecardData} />
        ) : (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Scorecard Available</h2>
            <p className="text-gray-500">Unable to generate scorecard for this repository.</p>
          </div>
        )}
      </div>
    </>
  );
} 