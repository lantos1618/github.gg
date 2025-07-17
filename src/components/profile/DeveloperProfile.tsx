"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingWave } from '@/components/LoadingWave';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { SubscriptionUpgrade } from '@/components/SubscriptionUpgrade';
import { SkillAssessment } from './SkillAssessment';
import { DevelopmentStyle } from './DevelopmentStyle';
import { TopRepos } from './TopRepos';
import { TechStack } from './TechStack';
import { trpc } from '@/lib/trpc/client';
import { RefreshCw, User, Calendar } from 'lucide-react';
import type { DeveloperProfile as DeveloperProfileType } from '@/lib/types/profile';

interface DeveloperProfileProps {
  username: string;
}

export function DeveloperProfile({ username }: DeveloperProfileProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get cached profile
  const { 
    data: cachedProfile, 
    isLoading: isLoadingCached,
    refetch: refetchCached 
  } = trpc.profile.generateProfile.useQuery({ username });

  // Generate profile mutation
  const generateProfileMutation = trpc.profile.generateProfileMutation.useMutation({
    onSuccess: () => {
      setIsGenerating(false);
      refetchCached(); // Refresh the cached data
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

  // Auto-generate if stale
  useEffect(() => {
    if (cachedProfile?.stale && !isGenerating && !generateProfileMutation.isPending) {
      handleGenerateProfile();
    }
  }, [cachedProfile?.stale, isGenerating, generateProfileMutation.isPending, handleGenerateProfile]);

  const profile = cachedProfile?.profile as DeveloperProfileType | null;
  const isLoading = isLoadingCached || planLoading;
  const error = generateProfileMutation.error?.message;

  // If plan is loading, show loading
  if (planLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingWave />
      </div>
    );
  }

  // If user does not have a paid plan, show upgrade
  if (!currentPlan || currentPlan.plan === 'free') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <SubscriptionUpgrade />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
                      <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="h-8 w-8" />
              {username}&apos;s Developer Profile
            </h1>
          {cachedProfile?.lastUpdated && (
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Last updated: {new Date(cachedProfile.lastUpdated).toLocaleDateString()}
              </span>
              {cachedProfile.cached && (
                <Badge variant="outline" className="text-xs">Cached</Badge>
              )}
              {cachedProfile.stale && (
                <Badge variant="destructive" className="text-xs">Stale</Badge>
              )}
            </div>
          )}
          {cachedProfile?.stale && (
            <p className="text-sm text-amber-600 mt-1">
              Profile data is over 7 days old. Consider refreshing for the latest insights.
            </p>
          )}
        </div>
        
        <Button
          onClick={handleGenerateProfile}
          disabled={isGenerating || generateProfileMutation.isPending}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Refresh Profile'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          isPending={generateProfileMutation.isPending}
          onRetry={handleGenerateProfile}
        />
      )}

      {/* Loading State */}
      {isLoading && !profile && (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <LoadingWave />
          <p className="mt-4 text-gray-600">Loading developer profile...</p>
        </div>
      )}

      {/* Profile Content */}
      {profile && (
        <div className="space-y-8">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{profile.summary}</p>
            </CardContent>
          </Card>

          {/* Skills and Development Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkillAssessment skills={profile.skillAssessment} />
            <DevelopmentStyle traits={profile.developmentStyle} />
          </div>

          {/* Tech Stack */}
          <TechStack techStack={profile.techStack} />

          {/* Top Repositories */}
          <TopRepos repos={profile.topRepos} />
        </div>
      )}

      {/* No Profile State */}
      {!isLoading && !profile && !error && (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600 mb-4">
            No Profile Available
          </h2>
          <p className="text-gray-500 mb-6">
            Generate an AI-powered developer profile to see insights about {username}&apos;s skills and repositories.
          </p>
          <Button
            onClick={handleGenerateProfile}
            disabled={isGenerating || generateProfileMutation.isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate Profile
          </Button>
        </div>
      )}
    </div>
  );
} 