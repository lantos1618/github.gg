"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import { SkillAssessment } from './SkillAssessment';
import { DevelopmentStyle } from './DevelopmentStyle';
import { TopRepos } from './TopRepos';
import { TechStack } from './TechStack';
import { RepoSelector } from './RepoSelector';
import { trpc } from '@/lib/trpc/client';
import { RefreshCw, Sword, Mail, FolderGit2, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DeveloperProfile } from '@/lib/types/profile';
import { developerProfileSchema } from '@/lib/types/profile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { ScoreHistory } from '@/components/ScoreHistory';
import { toast } from 'sonner';

interface DeveloperProfileProps {
  username: string;
}

export function DeveloperProfile({ username }: DeveloperProfileProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [generateInput, setGenerateInput] = useState<{ username: string; includeCodeAnalysis?: boolean; selectedRepos?: string[] } | null>(null);

  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch all available versions
  const { data: versions, isLoading: versionsLoading } = trpc.profile.getProfileVersions.useQuery({ username });

  // Use the new public endpoint for cached profile
  const { data: publicProfile, isLoading: publicLoading } = selectedVersion !== null
    ? trpc.profile.getProfileByVersion.useQuery({ username, version: selectedVersion }, { enabled: !!username && selectedVersion !== null })
    : trpc.profile.publicGetProfile.useQuery({ username }, { enabled: !!username });

  // Generate profile subscription
  trpc.profile.generateProfileMutation.useSubscription(
    generateInput || { username, includeCodeAnalysis: false },
    {
      enabled: shouldGenerate && !!generateInput,
      onData: (event: any) => {
        if (event.type === 'progress') {
          setProgress(event.progress || 0);
          setProgressMessage(event.message || '');
          setIsGenerating(true);
        } else if (event.type === 'complete') {
          setIsGenerating(false);
          setShouldGenerate(false);
          setProgress(0);
          setProgressMessage('');
          // Invalidate queries to refresh the data
          utils.profile.publicGetProfile.invalidate({ username });
          utils.profile.getProfileVersions.invalidate({ username });
          toast.success('Profile refreshed successfully!');
        } else if (event.type === 'error') {
          setIsGenerating(false);
          setShouldGenerate(false);
          setProgress(0);
          setProgressMessage('');
          console.error('Profile generation error:', event.message);
          toast.error(event.message || 'Failed to generate profile');
        }
      },
    }
  );

  // Check user plan and current user
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const { data: currentUser } = trpc.me.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Check if viewing own profile
  const isOwnProfile = currentUser?.user?.githubUsername?.toLowerCase() === username.toLowerCase();

  // Fetch user repos if viewing own profile
  const { data: userRepos, isLoading: reposLoading, error: reposError } = trpc.profile.getUserRepositories.useQuery(
    { username },
    { enabled: isOwnProfile && !!currentUser }
  );

  // Debug logging
  console.log('🔍 Debug:', {
    isOwnProfile,
    username,
    githubUsername: currentUser?.user?.githubUsername,
    currentPlan: currentPlan?.plan,
    userRepos: userRepos?.length,
    reposLoading,
    reposError
  });

  // More robust check for showing challenge button (case-insensitive)
  const shouldShowChallengeButton = !!currentUser?.user?.githubUsername && currentUser.user.githubUsername.toLowerCase() !== username.toLowerCase();

  const { data: emailData, isLoading: emailLoading } = trpc.profile.getDeveloperEmail.useQuery(
    { username },
    {
      enabled: !!currentUser?.user,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch score history for this user
  const { data: scoreHistory } = trpc.scoreHistory.getUserScoreHistory.useQuery(
    { username },
    { enabled: !!username }
  );

  // Fetch arena ranking for this user
  const { data: arenaRanking } = trpc.arena.getRankingByUsername.useQuery(
    { username },
    { enabled: !!username }
  );

  // Handle profile generation
  const handleGenerateProfile = useCallback(() => {
    setProgress(0);
    setProgressMessage('');
    setGenerateInput({ username, includeCodeAnalysis: true });
    setShouldGenerate(true);
  }, [username]);

  // Handle profile generation with selected repos
  const handleGenerateWithSelectedRepos = useCallback((selectedRepoNames: string[]) => {
    setProgress(0);
    setProgressMessage('');
    setGenerateInput({ username, includeCodeAnalysis: true, selectedRepos: selectedRepoNames });
    setShouldGenerate(true);
  }, [username]);

  const handleChallenge = useCallback(() => {
    // Prevent self-challenge (case-insensitive)
    if (!currentUser?.user?.githubUsername || currentUser.user.githubUsername.toLowerCase() === username.toLowerCase()) {
      return;
    }
    router.push(`/arena?opponent=${username}`);
  }, [router, username, currentUser?.user?.githubUsername]);

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

  // Helper to extract the correct profile object regardless of query source
  function getProfileData() {
    if (!publicProfile) return null;
    // If from publicGetProfile (has .profile)
    if ('profile' in publicProfile) return publicProfile.profile;
    // If from getProfileByVersion (has .profileData)
    if ('profileData' in publicProfile) return publicProfile.profileData;
    return null;
  }

  // Render content based on state
  const renderContent = () => {
    // Loading state
    if (planLoading || publicLoading) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-16 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      );
    }

    // Valid profile state
    const parsedProfile = developerProfileSchema.safeParse(getProfileData());
    if (parsedProfile.success) {
      const validProfile = parsedProfile.data;
      return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://avatars.githubusercontent.com/${username}`} alt={username} />
                <AvatarFallback>{username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-3xl font-bold hover:underline"
                  >
                    {username}
                  </a>
                  {arenaRanking && (
                    <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      {arenaRanking.eloRating} ELO
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs">{arenaRanking.tier}</span>
                    </Badge>
                  )}
                </div>
                {currentUser?.user ? (
                  emailLoading ? (
                    <Skeleton className="h-5 w-48 mt-1" />
                  ) : emailData?.email ? (
                    <div className="flex items-center gap-2 text-muted-foreground mt-1 text-base">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${emailData.email}`} className="hover:underline">{emailData.email}</a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm italic">
                      Email not public
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm italic">
                    Sign in to view email
                  </div>
                )}
              </div>
            </div>
            {versionInfo && (
              <div className="mt-2 text-base font-medium flex items-center gap-2">
                <span>Version</span>
                <VersionSelector />
                <span>&middot;</span>
                <span>{versionInfo.isLatest ? 'Latest' : 'Historical'}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {shouldShowChallengeButton && (
              <Button
                onClick={handleChallenge}
                variant="outline"
                className="flex items-center gap-2 px-6 py-3 text-base font-medium"
                size="lg"
              >
                <Sword className="h-5 w-5" />
                Challenge
              </Button>
            )}
            {currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro') && (
              <>
                {isOwnProfile && (
                  <Button
                    onClick={() => {
                      console.log('🖱️ Select Repos button clicked');
                      setShowRepoSelector(true);
                      console.log('🎭 showRepoSelector set to true');
                    }}
                    disabled={isGenerating || shouldGenerate || reposLoading}
                    className="flex items-center gap-2 px-6 py-3 text-base font-medium"
                    size="lg"
                    variant="outline"
                  >
                    <FolderGit2 className="h-5 w-5" />
                    Select Repos & Generate
                  </Button>
                )}
                <Button
                  onClick={handleGenerateProfile}
                  disabled={isGenerating || shouldGenerate}
                  className="flex items-center gap-2 px-6 py-3 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  <RefreshCw className={`h-5 w-5 ${isGenerating || shouldGenerate ? 'animate-spin' : ''}`} />
                  {isGenerating || shouldGenerate ? 'Generating...' : (isOwnProfile ? 'Quick Refresh' : 'Refresh Profile')}
                </Button>
              </>
            )}
          </div>
        </div>
        {/* Progress Bar */}
        {progressMessage && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">{progressMessage}</span>
                  <span className="text-sm text-blue-700">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-blue-200 rounded">
                  <div
                    className="h-2 bg-blue-600 rounded transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
          {/* Suggestions for Improvement */}
          {Array.isArray(validProfile.suggestions) && validProfile.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suggestions for Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {validProfile.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-gray-700">{suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {/* Skills and Development Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkillAssessment skills={validProfile.skillAssessment} />
            <DevelopmentStyle traits={validProfile.developmentStyle} />
          </div>
          {/* Tech Stack */}
          <TechStack techStack={validProfile.techStack} />
          {/* Top Repositories */}
          <TopRepos repos={validProfile.topRepos} />
          {/* Score History Graph */}
          {scoreHistory && scoreHistory.length > 0 && (
            <ScoreHistory
              data={scoreHistory}
              title="ELO Rating History"
              scoreLabel="ELO Rating"
              color="#8b5cf6"
            />
          )}
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


    // Loading state (after mutation)
    const isLoading = publicLoading || planLoading;
    if (isLoading && !publicProfile) {
      return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      );
    }

    // No profile state
    return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">No Profile Available</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Generate an AI-powered developer profile to see insights about {username}&apos;s skills and repositories.
        </p>
        <div className="flex justify-center items-center gap-4">
          {shouldShowChallengeButton && (
            <Button
              onClick={handleChallenge}
              variant="outline"
              className="flex items-center gap-2"
              size="lg"
            >
              <Sword className="h-5 w-5" />
              Challenge
            </Button>
          )}
          {currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro') ? (
            <Button
              onClick={handleGenerateProfile}
              disabled={isGenerating || shouldGenerate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <RefreshCw className={`h-5 w-5 ${isGenerating || shouldGenerate ? 'animate-spin' : ''}`} />
              {isGenerating || shouldGenerate ? 'Generating...' : 'Generate Profile'}
            </Button>
          ) : null}
        </div>
        {(!currentPlan || currentPlan.plan === 'free') && (
          <div className="mt-8">
            <SubscriptionUpgrade />
          </div>
        )}
      </div>

    </div>
    );
  };

  return (
    <>
      {renderContent()}
      {/* Repo Selector Modal - Always rendered */}
      {isOwnProfile && (
        <RepoSelector
          open={showRepoSelector}
          onOpenChange={setShowRepoSelector}
          repos={userRepos || []}
          onConfirm={handleGenerateWithSelectedRepos}
          defaultSelected={[]}
        />
      )}
    </>
  );
} 