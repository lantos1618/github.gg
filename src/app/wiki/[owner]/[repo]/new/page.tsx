import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createCaller } from '@/lib/trpc/server';
import { auth } from '@/lib/auth';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { headers } from 'next/headers';
import { RepoSidebarLayout } from '@/components/layouts/RepoSidebarLayout';
import { WikiEditor } from '@/components/wiki/WikiEditor';

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
    console.error('Failed to check repository permissions:', error);
  }

  if (!canEdit) {
    redirect(`/wiki/${owner}/${repo}`);
  }

  const wikiPages = toc.pages.map(p => ({ slug: p.slug, title: p.title }));

  return (
    <RepoSidebarLayout owner={owner} repo={repo} wikiPages={wikiPages}>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-border">
            <Link
              href={`/wiki/${owner}/${repo}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to wiki</span>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Create New Wiki Page</h1>
          </div>

          {/* Editor */}
          <WikiEditor
            owner={owner}
            repo={repo}
            mode="create"
          />
        </div>
      </div>
    </RepoSidebarLayout>
  );
}
