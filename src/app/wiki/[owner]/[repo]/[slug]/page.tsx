import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createCaller } from '@/lib/trpc/server';
import { incrementViewCount } from './actions';
import { WikiPageMenu } from '@/components/wiki/WikiPageMenu';
import { WikiPageViewers } from '@/components/wiki/WikiPageViewers';
import { auth } from '@/lib/auth';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { headers } from 'next/headers';
import { RepoSidebarLayout } from '@/components/layouts/RepoSidebarLayout';
import { MilkdownViewer } from '@/components/ui/MilkdownViewer';
import { TableOfContents } from '@/components/ui/TableOfContents';

interface WikiPageProps {
  params: Promise<{
    owner: string;
    repo: string;
    slug: string;
  }>;
  searchParams: Promise<{
    version?: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params, searchParams }: WikiPageProps): Promise<Metadata> {
  const { owner, repo, slug } = await params;
  const { version } = await searchParams;

  const caller = await createCaller();
  const page = await caller.wiki.getWikiPage({
    owner,
    repo,
    slug,
    version: version ? parseInt(version) : undefined,
  });

  if (!page) {
    return {
      title: 'Wiki Page Not Found',
    };
  }

  const title = `${page.title} - ${owner}/${repo} Documentation`;
  const description = page.summary || `Documentation for ${owner}/${repo}`;

  return {
    title,
    description,
    keywords: (page.metadata as { keywords?: string[] })?.keywords || [owner, repo, 'documentation', 'wiki'],
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://github.gg/wiki/${owner}/${repo}/${slug}`,
      siteName: 'gh.gg',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: page.isPublic,
      follow: page.isPublic,
    },
  };
}

export default async function WikiPage({ params, searchParams }: WikiPageProps) {
  const { owner, repo, slug } = await params;
  const { version } = await searchParams;

  const caller = await createCaller();
  const [page, toc] = await Promise.all([
    caller.wiki.getWikiPage({
      owner,
      repo,
      slug,
      version: version ? parseInt(version) : undefined,
    }),
    caller.wiki.getWikiTableOfContents({
      owner,
      repo,
      version: version ? parseInt(version) : undefined,
    }),
  ]);

  if (!page) {
    notFound();
  }

  // Check if user has permission to edit/delete wiki pages
  let canEditWiki = false;
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList } as Request);
    if (session?.user) {
      const githubService = await createGitHubServiceForUserOperations(session);
      const { data: repoData } = await githubService['octokit'].repos.get({
        owner,
        repo,
      });
      canEditWiki = !!(repoData.permissions?.admin || repoData.permissions?.push);
    }
  } catch (error) {
    console.error('Failed to check repository permissions:', error);
  }

  // Increment view count (server action)
  incrementViewCount({ owner, repo, slug, version: page.version });

  // Map TOC pages to the format expected by the sidebar
  const wikiPages = toc.pages.map(p => ({ slug: p.slug, title: p.title }));

  // Find current page index and get previous/next pages
  const currentIndex = toc.pages.findIndex(p => p.slug === slug);
  const previousPage = currentIndex > 0 ? toc.pages[currentIndex - 1] : null;
  const nextPage = currentIndex < toc.pages.length - 1 ? toc.pages[currentIndex + 1] : null;

  return (
    <RepoSidebarLayout owner={owner} repo={repo} wikiPages={wikiPages}>
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
            <MilkdownViewer content={page.content} />

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
