'use client';

import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnalysisResultRenderer } from '@/components/analysis/AnalysisResultRenderer';
import { UpgradePrompt } from './UpgradePrompt';
import { useAuthWithHint } from '@/lib/hooks/useAuthWithHint';
import { ArrowRight, Sparkles } from 'lucide-react';
import { safePostHog } from '@/lib/analytics/posthog';

const SAMPLE_REPOS: Array<{ user: string; repo: string }> = [
  { user: 'facebook', repo: 'react' },
  { user: 'vercel', repo: 'next.js' },
  { user: 'denoland', repo: 'deno' },
];

interface AISlopSamplePreviewProps {
  currentUser: string;
  currentRepo: string;
}

export function AISlopSamplePreview({ currentUser, currentRepo }: AISlopSamplePreviewProps) {
  const router = useRouter();
  const { isSignedIn, signIn } = useAuthWithHint();
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const sample = SAMPLE_REPOS[0];
  const { data, isLoading } = trpc.aiSlop.publicGetAISlop.useQuery(
    { user: sample.user, repo: sample.repo, ref: 'main' },
    { staleTime: 60 * 60 * 1000 }
  );

  if (isLoading) return null;
  if (!data?.analysis) {
    return <UpgradePrompt feature="ai-slop" />;
  }

  const onPrimary = async () => {
    safePostHog.capture('aislop_sample_cta_click', {
      currentRepo: `${currentUser}/${currentRepo}`,
      signed_in: isSignedIn,
    });
    if (!isSignedIn) {
      signIn(`/${currentUser}/${currentRepo}/aislop`);
      return;
    }
    setIsLoadingCheckout(true);
    try {
      const result = await createCheckout.mutateAsync({ plan: 'pro' });
      if (result.url) window.location.href = result.url;
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setIsLoadingCheckout(false);
    }
  };

  const onSecondary = () => {
    safePostHog.capture('aislop_sample_browse_click', {
      currentRepo: `${currentUser}/${currentRepo}`,
      sampleRepo: `${sample.user}/${sample.repo}`,
    });
    router.push(`/${sample.user}/${sample.repo}/aislop`);
  };

  return (
    <div data-testid="aislop-sample-preview" className="max-w-screen-xl w-full mx-auto px-2 sm:px-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#999] font-semibold tracking-[1.5px] uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sample AI-slop analysis</span>
          <span className="text-[#ccc]">·</span>
          <span className="text-[#666] normal-case tracking-normal font-mono">
            {sample.user}/{sample.repo}
          </span>
        </div>
        <div className="text-[13px] text-[#888]">
          What you&apos;ll get for{' '}
          <span className="font-mono text-[#111]">
            {currentUser}/{currentRepo}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none">
          <AnalysisResultRenderer
            data={data.analysis}
            title="AI-slop Analysis"
            showMetricsBar={true}
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[420px] bg-gradient-to-t from-white via-white via-50% to-transparent"
        />
      </div>

      <div className="relative -mt-48 max-w-lg mx-auto z-10">
        <div className="border border-[#111] bg-white p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
          <h3 className="text-[22px] font-semibold text-[#111] mb-2">
            See the full AI-slop analysis for{' '}
            <span className="font-mono text-[18px]">
              {currentUser}/{currentRepo}
            </span>
          </h3>
          <p className="text-base text-[#666] leading-[1.6] mb-5">
            {isSignedIn
              ? 'Run a fresh AI-slop scan on this repo. Pro unlocks unlimited scans across every repo, plus scorecards, diagrams, wiki, and AI PR reviews.'
              : `Sign in to detect AI-generated patterns and slop across your repos — like the ${sample.user}/${sample.repo} scan above.`}
          </p>

          <button
            data-testid="aislop-sample-primary-cta"
            onClick={onPrimary}
            disabled={isLoadingCheckout}
            className="w-full py-3 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoadingCheckout
              ? 'Loading…'
              : isSignedIn
              ? 'Upgrade to Pro · $20/mo'
              : 'Sign in to scan'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            data-testid="aislop-sample-secondary-cta"
            onClick={onSecondary}
            className="w-full mt-2 py-2 text-[13px] text-[#666] hover:text-[#111] transition-colors"
          >
            Or explore the full {sample.user}/{sample.repo} analysis →
          </button>

          <div className="mt-4 pt-4 border-t border-[#eee] text-[13px] text-[#aaa] flex items-center justify-between">
            <span>Cancel anytime · 7-day guarantee</span>
            <a href="/pricing" className="text-[#666] hover:text-[#111] transition-colors">
              Compare plans →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
