'use client';

import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { usePlan } from '@/lib/hooks/usePlan';
import { useAuth } from '@/lib/auth/client';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
interface PricingCardActionsProps {
  planType: 'free' | 'pro' | null;
  isPro: boolean;
}

export function PricingCardActions({ planType, isPro }: PricingCardActionsProps) {
  const { isSignedIn, signIn } = useAuth();

  const { plan, isLoading: planLoading } = usePlan();

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

  const isCurrent = plan === planType;
  const isLoading = planLoading || createCheckout.isPending;

  const handleAction = () => {
    if (!isSignedIn) {
      signIn('/pricing');
      return;
    }

    if (planType === 'pro') {
      createCheckout.mutate({ plan: 'pro' });
    }
  };

  // Free plan button
  if (planType === 'free') {
    return (
      <Button
        className="w-full h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium border-0 rounded"
        variant="outline"
        asChild
      >
        <a href="/">Get Started</a>
      </Button>
    );
  }

  // Pro plan button - loading state
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-md bg-gray-200 w-full h-10" />
    );
  }

  // Current plan
  if (isCurrent) {
    return (
      <Button
        className="w-full h-10 bg-gray-100 text-gray-500 font-medium border-0 rounded"
        disabled
      >
        Current Plan
      </Button>
    );
  }

  // Upgrade button
  return (
    <Button
      className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded"
      onClick={handleAction}
    >
      {!isSignedIn ? 'Sign in to upgrade' : 'Upgrade'}
      <ArrowRight className="h-4 w-4 ml-1.5" />
    </Button>
  );
}
