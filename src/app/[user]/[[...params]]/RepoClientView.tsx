"use client";
import { useState, useMemo } from 'react';
import React from 'react';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { FileTreeSidebar } from '@/components/FileTreeSidebar';
import { EnhancedCodeViewer } from '@/components/EnhancedCodeViewer';
import RepoSkeleton from '@/components/RepoSkeleton';
import { RepoStatus } from '@/components/RepoStatus';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useSelectedFiles } from '@/contexts/SelectedFilesContext';
import { FolderTree } from 'lucide-react';

interface RepoClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
}

interface RepoClientViewInnerProps extends RepoClientViewProps {
  files: any[];
  isLoading: boolean;
  error: unknown;
}

// Inner component that uses the context
function RepoClientViewInner({ user, repo, refName, path, files, isLoading, error }: RepoClientViewInnerProps) {
  const { selectedFilePaths, toggleFile } = useSelectedFiles();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Get selected file objects
  const selectedFiles = useMemo(() => {
    return files.filter(f => selectedFilePaths.has(f.path));
  }, [files, selectedFilePaths]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8">
        <RepoSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl w-full mx-auto px-2 sm:px-4 pt-2 sm:pt-4">
          <div className="flex gap-2 sm:gap-4 h-[calc(100vh-200px)]">
            {/* Mobile toggle button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed bottom-6 left-6 z-30 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              title="Open file tree"
            >
              <FolderTree className="w-6 h-6" />
            </button>

            {/* File Tree Sidebar */}
            <div className="hidden lg:block lg:w-80 flex-shrink-0 h-full">
              <FileTreeSidebar
                files={files}
                selectedFiles={selectedFilePaths}
                onToggleFile={toggleFile}
                className="h-full rounded-lg shadow-sm"
              />
            </div>

            {/* Mobile Sidebar */}
            <div className="lg:hidden">
              <FileTreeSidebar
                files={files}
                selectedFiles={selectedFilePaths}
                onToggleFile={toggleFile}
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
      <RepoStatus error={error ? { message: String(error) } : null} />
    </div>
  );
}

// Outer wrapper that provides context
export default function RepoClientView(props: RepoClientViewProps) {
  // Fetch files once at the top level
  const { files, isLoading, error } = useRepoData({
    user: props.user,
    repo: props.repo,
    ref: props.refName,
    path: props.path
  });

  return (
    <RepoPageLayout
      user={props.user}
      repo={props.repo}
      refName={props.refName}
      files={files}
      totalFiles={files.length}
    >
      <RepoClientViewInner
        {...props}
        files={files}
        isLoading={isLoading}
        error={error}
      />
    </RepoPageLayout>
  );
}
