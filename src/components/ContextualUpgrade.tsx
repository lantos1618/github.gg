"use client";

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/client';
import { BookOpen, BarChart3, Network, MessageSquare, Lock, Sparkles, ArrowRight } from 'lucide-react';

// Feature-specific messaging for contextual upsells
const FEATURE_CONTEXTS = {
  wiki: {
    icon: BookOpen,
    headline: 'Generate complete documentation in minutes',
    subtext: 'AI Wiki creates comprehensive docs from your codebase automatically. No more outdated READMEs.',
    benefit: 'Save hours of documentation work',
    cta: 'Unlock AI Wiki',
  },
  scorecard: {
    icon: BarChart3,
    headline: 'Get instant code quality insights',
    subtext: 'Scorecards analyze every file and give you actionable grades. Know exactly where to improve.',
    benefit: 'Find issues before they become problems',
    cta: 'Unlock Scorecards',
  },
  diagram: {
    icon: Network,
    headline: 'See how your code connects',
    subtext: 'Auto-generated architecture diagrams show data flow, dependencies, and system design.',
    benefit: 'Understand complex codebases visually',
    cta: 'Unlock Diagrams',
  },
  'ai-slop': {
    icon: Sparkles,
    headline: 'Detect AI-generated code issues',
    subtext: 'Find quality problems commonly introduced by AI coding tools. Keep your codebase clean.',
    benefit: 'Maintain code quality standards',
    cta: 'Unlock AI Analysis',
  },
  review: {
    icon: MessageSquare,
    headline: 'Get AI-powered code reviews',
    subtext: 'Catch bugs, security issues, and performance problems before they ship to production.',
    benefit: 'Ship with confidence',
    cta: 'Unlock Code Reviews',
  },
  private: {
    icon: Lock,
    headline: 'Analyze your private repositories',
    subtext: 'Get full AI-powered analysis on your proprietary codebases. Your code stays secure.',
    benefit: 'Full feature access for private repos',
    cta: 'Unlock Private Repos',
  },
  general: {
    icon: Sparkles,
    headline: 'Unlock AI-powered code intelligence',
    subtext: 'Get docs, diagrams, scorecards, and reviews for any repository. Understand code faster.',
    benefit: 'Master any codebase in minutes',
    cta: 'Upgrade to Pro',
  },
} as const;

export type UpgradeFeature = keyof typeof FEATURE_CONTEXTS;

interface ContextualUpgradeProps {
  feature?: UpgradeFeature;
  className?: string;
  variant?: 'card' | 'inline' | 'banner';
  showPrice?: boolean;
}

export function ContextualUpgrade({
  feature = 'general',
  className = '',
  variant = 'card',
  showPrice = true,
}: ContextualUpgradeProps) {
  const { isSignedIn, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const context = FEATURE_CONTEXTS[feature];
  const Icon = context.icon;

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      signIn('/pricing');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCheckout.mutateAsync({ plan: 'pro' });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 rounded-lg ${className}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-gray-300" />
            <div>
              <p className="font-medium">{context.headline}</p>
              <p className="text-sm text-gray-400">{context.benefit}</p>
            </div>
          </div>
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="bg-white text-gray-900 hover:bg-gray-100"
          >
            {isLoading ? 'Loading...' : context.cta}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <Icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
        <p className="text-sm text-gray-600 flex-1">{context.subtext}</p>
        <Button
          onClick={handleUpgrade}
          disabled={isLoading}
          size="sm"
          variant="outline"
        >
          {isLoading ? '...' : 'Upgrade'}
        </Button>
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {/* Icon */}
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-gray-700" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {context.headline}
        </h3>
        <p className="text-gray-600 mb-4">
          {context.subtext}
        </p>

        {/* Benefit highlight */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Sparkles className="h-4 w-4" />
          <span>{context.benefit}</span>
        </div>

        {/* CTA */}
        <Button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full bg-gray-900 hover:bg-gray-800"
          size="lg"
        >
          {isLoading ? 'Loading...' : context.cta}
          {showPrice && <span className="ml-2 text-gray-400">· $20/mo</span>}
        </Button>

        {/* Trust signals */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
          <span>Cancel anytime</span>
          <span>·</span>
          <span>7-day guarantee</span>
        </div>

        {/* Link to full pricing */}
        <p className="text-center mt-4">
          <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-700 underline">
            Compare all plans
          </Link>
        </p>
      </div>
    </div>
  );
}

// Smaller teaser component for sidebar or inline use
export function UpgradeTeaser({ feature = 'general' }: { feature?: UpgradeFeature }) {
  const context = FEATURE_CONTEXTS[feature];
  const Icon = context.icon;

  return (
    <Link
      href="/pricing"
      className="block p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-white rounded border border-gray-200 group-hover:border-gray-300">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {context.headline}
          </p>
          <p className="text-xs text-gray-500">
            Upgrade to Pro →
          </p>
        </div>
      </div>
    </Link>
  );
}
