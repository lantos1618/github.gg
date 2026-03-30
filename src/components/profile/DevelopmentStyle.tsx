import type { ScoredMetric } from '@/lib/types/profile';

interface DevelopmentStyleProps {
  traits: ScoredMetric[];
}

export function DevelopmentStyle({ traits }: DevelopmentStyleProps) {
  return (
    <div className="space-y-5">
      {traits.map((trait, index) => (
        <div key={index}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[14px] font-medium text-[#111]">{trait.metric}</span>
            <span className="text-[14px] font-semibold text-[#111] font-mono">
              {trait.score}/10
            </span>
          </div>

          <div className="h-1 w-full bg-[#eee] overflow-hidden">
            <div
              className="h-full bg-[#111]"
              style={{ width: `${trait.score * 10}%` }}
            />
          </div>

          <p className="text-[12px] text-[#888] leading-[1.5] mt-1.5">
            {trait.reason}
          </p>
        </div>
      ))}
    </div>
  );
}
