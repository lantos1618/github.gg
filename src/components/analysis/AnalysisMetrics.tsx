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
        <div className="mb-4">{renderCustomMetrics(metrics)}</div>
      )}

      {/* Metrics Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Metrics Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-md bg-background">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-left">Score</th>
                <th className="px-4 py-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => {
                const colorClass = getMetricColor ? getMetricColor(m.score) : 'bg-blue-500';
                return (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{m.metric}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span>{m.score}</span>
                        <div className="w-32 h-2 bg-gray-200 rounded">
                          <div
                            className={`h-2 rounded ${colorClass}`}
                            style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{m.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
