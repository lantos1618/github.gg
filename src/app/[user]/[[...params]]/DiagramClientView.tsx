"use client";
import { useRepoData } from '@/lib/hooks/useRepoData';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { RepoHeader } from '@/components/RepoHeader';
import RepoTabsBar from '@/components/RepoTabsBar';

function DiagramClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
    const { files, totalFiles } = useRepoData({ user, repo, ref: refName, path });
    const { copyAllContent, isCopying, copied } = useCopyRepoFiles(files);

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
            <RepoTabsBar />
            <div className="max-w-screen-xl w-full mx-auto px-4 text-center mt-8">
                <h1>Diagram View</h1>
                <p>This is a placeholder for the diagram view for <b>{user}/{repo}</b>.</p>
            </div>
        </>
    );
}

export default DiagramClientView;
