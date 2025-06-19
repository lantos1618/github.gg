'use client';

import { trpc } from '@/lib/trpc/client';
import { useParams } from 'next/navigation';
import { useRepoStore } from '@/app/providers';
import { useEffect } from 'react';
import { LoadingWave, AnimatedTick } from '@/components/LoadingWave';

export default function RepoPage() {
  const params = useParams();
  const user = params.user as string;
  const repo = params.repo as string;
  const { setFiles, files, copyAllContent, isCopying, copied } = useRepoStore();

  const { data: repoData, isLoading, error } = trpc.github.files.useQuery({
    owner: user,
    repo: repo,
    maxFiles: 100,
  });

  useEffect(() => {
    if (repoData?.files) {
      setFiles(repoData.files);
    }
  }, [repoData?.files, setFiles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading repository files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">
          Error loading repository: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
          <h1 className="text-3xl font-bold text-gray-800">
            {user}/{repo}
          </h1>
          <button
            onClick={copyAllContent}
            disabled={isCopying}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>
              {isCopying ? 'Copying' : copied ? 'Copied!' : 'Copy All Content'}
            </span>
            {isCopying && <LoadingWave size="sm" color="white" />}
            {copied && <AnimatedTick size="sm" color="#10b981" />}
          </button>
        </div>
        
        {files.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-6">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200"
                >
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="font-mono text-sm text-gray-700">{file.path}</div>
                    <div className="text-xs text-gray-500">
                      {file.content?.length} characters
                    </div>
                  </div>
                  {file.content && (
                    <pre className="p-6 bg-gray-900 text-gray-100 overflow-x-auto">
                      <code className="text-sm font-mono leading-relaxed">
                        {file.content}
                      </code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 bg-white p-8 rounded-lg text-center">
            No files found in repository
          </div>
        )}
      </div>
    </div>
  );
} 