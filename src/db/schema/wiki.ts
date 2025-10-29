import { pgTable, text, timestamp, uuid, uniqueIndex, index, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';

// Repository Wiki Pages - SEO-optimized documentation
export const repositoryWikiPages = pgTable('repository_wiki_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  slug: text('slug').notNull(), // URL-friendly: 'overview', 'api-reference', 'components'
  title: text('title').notNull(),
  content: text('content').notNull(), // Markdown content
  summary: text('summary'), // Short description for SEO
  version: integer('version').notNull().default(1),
  fileHashes: jsonb('file_hashes').$type<Record<string, string>>(), // Detect code changes
  metadata: jsonb('metadata').$type<{
    keywords?: string[];
    category?: string;
    order?: number;
    parent?: string;
    systemPrompt?: string;      // AI-designed prompt for generating this page
    dependsOn?: string[];        // Page slugs this page depends on
    priority?: number;           // Generation priority (1-10)
  }>(),
  isPublic: boolean('is_public').notNull().default(true), // Public for Google indexing
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Ensure unique page per repo and slug
  wikiPageUniqueIdx: uniqueIndex('wiki_page_unique_idx').on(
    table.repoOwner,
    table.repoName,
    table.slug,
    table.version
  ),
  // Index for public pages (Google crawling)
  publicPagesIdx: index('public_pages_idx').on(table.isPublic, table.repoOwner, table.repoName),
}));

// Wiki Page Viewers - track who views wiki pages
export const wikiPageViewers = pgTable('wiki_page_viewers', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoOwner: text('repo_owner').notNull(),
  repoName: text('repo_name').notNull(),
  slug: text('slug').notNull(),
  version: integer('version').notNull(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }), // Nullable for anonymous viewers
  username: text('username'), // Cache username for display
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
  lastViewedAt: timestamp('last_viewed_at').notNull().defaultNow(),
  viewCount: integer('view_count').notNull().default(1), // Track multiple views by same user
}, (table) => ({
  // Ensure unique viewer per page version and user
  wikiPageViewerUniqueIdx: uniqueIndex('wiki_page_viewer_unique_idx').on(
    table.repoOwner,
    table.repoName,
    table.slug,
    table.version,
    table.userId
  ),
  // Index for querying viewers by page
  wikiPageViewersIdx: index('wiki_page_viewers_idx').on(table.repoOwner, table.repoName, table.slug, table.version),
}));
