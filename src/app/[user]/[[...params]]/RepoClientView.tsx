"use client";
import { useState } from 'react';
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { FileTreeSidebar } from '@/components/FileTreeSidebar';
import { EnhancedCodeViewer } from '@/components/EnhancedCodeViewer';
import RepoSkeleton from '@/components/RepoSkeleton';
import { RepoStatus } from '@/components/RepoStatus';
import { useRepoData } from '@/lib/hooks/useRepoData';
import { RepoFile } from '@/types/repo';

interface RepoClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
}

export default function RepoClientView({ user, repo, refName, path }: RepoClientViewProps) {
  const { files, isLoading, error, totalFiles } = useRepoData({ user, repo, ref: refName, path });
  const [selectedFile, setSelectedFile] = useState<RepoFile | null>(null);

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
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile?.path}
                className="h-full rounded-lg shadow-sm"
              />
            </div>

            {/* Code Viewer */}
            <div className="flex-1 overflow-auto">
              <EnhancedCodeViewer file={selectedFile} />
            </div>
          </div>
        )}
        <RepoStatus error={error ? { message: String(error) } : null} />
      </div>
    </RepoPageLayout>
  );
}
