"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingWave } from '@/components/LoadingWave';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import { SkillAssessment } from './SkillAssessment';
import { DevelopmentStyle } from './DevelopmentStyle';
import { TopRepos } from './TopRepos';
import { TechStack } from './TechStack';
import { trpc } from '@/lib/trpc/client';
import { RefreshCw } from 'lucide-react';
import type { DeveloperProfile } from '@/lib/types/profile';
import { developerProfileSchema } from '@/lib/types/profile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface DeveloperProfileProps {
  username: string;
}

export function DeveloperProfile({ username }: DeveloperProfileProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  const utils = trpc.useUtils();
  
  // Fetch all available versions
  const { data: versions, isLoading: versionsLoading } = trpc.profile.getProfileVersions.useQuery({ username });

  // Use the new public endpoint for cached profile
  const { data: publicProfile, isLoading: publicLoading } = selectedVersion
    ? trpc.profile.getProfileByVersion.useQuery({ username, version: selectedVersion }, { enabled: !!username && !!selectedVersion })
    : trpc.profile.publicGetProfile.useQuery({ username }, { enabled: !!username });

  // Generate profile mutation
  const generateProfileMutation = trpc.profile.generateProfileMutation.useMutation({
    onSuccess: () => {
      setIsGenerating(false);
      // Invalidate queries to refresh the data
      utils.profile.publicGetProfile.invalidate({ username });
      utils.profile.getProfileVersions.invalidate({ username });
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  // Check user plan
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery();

  // Handle profile generation
  const handleGenerateProfile = useCallback(() => {
    setIsGenerating(true);
    generateProfileMutation.mutate({ username });
  }, [generateProfileMutation, username]);

  // Version selector UI
  const VersionSelector = () => {
    if (versionsLoading) return <span>Loading...</span>;
    if (!versions || versions.length === 0) return null;
    return (
      <select
        className="ml-2 border rounded px-1 py-0.5 text-sm"
        value={selectedVersion ?? versions[0].version}
        onChange={e => setSelectedVersion(Number(e.target.value))}
      >
        {versions.map(v => (
          <option key={v.version} value={v.version}>
            Version {v.version} ({new Date(v.updatedAt).toLocaleString()})
          </option>
        ))}
      </select>
    );
  };

  // Helper to get version info
  const getVersionInfo = () => {
    if (!versions || versions.length === 0) return null;
    const current = selectedVersion
      ? versions.find(v => v.version === selectedVersion)
      : versions[0];
    if (!current) return null;
    const isLatest = !selectedVersion || selectedVersion === versions[0].version;
    return {
      version: current.version,
      updatedAt: current.updatedAt,
      isLatest,
    };
  };

  const versionInfo = getVersionInfo();

  // Regenerate button
  const RegenerateButton = (disabled: boolean) => (
    <Button
      onClick={handleGenerateProfile}
      disabled={disabled}
      className="flex items-center gap-2 px-6 py-3 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
      size="lg"
    >
      <RefreshCw className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
      {isGenerating ? 'Generating...' : 'Refresh Profile'}
    </Button>
  );

  // Helper to extract the correct profile object regardless of query source
  function getProfileData() {
    if (!publicProfile) return null;
    // If from publicGetProfile (has .profile)
    if ('profile' in publicProfile) return publicProfile.profile;
    // If from getProfileByVersion (has .profileData)
    if ('profileData' in publicProfile) return publicProfile.profileData;
    return null;
  }

  // Loading state
  if (planLoading || publicLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingWave />
      </div>
    );
  }

  // Valid profile state
  const parsedProfile = developerProfileSchema.safeParse(getProfileData());
  if (parsedProfile.success) {
    const validProfile = parsedProfile.data;
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatars.githubusercontent.com/${username}`} alt={username} />
                <AvatarFallback>{username && typeof username === 'string' ? username[0]?.toUpperCase() ?? null : null}</AvatarFallback>
              </Avatar>
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl font-bold hover:underline"
              >
                {username}&apos;s Developer Profile
              </a>
            </div>
            {versionInfo && (
              <div className="mt-1 text-base font-medium flex items-center gap-2">
                <span>Version</span>
                <VersionSelector />
                <span>&middot;</span>
                <span>{versionInfo.isLatest ? 'Latest' : 'Historical'}</span>
              </div>
            )}
          </div>
          {/* Only show regenerate if user is allowed */}
          {currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro')
            ? RegenerateButton(isGenerating || generateProfileMutation.isPending)
            : null}
        </div>
        {/* Profile Content */}
        <div className="space-y-8">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{validProfile.summary}</p>
            </CardContent>
          </Card>
          {/* Skills and Development Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkillAssessment skills={validProfile.skillAssessment} />
            <DevelopmentStyle traits={validProfile.developmentStyle} />
          </div>
          {/* Tech Stack */}
          <TechStack techStack={validProfile.techStack} />
          {/* Top Repositories */}
          <TopRepos repos={validProfile.topRepos} />
        </div>
        {/* If user is not allowed to regenerate, show upgrade prompt below profile */}
        {(!currentPlan || currentPlan.plan === 'free') && (
          <div className="mt-8">
            <SubscriptionUpgrade />
          </div>
        )}
      </div>
    );
  }

  // Error state
  const error = typeof generateProfileMutation.error?.message === 'string' ? generateProfileMutation.error.message : null;
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <ErrorDisplay
          error={error ?? null}
          isPending={generateProfileMutation.isPending}
          onRetry={handleGenerateProfile}
        />
      </div>
    );
  }

  // Loading state (after mutation)
  const isLoading = publicLoading || planLoading;
  if (isLoading && !publicProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingWave />
        <p className="mt-4 text-gray-600">Loading developer profile...</p>
      </div>
    );
  }

  // No profile state
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          No Profile Available
        </h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Generate an AI-powered developer profile to see insights about {username}&apos;s skills and repositories.
        </p>
        <div className="flex justify-center">
          {RegenerateButton(isGenerating || generateProfileMutation.isPending)}
        </div>
      </div>
    </div>
  );
} 