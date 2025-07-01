"use client";
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { FileList } from '@/components/FileList';
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

  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
      <div className="max-w-screen-xl w-full mx-auto px-4 mt-8">
        <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          {isLoading ? <RepoSkeleton /> : <FileList files={files} />}
        </div>
        <RepoStatus error={error ? { message: String(error) } : null} />
      </div>
    </RepoPageLayout>
  );
} 