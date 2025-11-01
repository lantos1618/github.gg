"use client";

import { useMemo } from 'react';
import { GenericAnalysisView } from '@/components/analysis/GenericAnalysisView';
import { createAnalysisConfig, type AnalysisType } from '@/lib/analysis/configFactory';

interface AnalysisClientViewProps {
  user: string;
  repo: string;
  refName?: string;
  path?: string;
  analysisType: AnalysisType;
}

export default function AnalysisClientView({
  user,
  repo,
  refName,
  path,
  analysisType
}: AnalysisClientViewProps) {
  // Memoize config creation to prevent recreating hooks on every render
  const config = useMemo(() => createAnalysisConfig(analysisType), [analysisType]);
  return <GenericAnalysisView user={user} repo={repo} refName={refName} path={path} config={config} />;
}
