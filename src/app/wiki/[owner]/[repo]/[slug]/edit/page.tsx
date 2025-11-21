import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createCaller } from '@/lib/trpc/server';
import { auth } from '@/lib/auth';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { headers } from 'next/headers';
import { EditWikiClient } from './EditWikiClient';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WikiPermissionCheck');

interface EditWikiPageProps {
  params: Promise<{
    owner: string;
    repo: string;
    slug: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Edit Wiki Page',
};

export default async function EditWikiPage({ params }: EditWikiPageProps) {
  const { owner, repo, slug } = await params;

  const caller = await createCaller();
  const [page, toc] = await Promise.all([
    caller.wiki.getWikiPage({
      owner,
      repo,
      slug,
    }),
    caller.wiki.getWikiTableOfContents({
      owner,
      repo,
    }),
  ]);

  if (!page) {
    notFound();
  }

  // Check if user has permission to edit
  let canEdit = false;
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList } as Request);
    if (session?.user) {
      const githubService = await createGitHubServiceForUserOperations(session);
      const { data: repoData } = await githubService['octokit'].repos.get({
        owner,
        repo,
      });
      canEdit = !!(repoData.permissions?.admin || repoData.permissions?.push);
    }
  } catch (error) {
    logger.error('Failed to check repository permissions', error);
  }

  if (!canEdit) {
    redirect(`/wiki/${owner}/${repo}/${slug}`);
  }

  const wikiPages = toc.pages.map(p => ({ slug: p.slug, title: p.title }));

  return (
    <EditWikiClient
      owner={owner}
      repo={repo}
      slug={slug}
      initialTitle={page.title}
      initialContent={page.content}
      initialSummary={page.summary || ''}
      wikiPages={wikiPages}
    />
  );
}
