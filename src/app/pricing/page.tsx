'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Key, Zap, Crown } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';

export default function PricingPage() {
  const { data: currentPlan } = trpc.user.getCurrentPlan.useQuery();
  
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

  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Public repositories only',
      features: ['Public repos', 'Basic browsing', 'Community support'],
      icon: Zap,
      popular: false,
    },
    {
      name: 'Developer',
      price: '$6.90',
      period: '/month',
      description: 'Private repos + BYOK',
      features: ['Private repos', 'BYOK unlimited', 'Email support'],
      icon: Key,
      popular: true,
    },
    {
      name: 'Pro',
      price: '$20',
      period: '/month',
      description: 'Everything + managed AI',
      features: ['Private repos', '5M tokens/month', 'BYOK option', 'Priority support'],
      icon: Crown,
      popular: false,
    },
  ];

  const handleUpgrade = (plan: 'byok' | 'pro') => {
    createCheckout.mutate({ plan });
  };

  return (
    <div className="container py-8 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Unlock the full potential of GitHub.gg
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.name} className={plan.popular ? 'border-2 border-blue-500' : ''}>
              <CardHeader className="text-center">
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
                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  Get Started
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="text-left">
            <h3 className="font-semibold mb-2">What is BYOK?</h3>
            <p className="text-sm text-muted-foreground">
              Bring Your Own Key (BYOK) means you provide your own Google Gemini API key. 
              This gives you unlimited usage while keeping your AI costs separate from our platform.
            </p>
          </div>
          <div className="text-left">
            <h3 className="font-semibold mb-2">How do I get a Gemini API key?</h3>
            <p className="text-sm text-muted-foreground">
              Visit the Google AI Studio to create your API key. It's free to start and you only pay for what you use.
            </p>
          </div>
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