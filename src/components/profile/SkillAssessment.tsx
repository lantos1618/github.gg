import type { ScoredMetric } from '@/lib/types/profile';

interface SkillAssessmentProps {
  skills: ScoredMetric[];
  compact?: boolean;
}

export function SkillAssessment({ skills, compact = false }: SkillAssessmentProps) {
  if (compact) {
    return (
      <div className="space-y-3">
        {skills.map((skill, idx) => (
          <div key={idx} className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium text-gray-700 truncate">
              {skill.metric}
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    skill.score >= 8 ? 'bg-emerald-500' :
                    skill.score >= 6 ? 'bg-blue-500' :
                    skill.score >= 4 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${skill.score * 10}%` }}
                />
              </div>
            </div>
            <div className="w-10 text-sm text-gray-500 text-right">
              {skill.score}/10
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {skills.map((skill, index) => (
        <div key={index} className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-black text-sm">{skill.metric}</h4>
            <span className="font-mono text-sm font-medium text-black">
              {skill.score}/10
            </span>
          </div>

          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full"
              style={{ width: `${skill.score * 10}%` }}
            />
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            {skill.reason}
          </p>
        </div>
      ))}
    </div>
  );
}
