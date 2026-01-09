import { db } from '@/db';
import { repositoryScorecards, cachedRepos, trendingRepos } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';

export async function GET() {
  const baseUrl = 'https://github.gg';

  try {
    // Get repos with scorecards (most valuable for SEO - has analysis)
    const scorecardRepos = await db
      .selectDistinct({
        owner: repositoryScorecards.repoOwner,
        name: repositoryScorecards.repoName,
        updatedAt: repositoryScorecards.updatedAt,
      })
      .from(repositoryScorecards)
      .orderBy(desc(repositoryScorecards.updatedAt))
      .limit(5000);

    // Get trending repos
    const trending = await db
      .select({
        owner: trendingRepos.owner,
        name: trendingRepos.name,
        updatedAt: trendingRepos.updatedAt,
      })
      .from(trendingRepos)
      .orderBy(desc(trendingRepos.starsThisWeek))
      .limit(500);

    // Get popular cached repos
    const popular = await db
      .select({
        owner: cachedRepos.owner,
        name: cachedRepos.name,
        updatedAt: cachedRepos.updatedAt,
      })
      .from(cachedRepos)
      .orderBy(desc(cachedRepos.stargazersCount))
      .limit(1000);

    // Deduplicate repos
    const repoMap = new Map<string, { owner: string; name: string; updatedAt: Date; priority: number }>();

    // Scorecard repos get highest priority (0.9)
    scorecardRepos.forEach(repo => {
      const key = `${repo.owner}/${repo.name}`.toLowerCase();
      if (!repoMap.has(key)) {
        repoMap.set(key, { owner: repo.owner, name: repo.name, updatedAt: repo.updatedAt, priority: 0.9 });
      }
    });

    // Trending repos (0.8)
    trending.forEach(repo => {
      const key = `${repo.owner}/${repo.name}`.toLowerCase();
      if (!repoMap.has(key)) {
        repoMap.set(key, { owner: repo.owner, name: repo.name, updatedAt: repo.updatedAt, priority: 0.8 });
      }
    });

    // Popular repos (0.7)
    popular.forEach(repo => {
      const key = `${repo.owner}/${repo.name}`.toLowerCase();
      if (!repoMap.has(key)) {
        repoMap.set(key, { owner: repo.owner, name: repo.name, updatedAt: repo.updatedAt, priority: 0.7 });
      }
    });

    const repos = Array.from(repoMap.values());

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${repos.map(repo => `
  <url>
    <loc>${baseUrl}/${repo.owner}/${repo.name}</loc>
    <lastmod>${repo.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${repo.priority}</priority>
  </url>`).join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating repos sitemap:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`, {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
