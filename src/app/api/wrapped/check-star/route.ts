import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { createGitHubServiceForUserOperations } from '@/lib/github';
import { GITHUB_GG_REPO } from '@/lib/types/wrapped';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const githubService = await createGitHubServiceForUserOperations(session);
    const hasStarred = await githubService.hasStarredRepo(
      GITHUB_GG_REPO.owner,
      GITHUB_GG_REPO.repo
    );

    return NextResponse.json({
      hasStarred,
      repoUrl: GITHUB_GG_REPO.url,
      username: session.user.name || session.user.email,
    });
  } catch (error) {
    console.error('Error checking star status:', error);
    return NextResponse.json(
      { error: 'Failed to check star status' },
      { status: 500 }
    );
  }
}
