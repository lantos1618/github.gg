import { createCaller } from '@/lib/trpc/server';
import { UsersClientView } from '@/components/users/UsersClientView';
import type { Metadata } from 'next';

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
  const [profiles, leaderboard] = await Promise.all([
    caller.profile.getAllAnalyzedProfiles({ limit: 200, offset: 0 }),
    caller.arena.getLeaderboard({ limit: 100, offset: 0 }),
  ]);

  return <UsersClientView initialProfiles={profiles} initialLeaderboard={leaderboard} />;
}
