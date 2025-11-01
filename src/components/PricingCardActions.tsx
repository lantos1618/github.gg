'use client';

import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useAuth } from '@/lib/auth/client';
import { toast } from 'sonner';

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

  const getButtonText = () => {
    if (!isSignedIn) return 'Sign in to upgrade';
    if (isCurrent) return 'Current Plan';
    if (isPro) return 'Upgrade to Pro';
    return 'Current Plan';
  };

  // Free plan button
  if (planType === 'free') {
    return (
      <Button className="w-full" variant="outline" disabled>
        Free Forever
      </Button>
    );
  }

  // Pro plan button
  if (isLoading) {
    return (
      <Button className="w-full" variant="outline" disabled>
        Loading...
      </Button>
    );
  }

  if (isCurrent) {
    return (
      <Button className="w-full" variant="outline" disabled>
        Current Plan
      </Button>
    );
  }

  return (
    <Button
      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
      onClick={handleAction}
      disabled={isLoading}
    >
      {getButtonText()}
    </Button>
  );
}
