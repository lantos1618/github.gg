'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Lock, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GITHUB_GG_REPO } from '@/lib/types/wrapped';
import { trpc } from '@/lib/trpc/client';

interface StarGateProps {
  username: string;
  onUnlocked?: () => void;
  teaserStats?: {
    totalCommits?: number;
    topLanguage?: string;
    personalityHint?: string;
  };
}

export function StarGate({ username, onUnlocked, teaserStats }: StarGateProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  
  const utils = trpc.useUtils();

  const handleStarClick = useCallback(() => {
    window.open(GITHUB_GG_REPO.url, '_blank', 'noopener,noreferrer');
  }, []);

  const checkStarStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const data = await utils.wrapped.checkStar.fetch();
      
      if (data.hasStarred) {
        setShowUnlockAnimation(true);
        setTimeout(() => {
          onUnlocked?.();
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to check star status:', error);
    } finally {
      setIsChecking(false);
    }
  }, [onUnlocked, utils.wrapped.checkStar]);

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-900 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 via-transparent to-cyan-100/50" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-200/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] bg-cyan-200/30 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {showUnlockAnimation ? (
          <motion.div
            key="unlocking"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="text-center z-10"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              className="inline-block"
            >
              <Star className="w-24 h-24 text-yellow-400 fill-yellow-400" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-3xl font-bold"
            >
              Unlocked!
            </motion.h2>
          </motion.div>
        ) : (
          <motion.div
            key="gate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 max-w-xl mx-auto px-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-purple-300/40 via-pink-300/40 to-orange-300/40 rounded-full" />
              <div className="relative bg-white border border-gray-200 rounded-2xl p-8 backdrop-blur-xl shadow-xl">
                <Lock className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                
                <h1 className="text-3xl md:text-4xl font-black mb-2 bg-gradient-to-r from-gray-900 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  Your {new Date().getFullYear()} Wrapped
                </h1>
                <p className="text-lg text-gray-500 mb-6">is waiting to be unlocked</p>

                {teaserStats && (
                  <div className="space-y-3 mb-8 text-left">
                    {teaserStats.totalCommits && (
                      <TeaserLine
                        icon="📊"
                        text={`You made ${teaserStats.totalCommits > 100 ? '100+' : '???'} commits...`}
                        locked
                      />
                    )}
                    {teaserStats.topLanguage && (
                      <TeaserLine
                        icon="💻"
                        text={`Your top language is [LOCKED]...`}
                        locked
                      />
                    )}
                    <TeaserLine
                      icon="🎭"
                      text={`Your developer personality: [LOCKED]`}
                      locked
                    />
                    <TeaserLine
                      icon="🌙"
                      text={`Your peak coding hour is [LOCKED]...`}
                      locked
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <Button
                    onClick={handleStarClick}
                    size="lg"
                    className="w-full h-14 text-lg font-semibold rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black transition-all"
                  >
                    <Star className="w-5 h-5 mr-2 fill-current" />
                    Star github.gg to Unlock
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>

                  <Button
                    onClick={checkStarStatus}
                    variant="outline"
                    size="lg"
                    disabled={isChecking}
                    className="w-full h-12 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700"
                  >
                    {isChecking ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        I&apos;ve Starred! Check Again
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-gray-600"
            >
              @{username}, your year in code awaits
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingStars />
    </div>
  );
}

function TeaserLine({
  icon,
  text,
  locked,
}: {
  icon: string;
  text: string;
  locked?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-gray-100 border border-gray-200',
        locked && 'blur-[2px] select-none'
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-gray-600 text-sm">{text}</span>
    </motion.div>
  );
}

function FloatingStars() {
  const stars = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            background: `rgba(${Math.random() > 0.5 ? '147, 51, 234' : '6, 182, 212'}, 0.4)`,
          }}
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
