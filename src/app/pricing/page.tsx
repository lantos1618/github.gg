'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Zap, Crown } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/client';

export default function PricingPage() {
  const { isSignedIn, signIn } = useAuth();
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

  const { data: currentPlan, isLoading: planLoading, error: planError } = trpc.user.getCurrentPlan.useQuery();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Public repositories only',
      features: ['Public repos', 'Basic browsing', 'Community support'],
      icon: Zap,
      popular: false,
      plan: null as null,
    },
    {
      name: 'Pro',
      price: '$20',
      period: '/month',
      description: 'Everything + managed AI',
      features: ['Private repos', '5M tokens/month', 'BYOK option', 'Priority support'],
      icon: Crown,
      popular: true,
      plan: 'pro' as const,
    },
  ];

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
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isPro = plan.name === 'Pro';
          const isCurrent =
            currentPlan &&
            ((currentPlan.plan === 'pro' && isPro) ||
              (currentPlan.plan === 'free' && plan.name === 'Free'));
          const canUpgrade =
            currentPlan &&
            ((currentPlan.plan === 'free') ||
              (currentPlan.plan === 'pro'));
          return (
            <Card
              key={plan.name}
              className={
                isPro
                  ? 'border-4 border-purple-600 scale-105 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 relative'
                  : 'border'
              }
              style={isPro ? { zIndex: 2 } : {}}
            >
              <CardHeader className="text-center">
                {isPro && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">Most Popular</span>
                )}
                <Icon className="h-8 w-8 mx-auto mb-4 text-blue-600" />
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                {planLoading ? (
                  <Button className="w-full" variant="outline" disabled>
                    Loading...
                  </Button>
                ) : planError ? (
                  <Button className="w-full" variant="default" onClick={signIn}>
                    Sign in to choose a plan
                  </Button>
                ) : isSignedIn ? (
                  isCurrent ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className={isPro ? 'w-full bg-purple-600 hover:bg-purple-700 text-white font-bold' : 'w-full'}
                      variant={isPro ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.plan!)}
                      disabled={createCheckout.isPending}
                    >
                      {createCheckout.isPending ? 'Loading...' : 'Get Started'}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  )
                ) : (
                  <Button className="w-full" variant="default" onClick={signIn}>
                    Sign in to choose a plan
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
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