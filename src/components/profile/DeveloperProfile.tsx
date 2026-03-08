"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { RepoSelector } from './RepoSelector';
import { trpc } from '@/lib/trpc/client';
import { Mail } from 'lucide-react';
import { developerProfileSchema, type DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';
import { useRouter } from 'next/navigation';
import { LoadingPage, LoadingInline } from '@/components/common';
import { useProfileGeneration } from './hooks/useProfileGeneration';
import { ProfileEmptyState } from './ProfileEmptyState';
import { ProfileContent } from './ProfileContent';

interface SerializableInitialProfileData {
  profile: DeveloperProfileType | null;
  cached: boolean;
  stale: boolean;
  lastUpdated: string | null;
}

interface DeveloperProfileProps {
  username: string;
  initialData?: SerializableInitialProfileData;
}

function SparkleEffects({ chars = ['✨', '💖', '🌸', '🧚', '⭐', '🎀'] }: { chars?: string[] }) {
  const [sparkles, setSparkles] = useState<{ id: number; style: React.CSSProperties & Record<string, string | number>; char: string }[]>([]);
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let count = 0;

    const interval = setInterval(() => {
      // Skip creating sparkles when the tab is inactive
      if (document.hidden) return;

      const id = count++;
      const startX = Math.random() * 100;
      const startY = -10;
      const endX = startX + (Math.random() * 20 - 10);
      const duration = 3 + Math.random() * 4;
      const scale = 0.5 + Math.random() * 1;
      const char = chars[Math.floor(Math.random() * chars.length)];

      const style = {
        left: `${startX}%`,
        top: `${startY}%`,
        '--end-x': `${endX}%`,
        '--duration': `${duration}s`,
        '--scale': scale,
      };

      setSparkles(prev => [...prev.slice(-20), { id, style, char }]);
    }, 800);

    // Cleanup interval to prune finished sparkles (animations last max 7s)
    cleanupIntervalRef.current = setInterval(() => {
      setSparkles(prev => {
        if (prev.length <= 5) return prev;
        return prev.slice(-10);
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [chars]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <style jsx>{`
        @keyframes float-down {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(var(--scale));
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(var(--end-x) - var(--start-x)), 100vh) rotate(360deg) scale(var(--scale));
            opacity: 0;
          }
        }
      `}</style>
      {sparkles.map(s => (
        <div
          key={s.id}
          className="absolute text-2xl animate-float"
          style={{
            left: s.style.left,
            top: s.style.top,
            animation: `float-down ${s.style['--duration']} linear forwards`,
            ...s.style
          }}
        >
          {s.char}
        </div>
      ))}
    </div>
  );
}

export function DeveloperProfile({ username, initialData }: DeveloperProfileProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showRepoSelector, setShowRepoSelector] = useState(false);

  const {
    isGenerating,
    progress,
    logs,
    sseStatus,
    currentStep,
    generationError,
    handleGenerateProfile,
    handleGenerateWithSelectedRepos,
    handleReconnect,
  } = useProfileGeneration({ username });

  // Fetch profile styles
  const { data: profileStyles } = trpc.user.getProfileStyles.useQuery({ username }, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const router = useRouter();

  // Fetch all available versions
  const { data: versions, isLoading: versionsLoading } = trpc.profile.getProfileVersions.useQuery({ username });

  const queryInitialData = initialData ? {
    ...initialData,
    lastUpdated: initialData.lastUpdated
  } : undefined;

  // Use the new public endpoint for cached profile
  const { data: publicProfile, isLoading: publicLoading } = selectedVersion !== null
    ? trpc.profile.getProfileByVersion.useQuery({ username, version: selectedVersion }, { enabled: !!username && selectedVersion !== null })
    : trpc.profile.publicGetProfile.useQuery({ username }, {
        enabled: !!username,
        initialData: queryInitialData
      });

  // Check user plan and current user
  const { data: currentPlan, isLoading: planLoading } = trpc.user.getCurrentPlan.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const { data: currentUser } = trpc.me.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000,
  });

  // Check if viewing own profile
  const isOwnProfile = currentUser?.user
    ? (currentUser.user.githubUsername?.toLowerCase() === username.toLowerCase() ||
       currentUser.user.name?.toLowerCase() === username.toLowerCase())
    : false;

  // Fetch user repos if viewing own profile
  const { data: userRepos, isLoading: reposLoading } = trpc.profile.getUserRepositories.useQuery(
    { username },
    { enabled: isOwnProfile && !!currentUser }
  );

  const shouldShowChallengeButton = !!currentUser && !isOwnProfile;

  const { data: emailData, isLoading: emailLoading } = trpc.profile.getDeveloperEmail.useQuery(
    { username },
    {
      enabled: !!currentUser?.user,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000,
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

  const handleChallenge = useCallback(() => {
    router.push(`/arena?opponent=${username}`);
  }, [router, username]);

  // Version selector UI - rendered inline to avoid component identity issues
  const versionSelectorElement = versionsLoading
    ? <span>Loading...</span>
    : (!versions || versions.length === 0)
      ? null
      : (
        <select
          data-testid="profile-version-select"
          className="ml-2 border-b border-gray-300 bg-transparent py-0.5 text-sm focus:border-black focus:outline-none cursor-pointer"
          value={selectedVersion ?? versions[0].version}
          onChange={e => setSelectedVersion(Number(e.target.value))}
        >
          {versions.map(v => (
            <option key={v.version} value={v.version}>
              v{v.version} ({new Date(v.updatedAt).toLocaleDateString()})
            </option>
          ))}
        </select>
      );

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

  function getProfileData() {
    if (!publicProfile) return null;
    if ('profile' in publicProfile) return publicProfile.profile;
    if ('profileData' in publicProfile) return publicProfile.profileData;
    return null;
  }

  const calculateTotalScore = (profile: DeveloperProfileType) => {
    if (!profile.skillAssessment || profile.skillAssessment.length === 0) return 0;
    const total = profile.skillAssessment.reduce((acc, skill) => acc + skill.score, 0);
    return Math.round((total / profile.skillAssessment.length) * 10);
  };

  const renderContent = () => {
    if (planLoading || publicLoading) {
      return <LoadingPage text="Loading profile..." />;
    }

    const parsedProfile = developerProfileSchema.safeParse(getProfileData());
    if (parsedProfile.success) {
      const validProfile = parsedProfile.data;
      const totalScore = calculateTotalScore(validProfile);
      const isKnottedBrains = username.toLowerCase() === 'knottedbrains';

      const showSparkles = isKnottedBrains || !!profileStyles?.sparkles;
      const sparkleChars = profileStyles?.emoji ? [profileStyles.emoji] : undefined;

      const headerChildren = (
        <div className="mt-2 space-y-1">
          {currentUser?.user ? (
            emailLoading ? (
              <LoadingInline />
            ) : emailData?.email ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${emailData.email}`} className="hover:text-black transition-colors">{emailData.email}</a>
              </div>
            ) : null
          ) : null}

          {versionInfo && (
            <div className="text-sm text-gray-400 flex items-center gap-2 mt-2">
              <span>Analysis Version</span>
              {versionSelectorElement}
            </div>
          )}
        </div>
      );

      return (
        <ProfileContent
          username={username}
          profile={validProfile}
          totalScore={totalScore}
          isOwnProfile={isOwnProfile}
          isGenerating={isGenerating}
          reposLoading={reposLoading}
          showChallengeButton={shouldShowChallengeButton}
          canRefresh={isOwnProfile || !!(currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro'))}
          showUpgrade={!currentPlan || currentPlan.plan === 'free'}
          sseStatus={sseStatus}
          progress={progress}
          currentStep={currentStep}
          logs={logs}
          arenaRanking={arenaRanking}
          scoreHistory={scoreHistory}
          profileStyles={profileStyles}
          showSparkles={showSparkles}
          sparkleEffects={<SparkleEffects chars={sparkleChars} />}
          headerChildren={headerChildren}
          onChallenge={handleChallenge}
          onConfigure={() => setShowRepoSelector(true)}
          onRefresh={handleGenerateProfile}
        />
      );
    }

    const isLoading = publicLoading || planLoading;
    if (isLoading && !publicProfile) {
      return <LoadingPage text="Loading profile..." />;
    }

    return (
      <ProfileEmptyState
        username={username}
        isOwnProfile={isOwnProfile}
        isGenerating={isGenerating}
        reposLoading={reposLoading}
        canGenerate={isOwnProfile || !!(currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro'))}
        sseStatus={sseStatus}
        progress={progress}
        currentStep={currentStep}
        logs={logs}
        generationError={generationError}
        onConfigure={() => setShowRepoSelector(true)}
        onGenerate={handleGenerateProfile}
        onReconnect={handleReconnect}
      />
    );
  };

  return (
    <>
      {renderContent()}
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
