'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Github, GitPullRequest } from 'lucide-react';
import Link from 'next/link';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import { safePostHog } from '@/lib/analytics/posthog';
import { buildGitHubAppInstallUrl } from '@/lib/github/install-url';

const reviewsEnabled = process.env.NEXT_PUBLIC_GITHUB_REVIEWS_ENABLED === 'true';

export function CallToAction() {
  return (
    <section className="bg-[#111] text-white" data-testid="home-cta-section">
      <PageWidthContainer className="py-20">

        <div className="text-[13px] text-[#666] font-semibold tracking-[1.5px] uppercase mb-4">
          Your repos, automatic
        </div>

        <h2 className="text-[25px] font-semibold text-white mb-2">
          {reviewsEnabled ? 'AI reviews on every pull request' : 'Go deeper with your repositories'}
        </h2>

        <p className="text-base text-[#888] mb-8 max-w-lg">
          {reviewsEnabled
            ? 'Install the GitHub App on a repo to receive AI review comments on pull requests. Three free reviews per installation, no credit card.'
            : 'Browse public code for free. Pro unlocks new scorecards, diagrams, and AI documentation.'}
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          {reviewsEnabled ? (
            <>
              <a
                href={buildGitHubAppInstallUrl()}
                onClick={() => safePostHog.capture('install_clicked', { source: 'cta_section' })}
                data-testid="home-cta-install-btn"
              >
                <Button size="default" className="h-11 px-5 bg-white text-[#111] hover:bg-[#eee] rounded font-medium text-base">
                  <Github className="h-4 w-4 mr-2" />
                  Install on GitHub
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </a>
              <Link href="/onboarding" onClick={() => safePostHog.capture('onboarding_clicked', { source: 'cta_section' })} className="inline-flex">
                <Button size="default" variant="outline" className="h-11 px-5 border-[#444] bg-transparent text-white hover:bg-[#1a1a1a] hover:border-[#888] rounded font-medium text-base">
                  <GitPullRequest className="h-4 w-4 mr-2" />
                  Walk through setup
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/pricing" className="inline-flex">
              <Button size="default" className="h-11 px-5 bg-white text-[#111] hover:bg-[#eee] rounded font-medium text-base">
                View Pro plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>

        <p className="text-[13px] text-[#555] mb-16">
          Public repo browsing is free, forever.{' '}
          <Link href="/pricing" className="text-[#888] hover:text-white transition-colors" data-testid="home-cta-pricing-link">
            Upgrade to Pro
          </Link>{' '}
          for AI analyses{reviewsEnabled ? ' and private-repo access' : ''}.
        </p>

        <div className="pt-4 border-t border-[#222]">
          <table className="w-full text-base">
            <tbody>
              <tr>
                <td className="text-[#555] py-1">&copy; {new Date().getFullYear()} GG</td>
                <td className="text-right">
                  <div className="flex justify-end gap-6">
                    <Link href="/pricing" className="text-[#555] hover:text-[#aaa] transition-colors">Pricing</Link>
                    <a href="https://github.com/lantos1618/github.gg" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#aaa] transition-colors">GitHub</a>
                    <a href="https://twitter.com/github_gg" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-[#aaa] transition-colors">Twitter</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </PageWidthContainer>
    </section>
  );
}
