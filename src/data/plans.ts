import { Zap, Crown } from 'lucide-react';
import { Plan } from '@/components/PricingCard';

export const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Browse all public repositories',
    features: ['Browse public repos', 'View code & files', 'Community support'],
    icon: Zap,
    planType: 'free',
    isPopular: false,
  },
  {
    name: 'Pro',
    price: '$20',
    period: '/month',
    description: 'AI-powered code intelligence',
    features: ['Everything in Free', 'AI Wiki Generation', 'Code Analysis', 'Scorecards & Reports', '5M tokens/month', 'Priority support'],
    icon: Crown,
    planType: 'pro',
    isPopular: true,
  },
];

export const getPlanByName = (name: string): Plan | undefined => {
  return PLANS.find(plan => plan.name.toLowerCase() === name.toLowerCase());
};

export const getPlanByType = (planType: 'free' | 'pro' | null): Plan | undefined => {
  return PLANS.find(plan => plan.planType === planType);
};
