/**
 * Types for repository insights and analytics
 */

export interface ContributorData {
  name: string;
  contributions: number;
}

export interface CommitsData {
  name: string;
  commits: number;
}

export interface TopContributor {
  name: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface RepoInsightsData {
  contributorsData: ContributorData[];
  commitsData: CommitsData[];
  topContributors: TopContributor[];
  pulseData?: {
    activePullRequests: number;
    activeIssues: number;
    mergedPullRequests: number;
    closedIssues: number;
  };
  trafficData?: {
    clones: Array<{ timestamp: number; count: number; uniques: number }>;
    views: Array<{ timestamp: number; count: number; uniques: number }>;
  };
}

export type ActivityType = 'commit' | 'pull-request' | 'issue' | 'run';
export type ActivityStatus = 'success' | 'failure' | 'pending' | 'open' | 'closed' | 'merged';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  author: {
    name: string;
    avatarUrl: string;
    url: string;
  };
  timestamp: Date;
  status: ActivityStatus;
  details: string;
  url: string;
}

export interface RepoInsightsClientPageProps {
  params: { user: string; repo: string };
  contributorsData: ContributorData[];
  commitsData: CommitsData[];
  topContributors: TopContributor[];
  pulseData?: RepoInsightsData['pulseData'];
  trafficData?: RepoInsightsData['trafficData'];
  recentActivity?: ActivityItem[];
}
