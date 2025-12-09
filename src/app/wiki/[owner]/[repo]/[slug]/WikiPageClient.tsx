'use client';

import Link from 'next/link';
import { ArrowLeft, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { WikiPageMenu } from '@/components/wiki/WikiPageMenu';
import { WikiPageViewers } from '@/components/wiki/WikiPageViewers';
import { RepoSidebarLayout } from '@/components/layouts/RepoSidebarLayout';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { TableOfContents } from '@/components/ui/TableOfContents';

interface WikiPageClientProps {
  owner: string;
  repo: string;
  slug: string;
  version?: number;
  page: any; // Typed properly in a real scenario
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
        <div className="flex max-w-[1600px] mx-auto">
          {/* Main content container */}
          <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
              {/* Breadcrumb & Meta Header */}
              <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <Link
                    href={`/wiki/${owner}/${repo}`}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to wiki</span>
                  </Link>

                  <div className="flex items-center gap-2">
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
              </div>

              {/* Page Title & Metadata */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  {page.title}
                </h1>

                {page.summary && (
                  <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                    {page.summary}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>
                      Updated {new Date(page.updatedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <WikiPageViewers owner={owner} repo={repo} slug={slug} version={page.version} totalViewCount={page.viewCount} />
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>v{page.version}</span>
                  </div>
                </div>
              </div>

            {/* Markdown Content */}
            <MarkdownRenderer content={page.content} />

            {/* Next/Previous Navigation */}
            {(previousPage || nextPage) && (
              <nav className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4">
                  {previousPage ? (
                    <Link
                      href={`/wiki/${owner}/${repo}/${previousPage.slug}${version ? `?version=${version}` : ''}`}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-accent transition-colors group flex-1 max-w-sm"
                    >
                      <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground shrink-0" />
                      <div className="text-left">
                        <div className="text-xs text-muted-foreground mb-1">Previous</div>
                        <div className="font-medium text-sm group-hover:text-primary line-clamp-1">
                          {previousPage.title}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex-1" />
                  )}

                  {nextPage ? (
                    <Link
                      href={`/wiki/${owner}/${repo}/${nextPage.slug}${version ? `?version=${version}` : ''}`}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-accent transition-colors group flex-1 max-w-sm ml-auto"
                    >
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Next</div>
                        <div className="font-medium text-sm group-hover:text-primary line-clamp-1">
                          {nextPage.title}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </Link>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              </nav>
            )}
          </div>

          {/* Table of Contents - Right Sidebar */}
          <aside className="hidden xl:block xl:w-64 flex-shrink-0 py-6 pr-4">
            <TableOfContents content={page.content} />
          </aside>
        </div>
      </div>
    </RepoSidebarLayout>
  );
}

