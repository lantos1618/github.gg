"use client";

import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import { useRouter, usePathname } from 'next/navigation';
import { REPO_TABS, buildRepoUrl } from '@/lib/repoTabs';
import RepoTabs from '@/components/RepoTabs';

export default function InsightsClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  const { files, totalFiles, isLoading } = useRepoData({ user, repo });
  const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files);

  // Tabs logic (client-side)
  const router = useRouter();
  const pathname = usePathname();
  const userRepo = { user, repo };
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
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h1>Insights View</h1>
        <p>This is where the insights for the repo would be rendered.</p>
      </div>
    </>
  );
} 