import { db } from '@/db';
import { repositoryWikiPages } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getAccessibleRepositoryInfo } from '@/lib/github/repository-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all public wiki pages
    const pages = await db
      .select({
        repoOwner: repositoryWikiPages.repoOwner,
        repoName: repositoryWikiPages.repoName,
        slug: repositoryWikiPages.slug,
        updatedAt: repositoryWikiPages.updatedAt,
      })
      .from(repositoryWikiPages)
      .where(and(
        eq(repositoryWikiPages.isPublic, true),
        sql`${repositoryWikiPages.metadata}->>'visibilityVerified' = 'true'`
      ));

    // Legacy private-repository pages may still have isPublic=true. Check the
    // current GitHub visibility before publishing any URL in the sitemap.
    const repoKeys = [...new Set(pages.map(page => `${page.repoOwner}/${page.repoName}`))];
    const visibleRepos = new Set<string>();
    let nextRepo = 0;
    await Promise.all(Array.from({ length: Math.min(repoKeys.length, 6) }, async () => {
      while (nextRepo < repoKeys.length) {
        const key = repoKeys[nextRepo++];
        const [owner, repo] = key.split('/');
        const info = await getAccessibleRepositoryInfo(owner, repo, null);
        if (info && !info.private) visibleRepos.add(key);
      }
    }));
    const publicPages = pages.filter(page => visibleRepos.has(`${page.repoOwner}/${page.repoName}`));

    // Group pages by repo to get unique repos
    const repos = new Map<string, Date>();
    publicPages.forEach(page => {
      const key = `${page.repoOwner}/${page.repoName}`;
      const existingDate = repos.get(key);
      if (!existingDate || page.updatedAt > existingDate) {
        repos.set(key, page.updatedAt);
      }
    });

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${Array.from(repos.entries()).map(([repo, date]) => `
  <url>
    <loc>https://github.gg/wiki/${repo.split('/').map(encodeURIComponent).join('/')}</loc>
    <lastmod>${date.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  ${publicPages.map(page => `
  <url>
    <loc>https://github.gg/wiki/${[page.repoOwner, page.repoName, page.slug].map(encodeURIComponent).join('/')}</loc>
    <lastmod>${page.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating wiki sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
