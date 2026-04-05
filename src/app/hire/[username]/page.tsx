import { Metadata } from 'next';
import { createCaller } from '@/lib/trpc/server';
import { HiringReportClient } from './HiringReportClient';

export const revalidate = 600; // ISR: revalidate every 10 minutes

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `Hiring Report: ${username} - GG`,
    description: `Developer skills assessment and verification for ${username}`,
  };
}

export default async function HiringReportPage({ params }: Props) {
  const { username } = await params;

  // Fetch profile data server-side so the page renders with content
  let initialData = null;
  try {
    const caller = await createCaller();
    initialData = await caller.profile.publicGetProfile({ username });
  } catch {
    // Client will handle the error/empty state
  }

  return <HiringReportClient username={username} initialData={initialData} />;
}
