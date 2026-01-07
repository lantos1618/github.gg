import { Zap, Crown, Check, X } from 'lucide-react';
import { Plan } from '@/components/PricingCard';

export const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for exploring public repos',
    features: [
      'Unlimited public repo browsing',
      'Basic code navigation',
      'File tree explorer',
      'Community support',
    ],
    icon: Zap,
    planType: 'free',
    isPopular: false,
  },
  {
    name: 'Pro',
    price: '$20',
    period: '/mo',
    description: 'Full AI-powered code intelligence',
    features: [
      'Everything in Free',
      'AI-generated documentation',
      'Code quality scorecards',
      'Architecture diagrams',
      'AI code reviews',
      'Private repo access',
      '5M AI tokens/month',
      'Priority support',
    ],
    icon: Crown,
    planType: 'pro',
    isPopular: true,
  },
];

// Feature comparison for pricing table
export const FEATURE_COMPARISON = [
  { feature: 'Public repos', free: true, pro: true },
  { feature: 'Code browsing', free: true, pro: true },
  { feature: 'File explorer', free: true, pro: true },
  { feature: 'Private repos', free: false, pro: true },
  { feature: 'AI Wiki generation', free: false, pro: true },
  { feature: 'Code scorecards', free: false, pro: true },
  { feature: 'Architecture diagrams', free: false, pro: true },
  { feature: 'AI code reviews', free: false, pro: true },
  { feature: 'Priority support', free: false, pro: true },
];

export const getPlanByName = (name: string): Plan | undefined => {
  return PLANS.find(plan => plan.name.toLowerCase() === name.toLowerCase());
};

export const getPlanByType = (planType: 'free' | 'pro' | null): Plan | undefined => {
  return PLANS.find(plan => plan.planType === planType);
};
