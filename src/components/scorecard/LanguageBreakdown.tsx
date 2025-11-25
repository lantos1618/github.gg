import { RepoInsights, getLanguageColor } from '@/lib/analysis/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2 } from 'lucide-react';

interface LanguageBreakdownProps {
  languages: RepoInsights['languages'];
}

export function LanguageBreakdown({ languages }: LanguageBreakdownProps) {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="bg-white/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          Language Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Visual Bar */}
          <div className="flex h-4 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            {languages.map((lang) => (
              <div
                key={lang.name}
                className="h-full transition-all duration-500 hover:opacity-90 relative group"
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: getLanguageColor(lang.name),
                }}
              >
                 <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {lang.name} ({lang.percentage}%)
                 </div>
              </div>
            ))}
          </div>

          {/* Legend List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map((lang) => (
              <div key={lang.name} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <div 
                  className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: getLanguageColor(lang.name) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-sm truncate">{lang.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{lang.percentage}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{lang.files.toLocaleString()} files</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span>{lang.lines.toLocaleString()} lines</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
