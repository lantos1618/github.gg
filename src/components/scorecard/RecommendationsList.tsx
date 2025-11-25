import { RepoInsights } from '@/lib/analysis/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Lightbulb, Shield, Zap, Wrench, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecommendationsListProps {
  recommendations: RepoInsights['recommendations'];
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="w-4 h-4 text-rose-500" />;
      case 'performance':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'maintainability':
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'documentation':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      case 'medium':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'low':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'security':
        return 'bg-rose-50/50 dark:bg-rose-900/10 hover:border-rose-200 dark:hover:border-rose-800';
      case 'performance':
        return 'bg-amber-50/50 dark:bg-amber-900/10 hover:border-amber-200 dark:hover:border-amber-800';
      case 'maintainability':
        return 'bg-blue-50/50 dark:bg-blue-900/10 hover:border-blue-200 dark:hover:border-blue-800';
      case 'documentation':
        return 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:border-emerald-200 dark:hover:border-emerald-800';
      default:
        return 'bg-gray-50/50 dark:bg-gray-900/10 hover:border-gray-200 dark:hover:border-gray-800';
    }
  };

  // Sort recommendations by priority (high first)
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-white/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
        <CardTitle className="text-lg flex items-center space-x-2">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
          </div>
          <span>Strategic Recommendations</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sortedRecommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-6 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary ${getCategoryBg(rec.category)}`}
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getCategoryIcon(rec.category)}
                      <span className="capitalize">{rec.category}</span>
                    </div>
                    <Badge variant="outline" className={`capitalize font-normal ${getPriorityColor(rec.priority)}`}>
                      {rec.priority} Priority
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1">
                      {rec.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex items-start gap-3">
                <div className="bg-primary/10 p-1.5 rounded-full mt-0.5">
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Action Plan</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {rec.action}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
