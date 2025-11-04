import { router } from '@/lib/trpc/trpc';
import { filesRouter } from './files';
import { reposRouter } from './repos';
import { cacheRouter } from './cache';
import { installationRouter } from './installation';
import { debugRouter } from './debug';
import { dashboardRouter } from './dashboard';

export const githubRouter = router({
  // Files and repository info
  files: filesRouter.files,
  getRepoInfo: filesRouter.getRepoInfo,
  getBranches: filesRouter.getBranches,

  // Repository listings and user repos
  getReposForScrollingCached: reposRouter.getReposForScrollingCached,
  getReposForScrollingWithUser: reposRouter.getReposForScrollingWithUser,
  getSponsorRepos: reposRouter.getSponsorRepos,
  getUserRepoNames: reposRouter.getUserRepoNames,
  hasStarredRepo: reposRouter.hasStarredRepo,
  getInstallationRepositories: reposRouter.getInstallationRepositories,

  // Cache management
  refreshRepoCache: cacheRouter.refreshRepoCache,
  checkCacheStatus: cacheRouter.checkCacheStatus,

  // GitHub App installation
  checkInstallation: installationRouter.checkInstallation,
  canUseApp: installationRouter.canUseApp,

  // Debug endpoints
  testRepoFetching: debugRouter.testRepoFetching,

  // Dashboard data
  getUserPullRequests: dashboardRouter.getUserPullRequests,
  getUserIssues: dashboardRouter.getUserIssues,
  getUserActivity: dashboardRouter.getUserActivity,
  getUserRepositories: dashboardRouter.getUserRepositories,
}); 