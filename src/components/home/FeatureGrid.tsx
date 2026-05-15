import { PageWidthContainer } from '@/components/PageWidthContainer';

// HeroDiagram has moved into HeroSection (split-screen, right column) so the
// landing's strongest product asset sits above the fold next to the input.
// This section is now a compact feature roll-up — Scorecards / Wiki / PR
// reviews / Slop detector — that lives between the hero demo and the install
// CTA. Trimmed of marketing fluff per the value-first audit.
const FEATURES = [
  { label: 'Scorecards', desc: 'A–F grades, per file.' },
  { label: 'Wiki', desc: 'Generated from your code.' },
  { label: 'PR reviews', desc: 'AI comments on every PR.' },
  { label: 'Slop detector', desc: 'Catches AI-shaped code.' },
];

export function FeatureGrid() {
  return (
    <section className="bg-white border-t border-[#eee]" data-testid="home-feature-grid">
      <PageWidthContainer className="py-14">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-6">
          Every analysis above is one of these
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.label} className="border-l-2 border-[#111] pl-3">
              <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#111] mb-1">
                {f.label}
              </div>
              <div className="text-[13px] text-[#666] leading-[1.5]">
                {f.desc}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-[13px] text-[#aaa]">
          Works with any public GitHub repository. Private repos supported with GitHub App installation.
        </div>
      </PageWidthContainer>
    </section>
  );
}
