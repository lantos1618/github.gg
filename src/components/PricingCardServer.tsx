import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, LucideIcon } from 'lucide-react';
import { PricingCardActions } from './PricingCardActions';
import { getPricingCardClassName, getPricingCardStyle } from '@/lib/utils/pricing';

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

  return (
    <Card className={getPricingCardClassName(isPro, variant, className)} style={getPricingCardStyle(isPro)}>
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
