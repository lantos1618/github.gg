"use client";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Crown, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import Link from 'next/link';

interface SubscriptionUpgradeProps {
  className?: string;
  onUpgrade?: () => void;
}

export function SubscriptionUpgrade({ className = "", onUpgrade }: SubscriptionUpgradeProps) {
  const [selectedPlan, setSelectedPlan] = useState<'byok' | 'pro' | null>(null);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const handleUpgrade = async (plan: 'byok' | 'pro') => {
    setSelectedPlan(plan);
    try {
      const result = await createCheckout.mutateAsync({ plan });
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

      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Developer Plan */}
        <Card className="relative border-2 hover:border-blue-300 transition-colors">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Developer Plan</CardTitle>
            <CardDescription className="text-lg font-semibold text-blue-600">
              $6.90/month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Use your own Gemini API key
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited AI analysis
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Repository scorecards
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Code diagrams
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Usage analytics
              </li>
            </ul>
            <Button
              onClick={() => handleUpgrade('byok')}
              disabled={createCheckout.isPending && selectedPlan === 'byok'}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {createCheckout.isPending && selectedPlan === 'byok' ? 'Loading...' : 'Get Started'}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="relative border-2 border-purple-200 hover:border-purple-300 transition-colors">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
              MOST POPULAR
            </span>
          </div>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2">
              <Crown className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-xl">Pro Plan</CardTitle>
            <CardDescription className="text-lg font-semibold text-purple-600">
              $20/month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Everything in Developer Plan
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Managed Gemini API key
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                No API key setup required
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Advanced analytics
              </li>
            </ul>
            <Button
              onClick={() => handleUpgrade('pro')}
              disabled={createCheckout.isPending && selectedPlan === 'pro'}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {createCheckout.isPending && selectedPlan === 'pro' ? 'Loading...' : 'Get Pro'}
            </Button>
          </CardContent>
        </Card>
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