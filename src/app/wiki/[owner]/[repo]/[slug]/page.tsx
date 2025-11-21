import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createCaller } from '@/lib/trpc/server';
import { incrementViewCount } from './actions';
import { auth } from '@/lib/auth';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { headers } from 'next/headers';
import { WikiPageClient } from './WikiPageClient';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WikiPermissionCheck');

export const dynamicParams = true;

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
    alternates: {
      canonical: `https://github.gg/wiki/${owner}/${repo}/${slug}`,
    },
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

  // Fetch sidebar data server-side
  const [branchesResult, repoInfoResult] = await Promise.allSettled([
    caller.github.getBranches({ owner, repo }),
    caller.github.getRepoInfo({ owner, repo }),
  ]);

  const branches = branchesResult.status === 'fulfilled' ? branchesResult.value : [];
  const defaultBranch = repoInfoResult.status === 'fulfilled' ? repoInfoResult.value?.defaultBranch : 'main';

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
    logger.error('Failed to check repository permissions', error);
  }

  // Increment view count (server action)
  await incrementViewCount({ owner, repo, slug, version: page.version });

  // Map TOC pages to the format expected by the sidebar
  const wikiPages = toc.pages.map(p => ({ slug: p.slug, title: p.title }));

  // Find current page index and get previous/next pages
  const currentIndex = toc.pages.findIndex(p => p.slug === slug);
  const previousPage = currentIndex > 0 ? toc.pages[currentIndex - 1] : null;
  const nextPage = currentIndex < toc.pages.length - 1 ? toc.pages[currentIndex + 1] : null;

  return (
    <WikiPageClient
      owner={owner}
      repo={repo}
      slug={slug}
      version={version ? parseInt(version) : undefined}
      page={page}
      toc={toc}
      branches={branches}
      defaultBranch={defaultBranch}
      wikiPages={wikiPages}
      canEditWiki={canEditWiki}
      previousPage={previousPage}
      nextPage={nextPage}
    />
  );
}
