import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { z } from 'zod';
import { createGitHubServiceForUserOperations } from '@/lib/github';

/**
 * GitHub Dashboard Router
 * Provides data for the user's dashboard view
 */
export const dashboardRouter = router({
  /**
   * Get user's pull requests (created by them or assigned to them)
   */
  getUserPullRequests: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubServiceForUserOperations(ctx.session);

        // Use the non-deprecated API
        const prs = await githubService.octokit.issues.listForAuthenticatedUser({
          filter: 'all',
          state: 'open',
          sort: 'updated',
          direction: 'desc',
          per_page: input.limit,
        });

        // Filter for only PRs (issues API returns both issues and PRs)
        const pullRequests = prs.data.filter(item => item.pull_request);

        return pullRequests.map(pr => ({
          id: pr.id.toString(),
          title: pr.title,
          repo: pr.repository_url.split('/').slice(-2).join('/'),
          number: pr.number,
          author: pr.user?.login || 'unknown',
          updatedTime: new Date(pr.updated_at).toISOString(),
          comments: pr.comments,
          url: pr.html_url,
          state: pr.state,
        }));
      } catch (error) {
        console.error('Failed to fetch user PRs:', error);
        return [];
      }
    }),

  /**
   * Get user's issues (created by them or assigned to them)
   */
  getUserIssues: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubServiceForUserOperations(ctx.session);

        // Use the non-deprecated API
        const issues = await githubService.octokit.issues.listForAuthenticatedUser({
          filter: 'all',
          state: 'open',
          sort: 'updated',
          direction: 'desc',
          per_page: input.limit * 2, // Fetch more since we'll filter out PRs
        });

        // Filter for only issues (exclude PRs)
        const onlyIssues = issues.data
          .filter(item => !item.pull_request)
          .slice(0, input.limit);

        return onlyIssues.map(issue => ({
          id: issue.id.toString(),
          title: issue.title,
          repo: issue.repository_url.split('/').slice(-2).join('/'),
          number: issue.number,
          author: issue.user?.login || 'unknown',
          updatedTime: new Date(issue.updated_at).toISOString(),
          comments: issue.comments,
          url: issue.html_url,
          state: issue.state,
        }));
      } catch (error) {
        console.error('Failed to fetch user issues:', error);
        return [];
      }
    }),

  /**
   * Get user's recent activity using GitHub notifications API
   * This provides real notifications including mentions, PR reviews, assignments, etc.
   * Falls back to fetching PRs/issues directly if notifications scope is not granted.
   */
  getUserActivity: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      page: z.number().min(1).default(1).optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubServiceForUserOperations(ctx.session);

        // Try to fetch notifications for authenticated user
        try {
          console.log('🔍 Attempting to fetch notifications...');
          const notifications = await githubService.octokit.activity.listNotificationsForAuthenticatedUser({
            all: true,
            per_page: input.limit,
            page: input.page || 1,
          });
          console.log(`✅ Successfully fetched ${notifications.data.length} notifications`);

        const activities = await Promise.all(notifications.data.map(async (notification) => {
          const repo = notification.repository.full_name;
          const subject = notification.subject;

          // Extract issue/PR number from URL if present
          const urlMatch = subject.url?.match(/\/(?:issues|pulls)\/(\d+)$/);
          const issueNumber = urlMatch ? parseInt(urlMatch[1], 10) : 0;

          // Fetch comment count if we have an issue/PR number
          let comments = 0;
          if (issueNumber > 0 && subject.url) {
            try {
              // Extract owner/repo from repository
              const [owner, repoName] = repo.split('/');
              
              if (subject.type === 'PullRequest') {
                const pr = await githubService.octokit.pulls.get({
                  owner,
                  repo: repoName,
                  pull_number: issueNumber,
                });
                comments = pr.data.comments || 0;
              } else if (subject.type === 'Issue') {
                const issue = await githubService.octokit.issues.get({
                  owner,
                  repo: repoName,
                  issue_number: issueNumber,
                });
                comments = issue.data.comments || 0;
              }
            } catch (error) {
              // Silently fail - comments will remain 0
              console.log(`Could not fetch comments for ${repo}#${issueNumber}:`, error);
            }
          }

          // Determine status and statusText based on subject type and reason
          let status = 'notification';
          let statusText = notification.reason;
          let priority = 0;

          // Map notification reason to user-friendly text
          const reasonMap: Record<string, { text: string; priority: number }> = {
            'review_requested': { text: 'review requested', priority: 3 },
            'mention': { text: 'mentioned you', priority: 2 },
            'comment': { text: 'commented', priority: 2 },
            'assign': { text: 'assigned to you', priority: 2 },
            'author': { text: 'activity on your thread', priority: 1 },
            'team_mention': { text: 'mentioned your team', priority: 2 },
            'subscribed': { text: 'new activity', priority: 1 },
            'manual': { text: 'subscribed', priority: 0 },
          };

          if (subject.type === 'PullRequest') {
            status = 'pr';
            const mapped = reasonMap[notification.reason];
            statusText = mapped?.text || 'PR activity';
            priority = mapped?.priority || 2;
          } else if (subject.type === 'Issue') {
            status = 'issue';
            const mapped = reasonMap[notification.reason];
            statusText = mapped?.text || 'issue activity';
            priority = mapped?.priority || 1;
          } else if (subject.type === 'Commit') {
            status = 'commit';
            statusText = reasonMap[notification.reason]?.text || 'commit activity';
            priority = 1;
          } else {
            const mapped = reasonMap[notification.reason];
            statusText = mapped?.text || notification.reason;
            priority = mapped?.priority || 0;
          }

          return {
            id: notification.id,
            repo,
            issueNumber,
            title: subject.title,
            timeAgo: new Date(notification.updated_at).toISOString(),
            status,
            statusText,
            url: subject.url?.replace('api.github.com/repos', 'github.com').replace(/\/pulls\//, '/pull/') || notification.repository.html_url,
            unread: notification.unread,
            priority,
            comments,
          };
        }));

        // Fetch recent comments on issues/PRs the user is involved in
        let commentActivities: any[] = [];
        try {
          // Get user's login
          const { data: user } = await githubService.octokit.users.getAuthenticated();
          const userLogin = user.login;

          // Fetch user's issues/PRs to get comments on them
          const userItems = await githubService.octokit.issues.listForAuthenticatedUser({
            filter: 'all',
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            per_page: 20, // Limit to avoid too many API calls
          });

          // Fetch comments for each issue/PR
          const commentPromises = userItems.data.slice(0, 10).map(async (item) => {
            try {
              const [owner, repoName] = item.repository_url.split('/').slice(-2);
              const comments = await githubService.octokit.issues.listComments({
                owner,
                repo: repoName,
                issue_number: item.number,
                per_page: 5, // Get most recent 5 comments
                sort: 'updated',
                direction: 'desc',
              });

              return comments.data
                .filter(comment => comment.user?.login !== userLogin) // Only comments by others
                .slice(0, 3) // Limit to 3 most recent
                .map(comment => ({
                  id: `comment-${comment.id}`,
                  repo: `${owner}/${repoName}`,
                  issueNumber: item.number,
                  title: item.title,
                  timeAgo: new Date(comment.updated_at || comment.created_at).toISOString(),
                  status: item.pull_request ? 'pr' : 'issue',
                  statusText: 'commented',
                  url: comment.html_url,
                  unread: false,
                  priority: 2,
                  comments: 0,
                  commentBody: comment.body,
                  commentAuthor: comment.user?.login || 'unknown',
                  commentAuthorAvatar: comment.user?.avatar_url,
                  isComment: true,
                }));
            } catch (error) {
              console.log(`Could not fetch comments for ${item.repository_url.split('/').slice(-2).join('/')}#${item.number}:`, error);
              return [];
            }
          });

          const commentArrays = await Promise.all(commentPromises);
          commentActivities = commentArrays.flat();
        } catch (error) {
          console.log('Could not fetch comments:', error);
        }

        // Combine notifications and comments
        const allActivities = [...activities, ...commentActivities];

        // Sort by unread first, then priority, then time
        const sorted = allActivities.sort((a, b) => {
          if (a.unread !== b.unread) {
            return a.unread ? -1 : 1; // Unread first
          }
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return new Date(b.timeAgo).getTime() - new Date(a.timeAgo).getTime();
        });

        // Limit to requested number
        const limited = sorted.slice(0, input.limit);

        console.log(`📊 Activity feed: ${limited.length} items (${limited.filter(a => a.unread).length} unread, ${limited.filter(a => a.isComment).length} comments)`);

          return limited;
        } catch (notificationError: any) {
          // Fallback if notifications scope is not granted
          console.log('⚠️ Notifications API failed (missing scope?), falling back to direct PR/issue fetch');

          const activities: any[] = [];

          // Fetch user's open PRs and issues using non-deprecated API
          try {
            const items = await githubService.octokit.issues.listForAuthenticatedUser({
              filter: 'all',
              state: 'open',
              sort: 'updated',
              direction: 'desc',
              per_page: input.limit,
            });

            items.data.forEach(item => {
              if (item.pull_request) {
                activities.push({
                  id: item.id.toString(),
                  repo: item.repository_url.split('/').slice(-2).join('/'),
                  issueNumber: item.number,
                  title: item.title,
                  timeAgo: new Date(item.updated_at).toISOString(),
                  status: 'pr',
                  statusText: 'PR activity',
                  url: item.html_url,
                  unread: false,
                  priority: 2,
                  comments: item.comments,
                });
              } else {
                activities.push({
                  id: item.id.toString(),
                  repo: item.repository_url.split('/').slice(-2).join('/'),
                  issueNumber: item.number,
                  title: item.title,
                  timeAgo: new Date(item.updated_at).toISOString(),
                  status: 'issue',
                  statusText: 'issue activity',
                  url: item.html_url,
                  unread: false,
                  priority: 1,
                  comments: item.comments,
                });
              }
            });
          } catch (error) {
            console.log('Could not fetch PRs and issues:', error);
          }

          console.log(`📊 Activity feed (fallback): ${activities.length} items`);
          return activities;
        }
      } catch (error) {
        console.error('Failed to fetch user activity:', error);
        return [];
      }
    }),

  /**
   * Get user's repositories
   */
  getUserRepositories: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const githubService = await createGitHubServiceForUserOperations(ctx.session);

        const repos = await githubService.getUserRepositories(undefined, input.limit);

        return repos.map(repo => ({
          fullName: `${repo.owner}/${repo.name}`,
          name: repo.name,
          owner: repo.owner,
          url: repo.url,
          stargazersCount: repo.stargazersCount,
        }));
      } catch (error) {
        console.error('Failed to fetch user repos:', error);
        return [];
      }
    }),
});
