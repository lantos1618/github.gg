"use client";
import RepoPageLayout from "@/components/layouts/RepoPageLayout";
import { useRepoData } from '@/lib/hooks/useRepoData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ComingSoonProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
}

export default function ComingSoon({
  user,
  repo,
  refName,
  path,
  title,
  description,
  icon: Icon,
  iconColor = 'text-gray-600',
}: ComingSoonProps) {
  const { files, totalFiles } = useRepoData({ user, repo, ref: refName, path });

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
