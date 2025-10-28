import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import { createCaller } from '@/lib/trpc/server';
import { incrementViewCount } from './actions';
import { DeleteWikiButton } from '@/components/wiki/DeleteWikiButton';
import { auth } from '@/lib/auth';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { headers } from 'next/headers';
import { RepoSidebarLayout } from '@/components/layouts/RepoSidebarLayout';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

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

  // Check if user has permission to delete wiki
  let canDeleteWiki = false;
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList } as Request);
    if (session?.user) {
      const githubService = await createGitHubServiceForUserOperations(session);
      const { data: repoData } = await githubService['octokit'].repos.get({
        owner,
        repo,
      });
      canDeleteWiki = !!(repoData.permissions?.admin || repoData.permissions?.push);
    }
  } catch (error) {
    console.error('Failed to check repository permissions:', error);
  }

  // Increment view count (server action)
  incrementViewCount({ owner, repo, slug, version: page.version });

  // Map TOC pages to the format expected by the sidebar
  const wikiPages = toc.pages.map(p => ({ slug: p.slug, title: p.title }));

  return (
    <RepoSidebarLayout owner={owner} repo={repo} wikiPages={wikiPages}>
      <div className="min-h-screen bg-background">
        {/* Content container that respects sidebar */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Breadcrumb & Meta Header */}
          <div className="mb-8 pb-6 border-b border-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <Link
                href={`/wiki/${owner}/${repo}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to wiki</span>
              </Link>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>{page.viewCount} views</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">v{page.version}</span>
                </div>
                {canDeleteWiki && <DeleteWikiButton owner={owner} repo={repo} />}
              </div>
            </div>
          </div>

          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              {page.title}
            </h1>
            {page.summary && (
              <p className="text-lg text-muted-foreground leading-relaxed">
                {page.summary}
              </p>
            )}
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Updated {new Date(page.updatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Markdown Content */}
          <MarkdownRenderer content={page.content} />

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <p>
                Auto-generated by{' '}
                <Link href="/" className="font-semibold text-foreground hover:text-primary transition-colors">
                  gh.gg
                </Link>
              </p>
              <Link
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-foreground transition-colors font-medium"
              >
                View on GitHub
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </RepoSidebarLayout>
  );
}
