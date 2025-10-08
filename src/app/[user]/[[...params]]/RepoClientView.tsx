"use client";
import { useState, useMemo } from 'react';
import React from 'react';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { FileTreeSidebar } from '@/components/FileTreeSidebar';
import { EnhancedCodeViewer } from '@/components/EnhancedCodeViewer';
import RepoSkeleton from '@/components/RepoSkeleton';
import { RepoStatus } from '@/components/RepoStatus';
import { useRepoData } from '@/lib/hooks/useRepoData';

interface RepoClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
}

export default function RepoClientView({ user, repo, refName, path }: RepoClientViewProps) {
  const { files, isLoading, error, totalFiles } = useRepoData({ user, repo, ref: refName, path });
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());

  // Auto-select all files when files load
  React.useEffect(() => {
    if (files && files.length > 0) {
      setSelectedFilePaths(new Set(files.map(f => f.path)));
    }
  }, [files]);

  // Get selected file objects
  const selectedFiles = useMemo(() => {
    return files.filter(f => selectedFilePaths.has(f.path));
  }, [files, selectedFilePaths]);

  // Toggle file selection
  const handleToggleFile = (filePath: string) => {
    setSelectedFilePaths(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
      <div className="max-w-screen-xl w-full mx-auto mt-8">
        {isLoading ? (
          <div className="p-8">
            <RepoSkeleton />
          </div>
        ) : (
          <div className="flex gap-4 h-[calc(100vh-200px)]">
            {/* File Tree Sidebar */}
            <div className="w-80 flex-shrink-0">
              <FileTreeSidebar
                files={files}
                selectedFiles={selectedFilePaths}
                onToggleFile={handleToggleFile}
                className="h-full rounded-lg shadow-sm"
              />
            </div>

            {/* Code Viewer */}
            <div className="flex-1 overflow-auto">
              <EnhancedCodeViewer files={selectedFiles} />
            </div>
          </div>
        )}
        <RepoStatus error={error ? { message: String(error) } : null} />
      </div>
    </RepoPageLayout>
  );
}
