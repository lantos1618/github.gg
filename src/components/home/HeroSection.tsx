'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Github } from 'lucide-react';
import { toast } from 'sonner';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import { safePostHog } from '@/lib/analytics/posthog';

export function HeroSection() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    safePostHog.capture('landing_view', {
      utm_source: params.get('utm_source') ?? undefined,
      utm_medium: params.get('utm_medium') ?? undefined,
      utm_campaign: params.get('utm_campaign') ?? undefined,
      ref: params.get('ref') ?? undefined,
    });
  }, []);

  const handleAnalyze = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!repoUrl.trim()) return;

    setIsAnalyzing(true);

    let target = repoUrl.trim();
    target = target.replace(/^https?:\/\/github\.com\//, '');
    target = target.replace(/\/$/, '');

    const parts = target.split('/');
    if (parts.length < 2) {
      toast.error('Please enter a valid repository (e.g., facebook/react)');
      setIsAnalyzing(false);
      return;
    }

    const cleanPath = `${parts[0]}/${parts[1]}`;
    safePostHog.capture('analyze_clicked', {
      target: cleanPath,
      source: 'hero',
    });
    router.push(`/${cleanPath}`);
  };

  return (
    <div className="relative bg-white" data-testid="home-hero-section">
      <PageWidthContainer className="pt-24 pb-20">

        {/* Section label */}
        <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-4">
          GitHub Intelligence
        </div>

        {/* Headline */}
        <h1 className="text-[31px] sm:text-[39px] font-semibold text-[#111] leading-[1.2] mb-2 tracking-tight">
          Read any repository like you wrote it
        </h1>

        {/* Subtitle */}
        <p className="text-base text-[#aaa] mb-10">
          Quality scores, architecture diagrams, and generated docs — from any public GitHub URL
        </p>

        {/* Divider */}
        <div className="border-b border-[#eee] mb-10" />

        {/* Body text */}
        <p className="text-base text-[#666] leading-[1.6] mb-10">
          Paste a GitHub URL or <code className="bg-[#eee] px-1.5 py-0.5 rounded text-[13px]">owner/repo</code> below.
          Get an instant analysis — scorecards, architecture diagrams, auto-generated wiki, and AI code review.
          No signup required for public repositories.
        </p>

        {/* Search */}
        <div className="mb-6">
          <form onSubmit={handleAnalyze} className="group relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ccc] group-focus-within:text-[#111] transition-colors">
              <Github className="h-5 w-5" />
            </div>
            <Input
              type="text"
              placeholder="owner/repo or paste URL"
              aria-label="GitHub repository URL or path"
              data-testid="home-hero-repo-input"
              className="pl-12 pr-32 h-14 text-base"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              autoFocus
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <Button
                size="default"
                type="submit"
                disabled={isAnalyzing}
                data-testid="home-hero-submit-btn"
                className="h-11 px-6 bg-[#111] hover:bg-[#333] text-white rounded-md font-medium text-base"
              >
                {isAnalyzing ? '...' : (
                  <>
                    Analyze
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Quick examples */}
        <div className="flex flex-wrap items-center gap-2 text-base">
          <span className="text-[#aaa]">Try</span>
          {[
            { name: 'facebook/react', label: 'react' },
            { name: 'vercel/next.js', label: 'next.js' },
            { name: 'denoland/deno', label: 'deno' },
          ].map((repo) => (
            <button
              key={repo.name}
              onClick={() => setRepoUrl(repo.name)}
              data-testid={`home-hero-example-${repo.label}-btn`}
              className="px-2.5 py-1 rounded border border-[#e0e0e0] hover:border-[#ccc] hover:bg-[#fafafa] text-[#666] font-mono text-[13px] transition-colors"
            >
              {repo.label}
            </button>
          ))}
        </div>

        {/* Secondary CTA — install on your own repo for AI PR reviews */}
        <div className="mt-8 pt-6 border-t border-[#eee] flex flex-wrap items-center gap-3 text-base">
          <span className="text-[#aaa]">Want AI reviews on your own PRs?</span>
          <Link
            href="/install"
            data-testid="home-hero-install-cta"
            onClick={() => safePostHog.capture('install_clicked', { source: 'hero' })}
            className="inline-flex items-center gap-1.5 text-[#111] hover:text-[#333] font-medium underline-offset-4 hover:underline"
          >
            <Github className="h-4 w-4" />
            Install on your repo — 3 free reviews
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageWidthContainer>
    </div>
  );
}
