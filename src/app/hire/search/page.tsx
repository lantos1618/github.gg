import { createCaller } from '@/lib/trpc/server';
import HireSearchClient from './HireSearchClient';

export const revalidate = 300;

export default async function HireSearchPage() {
  const caller = await createCaller();
  const data = await caller.profile.searchProfiles({ limit: 50 });

  // Serialize Date objects to strings to match tRPC client wire format
  const initialData = {
    ...data,
    results: data.results.map((r) => ({
      ...r,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };

  return <HireSearchClient initialData={initialData} />;
}
