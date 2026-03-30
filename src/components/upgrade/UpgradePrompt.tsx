"use client";

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/client';
import { ArrowRight } from 'lucide-react';

const FEATURE_CONTEXTS = {
  wiki: {
    headline: 'Generate complete documentation in minutes',
    subtext: 'AI Wiki creates comprehensive docs from your codebase automatically.',
    benefit: 'Save hours of documentation work',
    cta: 'Unlock AI Wiki',
  },
  scorecard: {
    headline: 'Get instant code quality insights',
    subtext: 'Scorecards analyze every file and give you actionable grades.',
    benefit: 'Find issues before they become problems',
    cta: 'Unlock Scorecards',
  },
  diagram: {
    headline: 'See how your code connects',
    subtext: 'Auto-generated architecture diagrams show data flow and dependencies.',
    benefit: 'Understand complex codebases visually',
    cta: 'Unlock Diagrams',
  },
  'ai-slop': {
    headline: 'Detect AI-generated code issues',
    subtext: 'Find quality problems commonly introduced by AI coding tools.',
    benefit: 'Maintain code quality standards',
    cta: 'Unlock AI Analysis',
  },
  review: {
    headline: 'Get AI-powered code reviews',
    subtext: 'Catch bugs, security issues, and performance problems before they ship.',
    benefit: 'Ship with confidence',
    cta: 'Unlock Code Reviews',
  },
  private: {
    headline: 'Analyze your private repositories',
    subtext: 'Get full AI-powered analysis on your proprietary codebases.',
    benefit: 'Full feature access for private repos',
    cta: 'Unlock Private Repos',
  },
  general: {
    headline: 'Unlock AI-powered code intelligence',
    subtext: 'Get docs, diagrams, scorecards, and reviews for any repository.',
    benefit: 'Master any codebase in minutes',
    cta: 'Upgrade to Pro',
  },
} as const;

export type UpgradeFeature = keyof typeof FEATURE_CONTEXTS;

interface UpgradePromptProps {
  feature?: UpgradeFeature;
  className?: string;
  variant?: 'card' | 'inline' | 'banner';
  showPrice?: boolean;
}

export function UpgradePrompt({
  feature = 'general',
  className = '',
  variant = 'card',
  showPrice = true,
}: UpgradePromptProps) {
  const { isSignedIn, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const context = FEATURE_CONTEXTS[feature];

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      signIn('/pricing');
      return;
    }
    setIsLoading(true);
    try {
      const result = await createCheckout.mutateAsync({ plan: 'pro' });
      if (result.url) window.location.href = result.url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'banner') {
    return (
      <div data-testid="pricing-upgrade-prompt" className={`bg-[#111] text-white py-3 px-4 rounded ${className}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[14px] font-medium">{context.headline}</p>
            <p className="text-[12px] text-[#888]">{context.benefit}</p>
          </div>
          <button
            data-testid="pricing-upgrade-btn"
            onClick={handleUpgrade}
            disabled={isLoading}
            className="px-4 py-1.5 bg-white text-[#111] text-[14px] font-medium rounded hover:bg-[#eee] transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? 'Loading...' : context.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div data-testid="pricing-upgrade-prompt" className={`flex items-center gap-3 py-3 px-4 bg-[#f8f9fa] border border-[#eee] rounded ${className}`}>
        <p className="text-[14px] text-[#666] flex-1">{context.subtext}</p>
        <button
          data-testid="pricing-upgrade-btn"
          onClick={handleUpgrade}
          disabled={isLoading}
          className="px-3 py-1.5 bg-[#f8f9fa] text-[#333] text-[14px] font-medium rounded border border-[#ddd] hover:border-[#111] transition-colors disabled:opacity-50"
        >
          {isLoading ? '...' : 'Upgrade'}
        </button>
      </div>
    );
  }

  return (
    <div data-testid="pricing-upgrade-prompt" className={`max-w-md mx-auto ${className}`}>
      <div className="border border-[#eee] p-6">
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
          Pro Feature
        </div>
        <h3 className="text-[20px] font-semibold text-[#111] mb-2">
          {context.headline}
        </h3>
        <p className="text-[14px] text-[#666] leading-[1.6] mb-4">
          {context.subtext}
        </p>

        <div className="text-[12px] text-[#888] mb-6 italic">
          {context.benefit}
        </div>

        <button
          data-testid="pricing-upgrade-btn"
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full py-2.5 bg-[#111] text-white text-[14px] font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : context.cta}
          {showPrice && <span className="ml-2 text-[#888]">&middot; $20/mo</span>}
        </button>

        <div className="mt-3 flex items-center justify-center gap-3 text-[12px] text-[#aaa]">
          <span>Cancel anytime</span>
          <span>&middot;</span>
          <span>7-day guarantee</span>
        </div>

        <p className="text-center mt-3">
          <Link href="/pricing" className="text-[12px] text-[#888] hover:text-[#111] transition-colors">
            Compare all plans
          </Link>
        </p>
      </div>
    </div>
  );
}

export function UpgradeTeaser({ feature = 'general' }: { feature?: UpgradeFeature }) {
  const context = FEATURE_CONTEXTS[feature];

  return (
    <Link
      href="/pricing"
      className="block py-3 px-4 bg-[#f8f9fa] border border-[#eee] rounded hover:border-[#aaa] transition-colors group"
    >
      <p className="text-[14px] font-medium text-[#111] truncate">
        {context.headline}
      </p>
      <p className="text-[12px] text-[#888]">
        Upgrade to Pro &rarr;
      </p>
    </Link>
  );
}
