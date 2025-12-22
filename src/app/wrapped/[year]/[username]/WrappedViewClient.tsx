'use client';

import { WrappedStory } from '@/components/wrapped';
import type { WrappedData } from '@/lib/types/wrapped';

interface WrappedViewClientProps {
  data: WrappedData;
}

export function WrappedViewClient({ data }: WrappedViewClientProps) {
  return <WrappedStory data={data} />;
}
