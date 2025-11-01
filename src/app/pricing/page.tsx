import { PricingCardServer } from '@/components/PricingCardServer';
import { PLANS } from '@/data/plans';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - gh.gg',
  description: 'Choose the perfect plan for your GitHub workflow. From free public repos to unlimited private repositories with AI-powered features.',
  openGraph: {
    title: 'Pricing - gh.gg',
    description: 'Flexible pricing for developers. Start free or unlock premium features with BYOK and managed AI.',
  },
};

export default function PricingPage() {
  return (
    <div className="container py-8 max-w-6xl px-4 md:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Unlock the full potential of gh.gg
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {PLANS.map((plan) => (
          <PricingCardServer
            key={plan.name}
            plan={plan}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="text-left">
            <h3 className="font-semibold mb-2">Can I switch between plans?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          <div className="text-left">
            <h3 className="font-semibold mb-2">What happens to my data?</h3>
            <p className="text-sm text-muted-foreground">
              Your API keys are encrypted and stored securely. We never log or view your keys, and you can delete them anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 