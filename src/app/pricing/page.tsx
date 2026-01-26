import { FEATURE_COMPARISON } from '@/data/plans';
import { Check, X, Zap, BookOpen, BarChart3, Network, MessageSquare, Lock } from 'lucide-react';
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

// Pro features with benefits, not just names
const PRO_FEATURES = [
  {
    icon: BookOpen,
    name: 'AI Wiki Generation',
    benefit: 'Complete documentation generated in minutes, not days',
  },
  {
    icon: BarChart3,
    name: 'Code Quality Scorecards',
    benefit: 'Instant A-F grades with actionable improvement suggestions',
  },
  {
    icon: Network,
    name: 'Architecture Diagrams',
    benefit: 'Auto-generated visual maps of how code connects',
  },
  {
    icon: MessageSquare,
    name: 'AI Code Reviews',
    benefit: 'Catch bugs and security issues before they ship',
  },
  {
    icon: Lock,
    name: 'Private Repo Access',
    benefit: 'Full analysis on your proprietary codebases',
  },
  {
    icon: Zap,
    name: '5M AI Tokens/Month',
    benefit: 'Analyze hundreds of repos per month',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero - Value-focused */}
      <div className="pt-16 pb-12 text-center px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Free for public repos
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Stop wasting hours reading unfamiliar code
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
          Pro gives you AI-generated docs, diagrams, and reviews for any repo.
          <span className="text-gray-900 font-medium"> Understand codebases in minutes.</span>
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/50">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Free</h2>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500 text-sm">forever</span>
              </div>
              <p className="text-sm text-gray-600">Browse and explore any public repo</p>
            </div>

            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Unlimited public repo browsing</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">File tree navigation</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Syntax highlighting</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Community support</span>
              </li>
            </ul>

            <PricingCardActions planType="free" isPro={false} />
          </div>

          {/* Pro Plan - Highlighted */}
          <div className="border-2 border-gray-900 rounded-lg p-6 relative bg-white shadow-lg">
            <div className="absolute -top-3 left-4 px-3 py-0.5 bg-gray-900 text-white text-xs font-medium rounded-full">
              MOST POPULAR
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Pro</h2>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-bold text-gray-900">$20</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
              <p className="text-sm text-gray-600">Everything you need to master any codebase</p>
            </div>

            <ul className="space-y-4 mb-6">
              {PRO_FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="p-1 bg-gray-100 rounded">
                    <feature.icon className="h-4 w-4 text-gray-700" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{feature.name}</span>
                    <p className="text-xs text-gray-500">{feature.benefit}</p>
                  </div>
                </li>
              ))}
            </ul>

            <PricingCardActions planType="pro" isPro={true} />

            <p className="text-xs text-center text-gray-500 mt-3">
              Cancel anytime · 7-day money-back guarantee
            </p>
          </div>
        </div>
      </div>

      {/* Social proof / Use case */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-gray-50 rounded-lg p-6 md:p-8 text-center">
          <p className="text-lg text-gray-700 mb-4">
            "I used to spend <span className="line-through text-gray-400">3 hours</span> understanding a new codebase.
            Now it takes <span className="font-semibold text-gray-900">15 minutes</span>."
          </p>
          <p className="text-sm text-gray-500">
            — Every developer who's ever joined a new project
          </p>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
          Compare
        </h2>
        <div className="border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-700">Feature</th>
                <th className="p-3 font-medium text-gray-700 text-center w-20">Free</th>
                <th className="p-3 font-medium text-gray-700 text-center w-20">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_COMPARISON.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-0">
                  <td className="p-3 text-gray-600">{row.feature}</td>
                  <td className="p-3 text-center">
                    {row.free ? (
                      <Check className="h-4 w-4 text-gray-900 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {row.pro ? (
                      <Check className="h-4 w-4 text-gray-900 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple trust line */}
      <div className="max-w-2xl mx-auto px-4 pb-12 text-center">
        <p className="text-sm text-gray-500">
          Cancel anytime · Secure payment via Stripe · Your code stays private
        </p>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-4 pb-20">
        <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
          FAQ
        </h2>
        <div className="space-y-4 text-sm">
          {[
            {
              q: "What happens when I run out of tokens?",
              a: "AI features pause until next month. You can still browse repos for free."
            },
            {
              q: "Can I switch between plans?",
              a: "Yes. Upgrade or downgrade anytime, changes are prorated."
            },
            {
              q: "Team plans?",
              a: "Coming soon. Contact us if interested."
            },
            {
              q: "Payment methods?",
              a: "All major credit cards via Stripe."
            }
          ].map((faq, idx) => (
            <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
              <h3 className="font-medium text-gray-900 mb-1">{faq.q}</h3>
              <p className="text-gray-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
