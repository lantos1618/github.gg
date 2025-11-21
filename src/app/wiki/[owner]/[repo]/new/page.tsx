import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createCaller } from '@/lib/trpc/server';
import { auth } from '@/lib/auth';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { headers } from 'next/headers';
import { NewWikiClient } from './NewWikiClient';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WikiPermissionCheck');

interface NewWikiPageProps {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

export const metadata: Metadata = {
  title: 'New Wiki Page',
};

export default async function NewWikiPage({ params }: NewWikiPageProps) {
  const { owner, repo } = await params;

  const caller = await createCaller();
  const toc = await caller.wiki.getWikiTableOfContents({
    owner,
    repo,
  });

  // Check if user has permission to create
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
    redirect(`/wiki/${owner}/${repo}`);
  }

  const wikiPages = toc.pages.map(p => ({ slug: p.slug, title: p.title }));

  return (
    <NewWikiClient
      owner={owner}
      repo={repo}
      wikiPages={wikiPages}
    />
  );
}
