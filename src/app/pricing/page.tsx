import { PLANS, FEATURE_COMPARISON } from '@/data/plans';
import { Check, X, Sparkles, Shield, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <div className="pt-16 pb-12 text-center px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Simple pricing, no surprises
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Start free, upgrade when ready
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Explore any public repo for free. Unlock AI-powered features when you need them.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="relative bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-sm">
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Free</h2>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/forever</span>
              </div>
              <p className="text-gray-600">Perfect for exploring open source</p>
            </div>

            <ul className="space-y-4 mb-8">
              {PLANS[0].features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-gray-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <PricingCardActions planType="free" isPro={false} />
          </div>

          {/* Pro Plan */}
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl text-white">
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-sm font-semibold text-gray-900 shadow-lg">
                Most Popular
              </div>
            </div>

            <div className="mb-8 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Pro</h2>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-5xl font-bold">$20</span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-gray-300">Full AI-powered code intelligence</p>
            </div>

            <ul className="space-y-4 mb-8">
              {PLANS[1].features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-gray-200">{feature}</span>
                </li>
              ))}
            </ul>

            <PricingCardActions planType="pro" isPro={true} />
          </div>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Compare plans
        </h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-4 font-semibold text-gray-900">Feature</th>
                <th className="p-4 font-semibold text-gray-900 text-center w-28">Free</th>
                <th className="p-4 font-semibold text-gray-900 text-center w-28 bg-gray-50">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_COMPARISON.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-50 last:border-0">
                  <td className="p-4 text-gray-700">{row.feature}</td>
                  <td className="p-4 text-center">
                    {row.free ? (
                      <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center bg-gray-50/50">
                    {row.pro ? (
                      <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Signals */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-sm text-gray-600">Your code stays private. We never store or share your data.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h3>
            <p className="text-sm text-gray-600">No contracts, no commitments. Cancel with one click.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Always Improving</h3>
            <p className="text-sm text-gray-600">New features every month. Your feedback shapes the product.</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "What happens when I run out of tokens?",
              a: "You'll be notified when you're running low. You can continue browsing repos for free, but AI features will be paused until next month or until you upgrade."
            },
            {
              q: "Can I switch between plans?",
              a: "Yes! Upgrade or downgrade anytime. Changes take effect immediately and we'll prorate the difference."
            },
            {
              q: "Do you offer team plans?",
              a: "Not yet, but it's on our roadmap. Contact us if you're interested in a team plan."
            },
            {
              q: "What payment methods do you accept?",
              a: "We accept all major credit cards through Stripe. All payments are secure and encrypted."
            }
          ].map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
