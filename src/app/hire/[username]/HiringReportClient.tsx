'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { SkillAssessment } from '@/components/profile/SkillAssessment';
import { TopRepos } from '@/components/profile/TopRepos';
import { PageWidthContainer } from '@/components/PageWidthContainer';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/client';
import { safePostHog } from '@/lib/analytics/posthog';
import {
  ArrowLeft,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';

const SHORTLIST_KEY = 'gg.hire.shortlist';

function readShortlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SHORTLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function saveToShortlist(username: string): boolean {
  if (typeof window === 'undefined') return false;
  const current = readShortlist();
  const lower = username.toLowerCase();
  if (current.some((u) => u.toLowerCase() === lower)) return false;
  current.push(username);
  window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(current));
  return true;
}

type HiringReportClientProps = {
  username: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
};

function getRiskLabel(confidence: number | undefined, aiPercentage?: number): string {
  if (confidence === undefined) return 'Unknown';
  if (aiPercentage && aiPercentage > 60) return 'High Risk';
  if (confidence < 40) return 'High Risk';
  if (confidence < 70 || (aiPercentage && aiPercentage > 40)) return 'Medium Risk';
  return 'Low Risk';
}

function generateInterviewQuestions(profile: {
  skillAssessment?: Array<{ metric: string; score: number; reason: string }>;
  developmentStyle?: Array<{ metric: string; score: number; reason: string }>;
  topRepos?: Array<{ name: string; description: string }>;
  profileConfidence?: number;
  confidenceReason?: string;
}): string[] {
  const questions: string[] = [];

  const weakSkills = profile.skillAssessment?.filter(s => s.score < 6) || [];
  weakSkills.slice(0, 2).forEach(skill => {
    questions.push(`Their ${skill.metric} scored ${skill.score}/10. Ask them to explain a challenging ${skill.metric} problem they solved recently.`);
  });

  const styleIssues = profile.developmentStyle?.filter(s => s.score < 5) || [];
  styleIssues.slice(0, 1).forEach(style => {
    questions.push(`${style.metric} scored low (${style.score}/10). Ask about their typical development workflow and ${style.metric.toLowerCase()} practices.`);
  });

  if (profile.profileConfidence && profile.profileConfidence < 60) {
    questions.push(`Profile confidence is ${profile.profileConfidence}%. Ask them to walk you through their most significant project that may not be on GitHub.`);
  }

  if (profile.topRepos && profile.topRepos.length > 0) {
    const topRepo = profile.topRepos[0];
    questions.push(`Ask them to explain the architecture decisions in ${topRepo.name} and what they would do differently today.`);
  }

  if (questions.length < 3) {
    questions.push(`Ask them to live code a small feature or debug a problem in their primary language.`);
    questions.push(`Ask them to explain how they approach learning new technologies and staying current.`);
  }

  return questions.slice(0, 5);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
        {children}
      </div>
      <div className="border-b border-[#eee] mb-4" />
    </>
  );
}

