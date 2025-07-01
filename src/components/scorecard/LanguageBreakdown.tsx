import { RepoInsights, getLanguageColor } from '@/lib/analysis/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LanguageBreakdownProps {
  languages: RepoInsights['languages'];
}

export function LanguageBreakdown({ languages }: LanguageBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Language Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {languages.map((lang) => (
            <div key={lang.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getLanguageColor(lang.name) }}
                />
                <span className="font-medium">{lang.name}</span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span>{lang.files.toLocaleString()} files</span>
                <span>{lang.lines.toLocaleString()} lines</span>
                <span className="font-semibold text-gray-900">{lang.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Progress bar visualization */}
        <div className="mt-4">
          <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
            {languages.map((lang) => (
              <div
                key={lang.name}
                className="h-full transition-all duration-300"
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: getLanguageColor(lang.name),
                }}
                title={`${lang.name}: ${lang.percentage}%`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 