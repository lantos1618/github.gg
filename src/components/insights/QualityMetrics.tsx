import { RepoInsights } from '@/lib/analysis/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface QualityMetricsProps {
  quality: RepoInsights['quality'];
}

export function QualityMetrics({ quality }: QualityMetricsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getIssueIcon = (type: 'warning' | 'error' | 'info') => {
    switch (type) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Code Quality Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getScoreBg(quality.score)}`}>
              <span className={`text-2xl font-bold ${getScoreColor(quality.score)}`}>
                {quality.score}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Overall Quality</p>
              <p className="text-xs text-gray-500">Based on maintainability, test coverage, documentation, and complexity</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Metrics Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quality Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(quality.metrics).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(value)}`}>
                  {value}
                </div>
                <div className="text-xs text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quality Issues */}
      {quality.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quality Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quality.issues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getIssueIcon(issue.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">{issue.message}</span>
                      <Badge className={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                    </div>
                    {issue.file && (
                      <p className="text-xs text-gray-500 font-mono">{issue.file}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 