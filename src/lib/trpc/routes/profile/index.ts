import { router } from '@/lib/trpc/trpc';
import { profileReposRouter } from './repos';
import { profileEmailRouter } from './email';
import { profileReadRouter } from './read';
import { profileGenerateRouter } from './generate';
import { profileSearchRouter } from './search';

export const profileRouter = router({
  // Repo listing
  getUserRepositories: profileReposRouter.getUserRepositories,

  // Email lookup
  getDeveloperEmail: profileEmailRouter.getDeveloperEmail,

  // Read / list / version
  generateProfile: profileReadRouter.generateProfile,
  publicGetProfile: profileReadRouter.publicGetProfile,
  getProfileVersions: profileReadRouter.getProfileVersions,
  getProfileByVersion: profileReadRouter.getProfileByVersion,
  getAnalyzedProfileCount: profileReadRouter.getAnalyzedProfileCount,
  getAllAnalyzedProfiles: profileReadRouter.getAllAnalyzedProfiles,

  // Generation
  checkGenerationStatus: profileGenerateRouter.checkGenerationStatus,
  generateProfileMutation: profileGenerateRouter.generateProfileMutation,
  clearProfileCache: profileGenerateRouter.clearProfileCache,

  // Search
  searchProfiles: profileSearchRouter.searchProfiles,
});
