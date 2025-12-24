import { pgTable, text, timestamp, uuid, uniqueIndex, index, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';

export type WrappedStats = {
  totalCommits: number;
  totalPRs: number;
  totalPRsMerged: number;
  totalIssues: number;
  totalReviews: number;
  linesAdded: number;
  linesDeleted: number;
  
  topRepos: Array<{
    name: string;
    owner: string;
    commits: number;
    stars: number;
    language: string | null;
  }>;
  
  languages: Array<{
    name: string;
    percentage: number;
    color: string;
  }>;
  
  /** Array of 24 elements representing commits per hour (0-23) */
  commitsByHour: number[];
  /** Array of 7 elements representing commits per day (Sun=0 to Sat=6) */
  commitsByDay: number[];
  /** Array of 12 elements representing commits per month (Jan=0 to Dec=11) */
  commitsByMonth: number[];
  
  /** Contribution calendar: object with date strings (YYYY-MM-DD) as keys and commit counts as values */
  contributionCalendar: Record<string, number>;
  
  longestStreak: number;
  currentStreak: number;
  
  peakHour: number;
  peakDay: string;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  
  topCollaborators: Array<{
    username: string;
    avatar: string;
    sharedPRs: number;
  }>;
  
  commonCommitWords: Array<{ word: string; count: number }>;
  mostUsedCommitMessage: string | null;
  longestCommitMessage: string | null;
  avgCommitMessageLength: number;
  
  /** Commits made between 12am-5am */
  lateNightCommits: number;
  weekendCommits: number;
  mondayCommits: number;
  
  previousYearCommits?: number;
  growthPercentage?: number;
  
  shamefulCommits: {
    laziestMessages: Array<{ message: string; count: number }>;
    singleCharCommits: number;
    fixOnlyCommits: number;
    wcCommits: number;
    emptyishCommits: number;
    allCapsCommits: number;
    cursingCommits: number;
    longestMessage: { message: string; length: number } | null;
    shortestMessage: { message: string; length: number } | null;
  };
  
  commitPatterns: {
    avgCommitsPerDay: number;
    mostProductiveMonth: string;
    deadestMonth: string;
    fridayDeploys: number;
    biggestCommitDay: { date: string; count: number } | null;
  };
  
  codeQuality: {
    aiVibeScore: number;
    aiIndicators: {
      genericMessages: number;
      perfectFormatting: number;
      longDescriptions: number;
      buzzwordDensity: number;
    };
    slopScore: number;
    envLeakWarnings: Array<{
      type: 'api_key' | 'secret' | 'password' | 'token' | 'credential';
      count: number;
      example?: string;
    }>;
    suggestions: Array<{
      category: 'commit_messages' | 'security' | 'consistency' | 'workflow';
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    hygieneGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
};

export type WrappedAIInsights = {
  personalityType: string;
  personalityDescription: string;
  personalityEmoji: string;
  yearSummary: string;
  biggestWin: string | null;
  topProjects: Array<{
    name: string;
    description: string;
    impact: string;
  }> | null;
  codingJourney: string | null;
  commitMessageAnalysis: {
    style: string;
    commonThemes: string[];
    funFact: string;
  } | null;
  traumaEvent: string | null;
  roast: string | null;
  prediction2025: string | null;
  overallGrade: string | null;
  gradeDescription: string | null;
};

export const githubWrapped = pgTable('github_wrapped', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').notNull(),
  year: integer('year').notNull(),
  stats: jsonb('stats').$type<WrappedStats>().notNull(),
  aiInsights: jsonb('ai_insights').$type<WrappedAIInsights>(),
  badgeTheme: text('badge_theme').default('dark'),
  isPublic: boolean('is_public').default(true),
  shareCode: text('share_code').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userYearIdx: uniqueIndex('wrapped_user_year_idx').on(table.userId, table.year),
  usernameYearIdx: index('wrapped_username_year_idx').on(table.username, table.year),
  shareCodeIdx: index('wrapped_share_code_idx').on(table.shareCode),
}));

export const wrappedInvites = pgTable('wrapped_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  inviterId: text('inviter_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  inviterUsername: text('inviter_username').notNull(),
  inviteeUsername: text('invitee_username'),
  inviteCode: text('invite_code').notNull().unique(),
  status: text('status').notNull().default('pending'),
  message: text('message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  inviteCodeIdx: index('wrapped_invite_code_idx').on(table.inviteCode),
  inviterIdx: index('wrapped_inviter_idx').on(table.inviterId),
}));

export const wrappedBadgeViews = pgTable('wrapped_badge_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  wrappedId: uuid('wrapped_id').references(() => githubWrapped.id, { onDelete: 'cascade' }).notNull(),
  username: text('username').notNull(),
  badgeType: text('badge_type').notNull(),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
  referrer: text('referrer'),
  clicked: boolean('clicked').default(false),
}, (table) => ({
  viewTimeIdx: index('wrapped_badge_view_time_idx').on(table.wrappedId, table.viewedAt),
}));
