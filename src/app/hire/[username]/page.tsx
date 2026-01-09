import { Metadata } from 'next';
import { HiringReportClient } from './HiringReportClient';

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

  return <HiringReportClient username={username} />;
}
