import { createCaller } from '@/lib/trpc/server';
import { ReposClientView } from '@/components/repos/ReposClientView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analyzed Repositories - GG',
  description: 'Explore repositories with AI-generated scorecards and insights. Browse analyzed GitHub repositories with comprehensive code quality metrics and AI-powered analysis.',
  openGraph: {
    title: 'Analyzed Repositories - GG',
    description: 'Explore repositories with AI-generated scorecards and insights.',
  },
};

export default async function ReposPage() {
  const caller = await createCaller();
  
  // Fetch data on server
  const repos = await caller.scorecard.getAllAnalyzedRepos({ limit: 200, offset: 0 });

  return <ReposClientView initialRepos={repos} />;
}
