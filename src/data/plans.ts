import { Zap, Key, Crown } from 'lucide-react';
import { Plan } from '@/components/PricingCard';

export const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Public repositories only',
    features: ['Public repos', 'Basic browsing', 'Community support'],
    icon: Zap,
    planType: 'free',
    isPopular: false,
  },
  {
    name: 'Developer',
    price: '$6.90',
    period: '/month',
    description: 'BYOK with unlimited AI',
    features: ['Private repos access', 'BYOK (unlimited AI)', 'Email support'],
    icon: Key,
    planType: 'byok',
    isPopular: false,
  },
  {
    name: 'Pro',
    price: '$20',
    period: '/month',
    description: 'Everything + managed AI',
    features: ['Private repos', '5M tokens/month', 'BYOK option', 'Priority support'],
    icon: Crown,
    planType: 'pro',
    isPopular: true,
  },
];

export const getPlanByName = (name: string): Plan | undefined => {
  return PLANS.find(plan => plan.name.toLowerCase() === name.toLowerCase());
};

export const getPlanByType = (planType: 'free' | 'byok' | 'pro' | null): Plan | undefined => {
  return PLANS.find(plan => plan.planType === planType);
};
