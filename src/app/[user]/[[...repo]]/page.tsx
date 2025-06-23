import { useState } from 'react';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoLayout } from '@/components/RepoLayout';
import { RepoHeader } from '@/components/RepoHeader';
import { FileList } from '@/components/FileList';
import { RepoFile } from '@/types/repo';
// TODO: Import your Gemini AI integration for wiki generation

// Helper to parse repo, ref, and path from catch-all
function parseRepoParams(user: string, repoParams: string[] = []) {
  // /[user]/[repo]
  if (repoParams.length === 1) {
    return { repo: repoParams[0], ref: undefined, path: undefined };
  }
  // /[user]/[repo]/tree/[ref]/[...path]
  if (repoParams[1] === 'tree') {
    const ref = repoParams[2];
    const path = repoParams.length > 3 ? repoParams.slice(3).join('/') : undefined;
    return { repo: repoParams[0], ref, path };
  }
  // fallback
  return { repo: repoParams[0] || '', ref: undefined, path: undefined };
}

export default function RepoCatchAllPage({ params }: { params: { user: string; repo?: string[] } }) {
  const repoParams = params.repo || [];
  const { repo } = parseRepoParams(params.user, repoParams);

  const {
    files,
    totalFiles,
  } = useRepoData();

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