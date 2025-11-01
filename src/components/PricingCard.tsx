"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, LucideIcon } from 'lucide-react';

export interface Plan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  planType: 'free' | 'pro' | null;
  isPopular?: boolean;
}

interface PricingCardProps {
  plan: Plan;
  currentPlan?: string | null;
  onUpgrade?: (planType: 'byok' | 'pro') => void;
  onSignIn?: () => void;
  isLoading?: boolean;
  isSignedIn?: boolean;
  buttonText?: string;
  variant?: 'default' | 'compact' | 'hero';
  className?: string;
}

export function PricingCard({
  plan,
  currentPlan,
  onUpgrade,
  onSignIn,
  isLoading = false,
  isSignedIn = true,
  buttonText,
  variant = 'default',
  className = '',
}: PricingCardProps) {
  const Icon = plan.icon;
  const isPro = plan.planType === 'pro';
  const isCurrent = currentPlan === plan.planType;
  const canUpgrade = currentPlan === 'free' || currentPlan === 'byok';

  const getButtonText = () => {
    if (buttonText) return buttonText;
    if (!isSignedIn) return 'Sign in to continue';
    if (isCurrent) return 'Current Plan';
    if (isPro) return 'Get Pro';
    return 'Get Started';
  };

  const getCardClassName = () => {
    const baseClasses = 'relative transition-all duration-300';
    
    if (variant === 'compact') {
      return `${baseClasses} border rounded-lg ${isPro ? 'border-2 border-purple-200 hover:border-purple-300' : 'border hover:shadow-lg'}`;
    }
    
    if (variant === 'hero') {
      return `${baseClasses} ${isPro ? 'bg-gradient-to-br from-purple-50 to-blue-50' : ''}`;
    }
    
    // default variant
    if (isPro) {
      return `${baseClasses} border-2 border-purple-500/30 scale-105 shadow-xl bg-gradient-to-br from-purple-50/80 to-blue-50/80 backdrop-blur-sm overflow-hidden`;
    }
    
    return `${baseClasses} border shadow-md hover:shadow-lg`;
  };

  const renderContent = () => {
    if (variant === 'compact') {
      return (
        <div className="text-center p-4">
          <Icon className="h-6 w-6 mx-auto mb-2 text-purple-600" />
          <h3 className="font-semibold mb-1">{plan.name}</h3>
          <div className="flex items-baseline justify-center gap-1 mb-3">
            <span className="text-2xl font-bold text-purple-600">{plan.price}</span>
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          </div>
          <ul className="text-sm text-left space-y-1 mb-4">
            {plan.features.map((feature) => (
              <li key={feature}>✓ {feature}</li>
            ))}
          </ul>
          <Button
            onClick={() => !isSignedIn ? onSignIn?.() : (isPro ? onUpgrade?.('pro') : onUpgrade?.('byok'))}
            disabled={isLoading || isCurrent}
            className={!isSignedIn ? "w-full bg-blue-600 hover:bg-blue-700" : "w-full bg-purple-600 hover:bg-purple-700"}
          >
            {isLoading ? 'Loading...' : getButtonText()}
          </Button>
        </div>
      );
    }

    // default and hero variants
    return (
      <>
        <CardHeader className="text-center relative">
          {isPro && variant === 'default' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-400"></div>
          )}
          <Icon className="h-8 w-8 mx-auto mb-4 text-purple-600" />
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
          {isLoading ? (
            <Button className="w-full" variant="outline" disabled>
              Loading...
            </Button>
          ) : !isSignedIn ? (
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={onSignIn}>
              Sign in to continue
            </Button>
          ) : isCurrent ? (
            <Button className="w-full" variant="outline" disabled>
              Current Plan
            </Button>
          ) : canUpgrade ? (
            <Button
              className={isPro ? 'w-full bg-purple-600 hover:bg-purple-700 text-white font-bold' : 'w-full'}
              variant={isPro ? 'default' : 'outline'}
              onClick={() => onUpgrade?.(plan.planType as 'byok' | 'pro')}
              disabled={isLoading}
            >
              {getButtonText()}
            </Button>
          ) : (
            <Button className="w-full" variant="outline" disabled>
              Current Plan
            </Button>
          )}
        </CardContent>
      </>
    );
  };

  return (
    <Card className={`${getCardClassName()} ${className}`} style={isPro ? { zIndex: 2 } : {}}>
      {renderContent()}
    </Card>
  );
}
