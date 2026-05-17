/**
 * Seeds ~60 synthetic developer profiles with archetype-clustered embeddings
 * so the /hire/map UMAP projection has something meaningful to visualize.
 *
 * Delete seed rows with:
 *   DELETE FROM developer_profile_cache WHERE username LIKE 'synthdev-%';
 */
import { db } from '@/db';
import { sql } from 'drizzle-orm';

const ARCHETYPES = [
  'Production Builder',
  'Full-Stack Generalist',
  'Domain Specialist',
  'Research & Innovation',
  'Open Source Contributor',
  'Early Career Explorer',
];

const SKILL_BANK: Record<string, string[]> = {
  'Production Builder':       ['TypeScript', 'React', 'Next.js', 'AWS', 'PostgreSQL'],
  'Full-Stack Generalist':    ['Node.js', 'Python', 'Docker', 'GraphQL', 'MongoDB'],
  'Domain Specialist':        ['Rust', 'Systems', 'C++', 'Networking', 'Kernel'],
  'Research & Innovation':    ['Python', 'PyTorch', 'Machine Learning', 'Jupyter', 'CUDA'],
  'Open Source Contributor':  ['Go', 'Kubernetes', 'Terraform', 'Linux', 'Bash'],
  'Early Career Explorer':    ['JavaScript', 'HTML', 'CSS', 'Vue', 'Firebase'],
};

const DIM = 768;
const PER_ARCHETYPE = 10;

function seedRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function makeClusterCenter(rand: () => number): number[] {
  const v = new Array(DIM);
  let norm = 0;
  for (let i = 0; i < DIM; i++) {
    v[i] = (rand() - 0.5) * 2;
    norm += v[i] * v[i];
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}

function jitter(center: number[], rand: () => number, scale = 0.25): number[] {
  const v = new Array(DIM);
  let norm = 0;
  for (let i = 0; i < DIM; i++) {
    v[i] = center[i] + (rand() - 0.5) * scale;
    norm += v[i] * v[i];
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}

async function main() {
  const rand = seedRand(1337);
  const centers = ARCHETYPES.map(() => makeClusterCenter(rand));

  let count = 0;
  for (let a = 0; a < ARCHETYPES.length; a++) {
    const archetype = ARCHETYPES[a];
    const center = centers[a];
    for (let i = 0; i < PER_ARCHETYPE; i++) {
      const username = `synthdev-${archetype.toLowerCase().replace(/[^a-z]/g, '').slice(0, 6)}-${i}`;
      const embedding = jitter(center, rand);
      const confidence = 40 + Math.floor(rand() * 60);
      const skills = SKILL_BANK[archetype].slice(0, 3 + Math.floor(rand() * 2));

      const profileData = {
        developerArchetype: archetype,
        profileConfidence: confidence,
        skillAssessment: skills.map((metric, idx) => ({
          metric,
          score: 6 + Math.floor(rand() * 4),
          rationale: `Synthetic skill entry for ${archetype} #${idx}`,
        })),
        techStack: skills.map(name => ({ name, type: 'language' })),
        summary: `Synthetic ${archetype} profile for UMAP seed data.`,
      };

      const embeddingStr = `[${embedding.join(',')}]`;

      await db.execute(sql`
        INSERT INTO developer_profile_cache (username, version, profile_data, embedding)
        VALUES (${username}, 1, ${JSON.stringify(profileData)}::jsonb, ${embeddingStr}::vector)
        ON CONFLICT (username, version) DO UPDATE SET
          profile_data = EXCLUDED.profile_data,
          embedding = EXCLUDED.embedding,
          updated_at = now()
      `);
      count++;
    }
  }

  console.log(`Seeded ${count} synthetic profiles across ${ARCHETYPES.length} archetypes.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
