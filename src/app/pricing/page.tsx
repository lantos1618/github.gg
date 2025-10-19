'use client';

import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/client';
import { PricingCard } from '@/components/PricingCard';
import { PLANS } from '@/data/plans';

export default function PricingPage() {
  const { isSignedIn, signIn } = useAuth();

  const handleSignIn = () => {
    signIn('/pricing');
  };
  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery();

  const handleUpgrade = (plan: 'byok' | 'pro') => {
    createCheckout.mutate({ plan });
  };

  return (
    <div className="container py-8 max-w-6xl px-4 md:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Unlock the full potential of gh.gg
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {PLANS.filter(plan => plan.planType !== 'byok').map((plan) => (
          <PricingCard
            key={plan.name}
            plan={plan}
            currentPlan={currentPlan?.plan}
            onUpgrade={handleUpgrade}
            onSignIn={handleSignIn}
            isLoading={planLoading || createCheckout.isPending}
            isSignedIn={isSignedIn}
            buttonText="Get Started"
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