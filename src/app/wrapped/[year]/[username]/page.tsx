import { db } from '@/db';
import { githubWrapped } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { WrappedViewClient } from './WrappedViewClient';
import type { Metadata } from 'next';
import type { WrappedData } from '@/lib/types/wrapped';

interface PageProps {
  params: Promise<{ year: string; username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, username } = await params;
  
  return {
    title: `${username}'s ${year} GitHub Wrapped | github.gg`,
    description: `See ${username}'s year in code - commits, languages, and developer personality.`,
    openGraph: {
      title: `${username}'s ${year} GitHub Wrapped`,
      description: `Check out ${username}'s coding journey in ${year}`,
      images: [`/api/wrapped/${year}/${username}/badge.svg`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${username}'s ${year} GitHub Wrapped`,
      description: `Check out ${username}'s coding journey in ${year}`,
    },
  };
}

export default async function WrappedUserPage({ params }: PageProps) {
  const { year: yearParam, username } = await params;
  const year = parseInt(yearParam, 10);

  if (isNaN(year) || year < 2020 || year > 2100) {
    notFound();
  }

  const wrapped = await db
    .select()
    .from(githubWrapped)
    .where(
      and(
        eq(githubWrapped.username, username.toLowerCase()),
        eq(githubWrapped.year, year)
      )
    )
    .orderBy(desc(githubWrapped.createdAt))
    .limit(1);

  if (!wrapped.length) {
    notFound();
  }

  const wrappedData: WrappedData = {
    id: wrapped[0].id,
    userId: wrapped[0].userId,
    username: wrapped[0].username,
    year: wrapped[0].year,
    stats: wrapped[0].stats,
    aiInsights: wrapped[0].aiInsights,
    badgeTheme: wrapped[0].badgeTheme || 'dark',
    isPublic: wrapped[0].isPublic ?? true,
    shareCode: wrapped[0].shareCode,
    createdAt: wrapped[0].createdAt,
    updatedAt: wrapped[0].updatedAt,
  };

  return <WrappedViewClient data={wrappedData} />;
}
