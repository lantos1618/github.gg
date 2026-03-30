import { RepoInsights, getLanguageColor } from '@/lib/analysis/insights';

interface LanguageBreakdownProps {
  languages: RepoInsights['languages'];
}

export function LanguageBreakdown({ languages }: LanguageBreakdownProps) {
  return (
    <div data-testid="scorecard-language-breakdown">
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">Language Distribution</div>

      <div className="flex h-2 w-full overflow-hidden mb-6">
        {languages.map((lang) => (
          <div
            key={lang.name}
            className="h-full transition-all duration-500"
            style={{ width: `${lang.percentage}%`, backgroundColor: getLanguageColor(lang.name) }}
            title={`${lang.name} (${lang.percentage}%)`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {languages.map((lang) => (
          <div key={lang.name} className="flex items-start gap-3 py-2">
            <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: getLanguageColor(lang.name) }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="text-[14px] font-medium text-[#111] truncate">{lang.name}</span>
                <span className="text-[14px] font-semibold text-[#111]">{lang.percentage}%</span>
              </div>
              <div className="text-[12px] text-[#aaa]">{lang.files.toLocaleString()} files · {lang.lines.toLocaleString()} lines</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
