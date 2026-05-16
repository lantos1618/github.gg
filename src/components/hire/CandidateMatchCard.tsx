'use client';

import Link from 'next/link';

interface CandidateMatchCardProps {
  username: string;
  summary: string | null;
  archetype: string | null;
  confidence: number;
  similarityScore: number;
  fitScore: number;
  fitReason: string;
  keyStrengths: string[];
  potentialGaps: string[];
  interviewFocus: string[];
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  topSkills: Array<{ name: string; score: number }>;
}

function formatSalary(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount}`;
}

function getFitLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Moderate';
  return 'Weak';
}

export function CandidateMatchCard({
  username,
  archetype,
  confidence,
  fitScore,
  fitReason,
  keyStrengths,
  potentialGaps,
  interviewFocus,
  salaryRange,
  topSkills,
}: CandidateMatchCardProps) {
  return (
    <article
      data-testid={`hire-candidate-${username}-card`}
      className="border border-[#eee] hover:border-[#ccc] transition-colors p-6"
    >
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <Link
              href={`/hire/${username}`}
              className="text-lg font-semibold text-[#111] hover:text-[#666] transition-colors truncate"
            >
              {username}
            </Link>
            <span className="font-mono text-[13px] text-[#888]">
              <span className="font-semibold text-[#111]">{fitScore}</span>
              <span className="text-[#ccc]">/100</span> · {getFitLabel(fitScore)} fit
            </span>
          </div>
          {archetype && (
            <div className="text-sm text-[#888] mt-1">{archetype}</div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-[13px] text-[#111]">
            {formatSalary(salaryRange.min)}–{formatSalary(salaryRange.max)}
          </div>
          <div className="text-xs text-[#aaa] mt-1 font-mono">
            {confidence}% confidence
          </div>
        </div>
      </header>

      <p className="text-sm text-[#666] mb-5 leading-relaxed">{fitReason}</p>

      {topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {topSkills.map((skill) => (
            <span
              key={skill.name}
              className="inline-flex items-baseline gap-1 px-2 py-0.5 border border-[#eee] text-xs text-[#111]"
            >
              {skill.name}
              <span className="font-mono text-[11px] text-[#aaa]">{skill.score}/10</span>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        <div>
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
            Key Strengths
          </div>
          <div className="border-b border-[#eee] mb-3" />
          <ul className="space-y-1.5">
            {keyStrengths.slice(0, 3).map((strength, i) => (
              <li key={i} className="text-sm text-[#666] flex gap-2">
                <span className="text-[#ccc]">+</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {potentialGaps.length > 0 && (
          <div>
            <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-2">
              Areas to Explore
            </div>
            <div className="border-b border-[#eee] mb-3" />
            <ul className="space-y-1.5">
              {potentialGaps.slice(0, 3).map((gap, i) => (
                <li key={i} className="text-sm text-[#666] flex gap-2">
                  <span className="text-[#ccc]">−</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {interviewFocus.length > 0 && (
        <div className="pt-4 border-t border-[#eee] mb-5">
          <div className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase mb-3">
            Interview Focus
          </div>
          <div className="flex flex-wrap gap-1.5">
            {interviewFocus.map((topic, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 border border-[#eee] text-xs text-[#666]"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link
        data-testid="hire-candidate-view-btn"
        href={`/hire/${username}`}
        className="text-sm text-[#111] hover:text-[#666] transition-colors underline underline-offset-2"
      >
        View full hiring report →
      </Link>
    </article>
  );
}
