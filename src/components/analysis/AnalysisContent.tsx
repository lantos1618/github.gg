'use client';

import React from 'react';
import { MarkdownCardRenderer } from '@/components/MarkdownCardRenderer';
import { AnalysisMetrics } from './AnalysisMetrics';
import { ReactNode } from 'react';

interface Metric {
  metric: string;
  score: number;
  reason: string;
}

interface AnalysisData {
  markdown: string;
  metrics?: Metric[];
}

interface AnalysisContentProps {
  data: AnalysisData;
  title: string;
  showMetricsBar?: boolean;
  renderCustomMetrics?: (data: AnalysisData) => ReactNode;
  getMetricColor?: (score: number) => string;
}

export const AnalysisContent: React.FC<AnalysisContentProps> = ({
  data,
  title,
  showMetricsBar = false,
  renderCustomMetrics,
  getMetricColor,
}) => {
  return (
    <div>
      {data.metrics && (
        <AnalysisMetrics
          metrics={data.metrics}
          showMetricsBar={showMetricsBar}
          renderCustomMetrics={renderCustomMetrics ? () => renderCustomMetrics(data) : undefined}
          getMetricColor={getMetricColor}
        />
      )}
      <MarkdownCardRenderer markdown={data.markdown} title={title} />
    </div>
  );
};
