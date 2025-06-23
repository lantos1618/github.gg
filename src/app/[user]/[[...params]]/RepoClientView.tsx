"use client";

import { useState } from 'react';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoLayout } from '@/components/RepoLayout';
import { RepoHeader } from '@/components/RepoHeader';
import { FileList } from '@/components/FileList';
import { RepoFile } from '@/types/repo';

interface RepoClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  currentPath: string;
  params: { user: string; repo?: string[] };
}

export default function RepoClientView({ user, repo, refName, path, currentPath, params }: RepoClientViewProps) {
  const {
    files,
    totalFiles,
  } = useRepoData({ user, repo, ref: refName, path });

  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files as RepoFile[]);

  // Wiki state
  const [wiki, setWiki] = useState<string | null>(null);
  const [isGeneratingWiki, setIsGeneratingWiki] = useState(false);

  // Wiki generation handler (placeholder)
  const handleGenerateWiki = async () => {
    setIsGeneratingWiki(true);
    // TODO: Integrate Gemini AI call here
    setTimeout(() => {
      setWiki('This is a placeholder for the generated wiki.');
      setIsGeneratingWiki(false);
    }, 2000);
  };

  // Insights logic
  const isInsightsPath = currentPath.endsWith('insights');
  const nextInsightsUrl = `${typeof window !== 'undefined' ? window.location.pathname : ''}/insights`;

  if (isInsightsPath) {
    if (files.length > 0) {
      // Folder exists: show contents + prompt
      return (
        <RepoLayout>
          <RepoHeader
            user={user}
            repo={repo}
            onCopyAll={copyAllContent}
            isCopying={isCopying}
            copied={copied}
            fileCount={totalFiles}
          />
          <FileList files={files as RepoFile[]} />
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p>
              Did you mean to view the repository's{' '}
              <a href={nextInsightsUrl} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                Insights
              </a>
              ?
            </p>
          </div>
        </RepoLayout>
      );
    } else {
      // Folder missing: show special insights view
      return (
        <RepoLayout>
          <div style={{ padding: 32, textAlign: 'center' }}>
            <h1>Insights View</h1>
            <p>This is where the insights for the repo would be rendered.</p>
          </div>
        </RepoLayout>
      );
    }
  }

  return (
    <RepoLayout>
      <RepoHeader
        user={user}
        repo={repo}
        onCopyAll={copyAllContent}
        isCopying={isCopying}
        copied={copied}
        fileCount={totalFiles}
      />
      <div style={{ marginBottom: 24 }}>
        <h2>Wiki</h2>
        {wiki ? (
          <div>{wiki}</div>
        ) : (
          <button onClick={handleGenerateWiki} disabled={isGeneratingWiki}>
            {isGeneratingWiki ? 'Generating Wiki...' : 'Generate Wiki'}
          </button>
        )}
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
        <FileList files={files as RepoFile[]} />
      </div>
    </RepoLayout>
  );
} 