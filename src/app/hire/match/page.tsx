'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { CandidateMatchCard } from '@/components/hire/CandidateMatchCard';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { ArrowLeft, Github } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/client';
import { PageWidthContainer } from '@/components/PageWidthContainer';

const DRAFT_KEY = 'hire-match-draft-v1';

const ARCHETYPES = [
  'Production Builder',
  'Full-Stack Generalist',
  'Domain Specialist',
  'Research & Innovation',
  'Open Source Contributor',
  'Early Career Explorer',
];

const EXAMPLE_JOB = `Senior Full-Stack Engineer

We're looking for an experienced developer to join our team building a modern SaaS platform.

Requirements:
- 5+ years of experience with TypeScript and React
- Strong backend skills with Node.js or Python
- Experience with PostgreSQL or similar databases
- Understanding of cloud infrastructure (AWS/GCP)
- Track record of shipping production applications

Nice to have:
- Experience with AI/ML integration
- Open source contributions
- Remote work experience`;

export default function HireMatchPage() {
  const { isSignedIn, isLoading: authLoading, signIn } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [minConfidence, setMinConfidence] = useState(50);
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        jobDescription?: string;
        minConfidence?: number;
        selectedArchetypes?: string[];
      };
      if (draft.jobDescription) setJobDescription(draft.jobDescription);
      if (typeof draft.minConfidence === 'number') setMinConfidence(draft.minConfidence);
      if (Array.isArray(draft.selectedArchetypes)) setSelectedArchetypes(draft.selectedArchetypes);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (!jobDescription && selectedArchetypes.length === 0 && minConfidence === 50) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ jobDescription, minConfidence, selectedArchetypes })
      );
    } catch {}
  }, [jobDescription, minConfidence, selectedArchetypes]);

  const matchMutation = trpc.hire.matchCandidates.useMutation({
    onSuccess: () => {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to find matches');
    },
  });

  const validate = () => {
    if (jobDescription.trim().length < 50) {
      toast.error('Please enter a more detailed job description (at least 50 characters)');
      return false;
    }
    return true;
  };

  const handleSearch = () => {
    if (!validate()) return;
    matchMutation.mutate({
      jobDescription: jobDescription.trim(),
      limit: 20,
      minConfidence: minConfidence > 0 ? minConfidence : undefined,
      archetypes: selectedArchetypes.length > 0 ? selectedArchetypes : undefined,
    });
  };

  const handleSignInToMatch = () => {
    if (!validate()) return;
    signIn('/hire/match');
  };

  const toggleArchetype = (archetype: string) => {
    setSelectedArchetypes((prev) =>
      prev.includes(archetype)
        ? prev.filter((a) => a !== archetype)
        : [...prev, archetype]
    );
  };

  const useExample = () => {
    setJobDescription(EXAMPLE_JOB);
  };

  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <PageWidthContainer>
        <Link
          href="/hire"
          className="text-sm text-[#888] hover:text-[#111] inline-flex items-center gap-1 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Hire
        </Link>

        <h1 className="text-[31px] font-semibold text-[#111] tracking-tight leading-none mb-2">
          Match by Job Description
        </h1>
        <p className="text-base text-[#888] mb-10 max-w-2xl">
          Paste a job description to find and rank candidates from analyzed developer profiles.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Job input */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8">
              <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
                Job Description
              </div>
              <div className="border-b border-[#eee] mb-4" />

              <Textarea
                id="job-description"
                placeholder="Paste your job description here…&#10;&#10;Include:&#10;- Required skills and experience&#10;- Tech stack preferences&#10;- Role responsibilities&#10;- Nice-to-haves"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[200px] mb-3 text-sm border-[#ddd] focus-visible:ring-0 focus-visible:border-[#111]"
              />

              <button
                onClick={useExample}
                className="text-xs text-[#888] hover:text-[#111] underline underline-offset-2 mb-6 block transition-colors"
              >
                Use example job description
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2 hover:text-[#111] transition-colors"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <div className="border-b border-[#eee] mb-4" />

              {showFilters && (
                <div className="space-y-6 mb-6">
                  <div>
                    <div className="text-sm text-[#111] mb-2">
                      Minimum profile confidence: <span className="font-mono text-[13px]">{minConfidence}%</span>
                    </div>
                    <Slider
                      value={[minConfidence]}
                      onValueChange={([val]) => setMinConfidence(val)}
                      min={0}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <div className="text-sm text-[#111] mb-2">Developer types</div>
                    <div className="space-y-2">
                      {ARCHETYPES.map((archetype) => (
                        <div key={archetype} className="flex items-center gap-2">
                          <Checkbox
                            id={archetype}
                            checked={selectedArchetypes.includes(archetype)}
                            onCheckedChange={() => toggleArchetype(archetype)}
                          />
                          <label
                            htmlFor={archetype}
                            className="text-sm text-[#111] cursor-pointer"
                          >
                            {archetype}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!authLoading && !isSignedIn ? (
                <>
                  <Button
                    onClick={handleSignInToMatch}
                    disabled={jobDescription.trim().length < 50}
                    className="w-full bg-[#111] hover:bg-[#333] text-white"
                    data-testid="hire-match-signin"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    Sign in with GitHub to match
                  </Button>
                  <p className="text-xs text-[#aaa] mt-2 text-center">
                    Your draft is saved — you&apos;ll land back here.
                  </p>
                </>
              ) : (
                <Button
                  onClick={handleSearch}
                  disabled={matchMutation.isPending || jobDescription.trim().length < 50 || authLoading}
                  className={`w-full bg-[#111] hover:bg-[#333] text-white ${matchMutation.isPending ? 'animate-pulse' : ''}`}
                  data-testid="hire-match-submit"
                >
                  Find Candidates
                </Button>
              )}

              {matchMutation.isPending && (
                <p className="text-xs text-[#aaa] mt-2 text-center">
                  This may take 30–60 seconds as each candidate is analyzed.
                </p>
              )}
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            {!matchMutation.data && !matchMutation.isPending && (
              <div className="border-t border-[#eee] pt-12 pb-16 text-center">
                <p className="text-base text-[#aaa] max-w-md mx-auto">
                  Paste a job description on the left and we&apos;ll rank developers from the analyzed pool by fit.
                </p>
              </div>
            )}

            {matchMutation.isPending && (
              <div className="space-y-4">
                <div className="animate-pulse rounded-sm bg-[#eee] h-6 w-48" />
                <div className="animate-pulse rounded-sm bg-[#eee] h-24 w-full" />
                <div className="animate-pulse rounded-sm bg-[#eee] h-24 w-full" />
                <div className="animate-pulse rounded-sm bg-[#eee] h-24 w-full" />
              </div>
            )}

            {matchMutation.data && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
                    {matchMutation.data.candidates.length} Candidate{matchMutation.data.candidates.length === 1 ? '' : 's'} Found
                  </div>
                  <div className="border-b border-[#eee] mb-4" />
                  <p className="text-xs text-[#aaa] mb-6 font-mono">
                    Searched {matchMutation.data.totalSearched} profiles in {(matchMutation.data.searchTimeMs / 1000).toFixed(1)}s
                  </p>
                </div>

                {matchMutation.data.candidates.length === 0 ? (
                  <p className="text-base text-[#aaa] py-8 text-center">
                    No candidates matched your criteria. Try adjusting filters or rewording the job description.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {matchMutation.data.candidates.map((candidate) => (
                      <CandidateMatchCard
                        key={candidate.username}
                        username={candidate.username}
                        summary={candidate.summary}
                        archetype={candidate.archetype}
                        confidence={candidate.confidence}
                        similarityScore={candidate.similarityScore}
                        fitScore={candidate.fitScore}
                        fitReason={candidate.fitReason}
                        keyStrengths={candidate.keyStrengths}
                        potentialGaps={candidate.potentialGaps}
                        interviewFocus={candidate.interviewFocus}
                        salaryRange={candidate.salaryRange}
                        topSkills={candidate.topSkills}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PageWidthContainer>
    </div>
  );
}
