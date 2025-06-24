"use client";
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';

export type RepoTab = {
  key: string;
  label: string;
};

export const REPO_TABS: RepoTab[] = [
  { key: 'wiki', label: 'Wiki' },
  { key: 'insights', label: 'Insights' },
  { key: 'diagram', label: 'Diagram' },
];

const TAB_SUFFIXES = REPO_TABS.map(tab => tab.key);

function stripTabFromUrl(url: string) {
  for (const suffix of TAB_SUFFIXES) {
    if (url.endsWith(`/${suffix}`)) {
      return url.slice(0, -suffix.length - 1);
    }
  }
  return url;
}

function getActiveTab(pathname: string): string {
  for (const tab of REPO_TABS) {
    if (pathname.endsWith(`/${tab.key}`)) {
      return tab.key;
    }
  }
  return 'wiki'; // Default to wiki
}

function handleTabChangeFactory(router: AppRouterInstance) {
  return (key: string) => {
    const { pathname } = window.location;
    const baseUrl = stripTabFromUrl(pathname);
    if (key === 'wiki') {
      if (pathname !== baseUrl) {
        router.replace(baseUrl);
      } else {
        window.location.reload();
      }
    } else {
      router.replace(`${baseUrl}/${key}`);
    }
  };
}

interface RepoTabsBarProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
}

export default function RepoTabsBar({ user, repo, refName, path }: RepoTabsBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const handleTabChange = handleTabChangeFactory(router);

  return (
    <div className="max-w-screen-xl w-full mx-auto px-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
        <TabsList>
          {REPO_TABS.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
} 