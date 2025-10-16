"use client";
import RepoPageLayout from "@/components/layouts/RepoPageLayout";
import { useRepoData } from '@/lib/hooks/useRepoData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Workflow } from 'lucide-react';

export default function DataFlowClientView({
  user,
  repo,
  refName,
  path
}: {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
}) {
  const { files, isLoading: filesLoading, totalFiles } = useRepoData({ user, repo, ref: refName, path });

  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
      <div className="max-w-screen-xl w-full mx-auto px-4 pt-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-6 w-6 text-indigo-600" />
              Data Flow Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Data flow visualization and analysis coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </RepoPageLayout>
  );
}
