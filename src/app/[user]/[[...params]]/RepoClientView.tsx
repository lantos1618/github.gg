"use client";
import RepoPageLayout from '@/components/layouts/RepoPageLayout';
import { FileList } from '@/components/FileList';
import RepoSkeleton from '@/components/RepoSkeleton';
import { RepoStatus } from '@/components/RepoStatus';

interface RepoClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  tab?: string;
  currentPath?: string;
}

export default function RepoClientView({ user, repo, refName, path, tab, currentPath }: RepoClientViewProps) {
  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} path={path} tab={tab} currentPath={currentPath}>
      {({ files, isLoading, error }) => (
        <div className="max-w-screen-xl w-full mx-auto px-4 mt-8">
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
            {isLoading ? <RepoSkeleton /> : <FileList files={files} />}
          </div>
          <RepoStatus error={error} />
        </div>
      )}
    </RepoPageLayout>
  );
} 