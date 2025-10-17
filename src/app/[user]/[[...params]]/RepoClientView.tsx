"use client";
import { useState, useMemo } from 'react';
import React from 'react';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { FileTreeSidebar } from '@/components/FileTreeSidebar';
import { EnhancedCodeViewer } from '@/components/EnhancedCodeViewer';
import RepoSkeleton from '@/components/RepoSkeleton';
import { RepoStatus } from '@/components/RepoStatus';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { Menu } from 'lucide-react';

interface RepoClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
}

export default function RepoClientView({ user, repo, refName, path }: RepoClientViewProps) {
  const { files, isLoading, error } = useRepoData({ user, repo, ref: refName, path });
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <RepoPageLayout
      user={user}
      repo={repo}
      refName={refName}
      files={selectedFiles}
      totalFiles={selectedFiles.length}
    >
      <div className="max-w-screen-xl w-full mx-auto px-2 sm:px-4 pt-2 sm:pt-4">
        {isLoading ? (
          <div className="p-4 sm:p-8">
            <RepoSkeleton />
          </div>
        ) : (
          <div className="flex gap-2 sm:gap-4 h-[calc(100vh-200px)]">
            {/* Mobile toggle button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed bottom-6 left-6 z-30 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              title="Open file tree"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* File Tree Sidebar */}
            <div className="hidden lg:block lg:w-80 flex-shrink-0">
              <FileTreeSidebar
                files={files}
                selectedFiles={selectedFilePaths}
                onToggleFile={handleToggleFile}
                className="h-full rounded-lg shadow-sm"
              />
            </div>

            {/* Mobile Sidebar */}
            <div className="lg:hidden">
              <FileTreeSidebar
                files={files}
                selectedFiles={selectedFilePaths}
                onToggleFile={handleToggleFile}
                className="h-full rounded-lg shadow-sm"
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(false)}
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
