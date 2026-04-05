import type { TechStackItem } from '@/lib/types/profile';

interface TechStackProps {
  techStack: TechStackItem[];
}

export function TechStack({ techStack }: TechStackProps) {
  const groupedTech = techStack.reduce((acc, tech) => {
    if (!acc[tech.type]) {
      acc[tech.type] = [];
    }
    acc[tech.type].push(tech);
    return acc;
  }, {} as Record<string, TechStackItem[]>);

  const maxCount = Math.max(...techStack.map(t => t.repoCount), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
      {Object.entries(groupedTech).map(([type, techs]) => (
        <div key={type}>
          <div className="text-[11px] text-[#bbb] font-semibold tracking-[1.5px] uppercase mb-3">
            {type}
          </div>
          <div className="space-y-3">
            {techs.map((tech, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base font-medium text-[#111]">{tech.name}</span>
                  <span className="text-[13px] text-[#888] font-mono">{tech.repoCount}</span>
                </div>
                <div className="h-1 w-full bg-[#eee] overflow-hidden">
                  <div
                    className="h-full bg-[#111] transition-all duration-500"
                    style={{ width: `${(tech.repoCount / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
