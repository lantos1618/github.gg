import { Progress } from '@/components/ui/progress';
import type { ScoredMetric } from '@/lib/types/profile';

interface SkillAssessmentProps {
  skills: ScoredMetric[];
}

export function SkillAssessment({ skills }: SkillAssessmentProps) {
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