function HireConversionBar({ username }: { username: string }) {
  const { isSignedIn, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(readShortlist().some((u) => u.toLowerCase() === username.toLowerCase()));
  }, [username]);

  useEffect(() => {
    if (searchParams.get('action') !== 'saved') return;
    if (!isSignedIn) return;
    const added = saveToShortlist(username);
    if (added) {
      setIsSaved(true);
      toast.success(`@${username} added to your shortlist`);
      safePostHog.capture('hire_candidate_saved', { username, source: 'oauth_return' });
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('action');
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [searchParams, isSignedIn, username, router]);

  const onSave = () => {
    safePostHog.capture('hire_save_click', { username, signed_in: isSignedIn });
    if (!isSignedIn) {
      signIn(`/hire/${username}?action=saved`);
      return;
    }
    const added = saveToShortlist(username);
    setIsSaved(true);
    toast.success(added ? `@${username} added to your shortlist` : `@${username} is already on your shortlist`);
    safePostHog.capture('hire_candidate_saved', { username, source: 'direct' });
  };

  const onFindSimilar = () => {
    safePostHog.capture('hire_find_similar_click', { username, signed_in: isSignedIn });
    const target = `/hire?seed=${encodeURIComponent(username)}`;
    if (!isSignedIn) {
      signIn(target);
      return;
    }
    router.push(target);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#eee] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 print:hidden">
      <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
        <div className="text-sm text-[#888] hidden sm:block flex-1">
          Like @{username}? Save them or find similar developers.
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaved}
            data-testid="hire-save-candidate-btn"
            className="flex-1 sm:flex-none border-[#111] text-[#111] hover:bg-[#111] hover:text-white"
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                {isSignedIn ? 'Save candidate' : 'Sign in to save'}
              </>
            )}
          </Button>
          <Button
            onClick={onFindSimilar}
            data-testid="hire-find-similar-btn"
            className="flex-1 sm:flex-none bg-[#111] hover:bg-[#333] text-white"
          >
            Find similar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function HiringReportClient({ username, initialData }: HiringReportClientProps) {
  const { data, isLoading, error } = trpc.profile.publicGetProfile.useQuery({ username }, {
    initialData: initialData ?? undefined,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pt-12 pb-20">
        <PageWidthContainer>
          <div className="animate-pulse rounded-sm bg-[#eee] h-8 w-48 mb-3" />
          <div className="animate-pulse rounded-sm bg-[#eee] h-4 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="animate-pulse rounded-sm bg-[#eee] h-32 w-full" />
            <div className="animate-pulse rounded-sm bg-[#eee] h-32 w-full" />
          </div>
          <div className="animate-pulse rounded-sm bg-[#eee] h-48 w-full mt-4" />
        </PageWidthContainer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none mb-3">
            Couldn&apos;t load profile
          </h1>
          <p className="text-base text-[#888] mb-6">{error.message}</p>
          <Link href="/hire">
            <Button variant="outline" className="border-[#111] text-[#111] hover:bg-[#111] hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Try another username
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none mb-3">
            No profile found
          </h1>
          <p className="text-base text-[#888] mb-6">
            We haven&apos;t analyzed this user yet. The profile needs to be generated first.
          </p>
          <div className="flex flex-col gap-2">
            <Link href={`/${username}`}>
              <Button className="w-full bg-[#111] hover:bg-[#333] text-white">
                Generate profile on github.gg/{username}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/hire">
              <Button variant="outline" className="w-full border-[#111] text-[#111] hover:bg-[#111] hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to search
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profile = data.profile;
  const riskLabel = getRiskLabel(profile.profileConfidence);
  const interviewQuestions = generateInterviewQuestions(profile);

  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  if (profile.profileConfidence !== undefined) {
    if (profile.profileConfidence < 50) {
      redFlags.push(`Low profile confidence (${profile.profileConfidence}%) — ${profile.confidenceReason || 'limited visible work'}`);
    } else if (profile.profileConfidence >= 80) {
      greenFlags.push(`High profile confidence (${profile.profileConfidence}%) — strong GitHub presence`);
    }
  }

  const weakSkills = profile.skillAssessment?.filter(s => s.score < 5) || [];
  weakSkills.forEach(skill => {
    redFlags.push(`Weak ${skill.metric} (${skill.score}/10)`);
  });

  const strongSkills = profile.skillAssessment?.filter(s => s.score >= 8) || [];
  strongSkills.slice(0, 3).forEach(skill => {
    greenFlags.push(`Strong ${skill.metric} (${skill.score}/10)`);
  });

  if (profile.developerArchetype === 'Early Career Explorer') {
    redFlags.push('Early career developer — may need mentorship');
  } else if (profile.developerArchetype === 'Production Builder') {
    greenFlags.push('Production-focused developer — ships complete work');
  }

  return (
    <div className="min-h-screen bg-white pt-12 pb-32">
      <PageWidthContainer>
        <div className="flex items-center justify-between mb-6">
          <Link href="/hire" className="text-sm text-[#888] hover:text-[#111] inline-flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to search
          </Link>
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#888] hover:text-[#111] inline-flex items-center gap-1 transition-colors"
          >
            View on GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="flex items-start justify-between gap-4 mb-10">
          <div className="min-w-0">
            <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none mb-2">
              @{username}
            </h1>
            <p className="text-base text-[#888]">{profile.developerArchetype || 'Developer'}</p>
          </div>
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase flex-shrink-0">
            {riskLabel}
          </div>
        </div>

        {/* Summary */}
        <section className="mb-10">
          <SectionLabel>Summary</SectionLabel>
          <p className="text-base text-[#111] leading-relaxed">{profile.summary}</p>
          {profile.scoreInterpretation && (
            <p className="text-sm text-[#888] mt-3 italic">{profile.scoreInterpretation}</p>
          )}
        </section>

        {/* Key Metrics */}
        <section className="grid md:grid-cols-2 gap-10 mb-10">
          <div>
            <SectionLabel>Profile Confidence</SectionLabel>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-[31px] font-semibold text-[#111] tracking-tight leading-none">
                {profile.profileConfidence ?? 'N/A'}
              </span>
              {profile.profileConfidence !== undefined && (
                <span className="text-base text-[#aaa]">/100</span>
              )}
            </div>
            <p className="text-sm text-[#888]">
              {profile.confidenceReason || 'How well this GitHub represents their true skills'}
            </p>
          </div>

          <div>
            <SectionLabel>Developer Type</SectionLabel>
            <div className="text-lg font-semibold text-[#111] mb-2">
              {profile.developerArchetype || 'Unknown'}
            </div>
            <p className="text-sm text-[#888]">
              {profile.developerArchetype === 'Research & Innovation' && 'Prioritizes exploration over polish'}
              {profile.developerArchetype === 'Production Builder' && 'Ships complete, tested projects'}
              {profile.developerArchetype === 'Open Source Contributor' && 'Focus on contributing to others projects'}
              {profile.developerArchetype === 'Full-Stack Generalist' && 'Covers many areas and technologies'}
              {profile.developerArchetype === 'Domain Specialist' && 'Deep expertise in specific area'}
              {profile.developerArchetype === 'Early Career Explorer' && 'Building portfolio, learning'}
            </p>
          </div>
        </section>

        {/* Flags */}
        <section className="grid md:grid-cols-2 gap-10 mb-10">
          <div>
            <SectionLabel>Red Flags</SectionLabel>
            {redFlags.length > 0 ? (
              <ul className="space-y-2">
                {redFlags.map((flag, idx) => (
                  <li key={idx} className="text-sm text-[#666] flex gap-2">
                    <span className="text-[#ccc]">−</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#aaa]">No significant red flags detected.</p>
            )}
          </div>

          <div>
            <SectionLabel>Green Flags</SectionLabel>
            {greenFlags.length > 0 ? (
              <ul className="space-y-2">
                {greenFlags.map((flag, idx) => (
                  <li key={idx} className="text-sm text-[#666] flex gap-2">
                    <span className="text-[#ccc]">+</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#aaa]">Generate a full profile for detailed signals.</p>
            )}
          </div>
        </section>

        {profile.skillAssessment && profile.skillAssessment.length > 0 && (
          <section className="mb-10">
            <SectionLabel>Skills Assessment</SectionLabel>
            <SkillAssessment skills={profile.skillAssessment} compact />
          </section>
        )}

        <section className="mb-10">
          <SectionLabel>Suggested Interview Questions</SectionLabel>
          <ul className="space-y-3">
            {interviewQuestions.map((question, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 border border-[#eee] text-[#888] text-xs font-mono flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-sm text-[#666] leading-relaxed">{question}</span>
              </li>
            ))}
          </ul>
        </section>

        {profile.topRepos && profile.topRepos.length > 0 && (
          <section className="mb-10">
            <SectionLabel>Notable Repositories</SectionLabel>
            <TopRepos repos={profile.topRepos} compact username={username} />
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link href={`/${username}`} className="flex-1">
            <Button variant="outline" className="w-full border-[#111] text-[#111] hover:bg-[#111] hover:text-white">
              View full profile on GG
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex-1 border-[#111] text-[#111] hover:bg-[#111] hover:text-white"
          >
            Print / Save as PDF
          </Button>
        </div>
      </PageWidthContainer>

      <HireConversionBar username={username} />
    </div>
  );
}
