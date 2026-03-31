import { RepoInsights } from '@/lib/analysis/insights';

const CATEGORY_COLORS: Record<string, string> = {
  security: '#ea4335',
  performance: '#f59e0b',
  maintainability: '#4285f4',
  documentation: '#34a853',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ea4335',
  medium: '#f59e0b',
  low: '#34a853',
};

interface RecommendationsListProps {
  recommendations: RepoInsights['recommendations'];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const sorted = [...recommendations].sort((a, b) => {
    const order = { high: 3, medium: 2, low: 1 };
    return order[b.priority] - order[a.priority];
  });

  return (
    <div>
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">
        Strategic Recommendations
      </div>
      <div className="space-y-[2px]">
        {sorted.map((rec, index) => {
          const color = CATEGORY_COLORS[rec.category] || '#6b7280';
          return (
            <div key={index} className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: `3px solid ${color}` }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[13px] font-semibold uppercase tracking-[1px]" style={{ color }}>{rec.category}</span>
                <span className="text-[13px] font-semibold uppercase tracking-[1px]" style={{ color: PRIORITY_COLORS[rec.priority] }}>{rec.priority}</span>
              </div>
              <div className="text-base font-medium text-[#111] mb-1">{rec.title}</div>
              <div className="text-base text-[#666] leading-[1.6] mb-3">{rec.description}</div>
              <div className="border-t border-[#eee] pt-2 mt-2">
                <span className="text-[13px] text-[#aaa] font-semibold uppercase tracking-[1px]">Action</span>
                <p className="text-base text-[#333] mt-1">{rec.action}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
