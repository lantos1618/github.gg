'use client';

import React, { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

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
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderCustomMetrics(metrics)}
        </div>
      )}

      {/* Metrics Table */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b bg-muted/40">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Metrics Breakdown
          </h3>
        </div>
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px] font-medium text-muted-foreground pl-6">Metric</TableHead>
                <TableHead className="w-[140px] font-medium text-muted-foreground">Score</TableHead>
                <TableHead className="font-medium text-muted-foreground pr-6">Analysis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m, i) => {
                const colorClass = getMetricColor ? getMetricColor(m.score) : 'bg-blue-500';
                const scoreColor = getMetricColor ? getMetricColor(m.score).replace('bg-', 'text-') : 'text-blue-600';
                
                return (
                  <TableRow key={i} className="group hover:bg-muted/30 border-b-0">
                    <TableCell className="font-medium pl-6 align-top pt-4">
                      {m.metric}
                    </TableCell>
                    <TableCell className="align-top pt-4">
                      <div className="flex flex-col gap-2">
                        <span className={`font-bold ${scoreColor}`}>
                          {m.score}/100
                        </span>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                            style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm leading-relaxed align-top pt-4 pb-4 pr-6 whitespace-normal break-words">
                      {m.reason}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};
