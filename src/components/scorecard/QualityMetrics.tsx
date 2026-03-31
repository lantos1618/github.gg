import { RepoInsights } from '@/lib/analysis/insights';

function getScoreColor(score: number): string {
  if (score >= 80) return '#34a853';
  if (score >= 60) return '#f59e0b';
  return '#ea4335';
}

interface QualityMetricsProps {
  quality: RepoInsights['quality'];
}

export function QualityMetrics({ quality }: QualityMetricsProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quality Score */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">Quality Score</div>
          <div className="text-[64px] font-semibold leading-none" style={{ color: getScoreColor(quality.score) }}>
            {quality.score}
          </div>
          <div className="text-[13px] text-[#aaa] mt-2">Based on maintainability, coverage, and complexity</div>
        </div>

        {/* Detailed Metrics */}
        <div className="lg:col-span-2">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">Detailed Metrics</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {Object.entries(quality.metrics).map(([key, value]) => {
              const color = getScoreColor(value);
              return (
                <div key={key} data-testid={`scorecard-metric-${key}-card`}>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[13px] text-[#888] uppercase tracking-[0.5px]">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-base font-semibold" style={{ color }}>
                      {value}<span className="text-[13px] text-[#aaa] ml-0.5">/100</span>
                    </span>
                  </div>
                  <div className="h-1 w-full bg-[#eee] overflow-hidden">
                    <div className="h-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Issues */}
      {quality.issues.length > 0 && (
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">Identified Issues</div>
          <div className="space-y-[2px]">
            {quality.issues.map((issue, index) => {
              const color = issue.severity === 'high' ? '#ea4335' : issue.severity === 'medium' ? '#f59e0b' : '#34a853';
              return (
                <div key={index} className="bg-[#f8f9fa] py-[12px] px-[16px]" style={{ borderLeft: `3px solid ${color}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-base text-[#333] leading-[1.6]">{issue.message}</div>
                    <span className="text-[13px] font-semibold uppercase tracking-[1px] flex-shrink-0" style={{ color }}>{issue.severity}</span>
                  </div>
                  {issue.file && <div className="text-[13px] text-[#888] font-mono mt-1">{issue.file}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
