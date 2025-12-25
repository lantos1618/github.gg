import { Database, Code, Wrench, Globe, Library, Layers } from 'lucide-react';
import type { TechStackItem } from '@/lib/types/profile';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Language: <Code className="h-3.5 w-3.5" />,
  Framework: <Layers className="h-3.5 w-3.5" />,
  Database: <Database className="h-3.5 w-3.5" />,
  Tool: <Wrench className="h-3.5 w-3.5" />,
  Platform: <Globe className="h-3.5 w-3.5" />,
  Library: <Library className="h-3.5 w-3.5" />,
};

const DEFAULT_ICON = <Code className="h-3.5 w-3.5" />;

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
      {Object.entries(groupedTech).map(([type, techs]) => (
        <div key={type} className="space-y-3">
          <div className="flex items-center gap-2 text-gray-500 border-b border-gray-100 pb-2">
            {TYPE_ICONS[type] || DEFAULT_ICON}
            <h4 className="font-mono text-xs uppercase tracking-wider">{type}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {techs.map((tech, index) => (
              <div 
                key={index} 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 text-sm text-black font-medium border border-gray-100"
              >
                {tech.name}
                <span className="text-xs text-gray-400 font-mono">
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
