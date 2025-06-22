import { RepoInsights } from '@/lib/analysis/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Lightbulb, Shield, Zap, Wrench, FileText } from 'lucide-react';

interface RecommendationsListProps {
  recommendations: RepoInsights['recommendations'];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'performance':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'maintainability':
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'documentation':
        return <FileText className="w-4 h-4 text-green-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security':
        return 'bg-red-50 border-red-200';
      case 'performance':
        return 'bg-yellow-50 border-yellow-200';
      case 'maintainability':
        return 'bg-blue-50 border-blue-200';
      case 'documentation':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Sort recommendations by priority (high first)
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Lightbulb className="w-5 h-5" />
          <span>Recommendations</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedRecommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getCategoryColor(rec.category)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(rec.category)}
                  <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {rec.category}
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
              
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <ArrowRight className="w-4 h-4" />
                <span className="font-medium">Action:</span>
                <span>{rec.action}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 