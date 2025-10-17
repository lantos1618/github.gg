"use client";
import RepoPageLayout from "@/components/layouts/RepoPageLayout";
import { useRepoData } from '@/lib/hooks/useRepoData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, Box, Boxes, Workflow, Cog } from 'lucide-react';

const ICON_MAP = {
  GitBranch,
  Box,
  Boxes,
  Workflow,
  Cog,
} as const;

type IconName = keyof typeof ICON_MAP;

interface ComingSoonProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  title: string;
  description: string;
  iconName: IconName;
  iconColor?: string;
}

export default function ComingSoon({
  user,
  repo,
  refName,
  path,
  title,
  description,
  iconName,
  iconColor = 'text-gray-600',
}: ComingSoonProps) {
  const { files, totalFiles } = useRepoData({ user, repo, ref: refName, path });
  const Icon = ICON_MAP[iconName];

  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
      <div className="max-w-screen-xl w-full mx-auto px-4 pt-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className={`h-6 w-6 ${iconColor}`} />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{description}</p>
          </CardContent>
        </Card>
      </div>
    </RepoPageLayout>
  );
}
