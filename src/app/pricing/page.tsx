import { FEATURE_COMPARISON } from '@/data/plans';
import { Check, X } from 'lucide-react';
import type { Metadata } from 'next';
import { PricingCardActions } from '@/components/PricingCardActions';

export const metadata: Metadata = {
  title: 'Pricing - GG',
  description: 'Understand any codebase in minutes, not hours. AI-powered docs, diagrams, and code reviews.',
  openGraph: {
    title: 'Pricing - GG',
    description: 'Understand any codebase in minutes, not hours.',
  },
};

const PRO_FEATURES = [
  { label: 'Wiki', name: 'AI Wiki Generation', benefit: 'Complete documentation generated in minutes, not days', color: '#14b8a6' },
  { label: 'Scores', name: 'Code Quality Scorecards', benefit: 'Instant A-F grades with actionable improvement suggestions', color: '#f59e0b' },
  { label: 'Diagrams', name: 'Architecture Diagrams', benefit: 'Auto-generated visual maps of how code connects', color: '#8b5cf6' },
  { label: 'Reviews', name: 'AI Code Reviews', benefit: 'Catch bugs and security issues before they ship', color: '#f43f5e' },
  { label: 'Private', name: 'Private Repo Access', benefit: 'Full analysis on your proprietary codebases', color: '#111' },
  { label: 'Tokens', name: '5M AI Tokens/Month', benefit: 'Analyze hundreds of repos per month', color: '#6b7280' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="w-[90%] max-w-[880px] mx-auto pt-16 pb-12">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">
          Pricing
        </div>
        <h1 className="text-[31px] sm:text-[39px] font-semibold text-[#111] leading-[1.2] mb-2 tracking-tight">
          Stop wasting hours reading unfamiliar code
        </h1>
        <p className="text-base text-[#aaa] mb-4">
          Pro gives you AI-generated docs, diagrams, and reviews for any repo
        </p>
        <div className="border-b border-[#eee] mb-10" />

        <p className="text-base text-[#666] leading-[1.6] mb-10">
          Public repos are free, forever. <strong className="text-[#111]">Pro</strong> unlocks AI features, private repo access, and priority support.
          Understand codebases in minutes, not hours.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="w-[90%] max-w-[880px] mx-auto pb-16">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="bg-[#f8f9fa] p-6" style={{ borderLeft: '3px solid #6b7280' }}>
            <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#6b7280] mb-3">
              Free
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[31px] font-semibold text-[#111]">$0</span>
              <span className="text-base text-[#aaa]">forever</span>
            </div>
            <p className="text-base text-[#666] mb-6">Browse and explore any public repo</p>

            <div className="space-y-2 mb-6">
              {['Unlimited public repo browsing', 'File tree navigation', 'Syntax highlighting', 'Community support'].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-[#aaa] mt-0.5 flex-shrink-0" />
                  <span className="text-base text-[#666]">{item}</span>
                </div>
              ))}
            </div>

            <PricingCardActions planType="free" isPro={false} />
          </div>

          {/* Pro Plan */}
          <div className="bg-white p-6 border-2 border-[#111] relative">
            <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-[#111] text-white text-[13px] font-semibold tracking-[1px] uppercase">
              Most Popular
            </div>

            <div className="text-[13px] font-semibold uppercase tracking-[1px] text-[#111] mb-3">
              Pro
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[31px] font-semibold text-[#111]">$20</span>
              <span className="text-base text-[#aaa]">/month</span>
            </div>
            <p className="text-base text-[#666] mb-6">Everything you need to master any codebase</p>

            <div className="space-y-3 mb-6">
              {PRO_FEATURES.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className="w-1 h-4 mt-0.5 flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: feature.color }}
                  />
                  <div>
                    <span className="text-base font-medium text-[#111]">{feature.name}</span>
                    <p className="text-[13px] text-[#888]">{feature.benefit}</p>
                  </div>
                </div>
              ))}
            </div>

            <PricingCardActions planType="pro" isPro={true} />

            <p className="text-[13px] text-center text-[#aaa] mt-3">
              Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Quote */}
      <div className="w-[90%] max-w-[880px] mx-auto pb-16">
        <div className="bg-[#f8f9fa] rounded p-8 text-center" style={{ borderLeft: '3px solid #111' }}>
          <p className="text-base text-[#333] leading-[1.7] mb-3">
            "I used to spend <span className="line-through text-[#aaa]">3 hours</span> understanding a new codebase.
            Now it takes <strong className="text-[#111]">15 minutes</strong>."
          </p>
          <p className="text-[13px] text-[#aaa]">
            — Every developer who's ever joined a new project
          </p>
        </div>
      </div>

      {/* Feature Comparison */}
      <div className="w-[90%] max-w-[880px] mx-auto pb-16">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">
          Feature Comparison
        </div>

        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="border-b border-[#ddd]">
              <td className="py-2 px-2 text-[13px] text-[#aaa] font-semibold">Feature</td>
              <td className="py-2 px-2 text-[13px] text-[#aaa] font-semibold text-center w-16">Free</td>
              <td className="py-2 px-2 text-[13px] text-[#aaa] font-semibold text-center w-16">Pro</td>
            </tr>
          </thead>
          <tbody>
            {FEATURE_COMPARISON.map((row, idx) => (
              <tr key={idx} className="border-b border-[#f0f0f0]">
                <td className="py-2 px-2 text-[#333]">{row.feature}</td>
                <td className="py-2 px-2 text-center">
                  {row.free ? (
                    <Check className="h-3.5 w-3.5 text-[#111] mx-auto" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-[#ddd] mx-auto" />
                  )}
                </td>
                <td className="py-2 px-2 text-center">
                  {row.pro ? (
                    <Check className="h-3.5 w-3.5 text-[#111] mx-auto" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-[#ddd] mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trust */}
      <div className="w-[90%] max-w-[880px] mx-auto pb-12 text-center">
        <p className="text-[13px] text-[#aaa]">
          Cancel anytime · Secure payment via Stripe · Your code stays private
        </p>
      </div>

      {/* FAQ */}
      <div className="w-[90%] max-w-[880px] mx-auto pb-20">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">
          Questions
        </div>

        {[
          { q: 'What happens when I run out of tokens?', a: 'AI features pause until next month. You can still browse repos for free.' },
          { q: 'Can I switch between plans?', a: 'Yes. Upgrade or downgrade anytime, changes are prorated.' },
          { q: 'Team plans?', a: 'Coming soon. Contact us if interested.' },
          { q: 'Payment methods?', a: 'All major credit cards via Stripe.' },
        ].map((faq, idx) => (
          <div key={idx} className="border-b border-[#f0f0f0] py-3">
            <div className="text-base font-medium text-[#111] mb-1">{faq.q}</div>
            <div className="text-base text-[#666]">{faq.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
