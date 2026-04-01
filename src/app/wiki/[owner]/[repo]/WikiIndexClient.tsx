'use client';

import Link from 'next/link';
import { WikiGenerationButton } from '@/components/WikiGenerationButton';
import { WikiIndexMenu } from '@/components/wiki/WikiIndexMenu';
import { RepoPageLayout } from '@/components/layouts/RepoPageLayout';

interface WikiIndexClientProps {
  owner: string;
  repo: string;
  version?: number;
  toc: any;
  branches: any[];
  defaultBranch: string;
  canEditWiki: boolean;
  wikiPages: { slug: string; title: string }[];
}

export function WikiIndexClient({
  owner,
  repo,
  version,
  toc,
  branches,
  defaultBranch,
  canEditWiki,
  wikiPages,
}: WikiIndexClientProps) {
  if (!toc || toc.pages.length === 0) {
    return (
      <RepoPageLayout user={owner} repo={repo} branches={branches} defaultBranch={defaultBranch} wikiPages={wikiPages}>
        <div className="w-[90%] max-w-[1100px] mx-auto py-12">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Wiki
          </div>
          <h2 className="text-[20px] font-semibold text-[#111] mb-2">{repo} Documentation</h2>
          <p className="text-base text-[#888] mb-8">No wiki documentation exists for this repository yet.</p>
          <WikiGenerationButton owner={owner} repo={repo} />
        </div>
      </RepoPageLayout>
    );
  }

  return (
    <RepoPageLayout user={owner} repo={repo} branches={branches} defaultBranch={defaultBranch} wikiPages={wikiPages}>
      <div className="w-[90%] max-w-[1100px] mx-auto py-12">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">Wiki</div>
            <h2 className="text-[20px] font-semibold text-[#111]">{repo} Documentation</h2>
            <p className="text-base text-[#888] mt-1">{toc.pages.length} {toc.pages.length === 1 ? 'page' : 'pages'}</p>
          </div>
          <WikiIndexMenu owner={owner} repo={repo} pages={toc.pages} canEdit={canEditWiki} />
        </div>

        <div className="border-b border-[#eee] mb-6" />

        <div className="space-y-[2px]">
          {toc.pages.map((page: any) => (
            <Link
              key={page.slug}
              href={`/wiki/${owner}/${repo}/${page.slug}${version ? `?version=${version}` : ''}`}
              className="flex items-center justify-between bg-[#f8f9fa] py-[12px] px-[16px] hover:bg-[#f0f0f0] transition-colors group"
              style={{ borderLeft: '3px solid #14b8a6' }}
            >
              <div>
                <div className="text-base font-medium text-[#111] group-hover:text-[#666]">{page.title}</div>
                {page.summary && (
                  <p className="text-base text-[#888] mt-0.5">{page.summary}</p>
                )}
              </div>
              <span className="text-[#ccc] group-hover:text-[#888] transition-colors">&rarr;</span>
            </Link>
          ))}
        </div>
      </div>
    </RepoPageLayout>
  );
}
