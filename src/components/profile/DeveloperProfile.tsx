"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import { TopRepos } from './TopRepos';
import { TechStack } from './TechStack';
import { RepoSelector } from './RepoSelector';
import { ProfileHeader } from './ProfileHeader';
import { ProfileActions } from './ProfileActions';
import { ProfileSidebar } from './ProfileSidebar';
import { trpc } from '@/lib/trpc/client';
import { RefreshCw, Mail, FolderGit2, AlertCircle } from 'lucide-react';
import { developerProfileSchema, type DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';
import { useRouter } from 'next/navigation';
import { LoadingPage, LoadingInline } from '@/components/common';
import { ReusableSSEFeedback, type SSEStatus, type SSELogItem } from '@/components/analysis/ReusableSSEFeedback';

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

// Add this component outside the main DeveloperProfile component
function SparkleEffects({ chars = ['✨', '💖', '🌸', '🧚', '⭐', '🎀'] }: { chars?: string[] }) {
  const [sparkles, setSparkles] = useState<{ id: number; style: React.CSSProperties & Record<string, string | number>; char: string }[]>([]);

  useEffect(() => {
    let count = 0;

    const interval = setInterval(() => {
      const id = count++;
      const startX = Math.random() * 100; // % from left
      const startY = -10; // Start above
      const endX = startX + (Math.random() * 20 - 10); // Drift left/right
      const duration = 3 + Math.random() * 4; // 3-7s
      const scale = 0.5 + Math.random() * 1; // 0.5x - 1.5x
      const char = chars[Math.floor(Math.random() * chars.length)];

      const style = {
        left: `${startX}%`,
        top: `${startY}%`,
        '--end-x': `${endX}%`,
        '--duration': `${duration}s`,
        '--scale': scale,
      };

      setSparkles(prev => [...prev.slice(-20), { id, style, char }]);
    }, 800); // Add new sparkle every 800ms

    return () => clearInterval(interval);
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

type GenerationEvent =
  | { type: 'progress'; progress: number; message: string }
  | { type: 'complete'; data: { profile: DeveloperProfileType; cached: boolean; stale: boolean; lastUpdated: string } }
  | { type: 'error'; message: string };



export function DeveloperProfile({ username, initialData }: DeveloperProfileProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<SSELogItem[]>([]);
  const [sseStatus, setSseStatus] = useState<SSEStatus>('idle');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasCompletedRef = useRef(false);
  
  // Fetch profile styles
  const { data: profileStyles } = trpc.user.getProfileStyles.useQuery({ username }, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch all available versions
  const { data: versions, isLoading: versionsLoading } = trpc.profile.getProfileVersions.useQuery({ username });

  // Check generation status when error occurs with "already in progress" message
  const { refetch: checkGenerationStatus } = trpc.profile.checkGenerationStatus.useQuery(
    { username },
    { enabled: false } // Only fetch manually
  );

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

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

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
    if (isGenerating) return;

    setProgress(0);
    setLogs([]);
    setGenerationError(null);
    setSseStatus('connecting');
    setCurrentStep('Initializing analysis...');
    hasCompletedRef.current = false;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const params = new URLSearchParams({
      username,
      includeCodeAnalysis: 'true',
    });

    const eventSource = new EventSource(
      `/api/profile/generate?${params.toString()}`,
    );
    eventSourceRef.current = eventSource;
    setIsGenerating(true);
    setSseStatus('processing');

    eventSource.addEventListener('progress', (rawEvent) => {
      try {
        const messageEvent = rawEvent as MessageEvent;
        const event = JSON.parse(
          messageEvent.data,
        ) as unknown as GenerationEvent;

        if (event.type === 'progress') {
          const newProgress = event.progress || 0;
          const newMessage = event.message || '';
          setProgress(newProgress);
          if (newMessage) {
            setCurrentStep(newMessage);
            setLogs((prev: SSELogItem[]) => {
              // Avoid duplicate consecutive messages
              if (prev.length > 0 && prev[prev.length - 1].message === newMessage) {
                return prev;
              }
              return [...prev, {
                message: newMessage,
                timestamp: new Date(),
                type: 'info' as const,
              }];
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse progress event:', error);
      }
    });

    eventSource.addEventListener('complete', (rawEvent) => {
      try {
        const messageEvent = rawEvent as MessageEvent;
        const event = JSON.parse(
          messageEvent.data,
        ) as unknown as GenerationEvent;

        if (event.type === 'complete') {
          setIsGenerating(false);
          setProgress(100);
          setSseStatus('complete');
          setCurrentStep('Profile generated successfully');
          setLogs((prev: SSELogItem[]) => [...prev, {
            message: 'Profile generated successfully',
            timestamp: new Date(),
            type: 'success' as const,
          }]);
          hasCompletedRef.current = true;
          eventSource.close();
          eventSourceRef.current = null;

          utils.profile.publicGetProfile.invalidate({ username });
          utils.profile.getProfileVersions.invalidate({ username });
        }
      } catch (error) {
        console.error('Failed to parse complete event:', error);
      }
    });

    const handleError = async (rawEvent: Event) => {
      console.error('Profile generation SSE error:', rawEvent);
      // If we've already processed a successful completion, treat this as a normal close
      if (hasCompletedRef.current) {
        return;
      }
      setIsGenerating(false);
      setSseStatus('error');

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Try to extract error message from SSE event data
      let errorMessage = 'Failed to generate profile';
      try {
        const messageEvent = rawEvent as MessageEvent;
        if (messageEvent.data) {
          const parsed = JSON.parse(messageEvent.data);
          if (parsed.message) {
            errorMessage = parsed.message;
          }
        }
      } catch {
        // Parsing failed, use default message
      }

      // If "already in progress" error, check for recent profile that might have completed
      if (errorMessage.includes('already in progress')) {
        try {
          const result = await checkGenerationStatus();
          const status = result.data;
          if (status?.hasRecentProfile && status.profile) {
            // Profile was generated, just load it
            setProgress(100);
            setSseStatus('complete');
            setCurrentStep('Profile generated successfully');
            setGenerationError(null);
            setLogs((prev: SSELogItem[]) => [...prev, {
              message: '✅ Profile generated successfully',
              timestamp: new Date(),
              type: 'success' as const,
            }]);
            utils.profile.publicGetProfile.invalidate({ username });
            utils.profile.getProfileVersions.invalidate({ username });
            return;
          }
        } catch (err) {
          console.error('Failed to check generation status:', err);
        }
      }

      // Provide a more helpful message for low-activity users
      if (errorMessage.includes('No original (non-forked) public repositories')) {
        errorMessage = "This user doesn't have enough original public repositories to generate a meaningful profile yet.";
      }

      setCurrentStep(errorMessage);
      setGenerationError(errorMessage);
      setLogs((prev: SSELogItem[]) => [...prev, {
        message: errorMessage,
        timestamp: new Date(),
        type: 'error' as const,
      }]);
    };

    eventSource.addEventListener('error', handleError);
  }, [username, utils, isGenerating, checkGenerationStatus]);

  // Reconnect handler - checks for recent profile or allows retry
  const handleReconnect = useCallback(async () => {
    try {
      const result = await checkGenerationStatus();
      const status = result.data;
      if (status?.hasRecentProfile && status.profile) {
        // Profile exists, just refresh
        setProgress(100);
        setSseStatus('complete');
        setCurrentStep('Profile loaded');
        setGenerationError(null);
        setLogs((prev: SSELogItem[]) => [...prev, {
          message: '✅ Profile loaded successfully',
          timestamp: new Date(),
          type: 'success' as const,
        }]);
        utils.profile.publicGetProfile.invalidate({ username });
        utils.profile.getProfileVersions.invalidate({ username });
      } else if (status?.lockExists) {
        // Lock exists but no profile - generation might still be running
        setGenerationError('Generation is still in progress. Please wait a moment and try again.');
      } else {
        // No lock, can start new generation
        handleGenerateProfile();
      }
    } catch (err) {
      console.error('Failed to reconnect:', err);
      setGenerationError('Failed to check generation status. Please try again.');
    }
  }, [username, utils, checkGenerationStatus, handleGenerateProfile]);

  // Handle profile generation with selected repos
  const handleGenerateWithSelectedRepos = useCallback((selectedRepoNames: string[], forceRefreshScorecards: boolean = false) => {
    if (isGenerating) return;

    setProgress(0);
    setLogs([]);
    setGenerationError(null);
    setSseStatus('connecting');
    setCurrentStep('Initializing analysis with selected repos...');
    hasCompletedRef.current = false;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const params = new URLSearchParams({
      username,
      includeCodeAnalysis: 'true',
    });

    if (forceRefreshScorecards) {
      params.set('forceRefreshScorecards', 'true');
    }

    selectedRepoNames.forEach((name) => {
      params.append('selectedRepo', name);
    });

    const eventSource = new EventSource(
      `/api/profile/generate?${params.toString()}`,
    );
    eventSourceRef.current = eventSource;
    setIsGenerating(true);
    setSseStatus('processing');

    eventSource.addEventListener('progress', (rawEvent) => {
      try {
        const messageEvent = rawEvent as MessageEvent;
        const event = JSON.parse(
          messageEvent.data,
        ) as unknown as GenerationEvent;

        if (event.type === 'progress') {
          const newProgress = event.progress || 0;
          const newMessage = event.message || '';
          setProgress(newProgress);
          if (newMessage) {
            setCurrentStep(newMessage);
            setLogs((prev: SSELogItem[]) => {
              // Avoid duplicate consecutive messages
              if (prev.length > 0 && prev[prev.length - 1].message === newMessage) {
                return prev;
              }
              return [...prev, {
                message: newMessage,
                timestamp: new Date(),
                type: 'info' as const,
              }];
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse progress event:', error);
      }
    });

    eventSource.addEventListener('complete', (rawEvent) => {
      try {
        const messageEvent = rawEvent as MessageEvent;
        const event = JSON.parse(
          messageEvent.data,
        ) as unknown as GenerationEvent;

        if (event.type === 'complete') {
          setIsGenerating(false);
          setProgress(100);
          setSseStatus('complete');
          setCurrentStep('Profile generated successfully');
          setLogs((prev: SSELogItem[]) => [...prev, {
            message: 'Profile generated successfully',
            timestamp: new Date(),
            type: 'success' as const,
          }]);
          hasCompletedRef.current = true;
          eventSource.close();
          eventSourceRef.current = null;

          utils.profile.publicGetProfile.invalidate({ username });
          utils.profile.getProfileVersions.invalidate({ username });
        }
      } catch (error) {
        console.error('Failed to parse complete event:', error);
      }
    });

    const handleError = (rawEvent: Event) => {
      console.error('Profile generation SSE error (selected repos):', rawEvent);
      // If we've already processed a successful completion, treat this as a normal close
      if (hasCompletedRef.current) {
        return;
      }
      setIsGenerating(false);
      setSseStatus('error');

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Try to extract error message from SSE event data
      let errorMessage = 'Failed to generate profile';
      try {
        const messageEvent = rawEvent as MessageEvent;
        if (messageEvent.data) {
          const parsed = JSON.parse(messageEvent.data);
          if (parsed.message) {
            errorMessage = parsed.message;
          }
        }
      } catch {
        // Parsing failed, use default message
      }

      if (errorMessage.includes('No original (non-forked) public repositories')) {
        errorMessage = "This user doesn't have enough original public repositories to generate a meaningful profile yet.";
      }

      setCurrentStep(errorMessage);
      setGenerationError(errorMessage);
      setLogs((prev: SSELogItem[]) => [...prev, {
        message: errorMessage,
        timestamp: new Date(),
        type: 'error' as const,
      }]);
    };

    eventSource.addEventListener('error', handleError);
  }, [username, utils, isGenerating]);

  const handleChallenge = useCallback(() => {
    router.push(`/arena?opponent=${username}`);
  }, [router, username]);

  // Version selector UI
  const VersionSelector = () => {
    if (versionsLoading) return <span>Loading...</span>;
    if (!versions || versions.length === 0) return null;
    return (
      <select
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
      // "Cracked" threshold lowered to 80 based on user feedback (90 was too exclusive)
      const isCracked = totalScore >= 80 || isKnottedBrains;
      
      // Use custom styles or defaults (keeping knottedbrains hardcoded overrides for now as well)
      const showSparkles = isKnottedBrains || profileStyles?.sparkles;
      const sparkleChars = profileStyles?.emoji ? [profileStyles.emoji] : undefined;

      return (
      <div 
        className="max-w-[1200px] mx-auto px-4 py-16 space-y-16 relative"
        style={{
          backgroundColor: profileStyles?.backgroundColor || undefined,
          color: profileStyles?.textColor || undefined,
        }}
      >
        {showSparkles && <SparkleEffects chars={sparkleChars} />}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 border-b border-gray-100 pb-12 relative z-10">
          <ProfileHeader
            username={username}
            profile={validProfile}
            totalScore={totalScore}
            arenaRanking={arenaRanking}
            profileStyles={profileStyles}
          >
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
                  <VersionSelector />
                </div>
              )}
            </div>
          </ProfileHeader>

          <ProfileActions
            isOwnProfile={isOwnProfile}
            isGenerating={isGenerating}
            reposLoading={reposLoading}
            showChallengeButton={shouldShowChallengeButton}
            canRefresh={isOwnProfile || !!(currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro'))}
            onChallenge={handleChallenge}
            onConfigure={() => setShowRepoSelector(true)}
            onRefresh={handleGenerateProfile}
          />
        </div>

        {/* Progress Bar - Terminal-style logger for real-time generation feedback */}
        <ReusableSSEFeedback
          status={sseStatus}
          progress={progress}
          currentStep={currentStep}
          logs={logs}
          title="Profile Generation"
          className="w-full"
        />

        {/* Profile Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="xl:col-span-8 space-y-16">
             <section>
               <h3 className="text-2xl font-bold text-black mb-6">Executive Summary</h3>
               <p className="text-lg text-gray-600 leading-relaxed font-light">{validProfile.summary}</p>
               {validProfile.scoreInterpretation && (
                 <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                   <p className="text-sm text-blue-800 leading-relaxed">
                     <span className="font-medium">Score Context:</span> {validProfile.scoreInterpretation}
                   </p>
                 </div>
               )}
             </section>

             <section>
                <h3 className="text-2xl font-bold text-black mb-6">Technical Arsenal</h3>
                <TechStack techStack={validProfile.techStack} />
             </section>

             <section>
                <h3 className="text-2xl font-bold text-black mb-6">Key Repositories</h3>
                <TopRepos repos={validProfile.topRepos} />
             </section>
          </div>

          <ProfileSidebar profile={validProfile} scoreHistory={scoreHistory} />
        </div>

        {(!currentPlan || currentPlan.plan === 'free') && (
          <div className="mt-12 pt-12 border-t border-gray-100">
            <SubscriptionUpgrade />
          </div>
        )}
      </div>
      );
    }


    const isLoading = publicLoading || planLoading;
    if (isLoading && !publicProfile) {
      return <LoadingPage text="Loading profile..." />;
    }

    return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-3xl font-bold text-black mb-4">No Profile Available</h2>
      <p className="text-xl text-gray-500 font-light mb-10 max-w-lg">
        Generate an AI-powered analysis to uncover insights about {username}.
      </p>
      <div className="flex justify-center items-center gap-4">
        {isOwnProfile && (
          <Button
            onClick={() => setShowRepoSelector(true)}
            disabled={isGenerating || reposLoading}
            variant="outline"
            className="h-14 px-8 border-gray-200 hover:border-black transition-colors text-lg rounded-xl"
          >
            <FolderGit2 className="h-5 w-5 mr-2" />
            Configure
          </Button>
        )}
        {(isOwnProfile || (currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro'))) ? (
          <Button
            onClick={handleGenerateProfile}
            disabled={isGenerating}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analyzing...' : 'Generate Analysis'}
          </Button>
        ) : (
             <SubscriptionUpgrade />
        )}
      </div>
      
      {/* Progress Bar for Empty State */}
      <div className="w-full max-w-xl mt-8">
        <ReusableSSEFeedback
          status={sseStatus}
          progress={progress}
          currentStep={currentStep}
          logs={logs}
          title="Profile Generation"
        />
      </div>

      {/* Error Display */}
      {generationError && !isGenerating && (
        <div className="w-full max-w-xl mt-8 bg-red-50 border border-red-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Generate Profile</h3>
              <p className="text-red-700 text-sm leading-relaxed">{generationError}</p>
              {generationError.includes('already in progress') ? (
                <div className="mt-4">
                  <Button
                    onClick={handleReconnect}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconnect
                  </Button>
                </div>
              ) : (
                <p className="text-red-600 text-xs mt-3">
                  This user may not have enough public activity on GitHub to generate a meaningful profile analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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
