"use client";

import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import { FileList } from '@/components/FileList';
import { RepoFile } from '@/types/repo';
import RepoSkeleton from '@/components/RepoSkeleton';
import { useRouter, usePathname } from 'next/navigation';
import { REPO_TABS } from '@/lib/repoTabs';
import RepoTabs from '@/components/RepoTabs';

interface RepoClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  currentPath: string;
  params: { user: string; repo?: string[] };
}

export default function RepoClientView({ user, repo, refName, path }: RepoClientViewProps) {
  const {
    files,
    totalFiles,
    isLoading,
  } = useRepoData({ user, repo, ref: refName, path });

  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files as RepoFile[]);

  // Tabs logic (client-side)
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = REPO_TABS.find(tab => {
    if (tab.url) return pathname === tab.url(user, repo, refName, path);
    return pathname.endsWith(`/${tab.key}`);
  })?.key || 'wiki';
  const handleTabChange = (key: string) => {
    const tab = REPO_TABS.find(t => t.key === key);
    if (tab) {
      if (tab.onClick) {
        tab.onClick(user, repo, router, refName, path);
      } else if (tab.url) {
        router.push(tab.url(user, repo, refName, path));
      }
    }
  };

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
      <RepoTabs tabs={REPO_TABS} activeTab={activeTab} onTabChange={handleTabChange} />
      <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
        {isLoading ? <RepoSkeleton /> : <FileList files={files as RepoFile[]} />}
      </div>
    </>
  );
} 