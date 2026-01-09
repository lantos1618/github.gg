'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, DollarSign, Target, MessageSquare } from 'lucide-react';

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

function getFitColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function getFitLabel(score: number): string {
  if (score >= 80) return 'Strong Match';
  if (score >= 60) return 'Moderate Match';
  return 'Weak Match';
}

export function CandidateMatchCard({
  username,
  summary,
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
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <Link
                href={`/hire/${username}`}
                className="text-lg font-semibold hover:text-blue-600 transition-colors truncate"
              >
                {username}
              </Link>
              <div className={`px-2 py-1 rounded-md text-sm font-medium border ${getFitColor(fitScore)}`}>
                {fitScore}% Fit
              </div>
            </div>
            {archetype && (
              <div className="text-sm text-muted-foreground mt-1">{archetype}</div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>
                {formatSalary(salaryRange.min)} - {formatSalary(salaryRange.max)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {confidence}% profile confidence
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Fit reason */}
        <p className="text-sm text-gray-600">{fitReason}</p>

        {/* Top skills */}
        {topSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topSkills.map((skill) => (
              <Badge key={skill.name} variant="secondary" className="text-xs">
                {skill.name}
                <span className="ml-1 text-muted-foreground">{skill.score}/10</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Strengths and gaps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Key Strengths
            </div>
            <ul className="space-y-1">
              {keyStrengths.slice(0, 3).map((strength, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-green-500 mt-1">+</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps */}
          {potentialGaps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-2">
                <AlertCircle className="h-4 w-4" />
                Areas to Explore
              </div>
              <ul className="space-y-1">
                {potentialGaps.slice(0, 3).map((gap, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">-</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Interview focus */}
        {interviewFocus.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
              <MessageSquare className="h-4 w-4" />
              Interview Focus
            </div>
            <div className="flex flex-wrap gap-2">
              {interviewFocus.map((topic, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* View full report link */}
        <div className="pt-2">
          <Link
            href={`/hire/${username}`}
            className="text-sm text-blue-600 hover:underline"
          >
            View Full Hiring Report →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
