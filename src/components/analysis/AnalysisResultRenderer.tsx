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
  detectedPatterns?: string[];
  overallScore?: number;
  aiGeneratedPercentage?: number;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  vulnerabilities?: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    title: string;
    file: string;
    recommendation: string;
  }>;
  attackSurface?: string[];
}

interface AnalysisResultRendererProps {
  data: AnalysisData;
  title: string;
  showMetricsBar?: boolean;
  renderCustomMetrics?: (data: AnalysisData) => ReactNode;
  getMetricColor?: (score: number) => string;
}

export const AnalysisResultRenderer: React.FC<AnalysisResultRendererProps> = ({
  data,
  title,
  showMetricsBar = false,
  renderCustomMetrics,
  getMetricColor,
}) => {
  return (
    <div data-testid="analysis-result-container" className="space-y-6">
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
