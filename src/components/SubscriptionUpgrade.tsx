"use client";
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import Link from 'next/link';
import { PricingCard } from '@/components/PricingCard';
import { getPlanByType } from '@/data/plans';
import { useAuth } from '@/lib/auth/client';

interface SubscriptionUpgradeProps {
  className?: string;
  onUpgrade?: () => void;
}

export function SubscriptionUpgrade({ className = "", onUpgrade }: SubscriptionUpgradeProps) {
  const { isSignedIn, signIn } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'pro' | null>(null);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const handleSignIn = () => {
    signIn('/pricing');
  };

  const handleUpgrade = async (planType: 'byok' | 'pro') => {
    if (!isSignedIn) {
      handleSignIn();
      return;
    }

    if (planType === 'pro') {
      setSelectedPlan(planType);
    }
    try {
      const result = await createCheckout.mutateAsync({ plan: planType });
      if (result.url) {
        window.location.href = result.url;
      }
      onUpgrade?.();
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      setSelectedPlan(null);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choose Your Plan
        </h3>
        <p className="text-gray-600">
          Unlock AI-powered repository analysis with our premium plans
        </p>
      </div>

      <div className="flex justify-center">
        <div className="max-w-sm">
          <PricingCard
            plan={getPlanByType('pro')!}
            onUpgrade={(planType) => {
              if (planType === 'pro') {
                handleUpgrade(planType);
              }
            }}
            onSignIn={handleSignIn}
            isLoading={createCheckout.isPending && selectedPlan === 'pro'}
            isSignedIn={isSignedIn}
            buttonText="Get Pro"
            variant="compact"
          />
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>Cancel anytime. No setup fees.</p>
        <p className="mt-1">
          Need help? <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link>
        </p>
      </div>
    </div>
  );
} 