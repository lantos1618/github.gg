'use client';

import React, { ReactNode } from 'react';

interface Metric {
  metric: string;
  score: number;
  reason: string;
}

interface AnalysisMetricsProps {
  metrics: Metric[] | undefined;
  showMetricsBar?: boolean;
  renderCustomMetrics?: (metrics: Metric[]) => ReactNode;
  getMetricColor?: (score: number) => string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#34a853';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#6b7280';
  return '#ea4335';
}

export const AnalysisMetrics: React.FC<AnalysisMetricsProps> = ({
  metrics,
  showMetricsBar = false,
  renderCustomMetrics,
  getMetricColor,
}) => {
  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return null;
  }

  return (
    <>
      {showMetricsBar && renderCustomMetrics && (
        <div className="mb-8">
          {renderCustomMetrics(metrics)}
        </div>
      )}

      {/* Metrics Table */}
      <div className="mb-8">
        <div className="text-[11px] text-[#aaa] font-semibold tracking-[1.5px] uppercase mb-4">
          Metrics Breakdown
        </div>

        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b border-[#ddd]">
              <td className="py-2 px-2 text-[11px] text-[#aaa] font-semibold w-[180px]">Metric</td>
              <td className="py-2 px-2 text-[11px] text-[#aaa] font-semibold w-[120px]">Score</td>
              <td className="py-2 px-2 text-[11px] text-[#aaa] font-semibold">Analysis</td>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const color = getMetricColor
                ? getMetricColor(m.score).replace('bg-', '').replace('text-', '')
                : undefined;
              const scoreColor = color || getScoreColor(m.score);

              return (
                <tr key={i} className="border-b border-[#f0f0f0]">
                  <td className="py-3 px-2 font-medium text-[#111] align-top">
                    {m.metric}
                  </td>
                  <td className="py-3 px-2 align-top">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-semibold text-[14px]" style={{ color: typeof scoreColor === 'string' && scoreColor.startsWith('#') ? scoreColor : undefined }}>
                        {m.score}/100
                      </span>
                      <div className="w-full h-1 bg-[#eee] overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${Math.max(0, Math.min(100, m.score))}%`,
                            backgroundColor: typeof scoreColor === 'string' && scoreColor.startsWith('#') ? scoreColor : '#111',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-[#666] leading-[1.6] align-top">
                    {m.reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};
