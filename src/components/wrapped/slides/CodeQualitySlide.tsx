'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, SlideCard, UserHeader, WRAPPED_STYLES } from '../WrappedSlide';
import {
  Bot,
  Sparkles,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  GitCommit,
  Lock,
  Layers,
  Workflow,
  Gauge,
} from 'lucide-react';

interface CodeQualitySlideProps {
  codeQuality: {
    aiVibeScore: number;
    aiIndicators: {
      genericMessages: number;
      perfectFormatting: number;
      longDescriptions: number;
      buzzwordDensity: number;
    };
    slopScore: number;
    envLeakWarnings: Array<{
      type: 'api_key' | 'secret' | 'password' | 'token' | 'credential';
      count: number;
      example?: string;
    }>;
    suggestions: Array<{
      category: 'commit_messages' | 'security' | 'consistency' | 'workflow';
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    hygieneGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  username: string;
  user?: { username: string; avatarUrl: string };
}

const gradeConfig: Record<string, { color: string; emoji: string; message: string }> = {
  A: { color: 'text-emerald-400', emoji: '✨', message: 'Exemplary code hygiene!' },
  B: { color: 'text-violet-400', emoji: '👍', message: 'Solid practices overall' },
  C: { color: 'text-amber-400', emoji: '🔧', message: 'Room for improvement' },
  D: { color: 'text-orange-400', emoji: '⚠️', message: 'Needs attention' },
  F: { color: 'text-red-400', emoji: '🚨', message: 'Time for a cleanup!' },
};

const categoryIcons: Record<string, typeof GitCommit> = {
  commit_messages: GitCommit,
  security: Lock,
  consistency: Layers,
  workflow: Workflow,
};

const priorityStyles: Record<string, string> = {
  low: 'border-slate-200/60',
  medium: 'border-amber-500/30',
  high: 'border-red-500/30',
};

function AnimatedGauge({
  value,
  label,
  icon: Icon,
  isPrimary = false,
  delay = 0,
}: {
  value: number;
  label: string;
  icon: typeof Gauge;
  isPrimary?: boolean;
  delay?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1200;
      const steps = 60;
      const stepDuration = duration / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += value / steps;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  const circumference = 2 * Math.PI * 32;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 200 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative w-20 h-20">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r="32"
            fill="none"
            stroke="rgba(63, 63, 70, 0.5)"
            strokeWidth="5"
          />
          <motion.circle
            cx="36"
            cy="36"
            r="32"
            fill="none"
            stroke={isPrimary ? '#8b5cf6' : '#64748b'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, delay: delay / 1000, ease: 'easeOut' }}
            style={{
              filter: isPrimary ? 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.5))' : 'none',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={`w-3.5 h-3.5 ${isPrimary ? 'text-violet-400' : 'text-slate-600'} mb-0.5`} />
          <span className={`text-lg font-bold ${isPrimary ? 'text-slate-800' : 'text-slate-500'}`}>
            {displayValue}
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className={`text-xs font-medium ${isPrimary ? 'text-violet-400' : 'text-slate-600'} uppercase tracking-wide`}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

export function CodeQualitySlide({ codeQuality, username, user }: CodeQualitySlideProps) {
  const [phase, setPhase] = useState<'intro' | 'scores' | 'details'>('intro');

  const gradeInfo = gradeConfig[codeQuality.hygieneGrade] || gradeConfig.C;
  const hasSecurityWarnings = codeQuality.envLeakWarnings.length > 0;
  const topSuggestions = codeQuality.suggestions.slice(0, 2);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('scores'), 1500),
      setTimeout(() => setPhase('details'), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <WrappedSlide glowPosition="top">
      <div className="text-center space-y-6">
        {user && (
          <div className="flex justify-center mb-4">
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </div>
        )}

        {/* Min-height prevents CLS during phase transitions */}
        <div className="min-h-[400px] flex items-start justify-center">
          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <Sparkles className="w-12 h-12 mx-auto text-violet-400" />
              </motion.div>

              <motion.p
                className="text-xl text-slate-500"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Analyzing your code quality...
              </motion.p>

              <motion.div
                className="flex justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-violet-400"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.15,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {(phase === 'scores' || phase === 'details') && (
            <motion.div
              key="scores"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={WRAPPED_STYLES.sectionLabel}
              >
                @{username}&apos;s Code Hygiene
              </motion.p>

              {/* Grade */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
                className="inline-block"
              >
                <div className="relative">
                  <div
                    className={`text-7xl md:text-8xl font-black ${gradeInfo.color}`}
                    style={{ textShadow: '0 0 40px currentColor' }}
                  >
                    {codeQuality.hygieneGrade}
                  </div>
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="absolute -top-2 -right-4 text-2xl"
                  >
                    {gradeInfo.emoji}
                  </motion.span>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-slate-500"
              >
                {gradeInfo.message}
              </motion.p>

              {/* Gauges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center gap-8"
              >
                <AnimatedGauge
                  value={codeQuality.aiVibeScore}
                  label="AI-ish"
                  icon={Bot}
                  isPrimary
                  delay={600}
                />
                <AnimatedGauge
                  value={100 - codeQuality.slopScore}
                  label="Effort"
                  icon={Gauge}
                  delay={800}
                />
              </motion.div>

              {/* Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex justify-center gap-2 flex-wrap"
              >
                {[
                  { label: 'Generic', value: codeQuality.aiIndicators.genericMessages },
                  { label: 'Perfect', value: codeQuality.aiIndicators.perfectFormatting },
                  { label: 'Verbose', value: codeQuality.aiIndicators.longDescriptions },
                  { label: 'Buzzwords', value: codeQuality.aiIndicators.buzzwordDensity },
                ].map((indicator, i) => (
                  <motion.div
                    key={indicator.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                    className="px-3 py-1.5 bg-white/80 border border-slate-200/60 rounded-full"
                  >
                    <span className="text-xs text-slate-600">{indicator.label}</span>
                    <span className="ml-1.5 text-xs font-semibold text-slate-700">{indicator.value}%</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Security warnings */}
              {hasSecurityWarnings && phase === 'details' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <SlideCard className="max-w-md mx-auto border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-amber-400">
                          Potential secrets detected
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {codeQuality.envLeakWarnings.map((warning, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 rounded-full text-xs font-medium text-amber-400 border border-amber-500/20"
                            >
                              <Lock className="w-3 h-3" />
                              {warning.type.replace('_', ' ')} ({warning.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </SlideCard>
                </motion.div>
              )}

              {/* Suggestions */}
              {phase === 'details' && topSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: hasSecurityWarnings ? 0.5 : 0.2 }}
                  className="space-y-3 max-w-md mx-auto"
                >
                  <div className="flex items-center justify-center gap-2 text-zinc-500">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Quick Wins</span>
                  </div>

                  <div className="space-y-2">
                    {topSuggestions.map((suggestion, i) => {
                      const Icon = categoryIcons[suggestion.category] || Lightbulb;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (hasSecurityWarnings ? 0.7 : 0.4) + i * 0.15 }}
                        >
                          <SlideCard className={priorityStyles[suggestion.priority]}>
                            <div className="flex items-start gap-3 text-left">
                              <Icon className="w-4 h-4 mt-0.5 text-violet-400 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-700">{suggestion.title}</p>
                                <p className="text-xs text-slate-600 mt-0.5">{suggestion.description}</p>
                              </div>
                            </div>
                          </SlideCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Clean code champion */}
              {!hasSecurityWarnings && codeQuality.hygieneGrade === 'A' && phase === 'details' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Clean code champion!</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </WrappedSlide>
  );
}
