"use client";
import { useState, useMemo } from 'react';
import React from 'react';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { FileExplorerDrawer } from '@/components/FileExplorerDrawer';
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
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);

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
      {/* File Explorer Tab Button */}
      <button
        onClick={() => setIsFileExplorerOpen(true)}
        className="fixed right-0 top-20 z-30 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-l-lg shadow-lg transition-all duration-200 flex items-center gap-2 border border-r-0 border-blue-700"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
        }}
        title="Open File Explorer"
      >
        <span className="text-sm font-medium tracking-wider">FILES</span>
        <FolderTree className="h-4 w-4" />
      </button>

      {/* Code Viewer */}
      <div className="h-[calc(100vh-200px)] overflow-auto">
        <EnhancedCodeViewer files={selectedFiles} />
      </div>

      {/* File Explorer Drawer */}
      <FileExplorerDrawer
        owner={user}
        repo={repo}
        files={files}
        selectedFiles={selectedFilePaths}
        onToggleFile={toggleFile}
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
      />

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
