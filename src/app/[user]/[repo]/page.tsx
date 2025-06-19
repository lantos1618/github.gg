'use client';

import { trpc } from '@/lib/trpc/client';
import { useParams } from 'next/navigation';

export default function RepoPage() {
  const params = useParams();
  const user = params.user as string;
  const repo = params.repo as string;

  const { data: repoData, isLoading, error } = trpc.github.files.useQuery({
    owner: user,
    repo: repo,
    maxFiles: 100,
  });

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

  const files = repoData?.files || [];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          {user}/{repo}
        </h1>
        
        {files.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Repository Files</h2>
            <div className="grid gap-2">
              {files.map((file: { path: string; content: string }, index: number) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="font-mono text-sm">{file.path}</div>
                  {file.content && (
                    <div className="mt-2 text-xs text-gray-600">
                      Size: {file.content.length} characters
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No files found in repository</div>
        )}
      </div>
    </div>
  );
} 