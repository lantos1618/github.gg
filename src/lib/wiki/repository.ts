import { db } from '@/db';
import { repositoryWikiPages, wikiPageViewers } from '@/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';

export interface WikiPage {
  slug: string;
  title: string;
  content: string;
  summary?: string;
  version: number;
  fileHashes?: Record<string, string>;
  metadata?: {
    order?: number;
    keywords?: string[];
    category?: string;
    systemPrompt?: string;
    dependsOn?: string[];
    priority?: number;
  };
  isPublic?: boolean;
  viewCount?: number;
}

export async function getLatestVersion(owner: string, repo: string): Promise<number> {
  const latestPage = await db
    .select({ version: repositoryWikiPages.version })
    .from(repositoryWikiPages)
    .where(
      and(
        eq(repositoryWikiPages.repoOwner, owner),
        eq(repositoryWikiPages.repoName, repo)
      )
    )
    .orderBy(desc(repositoryWikiPages.version))
    .limit(1);

  return latestPage.length > 0 ? latestPage[0].version : 0;
}

export async function insertWikiPages(
  owner: string,
  repo: string,
  pages: Array<{
    slug: string;
    title: string;
    content: string;
    summary?: string;
  }>,
  fileHashes: Record<string, string>
) {
  const latestVersion = await getLatestVersion(owner, repo);
  const nextVersion = latestVersion + 1;

  const insertedPages = await Promise.all(
    pages.map((page, index) =>
      db.insert(repositoryWikiPages).values({
        repoOwner: owner,
        repoName: repo,
        slug: page.slug,
        title: page.title,
        content: page.content,
        summary: page.summary,
        version: nextVersion,
        fileHashes,
        metadata: {
          order: index,
          keywords: [owner, repo, 'documentation', 'wiki'],
          category: 'documentation',
          systemPrompt: '',
          dependsOn: [],
          priority: 10 - index,
        },
        isPublic: true,
        viewCount: 0,
      }).returning()
    )
  );

  return {
    version: nextVersion,
    pages: insertedPages.map(p => p[0]),
  };
}

export async function getWikiPage(
  owner: string,
  repo: string,
  slug: string,
  version?: number
) {
  const conditions = [
    eq(repositoryWikiPages.repoOwner, owner),
    eq(repositoryWikiPages.repoName, repo),
    eq(repositoryWikiPages.slug, slug),
    eq(repositoryWikiPages.isPublic, true),
  ];

  if (version !== undefined) {
    conditions.push(eq(repositoryWikiPages.version, version));
  }

  const query = db
    .select()
    .from(repositoryWikiPages)
    .where(and(...conditions));

  const result = version === undefined
    ? await query.orderBy(desc(repositoryWikiPages.version)).limit(1)
    : await query;

  return result.length > 0 ? result[0] : null;
}

export async function getWikiTableOfContents(
  owner: string,
  repo: string,
  version?: number
) {
  const conditions = [
    eq(repositoryWikiPages.repoOwner, owner),
    eq(repositoryWikiPages.repoName, repo),
    eq(repositoryWikiPages.isPublic, true),
  ];

  // Get latest version if not specified
  let targetVersion = version;
  if (targetVersion === undefined) {
    targetVersion = await getLatestVersion(owner, repo);
    if (targetVersion === 0) {
      return { pages: [], version: 0 };
    }
  }

  conditions.push(eq(repositoryWikiPages.version, targetVersion));

  const pages = await db
    .select({
      slug: repositoryWikiPages.slug,
      title: repositoryWikiPages.title,
      summary: repositoryWikiPages.summary,
      viewCount: repositoryWikiPages.viewCount,
      metadata: repositoryWikiPages.metadata,
      updatedAt: repositoryWikiPages.updatedAt,
    })
    .from(repositoryWikiPages)
    .where(and(...conditions));

  // Sort by metadata.order if available
  const sortedPages = pages.sort((a, b) => {
    const aOrder = (a.metadata as { order?: number })?.order ?? 999;
    const bOrder = (b.metadata as { order?: number })?.order ?? 999;
    return aOrder - bOrder;
  });

  return {
    pages: sortedPages,
    version: targetVersion,
  };
}

