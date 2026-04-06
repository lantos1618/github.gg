import { createCaller } from '@/lib/trpc/server';
import { UsersClientView } from '@/components/users/UsersClientView';
import type { Metadata } from 'next';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata: Metadata = {
  title: 'Developer Profiles - gh.gg',
  description: 'Discover developers with AI-generated insights and analysis. Browse analyzed GitHub profiles with AI-powered summaries, tech stacks, and repository insights.',
  openGraph: {
    title: 'Developer Profiles - gh.gg',
    description: 'Discover developers with AI-generated insights and analysis.',
  },
};

export default async function UsersPage() {
  const caller = await createCaller();

  // Fetch data on server
  const [profiles, totalCount] = await Promise.all([
    caller.profile.getAllAnalyzedProfiles({ limit: 200, offset: 0 }),
    caller.profile.getAnalyzedProfileCount(),
  ]);

  // DB query already extracts only the fields the table needs (summary, skillAssessment,
  // developerArchetype, profileConfidence) via jsonb_build_object — no JS stripping needed
  return <UsersClientView initialProfiles={profiles} totalProfileCount={totalCount} />;
}
