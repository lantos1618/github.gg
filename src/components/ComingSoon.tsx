"use client";
import { RepoPageLayout } from "@/components/layouts/RepoPageLayout";
import { useRepoData } from '@/lib/hooks/useRepoData';
import { GitBranch, Box, Boxes, Workflow, Cog, Wrench } from 'lucide-react';

const ICON_MAP = {
  GitBranch,
  Box,
  Boxes,
  Workflow,
  Cog,
  Wrench,
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

export function ComingSoon({
  user,
  repo,
  refName,
  path,
  title,
  description,
  iconName,
  showContributeSection = false,
}: ComingSoonProps) {
  const { files, totalFiles } = useRepoData({ user, repo, ref: refName, path });

  return (
    <RepoPageLayout user={user} repo={repo} refName={refName} files={files} totalFiles={totalFiles}>
      <div className="w-[90%] max-w-[800px] mx-auto py-16">
        <div className="text-[11px] text-[#aaa] font-semibold tracking-[1.5px] uppercase mb-3">
          Coming Soon
        </div>
        <h2 className="text-[26px] font-semibold text-[#111] mb-2">{title}</h2>
        <p className="text-[14px] text-[#666] leading-[1.6] mb-8">{description}</p>

        {showContributeSection && (
          <div className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #4285f4' }}>
            <div className="text-[12px] font-semibold uppercase tracking-[1px] text-[#4285f4] mb-1">
              Contribute
            </div>
            <div className="text-[13px] text-[#333] leading-[1.6] mb-3">
              GG is open source. You can help implement this feature by contributing to the repository.
            </div>
            <a
              href="https://github.com/lantos1618/github.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-[#4285f4] hover:text-[#111] transition-colors font-medium"
            >
              View on GitHub &rarr;
            </a>
          </div>
        )}
      </div>
    </RepoPageLayout>
  );
}