export async function incrementViewCount(
  owner: string,
  repo: string,
  slug: string,
  version?: number,
  userId?: string,
  username?: string
): Promise<boolean> {
  try {
    const conditions = [
      eq(repositoryWikiPages.repoOwner, owner),
      eq(repositoryWikiPages.repoName, repo),
      eq(repositoryWikiPages.slug, slug),
    ];

    if (version !== undefined) {
      conditions.push(eq(repositoryWikiPages.version, version));
    }

    const query = db
      .select({ id: repositoryWikiPages.id, viewCount: repositoryWikiPages.viewCount, version: repositoryWikiPages.version })
      .from(repositoryWikiPages)
      .where(and(...conditions));

    const result = version === undefined
      ? await query.orderBy(desc(repositoryWikiPages.version)).limit(1)
      : await query;

    if (result.length === 0) {
      return false;
    }

    const pageVersion = result[0].version;

    // Increment page view count
    await db
      .update(repositoryWikiPages)
      .set({
        viewCount: result[0].viewCount + 1,
      })
      .where(eq(repositoryWikiPages.id, result[0].id));

    // Track individual viewer if logged in
    if (userId && username) {
      const viewerConditions = [
        eq(wikiPageViewers.repoOwner, owner),
        eq(wikiPageViewers.repoName, repo),
        eq(wikiPageViewers.slug, slug),
        eq(wikiPageViewers.version, pageVersion),
        eq(wikiPageViewers.userId, userId),
      ];

      const existingViewer = await db
        .select()
        .from(wikiPageViewers)
        .where(and(...viewerConditions))
        .limit(1);

      if (existingViewer.length > 0) {
        await db
          .update(wikiPageViewers)
          .set({
            lastViewedAt: new Date(),
            viewCount: sql`${wikiPageViewers.viewCount} + 1`,
          })
          .where(eq(wikiPageViewers.id, existingViewer[0].id));
      } else {
        await db.insert(wikiPageViewers).values({
          repoOwner: owner,
          repoName: repo,
          slug,
          version: pageVersion,
          userId,
          username,
          viewedAt: new Date(),
          lastViewedAt: new Date(),
          viewCount: 1,
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to increment view count:', error);
    return false;
  }
}

export async function getWikiPageViewers(
  owner: string,
  repo: string,
  slug: string,
  version?: number
) {
  let targetVersion = version;
  if (targetVersion === undefined) {
    const latestPage = await db
      .select({ version: repositoryWikiPages.version })
      .from(repositoryWikiPages)
      .where(
        and(
          eq(repositoryWikiPages.repoOwner, owner),
          eq(repositoryWikiPages.repoName, repo),
          eq(repositoryWikiPages.slug, slug)
        )
      )
      .orderBy(desc(repositoryWikiPages.version))
      .limit(1);

    if (latestPage.length === 0) {
      return { viewers: [], totalViews: 0 };
    }

    targetVersion = latestPage[0].version;
  }

  const viewers = await db
    .select({
      userId: wikiPageViewers.userId,
      username: wikiPageViewers.username,
      viewedAt: wikiPageViewers.viewedAt,
      lastViewedAt: wikiPageViewers.lastViewedAt,
      viewCount: wikiPageViewers.viewCount,
    })
    .from(wikiPageViewers)
    .where(
      and(
        eq(wikiPageViewers.repoOwner, owner),
        eq(wikiPageViewers.repoName, repo),
        eq(wikiPageViewers.slug, slug),
        eq(wikiPageViewers.version, targetVersion)
      )
    )
    .orderBy(desc(wikiPageViewers.lastViewedAt));

  const totalViews = viewers.reduce((sum, viewer) => sum + viewer.viewCount, 0);

  return { viewers, totalViews };
}

export async function deleteWikiPage(owner: string, repo: string, slug: string) {
  const latestPage = await db
    .select({ id: repositoryWikiPages.id })
    .from(repositoryWikiPages)
    .where(
      and(
        eq(repositoryWikiPages.repoOwner, owner),
        eq(repositoryWikiPages.repoName, repo),
        eq(repositoryWikiPages.slug, slug)
      )
    )
    .orderBy(desc(repositoryWikiPages.version))
    .limit(1);

  if (latestPage.length === 0) {
    return false;
  }

  await db
    .delete(repositoryWikiPages)
    .where(eq(repositoryWikiPages.id, latestPage[0].id));

  return true;
}

export async function deleteRepositoryWiki(owner: string, repo: string) {
  const deletedPages = await db
    .delete(repositoryWikiPages)
    .where(
      and(
        eq(repositoryWikiPages.repoOwner, owner),
        eq(repositoryWikiPages.repoName, repo)
      )
    )
    .returning();

  return deletedPages.length;
}

export async function updateWikiPage(
  owner: string,
  repo: string,
  slug: string,
  data: {
    title: string;
    content: string;
    summary?: string;
  }
) {
  const latestPage = await db
    .select()
    .from(repositoryWikiPages)
    .where(
      and(
        eq(repositoryWikiPages.repoOwner, owner),
        eq(repositoryWikiPages.repoName, repo),
        eq(repositoryWikiPages.slug, slug)
      )
    )
    .orderBy(desc(repositoryWikiPages.version))
    .limit(1);

  if (latestPage.length === 0) {
    return null;
  }

  const updatedPage = await db
    .update(repositoryWikiPages)
    .set({
      title: data.title,
      content: data.content,
      summary: data.summary,
      updatedAt: new Date(),
    })
    .where(eq(repositoryWikiPages.id, latestPage[0].id))
    .returning();

  return updatedPage[0];
}

export async function createWikiPage(
  owner: string,
  repo: string,
  data: {
    slug: string;
    title: string;
    content: string;
    summary?: string;
  }
) {
  const version = await getLatestVersion(owner, repo) || 1;

  // Check if page with this slug already exists
  const existingPage = await db
    .select()
    .from(repositoryWikiPages)
    .where(
      and(
        eq(repositoryWikiPages.repoOwner, owner),
        eq(repositoryWikiPages.repoName, repo),
        eq(repositoryWikiPages.slug, data.slug),
        eq(repositoryWikiPages.version, version)
      )
    )
    .limit(1);

  if (existingPage.length > 0) {
    return null; // Page already exists
  }

  const newPage = await db
    .insert(repositoryWikiPages)
    .values({
      repoOwner: owner,
      repoName: repo,
      slug: data.slug,
      title: data.title,
      content: data.content,
      summary: data.summary,
      version,
      fileHashes: {},
      metadata: {
        order: 999,
        keywords: [owner, repo, 'documentation', 'wiki'],
        category: 'documentation',
        systemPrompt: '',
        dependsOn: [],
        priority: 1,
      },
      isPublic: true,
      viewCount: 0,
    })
    .returning();

  return newPage[0];
}
