import { db } from '@/db';
import { developerProfileCache } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';

export async function GET() {
  const baseUrl = 'https://github.gg';

  try {
    // Get latest version of each analyzed profile
    const profiles = await db.execute(sql`
      SELECT DISTINCT ON (username)
        username,
        updated_at as "updatedAt",
        (profile_data->>'profileConfidence')::int as confidence
      FROM developer_profile_cache
      ORDER BY username, version DESC
    `);

    const profileRows = profiles as unknown as Array<{
      username: string;
      updatedAt: Date;
      confidence: number | null;
    }>;

    // Sort by confidence (higher confidence = better profile = higher priority)
    const sortedProfiles = profileRows.sort((a, b) =>
      (b.confidence || 0) - (a.confidence || 0)
    );

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sortedProfiles.map((profile, index) => {
    // Priority based on profile confidence and position
    const priority = profile.confidence
      ? Math.min(0.9, 0.5 + (profile.confidence / 200))
      : 0.5;

    return `
  <url>
    <loc>${baseUrl}/hire/${profile.username}</loc>
    <lastmod>${new Date(profile.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
  }).join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating profiles sitemap:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`, {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
