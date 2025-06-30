'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Crown, Key, Lock, Sparkles } from 'lucide-react';

interface UpgradePromptProps {
  feature: 'diagram' | 'scorecard' | 'analysis';
  className?: string;
}

export function UpgradePrompt({ feature, className = '' }: UpgradePromptProps) {
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

  const handleUpgrade = (plan: 'byok' | 'pro') => {
    createCheckout.mutate({ plan });
  };

  const featureInfo = {
    diagram: {
      title: 'AI-Powered Diagrams',
      description: 'Generate intelligent flowcharts, architecture diagrams, and visual representations of your codebase.',
      icon: Sparkles,
    },
    scorecard: {
      title: 'Repository Scorecard',
      description: 'Get comprehensive analysis and scoring of your repository quality, security, and maintainability.',
      icon: Sparkles,
    },
    analysis: {
      title: 'Code Analysis',
      description: 'Deep insights into your codebase structure, patterns, and recommendations for improvement.',
      icon: Sparkles,
    },
  };

  const info = featureInfo[feature];
  const Icon = info.icon;

  return (
    <Card className={`max-w-2xl mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">{info.title}</CardTitle>
        <CardDescription className="text-lg">
          {info.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-orange-500" />
            <span className="text-lg font-semibold text-orange-600">
              {currentPlan?.plan === 'free' ? 'Upgrade Required' : 'Plan Upgrade Required'}
            </span>
          </div>
          <p className="text-muted-foreground">
            {currentPlan?.plan === 'free' 
              ? 'This feature requires a paid plan to access private repositories and AI capabilities.'
              : 'Upgrade your plan to unlock this feature.'
            }
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <Key className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold mb-1">Developer Plan</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">$6.90</p>
            <p className="text-sm text-muted-foreground mb-3">per month</p>
            <ul className="text-sm text-left space-y-1 mb-4">
              <li>✓ Private repos access</li>
              <li>✓ BYOK (unlimited AI)</li>
              <li>✓ Email support</li>
            </ul>
            <Button 
              onClick={() => handleUpgrade('byok')}
              disabled={createCheckout.isPending}
              className="w-full"
              variant="outline"
            >
              {createCheckout.isPending ? 'Loading...' : 'Get Developer Plan'}
            </Button>
          </div>

          <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50">
            <Crown className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold mb-1">Pro Plan</h3>
            <p className="text-2xl font-bold text-purple-600 mb-1">$20</p>
            <p className="text-sm text-muted-foreground mb-3">per month</p>
            <ul className="text-sm text-left space-y-1 mb-4">
              <li>✓ Private repos access</li>
              <li>✓ 5M tokens/month</li>
              <li>✓ BYOK option</li>
              <li>✓ Priority support</li>
            </ul>
            <Button 
              onClick={() => handleUpgrade('pro')}
              disabled={createCheckout.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {createCheckout.isPending ? 'Loading...' : 'Get Pro Plan'}
            </Button>
          </div>
        </div>

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/pricing'}
            className="text-sm text-muted-foreground"
          >
            View all plans →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 