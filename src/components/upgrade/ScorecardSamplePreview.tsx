'use client';

/**
 * Replaces the empty "Pro Feature" card on /<o>/<r>/scorecard for free users
 * with a real sample scorecard (from a popular public repo we know we've
 * already analyzed) plus a contextual CTA pointing back at the user's
 * current repo. Implements the value-first principle: visitor sees what the
 * product actually produces before being asked for anything.
 *
 * If the sample isn't in cache yet (cold start, dev DB), we fall back to the
 * stock UpgradePrompt — no broken state.
 */

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

interface ScorecardSamplePreviewProps {
  currentUser: string;
  currentRepo: string;
}

export function ScorecardSamplePreview({ currentUser, currentRepo }: ScorecardSamplePreviewProps) {
  const router = useRouter();
  const { isSignedIn, signIn } = useAuthWithHint();
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  // Pick a sample. The query fans out to the first repo with a cached scorecard;
  // tRPC will only fire useQuery hooks that are enabled, but to keep the hook
  // count stable across renders we just query the first sample and let
  // fallback handle absence rather than chaining queries.
  const sample = SAMPLE_REPOS[0];
  const { data, isLoading } = trpc.scorecard.publicGetScorecard.useQuery(
    { user: sample.user, repo: sample.repo, ref: 'main' },
    { staleTime: 60 * 60 * 1000 }
  );

  // While loading, render nothing — the parent already shows a generic
  // loading state. After load, if there's no sample to show, fall through.
  if (isLoading) return null;
  if (!data?.scorecard) {
    return <UpgradePrompt feature="scorecard" />;
  }

  const onPrimary = async () => {
    safePostHog.capture('scorecard_sample_cta_click', {
      currentRepo: `${currentUser}/${currentRepo}`,
      signed_in: isSignedIn,
    });
    if (!isSignedIn) {
      signIn(`/${currentUser}/${currentRepo}/scorecard`);
      return;
    }
    setIsLoadingCheckout(true);
    try {
      const result = await createCheckout.mutateAsync({ plan: 'pro' });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setIsLoadingCheckout(false);
    }
  };

  const onSecondary = () => {
    safePostHog.capture('scorecard_sample_browse_click', {
      currentRepo: `${currentUser}/${currentRepo}`,
      sampleRepo: `${sample.user}/${sample.repo}`,
    });
    router.push(`/${sample.user}/${sample.repo}/scorecard`);
  };

  return (
    <div data-testid="scorecard-sample-preview" className="max-w-screen-xl w-full mx-auto px-2 sm:px-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#999] font-semibold tracking-[1.5px] uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sample scorecard</span>
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

      {/* The actual sample scorecard, rendered with the same component the
          real one uses. Fade-to-white mask on the bottom half so the user
          gets the shape and the top-level grades without us giving away the
          full analysis. */}
      <div className="relative">
        <div className="pointer-events-none">
          <AnalysisResultRenderer
            data={data.scorecard}
            title="Code Quality Scorecard"
            showMetricsBar={true}
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[420px] bg-gradient-to-t from-white via-white via-50% to-transparent"
        />
      </div>

      {/* Conversion card sits directly on the fade so the user reads it without
          scrolling. */}
      <div className="relative -mt-48 max-w-lg mx-auto z-10">
        <div className="border border-[#111] bg-white p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
          <h3 className="text-[22px] font-semibold text-[#111] mb-2">
            See the full scorecard for{' '}
            <span className="font-mono text-[18px]">
              {currentUser}/{currentRepo}
            </span>
          </h3>
          <p className="text-base text-[#666] leading-[1.6] mb-5">
            {isSignedIn
              ? 'Generate a fresh, full scorecard for this repo. Pro unlocks unlimited regenerations across every repo, plus diagrams, wiki, and AI PR reviews.'
              : `Sign in to generate a scorecard like the ${sample.user}/${sample.repo} one above — for your repos and any public repo.`}
          </p>

          <button
            data-testid="scorecard-sample-primary-cta"
            onClick={onPrimary}
            disabled={isLoadingCheckout}
            className="w-full py-3 bg-[#111] text-white text-base font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoadingCheckout
              ? 'Loading…'
              : isSignedIn
              ? 'Upgrade to Pro · $20/mo'
              : 'Sign in to generate'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            data-testid="scorecard-sample-secondary-cta"
            onClick={onSecondary}
            className="w-full mt-2 py-2 text-[13px] text-[#666] hover:text-[#111] transition-colors"
          >
            Or explore the full {sample.user}/{sample.repo} scorecard →
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
