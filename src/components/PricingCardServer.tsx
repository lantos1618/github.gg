import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, LucideIcon } from 'lucide-react';
import { PricingCardActions } from './PricingCardActions';

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

interface PricingCardServerProps {
  plan: Plan;
  variant?: 'default' | 'compact' | 'hero';
  className?: string;
}

export function PricingCardServer({
  plan,
  variant = 'default',
  className = '',
}: PricingCardServerProps) {
  const Icon = plan.icon;
  const isPro = plan.planType === 'pro';

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

  return (
    <Card className={`${getCardClassName()} ${className}`} style={isPro ? { zIndex: 2 } : {}}>
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
        {/* Client island for interactive button */}
        <PricingCardActions planType={plan.planType} isPro={isPro} />
      </CardContent>
    </Card>
  );
}
