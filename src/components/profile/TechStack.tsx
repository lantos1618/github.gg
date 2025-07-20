import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        return <Code className="h-4 w-4" />;
      case 'Framework':
        return <Layers className="h-4 w-4" />;
      case 'Database':
        return <Database className="h-4 w-4" />;
      case 'Tool':
        return <Wrench className="h-4 w-4" />;
      case 'Platform':
        return <Globe className="h-4 w-4" />;
      case 'Library':
        return <Library className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Technology Stack
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedTech).map(([type, techs]) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                {getTypeIcon(type)}
                <h4 className="font-semibold text-sm">{type}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {techs.map((tech, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs"
                  >
                    {tech.name}
                    <span className="ml-1 text-muted-foreground">
                      ({tech.repoCount})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 