import { db } from '@/db';
import { repositoryWikiPages } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
      .where(eq(repositoryWikiPages.isPublic, true));

    // Group pages by repo to get unique repos
    const repos = new Map<string, Date>();
    pages.forEach(page => {
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
    <loc>https://github.gg/wiki/${repo}</loc>
    <lastmod>${date.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  ${pages.map(page => `
  <url>
    <loc>https://github.gg/wiki/${page.repoOwner}/${page.repoName}/${page.slug}</loc>
    <lastmod>${page.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating wiki sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
