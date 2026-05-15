'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Github, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import DiscoverApp from '@/components/discover/DiscoverApp';

export default function HirePage() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer>
        <HireHeader />
        <div className="mt-10">
          <Suspense fallback={<div className="h-[500px] rounded-lg bg-gray-100 animate-pulse" />}>
            <DiscoverApp />
          </Suspense>
        </div>
      </PageWidthContainer>
    </div>
  );
}

function HireHeader() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsLoading(true);
    let clean = username.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '');
    clean = clean.split('/')[0];
    router.push(`/hire/${clean}`);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-6 flex-wrap mb-2">
        <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">
          Hire
        </h1>
        <Link
          href="/hire/match"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#111] hover:text-[#666] transition-colors"
          data-testid="hire-jd-match-link"
        >
          <Sparkles className="h-4 w-4" />
          Match candidates to a job description
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="text-base text-[#888] mb-6 max-w-2xl">
        Source developers by how they actually code. Browse the semantic map below,
        explore a specific GitHub user&apos;s network, or analyze one candidate directly.
      </p>

      <form onSubmit={handleAnalyze} className="max-w-md">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]">
            <Github className="h-4 w-4" />
          </div>
          <Input
            type="text"
            placeholder="GitHub username — get a hiring report"
            aria-label="GitHub username"
            data-testid="hire-username-input"
            className="pl-10 pr-28 h-10 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              disabled={isLoading || !username.trim()}
              data-testid="hire-username-submit"
              className="h-8 px-3 bg-[#111] hover:bg-[#333] text-white rounded font-medium text-xs"
            >
              {isLoading ? '...' : (
                <>
                  Analyze
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
