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

  // Build flat list: tier label then chips, all in one flex flow
  const items: Array<{ type: 'label'; tier: string } | { type: 'chip'; tech: TechStackItem }> = [];
  const tierOrder: Array<'primary' | 'proficient' | 'familiar'> = ['primary', 'proficient', 'familiar'];

  const grouped = techStack.reduce((acc, tech) => {
    const tier = getTier(tech.repoCount, maxCount);
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(tech);
    return acc;
  }, {} as Record<string, TechStackItem[]>);

  for (const tier of tierOrder) {
    const techs = grouped[tier];
    if (!techs?.length) continue;
    techs.sort((a, b) => b.repoCount - a.repoCount);
    items.push({ type: 'label', tier: TIER_LABELS[tier] });
    for (const tech of techs) {
      items.push({ type: 'chip', tech });
    }
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      {items.map((item, i) =>
        item.type === 'label' ? (
          <span key={`l-${i}`} className="text-[11px] text-[#bbb] font-semibold tracking-[1.5px] uppercase mr-1">
            {item.tier}
          </span>
        ) : (
          <span
            key={`c-${i}`}
            className="inline-flex items-baseline gap-1 pb-0.5 border-b-2 text-base"
            style={{ borderColor: getLanguageColor(item.tech.name) }}
          >
            <span className="font-medium text-[#111]">{item.tech.name}</span>
            <span className="text-[13px] text-[#999]">{item.tech.repoCount}</span>
          </span>
        )
      )}
    </div>
  );
}
