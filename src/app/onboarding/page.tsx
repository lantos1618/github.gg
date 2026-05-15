'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/client';
import { trpc } from '@/lib/trpc/client';
import { Github, Check, GitPullRequest, Sparkles, ExternalLink } from 'lucide-react';
import { safePostHog } from '@/lib/analytics/posthog';
import { buildGitHubAppInstallUrl } from '@/lib/github/install-url';

export default function OnboardingPage() {
  const { isSignedIn, isLoading: authLoading, signIn } = useAuth();

  const installationQuery = trpc.webhooks.getInstallationInfo.useQuery(undefined, {
    enabled: isSignedIn,
    refetchInterval: 5_000,
  });
  const reposQuery = trpc.webhooks.getRepositories.useQuery(undefined, {
    enabled: isSignedIn && !!installationQuery.data,
    refetchInterval: 5_000,
  });

  const installed = !!installationQuery.data;
  const repos = reposQuery.data ?? [];
  const hasRepo = repos.length > 0;
  const firstRepo = repos[0];

  const stepStatus = useMemo(() => {
    return {
      step1: installed ? 'done' : 'active',
      step2: !installed ? 'pending' : hasRepo ? 'done' : 'active',
      step3: !installed || !hasRepo ? 'pending' : 'active',
    } as const;
  }, [installed, hasRepo]);

  useEffect(() => {
    safePostHog.capture('onboarding_view', {
      installed,
      repoCount: repos.length,
    });
    try { sessionStorage.setItem('gg-seen-onboarding', '1'); } catch {}
  }, [installed, repos.length]);

  if (authLoading) {
    return <Layout><Skeleton /></Layout>;
  }

  if (!isSignedIn) {
    return (
      <Layout>
        <Hero
          title="Get started"
          subtitle="Sign in with GitHub to set up automated AI reviews on your pull requests."
        />
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => signIn('/onboarding')} className="text-base px-6 py-6">
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Hero
        title="Set up github.gg"
        subtitle="Three steps to AI reviews on every pull request. Free tier includes 3 reviews per installation."
      />

      <div className="mt-10 space-y-3">
        <Step
          n={1}
          status={stepStatus.step1}
          title="Install the GitHub App"
          body="Choose which repos github.gg can read. We never store source code."
          cta={
            installed ? (
              <Done label={`Connected to ${installationQuery.data?.accountLogin ?? 'your account'}`} />
            ) : (
              <a
                href={buildGitHubAppInstallUrl('/onboarding')}
                onClick={() => safePostHog.capture('install_clicked', { source: 'onboarding' })}
              >
                <Button size="lg">
                  <Github className="mr-2 h-4 w-4" />
                  Install on GitHub
                </Button>
              </a>
            )
          }
        />

        <Step
          n={2}
          status={stepStatus.step2}
          title="Pick a repo"
          body="Webhooks are enabled by default for every repo on the installation. You can opt repos out in settings."
          cta={
            stepStatus.step2 === 'pending' ? null : hasRepo ? (
              <Done label={`${repos.length} ${repos.length === 1 ? 'repo' : 'repos'} connected`} />
            ) : (
              <p className="text-sm text-gray-500">
                Waiting for GitHub to send the install event…
              </p>
            )
          }
        />

        <Step
          n={3}
          status={stepStatus.step3}
          title="Open a pull request"
          body="The next PR you open on a connected repo gets a real AI review posted as a comment. No extra config."
          cta={
            stepStatus.step3 === 'pending' ? null : firstRepo ? (
              <div className="flex flex-col gap-2">
                <a
                  href={`https://github.com/${firstRepo.fullName}/pulls`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => safePostHog.capture('open_pr_clicked', { repo: firstRepo.fullName, source: 'onboarding' })}
                >
                  <Button size="lg" variant="outline" className="w-full">
                    <GitPullRequest className="mr-2 h-4 w-4" />
                    Open a PR on {firstRepo.fullName}
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </a>
                <Link
                  href={`/${firstRepo.fullName}`}
                  className="text-sm text-gray-500 hover:text-gray-700 text-center underline-offset-4 hover:underline"
                >
                  Or browse {firstRepo.fullName} on github.gg →
                </Link>
              </div>
            ) : null
          }
        />
      </div>

      <div className="mt-10 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 leading-relaxed">
          <span className="font-semibold">Pro?</span> No setup difference — Pro just removes the 3-review cap.{' '}
          <Link href="/pricing?ref=onboarding" className="underline font-medium">
            See pricing
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4 max-w-2xl">{children}</div>
    </div>
  );
}

function Hero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{title}</h1>
      <p className="text-base text-gray-600 max-w-lg mx-auto leading-relaxed">{subtitle}</p>
    </div>
  );
}

function Step({
  n,
  status,
  title,
  body,
  cta,
}: {
  n: number;
  status: 'pending' | 'active' | 'done';
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  const ringClass =
    status === 'done'
      ? 'bg-green-100 border-green-400 text-green-700'
      : status === 'active'
      ? 'bg-[#111] border-[#111] text-white'
      : 'bg-gray-100 border-gray-300 text-gray-400';
  const opacity = status === 'pending' ? 'opacity-60' : '';

  return (
    <div className={`p-5 bg-white border border-gray-200 rounded-lg flex gap-4 ${opacity}`}>
      <div className={`shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${ringClass}`}>
        {status === 'done' ? <Check className="h-4 w-4" /> : n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="text-sm text-gray-600 mt-0.5 mb-3">{body}</div>
        {cta}
      </div>
    </div>
  );
}

function Done({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-green-700 font-medium">
      <Check className="h-4 w-4" />
      {label}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-gray-200 rounded w-3/4 mx-auto" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
      <div className="h-24 bg-gray-200 rounded mt-8" />
      <div className="h-24 bg-gray-200 rounded" />
      <div className="h-24 bg-gray-200 rounded" />
    </div>
  );
}
