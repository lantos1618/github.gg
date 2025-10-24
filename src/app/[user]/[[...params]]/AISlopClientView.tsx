"use client";
import { GenericAnalysisView } from '@/components/analysis/GenericAnalysisView';
import { createAnalysisConfig } from '@/lib/analysis/configFactory';

export default function AISlopClientView({ user, repo, refName, path }: { user: string; repo: string; refName?: string; path?: string }) {
  const config = createAnalysisConfig('ai-slop');
  return <GenericAnalysisView user={user} repo={repo} refName={refName} path={path} config={config} />;
}
