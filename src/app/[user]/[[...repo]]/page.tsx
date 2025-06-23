import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { RepoLayout } from '@/components/RepoLayout';
import { RepoHeader } from '@/components/RepoHeader';
import { FileList } from '@/components/FileList';
import { RepoFile } from '@/types/repo';
// TODO: Import your Gemini AI integration for wiki generation

export default function RepoCatchAllPage({ params }: { params: { user: string; repo?: string[] } }) {
  // params.repo is an array: [repo, 'tree', ref, ...path]
  const repoParams = params.repo || [];
  const { 
    isLoading, 
    error, 
    files, 
    totalFiles, 
    copyAllContent, 
    isCopying, 
    copied 
  } = useRepoData();

  // Parse repo, ref, and path
  const repo = repoParams[0] || '';
  const isTree = repoParams[1] === 'tree';
  const ref = isTree ? repoParams[2] : null;
  const path = isTree ? repoParams.slice(3) : [];

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

  return (
    <RepoLayout>
      <RepoHeader
        user={params.user}
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