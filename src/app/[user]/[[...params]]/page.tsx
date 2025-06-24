import RepoClientView from './RepoClientView';
import InsightsClientView from './InsightsClientView';
import { RepoLayout } from '@/components/RepoLayout';
import RepoTabsWrapper from '@/components/RepoTabsWrapper';

// Placeholder: Replace with real data fetching
async function checkRepoExists(user: string, repo: string) {
  // TODO: Implement real repo existence check
  return !!repo;
}

async function checkFolderExists(user: string, repo: string, ref: string | undefined, path: string | undefined) {
  // TODO: Implement real folder existence check
  // For now, return true if path is not 'missing-folder'
  return path !== 'missing-folder';
}

function parseRepoParams(user: string, repoParams: string[] = []) {
  if (repoParams.length === 0) return { repo: undefined, ref: undefined, path: undefined };
  if (repoParams.length === 1) return { repo: repoParams[0], ref: undefined, path: undefined };
  if (repoParams[1] === 'tree') {
    const ref = repoParams[2];
    const path = repoParams.length > 3 ? repoParams.slice(3).join('/') : undefined;
    return { repo: repoParams[0], ref, path };
  }
  return { repo: repoParams[0] || '', ref: undefined, path: undefined };
}

function getCurrentPath(repoParams: string[] = []) {
  if (repoParams[1] === 'tree') {
    return repoParams.length > 3 ? repoParams.slice(3).join('/') : '';
  }
  return '';
}

export default async function Page({ params }: { params: Promise<{ user: string; params?: string[] }> }) {
  const awaitedParams = await params;
  const repoParams = awaitedParams.params || [];
  const { repo, ref, path } = parseRepoParams(awaitedParams.user, repoParams);
  const currentPath = getCurrentPath(repoParams);

  // 1. If no repo param, render user profile
  if (!repo) {
    return <div style={{ padding: 32, textAlign: 'center' }}><h1>User Profile</h1><p>This is the user profile/dashboard for {awaitedParams.user}.</p></div>;
  }

  // 2. Check if repo exists
  const repoExists = await checkRepoExists(awaitedParams.user, repo);
  if (!repoExists) {
    return <div style={{ padding: 32, textAlign: 'center' }}><h1>404</h1><p>Repository not found.</p></div>;
  }

  // 3. Determine active tab
  const isInsightsRoute = repoParams[repoParams.length - 1] === 'insights';
  const activeTab = isInsightsRoute ? 'insights' : 'wiki';

  // 4. Tabs config
  const tabs = [
    { key: 'wiki', label: 'Wiki' },
    { key: 'insights', label: 'Insights' },
  ];

  // 5. Render layout with tabs and content
  return (
    <RepoLayout>
      {activeTab === 'insights' ? (
        <InsightsClientView user={awaitedParams.user} repo={repo} refName={ref} path={path} />
      ) : (
        <RepoClientView
          params={awaitedParams}
          user={awaitedParams.user}
          repo={repo}
          refName={ref}
          path={path}
          currentPath={currentPath}
        />
      )}
    </RepoLayout>
  );
} 