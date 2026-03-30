import type { ScoredMetric } from '@/lib/types/profile';

interface SkillAssessmentProps {
  skills: ScoredMetric[];
  compact?: boolean;
}

export function SkillAssessment({ skills, compact = false }: SkillAssessmentProps) {
  if (compact) {
    return (
      <div className="space-y-2.5">
        {skills.map((skill, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-28 text-[14px] font-medium text-[#111] truncate">
              {skill.metric}
            </div>
            <div className="flex-1">
              <div className="h-1 bg-[#eee] overflow-hidden">
                <div
                  className="h-full bg-[#111]"
                  style={{ width: `${skill.score * 10}%` }}
                />
              </div>
            </div>
            <div className="w-10 text-[12px] text-[#888] text-right font-mono">
              {skill.score}/10
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {skills.map((skill, index) => (
        <div key={index}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[14px] font-medium text-[#111]">{skill.metric}</span>
            <span className="text-[14px] font-semibold text-[#111] font-mono">
              {skill.score}/10
            </span>
          </div>

          <div className="h-1 w-full bg-[#eee] overflow-hidden">
            <div
              className="h-full bg-[#111]"
              style={{ width: `${skill.score * 10}%` }}
            />
          </div>

          <p className="text-[12px] text-[#888] leading-[1.5] mt-1.5">
            {skill.reason}
          </p>
        </div>
      ))}
    </div>
  );
}
