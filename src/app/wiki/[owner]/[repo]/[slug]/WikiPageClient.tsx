'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { WikiPageMenu } from '@/components/wiki/WikiPageMenu';
import { WikiPageViewers } from '@/components/wiki/WikiPageViewers';
import { RepoSidebarLayout } from '@/components/layouts/RepoSidebarLayout';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { CopyForAIButton } from '@/components/ui/copy-for-ai-button';
import { TableOfContents } from '@/components/ui/table-of-contents';

interface WikiPageClientProps {
  owner: string;
  repo: string;
  slug: string;
  version?: number;
  page: any;
  toc: any;
  branches: any[];
  defaultBranch: string;
  wikiPages: { slug: string; title: string }[];
  canEditWiki: boolean;
  previousPage: any;
  nextPage: any;
}

export function WikiPageClient({
  owner,
  repo,
  slug,
  version,
  page,
  toc,
  branches,
  defaultBranch,
  wikiPages,
  canEditWiki,
  previousPage,
  nextPage,
}: WikiPageClientProps) {
  return (
    <RepoSidebarLayout owner={owner} repo={repo} wikiPages={wikiPages} branches={branches} defaultBranch={defaultBranch}>
      <div className="min-h-screen">
        <div className="flex max-w-[1400px] mx-auto">
          <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumb */}
            <div className="mb-8 pb-6 border-b border-[#eee]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <Link
                  href={`/wiki/${owner}/${repo}`}
                  className="inline-flex items-center gap-2 text-base text-[#888] hover:text-[#111] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to wiki
                </Link>
                {canEditWiki && (
                  <WikiPageMenu
                    owner={owner}
                    repo={repo}
                    slug={slug}
                    pageTitle={page.title}
                    pageContent={page.content}
                  />
                )}
              </div>
            </div>

            {/* Title & Meta */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase">
                  Wiki
                </div>
                <CopyForAIButton
                  content={page.content}
                  title={page.title}
                  context={`Wiki page: ${owner}/${repo} · ${slug}`}
                />
              </div>
              <h1 className="text-[31px] sm:text-[31px] font-semibold text-[#111] tracking-tight mb-3">
                {page.title}
              </h1>
              {page.summary && (
                <p className="text-base text-[#666] leading-[1.6] mb-4">
                  {page.summary}
                </p>
              )}
              <div className="flex items-center gap-4 text-base text-[#aaa] flex-wrap">
                <span>
                  Updated {new Date(page.updatedAt).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </span>
                <WikiPageViewers owner={owner} repo={repo} slug={slug} version={page.version} totalViewCount={page.viewCount} />
                <span>v{page.version}</span>
              </div>
            </div>

            {/* Content */}
            <MarkdownRenderer content={page.content} />

            {/* Prev/Next */}
            {(previousPage || nextPage) && (
              <nav className="mt-12 pt-8 border-t border-[#eee]">
                <div className="flex items-center justify-between gap-4">
                  {previousPage ? (
                    <Link
                      href={`/wiki/${owner}/${repo}/${previousPage.slug}${version ? `?version=${version}` : ''}`}
                      className="flex items-center gap-2 py-3 px-4 bg-[#f8f9fa] hover:bg-[#f0f0f0] transition-colors group flex-1 max-w-sm"
                      style={{ borderLeft: '3px solid #ccc' }}
                    >
                      <ChevronLeft className="h-4 w-4 text-[#ccc] group-hover:text-[#111] shrink-0" />
                      <div className="text-left">
                        <div className="text-xs text-[#999] font-semibold tracking-[1px] uppercase mb-0.5">Previous</div>
                        <div className="text-base font-medium text-[#111] line-clamp-1">{previousPage.title}</div>
                      </div>
                    </Link>
                  ) : <div className="flex-1" />}

                  {nextPage ? (
                    <Link
                      href={`/wiki/${owner}/${repo}/${nextPage.slug}${version ? `?version=${version}` : ''}`}
                      className="flex items-center gap-2 py-3 px-4 bg-[#f8f9fa] hover:bg-[#f0f0f0] transition-colors group flex-1 max-w-sm ml-auto"
                      style={{ borderLeft: '3px solid #ccc' }}
                    >
                      <div className="text-right flex-1">
                        <div className="text-xs text-[#999] font-semibold tracking-[1px] uppercase mb-0.5">Next</div>
                        <div className="text-base font-medium text-[#111] line-clamp-1">{nextPage.title}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#ccc] group-hover:text-[#111] shrink-0" />
                    </Link>
                  ) : <div className="flex-1" />}
                </div>
              </nav>
            )}
          </div>

          {/* TOC Sidebar */}
          <aside className="hidden xl:block xl:w-64 flex-shrink-0 py-6 pr-4">
            <TableOfContents content={page.content} />
          </aside>
        </div>
      </div>
    </RepoSidebarLayout>
  );
}
