import { router } from '@/lib/trpc/trpc';
import { filesRouter } from './files';
import { reposRouter } from './repos';
import { cacheRouter } from './cache';
import { installationRouter } from './installation';

export const githubRouter = router({
  // Files and repository info
  files: filesRouter.files,
  getRepoInfo: filesRouter.getRepoInfo,
  getBranches: filesRouter.getBranches,
  
  // Repository listings and user repos
  getReposForScrollingCached: reposRouter.getReposForScrollingCached,
  getReposForScrollingWithUser: reposRouter.getReposForScrollingWithUser,
  getReposForScrolling: reposRouter.getReposForScrolling,
  getSponsorRepos: reposRouter.getSponsorRepos,
  getUserRepoNames: reposRouter.getUserRepoNames,
  
  // Cache management
  refreshRepoCache: cacheRouter.refreshRepoCache,
  checkCacheStatus: cacheRouter.checkCacheStatus,
  
  // GitHub App installation
  checkInstallation: installationRouter.checkInstallation,
  canUseApp: installationRouter.canUseApp,
  getInstallationRepositories: installationRouter.getInstallationRepositories,
}); 