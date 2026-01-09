'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  Search,
  ArrowLeft,
  X,
  ChevronDown,
  ExternalLink,
  Loader2,
  Users,
  Filter,
} from 'lucide-react';

const ARCHETYPES = [
  'Production Builder',
  'Full-Stack Generalist',
  'Domain Specialist',
  'Research & Innovation',
  'Open Source Contributor',
  'Early Career Explorer',
];

const COMMON_SKILLS = [
  'React', 'TypeScript', 'Python', 'JavaScript', 'Node.js',
  'Go', 'Rust', 'Java', 'C++', 'Swift',
  'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
  'Machine Learning', 'GraphQL', 'Next.js', 'Vue', 'Angular',
];

function getRiskColor(confidence: number | undefined) {
  if (confidence === undefined) return 'text-gray-500';
  if (confidence >= 70) return 'text-emerald-600';
  if (confidence >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function HireSearchPage() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [minConfidence, setMinConfidence] = useState<number | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = trpc.profile.searchProfiles.useQuery({
    skills: skills.length > 0 ? skills : undefined,
    archetypes: archetypes.length > 0 ? archetypes : undefined,
    minConfidence,
    query: query || undefined,
    limit: 50,
  }, {
    enabled: true, // Always fetch, show all profiles by default
  });

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const toggleArchetype = (archetype: string) => {
    if (archetypes.includes(archetype)) {
      setArchetypes(archetypes.filter(a => a !== archetype));
    } else {
      setArchetypes([...archetypes, archetype]);
    }
  };

  const clearFilters = () => {
    setSkills([]);
    setArchetypes([]);
    setMinConfidence(undefined);
    setQuery('');
  };

  const hasFilters = skills.length > 0 || archetypes.length > 0 || minConfidence !== undefined || query;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/hire" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <h1 className="font-semibold text-gray-900">Search Candidates</h1>
            <div className="w-16" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Main search bar */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, summary, or skills..."
                className="pl-10 h-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-900 text-white rounded">
                  {skills.length + archetypes.length + (minConfidence ? 1 : 0)}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Skills chips */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Expanded filters */}
          {showFilters && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              {/* Skills input */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Required Skills</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Add a skill..."
                    className="max-w-xs h-9"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill(skillInput);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSkill(skillInput)}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {COMMON_SKILLS.filter(s => !skills.includes(s)).slice(0, 12).map(skill => (
                    <button
                      key={skill}
                      onClick={() => addSkill(skill)}
                      className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Developer Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Developer Type</label>
                <div className="flex flex-wrap gap-2">
                  {ARCHETYPES.map(archetype => (
                    <button
                      key={archetype}
                      onClick={() => toggleArchetype(archetype)}
                      className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                        archetypes.includes(archetype)
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {archetype}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Confidence */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Minimum Profile Confidence
                </label>
                <div className="flex gap-2">
                  {[undefined, 50, 70, 80].map((value) => (
                    <button
                      key={value ?? 'any'}
                      onClick={() => setMinConfidence(value)}
                      className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                        minConfidence === value
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {value === undefined ? 'Any' : `${value}%+`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No candidates found</p>
            <p className="text-sm text-gray-400">
              {hasFilters ? 'Try adjusting your filters' : 'No profiles have been analyzed yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {data.total} candidate{data.total !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="space-y-3">
              {data.results.map((candidate) => (
                <Link
                  key={candidate.username}
                  href={`/hire/${candidate.username}`}
                  className="block bg-white border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">@{candidate.username}</h3>
                        <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-50 rounded">
                          {candidate.archetype || 'Developer'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {candidate.summary}
                      </p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.topSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-0.5 rounded ${
                              skill.score >= 8
                                ? 'bg-emerald-50 text-emerald-700'
                                : skill.score >= 6
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {skill.name} ({skill.score})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-lg font-semibold ${getRiskColor(candidate.confidence)}`}>
                        {candidate.confidence ?? '?'}%
                      </div>
                      <div className="text-xs text-gray-400">confidence</div>
                      <div className="mt-2">
                        <ExternalLink className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {data.hasMore && (
              <div className="text-center py-4">
                <Button variant="outline" size="sm">
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
