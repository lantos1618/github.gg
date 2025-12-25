import { RepoInsights } from '@/lib/analysis/insights';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, XCircle, TrendingUp, Gauge } from 'lucide-react';

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  error: <XCircle className="w-5 h-5 text-rose-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const getScoreBg = (score: number) => {
  if (score >= 80) return 'bg-emerald-100 dark:bg-emerald-900/20';
  if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/20';
  return 'bg-rose-100 dark:bg-rose-900/20';
};

interface QualityMetricsProps {
  quality: RepoInsights['quality'];
}

export function QualityMetrics({ quality }: QualityMetricsProps) {

  return (
    <div className="space-y-8">
      {/* Overall Quality Score & Metrics Grid Combined */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score Card - Simplified without heavy container borders */}
        <div className="col-span-1 flex flex-col items-center justify-center p-8 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground font-medium mb-6">
             <Gauge className="w-4 h-4" />
             <span>Quality Score</span>
          </div>
          
          <div className={`w-40 h-40 rounded-full flex items-center justify-center border-[12px] ${getScoreBg(quality.score)} border-current transition-all duration-500 ${getScoreColor(quality.score)}`}>
            <span className="text-5xl font-bold tracking-tighter">
              {quality.score}
            </span>
          </div>
          
          <div className="mt-6 text-center max-w-[200px]">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Based on maintainability, coverage, and complexity analysis
            </p>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="col-span-1 lg:col-span-2 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Detailed Metrics</h3>
            </div>
          
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-8 gap-y-6">
              {Object.entries(quality.metrics).map(([key, value]) => (
                <div key={key} className="flex flex-col group">
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className={`text-xl font-bold ${getScoreColor(value)}`}>
                        {value}<span className="text-xs text-muted-foreground ml-1 font-normal">/100</span>
                      </span>
                  </div>
                  
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getScoreColor(value).replace('text-', 'bg-')}`} 
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* Quality Issues */}
      {quality.issues.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-muted/40">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Identified Issues
            </h3>
          </div>
          
          <div className="divide-y divide-border">
            {quality.issues.map((issue, index) => (
              <div key={index} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="mt-1 flex-shrink-0">
                  {ISSUE_ICONS[issue.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {issue.message}
                    </span>
                    <Badge variant="outline" className={`w-fit text-[10px] px-2 py-0.5 uppercase font-bold tracking-wider ${SEVERITY_COLORS[issue.severity]}`}>
                      {issue.severity}
                    </Badge>
                  </div>
                  {issue.file && (
                    <p className="text-xs text-muted-foreground font-mono mt-1.5">
                      {issue.file}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
