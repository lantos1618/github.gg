"use client";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type RepoTab = {
  key: string;
  label: string;
  path: string;
};

export const REPO_TABS: RepoTab[] = [
  { key: 'files', label: 'Files', path: '' },
  { key: 'scorecard', label: 'Scorecard', path: 'scorecard' },
  { key: 'diagram', label: 'Diagram', path: 'diagram' },
];

export default function RepoTabsBar() {
  const router = useRouter();
  const pathname = usePathname();

  const { activeTab, basePath } = useMemo(() => {
    const segments = pathname.replace(/\/$/, '').split('/');
    const lastSegment = segments[segments.length - 1];
    const activeTab = REPO_TABS.find(tab => tab.path === lastSegment)?.key || 'files';
    const basePath = REPO_TABS.some(tab => tab.path === lastSegment) 
      ? segments.slice(0, -1).join('/') 
      : pathname.replace(/\/$/, '');
    
    return { activeTab, basePath };
  }, [pathname]);

  const handleTabChange = (key: string) => {
    const tab = REPO_TABS.find(t => t.key === key);
    const newPath = tab?.path ? `${basePath}/${tab.path}` : basePath;
    router.replace(newPath);
  };

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