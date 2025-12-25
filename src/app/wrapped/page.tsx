'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Eye, Gift, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarGate, useWrappedGeneration, Confetti } from '@/components/wrapped';
import { useAuth } from '@/lib/auth/factory';
import { trpc } from '@/lib/trpc/client';

export default function WrappedLandingPage() {
  const router = useRouter();
  const { user, isSignedIn, isLoading: authLoading, signIn } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);
  const [starCheckPassed, setStarCheckPassed] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  const currentYear = new Date().getFullYear();
  
  const { data: existsData, isLoading: existsLoading } = trpc.wrapped.exists.useQuery(
    { year: currentYear },
    { enabled: isSignedIn }
  );
  const hasExistingWrapped = existsData?.exists ?? false;

  const { data: cacheStatus } = trpc.wrapped.getCacheStatus.useQuery(
    { year: currentYear },
    { enabled: isSignedIn && hasExistingWrapped }
  );

  const { data: subscription, isLoading: subscriptionLoading } = trpc.billing.getSubscription.useQuery(
    undefined,
    { enabled: isSignedIn }
  );
  const isPaidUser = subscription?.status === 'active' && subscription?.plan === 'pro';
  
  const {
    progress,
    logs,
    data,
    error,
    cached,
    isLoading: generating,
    starRequired,
    startGeneration,
    reset,
  } = useWrappedGeneration();

  useEffect(() => {
    reset();
    setHasStarted(false);
    setStarCheckPassed(false);
    setShowReveal(false);
  }, [reset]);

  useEffect(() => {
    if (data && !showReveal) {
      setShowReveal(true);
    }
  }, [data, showReveal]);

  const handleStartGeneration = (force = false) => {
    setHasStarted(true);
    setShowReveal(false);
    startGeneration({ 
      withAI: isPaidUser, 
      includeRoast: isPaidUser,
      force,
    });
  };

  const handleUnlocked = () => {
    setStarCheckPassed(true);
    setHasStarted(true);
    startGeneration({ 
      withAI: isPaidUser, 
      includeRoast: isPaidUser,
    });
  };

  const handleViewWrapped = () => {
    if (data) {
      router.push(`/wrapped/${data.year}/${data.username}`);
    }
  };

  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-8xl"
            >
              🎁
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              GitHub Wrapped {currentYear}
            </h1>
            <p className="text-gray-600">
              Sign in with GitHub to see your year in code
            </p>
          </div>

          <Button
            onClick={() => signIn()}
            size="lg"
            className="w-full h-14 text-lg bg-gray-900 text-white hover:bg-gray-800"
          >
            <Gift className="w-5 h-5 mr-2" />
            Sign in with GitHub
          </Button>

          <p className="text-xs text-gray-500">
            We only access your public GitHub data
          </p>
        </motion.div>
        <FloatingParticles />
      </div>
    );
  }

  if (starRequired && !starCheckPassed) {
    return (
      <StarGate
        username={user?.githubUsername || user?.name || 'developer'}
        onUnlocked={handleUnlocked}
      />
    );
  }

  if (showReveal && data) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
        <Confetti />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <PartyPopper className="w-20 h-20 mx-auto text-purple-500 mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your Wrapped is Ready!
            </h1>
            <p className="text-gray-600">
              {cached ? 'Loaded from cache' : 'Freshly generated just for you'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
          >
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {data.stats.totalCommits.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 uppercase">Commits</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600">
                  {data.stats.languages[0]?.name || '—'}
                </div>
                <div className="text-xs text-gray-500 uppercase">Top Lang</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">
                  {data.stats.longestStreak}
                </div>
                <div className="text-xs text-gray-500 uppercase">Day Streak</div>
              </div>
            </div>
            {data.aiInsights?.personalityType && (
              <div className="pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">Your Personality</div>
                <div className="text-lg font-bold text-gray-900 flex items-center justify-center gap-2">
                  <span>{data.aiInsights.personalityEmoji}</span>
                  <span>{data.aiInsights.personalityType}</span>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              onClick={handleViewWrapped}
              size="lg"
              className="w-full h-16 text-xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white"
            >
              <Sparkles className="w-6 h-6 mr-2" />
              Unwrap My Story
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (generating || hasStarted) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full space-y-8 relative z-10"
        >
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
              {currentYear}
            </h1>
            <p className="text-gray-500 text-sm mt-2 font-mono uppercase tracking-widest">
              GitHub Wrapped
            </p>
          </motion.div>

          <motion.div 
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-gray-500 font-mono">wrapped-generator</span>
              </div>
              <div className="w-16" />
            </div>

            <div className="p-4 font-mono text-sm h-64 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {logs.map((log, index) => (
                  <motion.div
                    key={log.timestamp}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex items-start gap-2 mb-2"
                  >
                    <span className="text-purple-500 select-none">→</span>
                    <span className="text-gray-600">{log.message}</span>
                    {index === logs.length - 1 && !error && progress < 100 && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                        className="inline-block w-2 h-4 bg-purple-500 ml-1"
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {logs.length === 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-purple-500">→</span>
                  <span className="text-gray-400">Initializing...</span>
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                    className="inline-block w-2 h-4 bg-purple-500"
                  />
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-500 min-w-[3ch] text-right">
                  {progress}%
                </span>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-red-600 font-medium mb-1">Error encountered</p>
                    <p className="text-red-500 text-sm font-mono mb-4">{error}</p>
                    <Button
                      onClick={() => {
                        reset();
                        setHasStarted(false);
                        setStarCheckPassed(false);
                      }}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-100"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  const isLoadingData = existsLoading || subscriptionLoading;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center space-y-8 relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="space-y-2"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-7xl md:text-8xl"
          >
            🎁
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-gray-900 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
            {currentYear}
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            GitHub Wrapped
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-gray-600"
        >
          Ready to see your year in code, @{user?.githubUsername || user?.name}?
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          {isLoadingData ? (
            <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ) : hasExistingWrapped ? (
            <>
              <Button
                onClick={() => router.push(`/wrapped/${currentYear}/${user?.githubUsername}`)}
                size="lg"
                className="w-full h-14 text-lg font-bold bg-gray-900 hover:bg-gray-800 text-white transition-all"
              >
                <Eye className="w-5 h-5 mr-2" />
                View My Wrapped
              </Button>
              <Button
                onClick={() => handleStartGeneration(true)}
                variant="outline"
                size="lg"
                className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate {cacheStatus && 'hoursAgo' in cacheStatus && (() => {
                  const hours = cacheStatus.hoursAgo;
                  const mins = 'minutesAgo' in cacheStatus ? cacheStatus.minutesAgo : 0;
                  if (hours > 0) return `(last: ${hours}h ago)`;
                  if (mins > 0) return `(last: ${mins}m ago)`;
                  return '(last: just now)';
                })()}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => handleStartGeneration(false)}
                size="lg"
                className="w-full h-16 text-xl font-bold bg-gray-900 hover:bg-gray-800 text-white transition-all"
              >
                <Sparkles className="w-6 h-6 mr-2" />
                Unwrap My Year
              </Button>
              <p className="text-xs text-gray-500">
                Takes about 30 seconds to generate
              </p>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-3 gap-4 pt-8"
        >
          <PreviewStat icon="📊" label="Commits" />
          <PreviewStat icon="💻" label="Languages" />
          <PreviewStat icon="🎭" label="Personality" />
        </motion.div>

        {isPaidUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="pt-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-cyan-100 rounded-full">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Pro: AI Insights Enabled</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      <FloatingParticles />
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-4xl inline-block"
        >
          ⏳
        </motion.div>
        <p className="text-gray-600">{message}</p>
      </motion.div>
    </div>
  );
}

function PreviewStat({ icon, label }: { icon: string; label: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm"
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    </motion.div>
  );
}

function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 3,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `rgba(${Math.random() > 0.5 ? '147, 51, 234' : '6, 182, 212'}, 0.4)`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
