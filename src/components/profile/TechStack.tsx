import { Badge } from '@/components/ui/badge';
import { Database, Code, Wrench, Globe, Library, Layers } from 'lucide-react';
import type { TechStackItem } from '@/lib/types/profile';

interface TechStackProps {
  techStack: TechStackItem[];
}

export function TechStack({ techStack }: TechStackProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Language':
        return <Code className="h-3.5 w-3.5" />;
      case 'Framework':
        return <Layers className="h-3.5 w-3.5" />;
      case 'Database':
        return <Database className="h-3.5 w-3.5" />;
      case 'Tool':
        return <Wrench className="h-3.5 w-3.5" />;
      case 'Platform':
        return <Globe className="h-3.5 w-3.5" />;
      case 'Library':
        return <Library className="h-3.5 w-3.5" />;
      default:
        return <Code className="h-3.5 w-3.5" />;
    }
  };

  // Group by type
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
            {getTypeIcon(type)}
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
