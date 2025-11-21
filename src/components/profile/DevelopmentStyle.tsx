import { Progress } from '@/components/ui/progress';
import type { ScoredMetric } from '@/lib/types/profile';

interface DevelopmentStyleProps {
  traits: ScoredMetric[];
}

export function DevelopmentStyle({ traits }: DevelopmentStyleProps) {
  return (
    <div className="space-y-8">
      {traits.map((trait, index) => (
        <div key={index} className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-black text-sm">{trait.metric}</h4>
            <span className="font-mono text-sm font-medium text-black">
              {trait.score}/10
            </span>
          </div>
          
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black rounded-full" 
              style={{ width: `${trait.score * 10}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-500 leading-relaxed">
            {trait.reason}
          </p>
        </div>
      ))}
    </div>
  );
}
