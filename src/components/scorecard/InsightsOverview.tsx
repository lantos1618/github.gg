import { RepoInsights } from '@/lib/analysis/insights';

interface InsightsOverviewProps {
  overview: RepoInsights['overview'];
}

export function InsightsOverview({ overview }: InsightsOverviewProps) {
  const complexityColor: Record<string, string> = {
    low: '#34a853',
    medium: '#f59e0b',
    high: '#ea4335',
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
          Repository Overview
        </div>
        <p className="text-[14px] text-[#666] leading-[1.6]">{overview.summary}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-[12px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">Total Files</div>
          <div className="text-[28px] font-semibold text-[#111]">{overview.totalFiles.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[12px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">Size</div>
          <div className="text-[28px] font-semibold text-[#111]">{overview.totalSize}</div>
        </div>
        <div>
          <div className="text-[12px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">Main Language</div>
          <div className="text-[28px] font-semibold text-[#111]">{overview.mainLanguage}</div>
        </div>
        <div>
          <div className="text-[12px] text-[#aaa] font-semibold tracking-[1px] uppercase mb-1">Complexity</div>
          <div className="text-[28px] font-semibold capitalize" style={{ color: complexityColor[overview.complexity] || '#6b7280' }}>
            {overview.complexity}
          </div>
        </div>
      </div>
    </div>
  );
}
