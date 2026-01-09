import { PLANS, FEATURE_COMPARISON } from '@/data/plans';
import { Check, X } from 'lucide-react';
import type { Metadata } from 'next';
import { PricingCardActions } from '@/components/PricingCardActions';

export const metadata: Metadata = {
  title: 'Pricing - GG',
  description: 'Simple, transparent pricing. Start free, upgrade when you need AI features.',
  openGraph: {
    title: 'Pricing - GG',
    description: 'Simple, transparent pricing for AI-powered code intelligence.',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="pt-16 pb-10 text-center px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Pricing
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Free for public repos. Pro unlocks AI features and private repo support.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Free</h2>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-gray-900">$0</span>
              </div>
              <p className="text-sm text-gray-500">For exploring public repos</p>
            </div>

            <ul className="space-y-3 mb-6 text-sm">
              {PLANS[0].features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>

            <PricingCardActions planType="free" isPro={false} />
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-gray-900 p-6 relative">
            <div className="absolute -top-3 left-4 px-2 bg-white text-xs font-medium text-gray-900">
              RECOMMENDED
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Pro</h2>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-gray-900">$20</span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>
              <p className="text-sm text-gray-500">AI features + private repos</p>
            </div>

            <ul className="space-y-3 mb-6 text-sm">
              {PLANS[1].features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-gray-900 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <PricingCardActions planType="pro" isPro={true} />
          </div>
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
