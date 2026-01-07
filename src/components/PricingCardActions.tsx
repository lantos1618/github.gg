'use client';

import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';

interface PricingCardActionsProps {
  planType: 'free' | 'pro' | null;
  isPro: boolean;
}

export function PricingCardActions({ planType, isPro }: PricingCardActionsProps) {
  const { isSignedIn, signIn } = useAuth();

  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery();

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

  const isCurrent = currentPlan?.plan === planType;
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
        className="w-full h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold border-0"
        variant="outline"
        asChild
      >
        <a href="/">Get Started Free</a>
      </Button>
    );
  }

  // Pro plan button - loading state
  if (isLoading) {
    return (
      <Button
        className="w-full h-12 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold"
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  // Current plan
  if (isCurrent) {
    return (
      <Button
        className="w-full h-12 rounded-xl bg-white/20 text-white font-semibold border border-white/30 hover:bg-white/30"
        disabled
      >
        Current Plan
      </Button>
    );
  }

  // Upgrade button
  return (
    <Button
      className="w-full h-12 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleAction}
    >
      {!isSignedIn ? 'Sign in to upgrade' : 'Upgrade to Pro'}
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  );
}
