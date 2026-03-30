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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
      {Object.entries(groupedTech).map(([type, techs]) => (
        <div key={type}>
          <div className="text-[11px] text-[#aaa] font-semibold tracking-[1.5px] uppercase mb-3 pb-2 border-b border-[#f0f0f0]">
            {type}
          </div>
          <div className="flex flex-wrap gap-2">
            {techs.map((tech, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f8f9fa] text-[13px] text-[#111] font-medium border border-[#eee] rounded"
              >
                {tech.name}
                <span className="text-[11px] text-[#aaa] font-mono">
                  {tech.repoCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
