import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { UMAP } from 'umap-js';

const PROJECTION_VERSION = 1;

interface ProfileRow {
  username: string;
  version: number;
  embedding: number[];
}

async function main() {
  console.log('Loading latest-version profiles with embeddings…');

  const rows = await db.execute<{ username: string; version: number; embedding: string }>(sql`
    SELECT p.username, p.version, p.embedding::text AS embedding
    FROM developer_profile_cache p
    INNER JOIN (
      SELECT username, MAX(version) AS max_version
      FROM developer_profile_cache
      WHERE embedding IS NOT NULL
      GROUP BY username
    ) latest
      ON p.username = latest.username AND p.version = latest.max_version
    WHERE p.embedding IS NOT NULL
  `);

  const profiles: ProfileRow[] = (rows as unknown as Array<{ username: string; version: number; embedding: string }>).map(r => ({
    username: r.username,
    version: r.version,
    embedding: r.embedding.slice(1, -1).split(',').map(Number),
  }));

  if (profiles.length < 3) {
    console.error(`Need at least 3 profiles with embeddings, found ${profiles.length}. Aborting.`);
    process.exit(1);
  }

  console.log(`Fitting UMAP on ${profiles.length} profiles (${profiles[0].embedding.length}-dim)…`);
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors: Math.min(15, profiles.length - 1),
    minDist: 0.1,
    spread: 1.0,
    random: seededRandom(42),
  });

  const embeddings = profiles.map(p => p.embedding);
  const coords = umap.fit(embeddings);

  const [minX, maxX, minY, maxY] = coords.reduce(
    ([nx, xx, ny, xy], [x, y]) => [Math.min(nx, x), Math.max(xx, x), Math.min(ny, y), Math.max(xy, y)],
    [Infinity, -Infinity, Infinity, -Infinity]
  );
  console.log(`UMAP bounds: x=[${minX.toFixed(2)}, ${maxX.toFixed(2)}], y=[${minY.toFixed(2)}, ${maxY.toFixed(2)}]`);

  console.log('Writing projections back…');
  let written = 0;
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const [x, y] = coords[i];
    await db.execute(sql`
      UPDATE developer_profile_cache
      SET projection_x = ${x}, projection_y = ${y}, projection_version = ${PROJECTION_VERSION}
      WHERE username = ${p.username} AND version = ${p.version}
    `);
    written++;
    if (written % 100 === 0) console.log(`  ${written}/${profiles.length}`);
  }

  console.log(`Done. Wrote projections for ${written} profiles (version ${PROJECTION_VERSION}).`);
  process.exit(0);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
