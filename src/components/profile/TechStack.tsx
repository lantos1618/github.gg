import type { TechStackItem } from '@/lib/types/profile';
import { getLanguageColor } from '@/lib/analysis/insights';

interface TechStackProps {
  techStack: TechStackItem[];
}

function getTier(repoCount: number, max: number): 'primary' | 'proficient' | 'familiar' {
  const ratio = repoCount / max;
  if (ratio >= 0.5) return 'primary';
  if (ratio >= 0.2) return 'proficient';
  return 'familiar';
}

const TIER_LABELS = {
  primary: 'Primary',
  proficient: 'Proficient',
  familiar: 'Familiar',
} as const;

export function TechStack({ techStack }: TechStackProps) {
  const maxCount = Math.max(...techStack.map(t => t.repoCount), 1);

  const grouped = techStack.reduce((acc, tech) => {
    const tier = getTier(tech.repoCount, maxCount);
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(tech);
    return acc;
  }, {} as Record<string, TechStackItem[]>);

  // Sort each tier by repo count descending
  for (const tier of Object.values(grouped)) {
    tier.sort((a, b) => b.repoCount - a.repoCount);
  }

  const tierOrder: Array<'primary' | 'proficient' | 'familiar'> = ['primary', 'proficient', 'familiar'];

  return (
    <div className="space-y-5">
      {tierOrder.map(tier => {
        const techs = grouped[tier];
        if (!techs?.length) return null;
        return (
          <div key={tier}>
            <div className="text-[11px] text-[#bbb] font-semibold tracking-[1.5px] uppercase mb-2">
              {TIER_LABELS[tier]}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {techs.map((tech, i) => {
                const color = getLanguageColor(tech.name);
                return (
                  <span
                    key={i}
                    className="inline-flex items-baseline gap-1.5 pb-0.5 border-b-2 text-base"
                    style={{ borderColor: color }}
                  >
                    <span className="font-medium text-[#111]">{tech.name}</span>
                    <span className="text-[13px] text-[#999]">{tech.repoCount}</span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
