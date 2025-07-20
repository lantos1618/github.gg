import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubServiceForUserOperations } from '@/lib/github';

export const debugRouter = router({
  // Debug endpoint to test repository fetching
  testRepoFetching: protectedProcedure
    .input(z.object({
      username: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubServiceForUserOperations(ctx.session);
        
        console.log('🔍 Debug: Testing repository fetching...');
        console.log('🔍 Debug: Session user ID:', ctx.session?.user?.id);
        console.log('🔍 Debug: Target username:', input.username || 'authenticated user');
        
        const repos = await githubService.getUserRepositories(input.username);
        
        console.log('🔍 Debug: Repositories found:', repos.length);
        console.log('🔍 Debug: First few repos:', repos.slice(0, 5).map(r => `${r.owner}/${r.name}`));
        
        return {
          success: true,
          repoCount: repos.length,
          repos: repos.slice(0, 10), // Return first 10 for debugging
          message: `Successfully fetched ${repos.length} repositories for ${input.username || 'authenticated user'}`
        };
      } catch (error) {
        console.error('❌ Debug: Error fetching repositories:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          repoCount: 0,
          repos: []
        };
      }
    }),
}); 