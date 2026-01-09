'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { CandidateMatchCard } from '@/components/hire/CandidateMatchCard';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Search, Loader2, Sparkles, Users, Filter, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
  const [jobDescription, setJobDescription] = useState('');
  const [minConfidence, setMinConfidence] = useState(50);
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const matchMutation = trpc.hire.matchCandidates.useMutation({
    onError: (error) => {
      toast.error(error.message || 'Failed to find matches');
    },
  });

  const handleSearch = () => {
    if (jobDescription.trim().length < 50) {
      toast.error('Please enter a more detailed job description (at least 50 characters)');
      return;
    }

    matchMutation.mutate({
      jobDescription: jobDescription.trim(),
      limit: 20,
      minConfidence: minConfidence > 0 ? minConfidence : undefined,
      archetypes: selectedArchetypes.length > 0 ? selectedArchetypes : undefined,
    });
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link
            href="/hire"
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Hire
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Job Matching</h1>
              <p className="text-gray-500">
                Paste a job description to find and rank candidates automatically
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Job input */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border p-6 sticky top-8">
              <Label htmlFor="job-description" className="text-base font-medium">
                Job Description
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Paste your job listing or requirements
              </p>

              <Textarea
                id="job-description"
                placeholder="Paste your job description here...

Include:
- Required skills and experience
- Tech stack preferences
- Role responsibilities
- Nice-to-haves"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[200px] mb-3"
              />

              <button
                onClick={useExample}
                className="text-xs text-blue-600 hover:underline mb-4 block"
              >
                Use example job description
              </button>

              {/* Filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>

              {showFilters && (
                <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  {/* Confidence slider */}
                  <div>
                    <Label className="text-sm">
                      Minimum Profile Confidence: {minConfidence}%
                    </Label>
                    <Slider
                      value={[minConfidence]}
                      onValueChange={([val]) => setMinConfidence(val)}
                      min={0}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                  </div>

                  {/* Archetype filters */}
                  <div>
                    <Label className="text-sm mb-2 block">Developer Types</Label>
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
                            className="text-sm cursor-pointer"
                          >
                            {archetype}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSearch}
                disabled={matchMutation.isPending || jobDescription.trim().length < 50}
                className="w-full"
              >
                {matchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finding Matches...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find Candidates
                  </>
                )}
              </Button>

              {matchMutation.isPending && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  This may take 30-60 seconds as we analyze each candidate
                </p>
              )}
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            {!matchMutation.data && !matchMutation.isPending && (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Find Your Perfect Candidates
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Paste a job description on the left and our AI will find and rank
                  the best matching developers from our database.
                </p>
              </div>
            )}

            {matchMutation.isPending && (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Loader2 className="h-12 w-12 text-violet-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Analyzing Candidates...
                </h3>
                <p className="text-gray-500">
                  We&apos;re searching our database and using AI to rank each candidate
                  against your requirements.
                </p>
              </div>
            )}

            {matchMutation.data && (
              <div className="space-y-4">
                {/* Results header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {matchMutation.data.candidates.length} Candidates Found
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Searched {matchMutation.data.totalSearched} profiles in{' '}
                      {(matchMutation.data.searchTimeMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>

                {/* Candidate cards */}
                {matchMutation.data.candidates.length === 0 ? (
                  <div className="bg-white rounded-lg border p-8 text-center">
                    <p className="text-gray-500">
                      No candidates matched your criteria. Try adjusting your filters
                      or using a different job description.
                    </p>
                  </div>
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
      </div>
    </div>
  );
}
