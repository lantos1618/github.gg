'use client';

import React, { ReactNode } from 'react';
import { MarkdownCardRenderer } from '@/components/MarkdownCardRenderer';
import { AnalysisMetrics } from './AnalysisMetrics';

interface Metric {
  metric: string;
  score: number;
  reason: string;
}

interface AnalysisData {
  markdown: string;
  metrics?: Metric[];
  detectedPatterns?: string[]; // Add this to support SlopMetrics
  overallScore?: number;       // Add this to support SlopMetrics
  aiGeneratedPercentage?: number; // Add this to support SlopMetrics
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
    <div className="space-y-6">
      {data.metrics && (
        <AnalysisMetrics
          metrics={data.metrics}
          showMetricsBar={showMetricsBar}
          renderCustomMetrics={renderCustomMetrics ? () => renderCustomMetrics(data) : undefined}
          getMetricColor={getMetricColor}
        />
      )}
      
      {/* 
        Ensure detectedPatterns are passed if renderCustomMetrics is used 
        (SlopMetrics needs data.detectedPatterns, data.overallScore etc)
      */}
      
      <MarkdownCardRenderer markdown={data.markdown} title={title} />
    </div>
  );
};
