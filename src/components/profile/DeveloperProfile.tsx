"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import { SkillAssessment } from './SkillAssessment';
import { DevelopmentStyle } from './DevelopmentStyle';
import { TopRepos } from './TopRepos';
import { TechStack } from './TechStack';
import { RepoSelector } from './RepoSelector';
import { trpc } from '@/lib/trpc/client';
import { RefreshCw, Sword, Mail, FolderGit2, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { developerProfileSchema } from '@/lib/types/profile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { ScoreHistory } from '@/components/ScoreHistory';
import { toast } from 'sonner';
import { LoadingPage, LoadingInline } from '@/components/common';

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
  const isOwnProfile = currentUser?.user?.githubUsername
    ? currentUser.user.githubUsername.toLowerCase() === username.toLowerCase()
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
    router.push(`/arena?opponent=${username}`);
  }, [router, username]);

  // Version selector UI
  const VersionSelector = () => {
    if (versionsLoading) return <span>Loading...</span>;
    if (!versions || versions.length === 0) return null;
    return (
      <select
        className="ml-2 border-b border-gray-300 bg-transparent py-0.5 text-sm focus:border-black focus:outline-none"
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

  const renderContent = () => {
    if (planLoading || publicLoading) {
      return <LoadingPage text="Loading profile..." />;
    }

    const parsedProfile = developerProfileSchema.safeParse(getProfileData());
    if (parsedProfile.success) {
      const validProfile = parsedProfile.data;
      return (
      <div className="max-w-[1200px] mx-auto px-4 py-16 space-y-16">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 border-b border-gray-100 pb-12">
          <div className="flex gap-8">
            <Avatar className="h-24 w-24 border border-gray-200 shadow-sm">
              <AvatarImage src={`https://avatars.githubusercontent.com/${username}`} alt={username} />
              <AvatarFallback className="text-2xl bg-gray-50 text-gray-500">{username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-baseline gap-4 flex-wrap">
                <a
                  href={`https://github.com/${username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-4xl font-bold tracking-tight text-black hover:text-blue-600 transition-colors"
                >
                  {username}
                </a>
                {arenaRanking && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
                    <Trophy className="h-3.5 w-3.5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-900">{arenaRanking.eloRating} ELO</span>
                  </div>
                )}
              </div>
              
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
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {shouldShowChallengeButton && (
              <Button
                onClick={handleChallenge}
                variant="outline"
                className="h-12 px-6 border-gray-200 hover:border-black transition-colors"
              >
                <Sword className="h-4 w-4 mr-2" />
                Challenge
              </Button>
            )}
            {currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro') && (
              <>
                {isOwnProfile && (
                  <Button
                    onClick={() => setShowRepoSelector(true)}
                    disabled={isGenerating || shouldGenerate || reposLoading}
                    variant="outline"
                    className="h-12 px-6 border-gray-200 hover:border-black transition-colors"
                  >
                    <FolderGit2 className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                )}
                <Button
                  onClick={handleGenerateProfile}
                  disabled={isGenerating || shouldGenerate}
                  className="h-12 px-6 bg-black hover:bg-gray-800 text-white shadow-none rounded-lg"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating || shouldGenerate ? 'animate-spin' : ''}`} />
                  {isGenerating || shouldGenerate ? 'Analyzing...' : 'Refresh Analysis'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {progressMessage && (
          <div className="w-full bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">{progressMessage}</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Profile Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="xl:col-span-8 space-y-16">
             <section>
               <h3 className="text-2xl font-bold text-black mb-6">Executive Summary</h3>
               <p className="text-lg text-gray-600 leading-relaxed font-light">{validProfile.summary}</p>
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

          {/* Sidebar */}
          <div className="xl:col-span-4 space-y-12">
             {scoreHistory && scoreHistory.length > 0 && (
               <section>
                 <h3 className="text-lg font-bold text-black mb-4">ELO Trajectory</h3>
                 <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <ScoreHistory
                      data={scoreHistory}
                      title=""
                      scoreLabel="ELO"
                      color="#000000"
                    />
                 </div>
               </section>
             )}

             <section>
               <h3 className="text-lg font-bold text-black mb-4">Developer Persona</h3>
               <DevelopmentStyle traits={validProfile.developmentStyle} />
             </section>

             <section>
                <h3 className="text-lg font-bold text-black mb-4">Skill Assessment</h3>
                <SkillAssessment skills={validProfile.skillAssessment} />
             </section>

             {Array.isArray(validProfile.suggestions) && validProfile.suggestions.length > 0 && (
               <section>
                 <h3 className="text-lg font-bold text-black mb-4">Growth Areas</h3>
                 <ul className="space-y-3">
                   {validProfile.suggestions.map((suggestion, idx) => (
                     <li key={idx} className="text-gray-600 text-sm leading-relaxed flex gap-2">
                       <span className="text-black font-bold">•</span>
                       {suggestion}
                     </li>
                   ))}
                 </ul>
               </section>
             )}
          </div>
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
        {currentPlan && (currentPlan.plan === 'byok' || currentPlan.plan === 'pro') ? (
          <Button
            onClick={handleGenerateProfile}
            disabled={isGenerating || shouldGenerate}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isGenerating || shouldGenerate ? 'animate-spin' : ''}`} />
            {isGenerating || shouldGenerate ? 'Analyzing...' : 'Generate Analysis'}
          </Button>
        ) : (
             <SubscriptionUpgrade />
        )}
      </div>
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
