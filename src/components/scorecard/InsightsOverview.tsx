import { RepoInsights } from '@/lib/analysis/insights';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode, Database, Code2, Activity } from 'lucide-react';

interface InsightsOverviewProps {
  overview: RepoInsights['overview'];
}

export function InsightsOverview({ overview }: InsightsOverviewProps) {
  const complexityColor = {
    low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', 
    high: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800'
  };

  const metrics = [
    {
      title: 'Total Files',
      value: overview.totalFiles.toLocaleString(),
      description: 'Files in repository',
      icon: FileCode,
      color: "text-blue-500"
    },
    {
      title: 'Size',
      value: overview.totalSize,
      description: 'Repository size',
      icon: Database,
      color: "text-purple-500"
    },
    {
      title: 'Main Language',
      value: overview.mainLanguage,
      description: 'Primary language',
      icon: Code2,
      color: "text-orange-500"
    },
    {
      title: 'Complexity',
      value: overview.complexity,
      description: 'Code complexity',
      badge: true,
      icon: Activity,
      color: "text-pink-500"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="prose dark:prose-invert max-w-none">
        <h2 className="text-xl font-semibold tracking-tight">Repository Overview</h2>
        <p className="text-muted-foreground text-sm leading-relaxed border-l-4 border-primary/20 pl-4 py-1">
          {overview.summary}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="border-none shadow-md bg-white/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-900 transition-colors">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </span>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              
              <div className="space-y-1">
                {metric.badge ? (
                  <Badge variant="outline" className={`capitalize px-3 py-1 ${complexityColor[overview.complexity]}`}>
                    {metric.value}
                  </Badge>
                ) : (
                  <div className="text-2xl font-bold tracking-tight">{metric.value}</div>
                )}
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
