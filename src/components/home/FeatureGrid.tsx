import { PageWidthContainer } from '@/components/PageWidthContainer';

export function FeatureGrid() {
  const steps = [
    {
      num: '1',
      color: '#f59e0b',
      label: 'Scorecards',
      desc: 'A-F quality grades for every file. Architecture patterns, complexity, test coverage — scored and explained.',
      detail: 'Per file, per function. Identify what needs attention before it becomes tech debt.',
    },
    {
      num: '2',
      color: '#8b5cf6',
      label: 'Diagrams',
      desc: 'Auto-generated architecture maps. Dependencies, data flow, class hierarchies — rendered as interactive Mermaid diagrams.',
    },
    {
      num: '3',
      color: '#14b8a6',
      label: 'Wiki',
      desc: 'Documentation generated from your codebase. API references, component guides, onboarding docs — maintained automatically.',
    },
    {
      num: '4',
      color: '#f43f5e',
      label: 'PR Reviews',
      desc: 'Automated code review on every pull request. Catch bugs, suggest improvements, enforce standards before merge.',
    },
    {
      num: '5',
      color: '#6b7280',
      label: 'Slop Detector',
      desc: 'Find low-quality AI-generated code. Pattern matching against known LLM outputs, hallucinated imports, and dead logic.',
    },
  ];

  return (
    <section className="bg-white border-t border-[#eee]" data-testid="home-feature-grid">
      <PageWidthContainer className="py-20">

        {/* Section label */}
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
          What You Get
        </div>

        <div className="text-[25px] font-semibold text-[#111] mb-2">
          Five layers of analysis
        </div>

        <p className="text-base text-[#aaa] mb-8">
          From architecture overview to line-by-line quality scores
        </p>

        {/* Eve-style numbered steps */}
        <div className="space-y-[2px] mb-8">
          {steps.map((step) => (
            <div key={step.num} className="flex">
              <div
                className="min-w-[32px] text-[20px] font-bold pt-[10px]"
                style={{ color: step.color }}
              >
                {step.num}
              </div>
              <div
                className="bg-[#f8f9fa] py-[14px] px-[16px] flex-1"
                style={{ borderLeft: `3px solid ${step.color}` }}
              >
                <div
                  className="text-[13px] font-semibold uppercase tracking-[1px] mb-1"
                  style={{ color: step.color }}
                >
                  {step.label}
                </div>
                <div className="text-base text-[#333] leading-[1.6]">
                  {step.desc}
                </div>
                {step.detail && (
                  <div className="text-[13px] text-[#888] mt-2 italic">
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[13px] text-[#aaa]">
          Works with any public GitHub repository. Private repos supported with GitHub App installation.
        </div>
      </PageWidthContainer>
    </section>
  );
}
