'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ExternalLink, Key, ArrowRight, SkipForward, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { StarGate, useWrappedGeneration } from '@/components/wrapped';
import { useAuth } from '@/lib/auth/factory';
import { trpc } from '@/lib/trpc/client';

export default function WrappedLandingPage() {
  const router = useRouter();
  const { user, isSignedIn, isLoading: authLoading, signIn } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);

  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [starCheckPassed, setStarCheckPassed] = useState(false);

  const currentYear = new Date().getFullYear();
  
  const { data: existsData } = trpc.wrapped.exists.useQuery(
    { year: currentYear },
    { enabled: isSignedIn }
  );
  const hasExistingWrapped = existsData?.exists ?? false;

  const { data: subscription } = trpc.billing.getSubscription.useQuery(
    undefined,
    { enabled: isSignedIn }
  );
  const isPaidUser = subscription?.status === 'active' && subscription?.plan === 'pro';
  
  const {
    progress,
    message,
    data,
    error,
    isLoading: generating,
    starRequired,
    startGeneration,
    reset,
  } = useWrappedGeneration();

  useEffect(() => {
    reset();
    setHasStarted(false);
    setShowApiKeyInput(false);
    setStarCheckPassed(false);
  }, []);

  useEffect(() => {
    if (data) {
      router.push(`/wrapped/${data.year}/${data.username}`);
    }
  }, [data, router]);

  const handleStartGeneration = () => {
    setHasStarted(true);
    if (isPaidUser) {
      startGeneration({ withAI: true, includeRoast: true });
    } else {
      startGeneration({ apiKey: apiKey || undefined });
    }
  };

  const handleUnlocked = () => {
    setStarCheckPassed(true);
    if (isPaidUser) {
      setHasStarted(true);
      startGeneration({ withAI: true, includeRoast: true });
    } else {
      setShowApiKeyInput(true);
    }
  };

  const handleSkipAI = () => {
    setShowApiKeyInput(false);
    setHasStarted(true);
    startGeneration({ withAI: false, includeRoast: false });
  };

  const handleContinueWithAI = () => {
    setShowApiKeyInput(false);
    setHasStarted(true);
    startGeneration({ withAI: true, includeRoast: true, apiKey: apiKey || undefined });
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
              GitHub Wrapped {new Date().getFullYear()}
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
            <ExternalLink className="w-5 h-5 mr-2" />
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

  if (showApiKeyInput) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="text-6xl"
          >
            🤖
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-900">
              Want AI Personality Insights?
            </h2>
            <p className="text-gray-600">
              Enter your Gemini API key for personalized roasts and developer personality analysis
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="password"
                placeholder="Enter your Gemini API key (optional)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pl-10 h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <p className="text-xs text-gray-500">
              Get your free API key at{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                aistudio.google.com
              </a>
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleContinueWithAI}
              size="lg"
              className="w-full h-14 text-lg bg-gray-900 hover:bg-gray-800 text-white"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Continue with AI Insights
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button
              onClick={handleSkipAI}
              variant="outline"
              size="lg"
              className="w-full h-12 border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Skip AI Features
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Your API key is used only for this session and never stored
          </p>
        </motion.div>
        <FloatingParticles />
      </div>
    );
  }

  if (generating || hasStarted) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <WrappedLoadingAnimation />

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Generating Your Wrapped
            </h2>
            <p className="text-gray-600">{message || 'Preparing...'}</p>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2 bg-gray-200" />
            <p className="text-sm text-gray-500">{progress}%</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-600">{error}</p>
              <Button
                onClick={() => {
                  reset();
                  setHasStarted(false);
                  setStarCheckPassed(false);
                }}
                variant="outline"
                className="mt-4 border-red-300 text-red-600 hover:bg-red-50"
              >
                Try Again
              </Button>
            </motion.div>
          )}
        </motion.div>
        <FloatingParticles />
      </div>
    );
  }

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
            {new Date().getFullYear()}
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
          {hasExistingWrapped ? (
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
                onClick={handleStartGeneration}
                variant="outline"
                size="lg"
                className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Again
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleStartGeneration}
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
      </motion.div>

      <FloatingParticles />
    </div>
  );
}

function WrappedLoadingAnimation() {
  const orbits = [
    { radius: 40, count: 6, duration: 8, direction: 1 },
    { radius: 65, count: 8, duration: 12, direction: -1 },
    { radius: 90, count: 10, duration: 16, direction: 1 },
  ];

  const ringRadii = [90, 65, 40];
  const yearDigits = ['2', '0', '2', '5'];

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {ringRadii.map((size, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute rounded-full border border-gray-200"
          style={{ width: size * 2, height: size * 2 }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {orbits.map((orbit, orbitIndex) =>
        Array.from({ length: orbit.count }).map((_, dotIndex) => {
          const angle = (360 / orbit.count) * dotIndex;
          const isPrimary = dotIndex % 3 === 0;
          return (
            <motion.div
              key={`orbit-${orbitIndex}-dot-${dotIndex}`}
              className="absolute"
              style={{
                width: isPrimary ? 8 : 5,
                height: isPrimary ? 8 : 5,
              }}
              animate={{
                rotate: orbit.direction > 0 ? [angle, angle + 360] : [angle, angle - 360],
              }}
              transition={{
                duration: orbit.duration,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <motion.div
                className="rounded-full"
                style={{
                  width: '100%',
                  height: '100%',
                  background: isPrimary 
                    ? 'linear-gradient(135deg, #9333ea, #06b6d4)' 
                    : orbitIndex === 1 ? '#9333ea' : '#06b6d4',
                  transform: `translateX(${orbit.radius}px)`,
                  boxShadow: isPrimary 
                    ? '0 0 12px rgba(147, 51, 234, 0.5)' 
                    : '0 0 6px rgba(6, 182, 212, 0.3)',
                }}
                animate={{
                  scale: [1, isPrimary ? 1.3 : 1.15, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  delay: dotIndex * 0.1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          );
        })
      )}

      <motion.div
        className="absolute w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center z-10"
        style={{
          boxShadow: '0 4px 20px rgba(147, 51, 234, 0.15), 0 0 40px rgba(6, 182, 212, 0.1)',
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="relative flex items-center gap-1">
          <motion.span
            className="text-xl font-mono font-bold text-purple-600"
            animate={{
              x: [-2, -5, -2],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {'<'}
          </motion.span>
          <motion.span
            className="text-xl font-mono font-bold"
            style={{
              background: 'linear-gradient(135deg, #9333ea, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            /
          </motion.span>
          <motion.span
            className="text-xl font-mono font-bold text-cyan-600"
            animate={{
              x: [2, 5, 2],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {'>'}
          </motion.span>
        </div>
      </motion.div>

      <motion.div
        className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
        animate={{
          y: [-96, 96],
          opacity: [0, 0.6, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {yearDigits.map((digit, i) => (
        <motion.span
          key={`digit-${i}`}
          className="absolute text-sm font-bold text-gray-300 font-mono"
          style={{
            left: `${15 + i * 20}%`,
            top: `${10 + (i % 2) * 80}%`,
          }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            delay: i * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {digit}
        </motion.span>
      ))}
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
