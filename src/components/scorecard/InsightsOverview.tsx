import { RepoInsights } from '@/lib/analysis/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InsightsOverviewProps {
  overview: RepoInsights['overview'];
}

export function InsightsOverview({ overview }: InsightsOverviewProps) {
  const complexityColor = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    high: 'bg-red-100 text-red-800'
  };

  const metrics = [
    {
      title: 'Total Files',
      value: overview.totalFiles.toLocaleString(),
      description: 'Files in repository'
    },
    {
      title: 'Size',
      value: overview.totalSize,
      description: 'Repository size'
    },
    {
      title: 'Main Language',
      value: overview.mainLanguage,
      description: 'Primary language'
    },
    {
      title: 'Complexity',
      value: overview.complexity,
      description: 'Code complexity',
      badge: true
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Repository Overview</h2>
        <p className="text-gray-600 text-sm">{overview.summary}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metric.badge ? (
                <Badge className={complexityColor[overview.complexity]}>
                  {metric.value}
                </Badge>
              ) : (
                <div className="text-2xl font-bold">{metric.value}</div>
              )}
              <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 