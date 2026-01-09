'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { SkillAssessment } from '@/components/profile/SkillAssessment';
import { TopRepos } from '@/components/profile/TopRepos';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  MessageSquare,
  Shield,
  User,
  GitBranch,
} from 'lucide-react';

type HiringReportClientProps = {
  username: string;
};

function getRiskLevel(confidence: number | undefined, aiPercentage?: number): {
  level: 'low' | 'medium' | 'high';
  color: string;
  bgColor: string;
  label: string;
} {
  // If no data, medium risk by default
  if (confidence === undefined) {
    return { level: 'medium', color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Unknown' };
  }

  // High AI percentage is a red flag
  if (aiPercentage && aiPercentage > 60) {
    return { level: 'high', color: 'text-red-600', bgColor: 'bg-red-50', label: 'High Risk' };
  }

  // Low confidence is a red flag
  if (confidence < 40) {
    return { level: 'high', color: 'text-red-600', bgColor: 'bg-red-50', label: 'High Risk' };
  }

  if (confidence < 70 || (aiPercentage && aiPercentage > 40)) {
    return { level: 'medium', color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Medium Risk' };
  }

  return { level: 'low', color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'Low Risk' };
}

function generateInterviewQuestions(profile: {
  skillAssessment?: Array<{ metric: string; score: number; reason: string }>;
  developmentStyle?: Array<{ metric: string; score: number; reason: string }>;
  topRepos?: Array<{ name: string; description: string }>;
  profileConfidence?: number;
  confidenceReason?: string;
}): string[] {
  const questions: string[] = [];

  // Questions based on low-scoring skills
  const weakSkills = profile.skillAssessment?.filter(s => s.score < 6) || [];
  weakSkills.slice(0, 2).forEach(skill => {
    questions.push(`Their ${skill.metric} scored ${skill.score}/10. Ask them to explain a challenging ${skill.metric} problem they solved recently.`);
  });

  // Questions based on development style concerns
  const styleIssues = profile.developmentStyle?.filter(s => s.score < 5) || [];
  styleIssues.slice(0, 1).forEach(style => {
    questions.push(`${style.metric} scored low (${style.score}/10). Ask about their typical development workflow and ${style.metric.toLowerCase()} practices.`);
  });

  // Questions based on confidence issues
  if (profile.profileConfidence && profile.profileConfidence < 60) {
    questions.push(`Profile confidence is ${profile.profileConfidence}%. Ask them to walk you through their most significant project that may not be on GitHub.`);
  }

  // Questions about top repos
  if (profile.topRepos && profile.topRepos.length > 0) {
    const topRepo = profile.topRepos[0];
    questions.push(`Ask them to explain the architecture decisions in ${topRepo.name} and what they would do differently today.`);
  }

  // Generic fallback questions
  if (questions.length < 3) {
    questions.push(`Ask them to live code a small feature or debug a problem in their primary language.`);
    questions.push(`Ask them to explain how they approach learning new technologies and staying current.`);
  }

  return questions.slice(0, 5);
}

export function HiringReportClient({ username }: HiringReportClientProps) {
  const { data, isLoading, error } = trpc.profile.publicGetProfile.useQuery({ username });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Loading profile for {username}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error loading profile</h1>
          <p className="text-gray-500 mb-4">{error.message}</p>
          <Link href="/hire">
            <Button variant="outline">
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
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">No profile found</h1>
          <p className="text-gray-500 mb-4">
            We haven't analyzed this user yet. The profile needs to be generated first.
          </p>
          <div className="flex flex-col gap-2">
            <Link href={`/${username}`}>
              <Button className="w-full">
                Generate profile on github.gg/{username}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/hire">
              <Button variant="outline" className="w-full">
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
  const risk = getRiskLevel(profile.profileConfidence);
  const interviewQuestions = generateInterviewQuestions(profile);

  // Calculate red flags and green flags
  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  if (profile.profileConfidence !== undefined) {
    if (profile.profileConfidence < 50) {
      redFlags.push(`Low profile confidence (${profile.profileConfidence}%) - ${profile.confidenceReason || 'Limited visible work'}`);
    } else if (profile.profileConfidence >= 80) {
      greenFlags.push(`High profile confidence (${profile.profileConfidence}%) - Strong GitHub presence`);
    }
  }

  // Check for weak skills
  const weakSkills = profile.skillAssessment?.filter(s => s.score < 5) || [];
  weakSkills.forEach(skill => {
    redFlags.push(`Weak ${skill.metric} (${skill.score}/10)`);
  });

  // Check for strong skills
  const strongSkills = profile.skillAssessment?.filter(s => s.score >= 8) || [];
  strongSkills.slice(0, 3).forEach(skill => {
    greenFlags.push(`Strong ${skill.metric} (${skill.score}/10)`);
  });

  // Check archetype
  if (profile.developerArchetype === 'Early Career Explorer') {
    redFlags.push('Early career developer - may need mentorship');
  } else if (profile.developerArchetype === 'Production Builder') {
    greenFlags.push('Production-focused developer - ships complete work');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/hire" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              View on GitHub
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">@{username}</h1>
              <p className="text-gray-500">{profile.developerArchetype || 'Developer'}</p>
            </div>
            <div className={`px-3 py-1.5 rounded ${risk.bgColor}`}>
              <span className={`font-medium ${risk.color}`}>{risk.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Summary */}
        <div className="bg-white border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Summary</h2>
          <p className="text-gray-700">{profile.summary}</p>
          {profile.scoreInterpretation && (
            <p className="text-sm text-gray-500 mt-3 italic">{profile.scoreInterpretation}</p>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Profile Confidence */}
          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Profile Confidence</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">
                {profile.profileConfidence ?? 'N/A'}
              </span>
              {profile.profileConfidence !== undefined && (
                <span className="text-gray-500">/ 100</span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {profile.confidenceReason || 'How well this GitHub represents their true skills'}
            </p>
          </div>

          {/* Developer Type */}
          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Developer Type</h3>
            </div>
            <div className="text-xl font-semibold text-gray-900 mb-2">
              {profile.developerArchetype || 'Unknown'}
            </div>
            <p className="text-sm text-gray-500">
              {profile.developerArchetype === 'Research & Innovation' && 'Prioritizes exploration over polish'}
              {profile.developerArchetype === 'Production Builder' && 'Ships complete, tested projects'}
              {profile.developerArchetype === 'Open Source Contributor' && 'Focus on contributing to others projects'}
              {profile.developerArchetype === 'Full-Stack Generalist' && 'Covers many areas and technologies'}
              {profile.developerArchetype === 'Domain Specialist' && 'Deep expertise in specific area'}
              {profile.developerArchetype === 'Early Career Explorer' && 'Building portfolio, learning'}
            </p>
          </div>
        </div>

        {/* Flags */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Red Flags */}
          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-gray-900">Red Flags</h3>
            </div>
            {redFlags.length > 0 ? (
              <ul className="space-y-2">
                {redFlags.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No significant red flags detected</p>
            )}
          </div>

          {/* Green Flags */}
          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <h3 className="font-medium text-gray-900">Green Flags</h3>
            </div>
            {greenFlags.length > 0 ? (
              <ul className="space-y-2">
                {greenFlags.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Generate a full profile for detailed signals</p>
            )}
          </div>
        </div>

        {/* Skills Assessment */}
        {profile.skillAssessment && profile.skillAssessment.length > 0 && (
          <div className="bg-white border border-gray-200 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Skills Assessment</h3>
            </div>
            <SkillAssessment skills={profile.skillAssessment} compact />
          </div>
        )}

        {/* Interview Questions */}
        <div className="bg-white border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Suggested Interview Questions</h3>
          </div>
          <ul className="space-y-3">
            {interviewQuestions.map((question, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-700">{question}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Repositories */}
        {profile.topRepos && profile.topRepos.length > 0 && (
          <div className="bg-white border border-gray-200 p-5 mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Notable Repositories</h3>
            <TopRepos repos={profile.topRepos} compact username={username} />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/${username}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View full profile on GG
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex-1"
          >
            Print / Save as PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
