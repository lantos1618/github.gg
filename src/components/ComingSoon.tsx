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
  showContributeSection?: boolean;
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
  showContributeSection = false,
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
          <CardContent className="space-y-6">
            <p className="text-gray-600">{description}</p>

            {showContributeSection && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Want to contribute this feature?
                </h3>
                <p className="text-gray-700 mb-4">
                  gh.gg is open source! You can help implement this feature by contributing to the repository.
                </p>
                <div className="space-y-3">
                  <a
                    href="https://github.com/lantos1618/github.gg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    View on GitHub
                  </a>
                  <p className="text-sm text-gray-600">
                    Check out the existing codebase, open an issue to discuss your approach, or submit a pull request!
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RepoPageLayout>
  );
}
