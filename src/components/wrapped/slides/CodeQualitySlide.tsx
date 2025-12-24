'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';
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
  Gauge
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
}

const gradeConfig: Record<string, { color: string; gradient: string; emoji: string; message: string }> = {
  A: { 
    color: 'text-emerald-600', 
    gradient: 'from-emerald-400 to-green-500',
    emoji: '✨',
    message: 'Exemplary code hygiene!'
  },
  B: { 
    color: 'text-cyan-600', 
    gradient: 'from-cyan-400 to-blue-500',
    emoji: '👍',
    message: 'Solid practices overall'
  },
  C: { 
    color: 'text-amber-600', 
    gradient: 'from-amber-400 to-orange-500',
    emoji: '🔧',
    message: 'Room for improvement'
  },
  D: { 
    color: 'text-orange-600', 
    gradient: 'from-orange-400 to-red-500',
    emoji: '⚠️',
    message: 'Needs attention'
  },
  F: { 
    color: 'text-red-600', 
    gradient: 'from-red-400 to-rose-600',
    emoji: '🚨',
    message: 'Time for a cleanup!'
  },
};

const categoryIcons: Record<string, typeof GitCommit> = {
  commit_messages: GitCommit,
  security: Lock,
  consistency: Layers,
  workflow: Workflow,
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-rose-50 text-rose-700 border-rose-200',
};

function AnimatedGauge({ 
  value, 
  label, 
  icon: Icon, 
  colorFrom, 
  colorTo,
  delay = 0 
}: { 
  value: number; 
  label: string; 
  icon: typeof Gauge;
  colorFrom: string;
  colorTo: string;
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

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;
  
  const getScoreLabel = (score: number) => {
    if (score < 20) return 'Minimal';
    if (score < 40) return 'Low';
    if (score < 60) return 'Moderate';
    if (score < 80) return 'High';
    return 'Very High';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 200 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-gray-200"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={`url(#gradient-${label.replace(/\s/g, '')})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, delay: delay / 1000, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id={`gradient-${label.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400 mb-0.5" />
          <span className="text-xl font-bold text-gray-800">{displayValue}</span>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
        <p className="text-[10px] text-gray-400">{getScoreLabel(value)}</p>
      </div>
    </motion.div>
  );
}

export function CodeQualitySlide({ codeQuality, username }: CodeQualitySlideProps) {
  const [phase, setPhase] = useState<'intro' | 'scores' | 'details'>('intro');
  
  const gradeInfo = gradeConfig[codeQuality.hygieneGrade] || gradeConfig.C;
  const hasSecurityWarnings = codeQuality.envLeakWarnings.length > 0;
  const topSuggestions = codeQuality.suggestions.slice(0, 2);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('scores'), 1500),
      setTimeout(() => setPhase('details'), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#f0f9ff"
      gradientTo="#faf5ff"
    >
      <div className="text-center space-y-5">
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
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-100 to-cyan-100 rounded-2xl shadow-lg"
              >
                <Sparkles className="w-10 h-10 text-violet-500" />
              </motion.div>
              
              <motion.p
                className="text-xl text-gray-600"
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
                    className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400"
                    animate={{ 
                      scale: [1, 1.4, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 1, 
                      delay: i * 0.15, 
                      repeat: Infinity 
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
              className="space-y-5"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">
                  @{username}&apos;s Code Hygiene Report
                </p>
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
                  className="inline-block"
                >
                  <div className={`relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br ${gradeInfo.gradient} rounded-2xl shadow-xl`}>
                    <span className="text-5xl font-black text-white drop-shadow-lg">
                      {codeQuality.hygieneGrade}
                    </span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 }}
                      className="absolute -top-2 -right-2 text-2xl"
                    >
                      {gradeInfo.emoji}
                    </motion.span>
                  </div>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-gray-600"
                >
                  {gradeInfo.message}
                </motion.p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center gap-8"
              >
                <AnimatedGauge
                  value={codeQuality.aiVibeScore}
                  label="AI Vibe"
                  icon={Bot}
                  colorFrom="#8b5cf6"
                  colorTo="#06b6d4"
                  delay={600}
                />
                <AnimatedGauge
                  value={codeQuality.slopScore}
                  label="Slop"
                  icon={Gauge}
                  colorFrom="#f97316"
                  colorTo="#ef4444"
                  delay={800}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex justify-center gap-3 flex-wrap"
              >
                {[
                  { label: 'Generic', value: codeQuality.aiIndicators.genericMessages },
                  { label: 'Perfect Format', value: codeQuality.aiIndicators.perfectFormatting },
                  { label: 'Long Desc', value: codeQuality.aiIndicators.longDescriptions },
                  { label: 'Buzzwords', value: codeQuality.aiIndicators.buzzwordDensity },
                ].map((indicator, i) => (
                  <motion.div
                    key={indicator.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                    className="px-2 py-1 bg-white/80 rounded-lg border border-gray-200 shadow-sm"
                  >
                    <span className="text-[10px] text-gray-500">{indicator.label}</span>
                    <span className="ml-1 text-xs font-semibold text-gray-700">{indicator.value}%</span>
                  </motion.div>
                ))}
              </motion.div>

              {hasSecurityWarnings && phase === 'details' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200 shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow">
                      <ShieldAlert className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-orange-800">
                        Heads up! Potential secrets detected
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {codeQuality.envLeakWarnings.map((warning, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full text-xs font-medium text-orange-700 border border-orange-200"
                          >
                            <Lock className="w-3 h-3" />
                            {warning.type.replace('_', ' ')} ({warning.count})
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-orange-600">
                        Consider reviewing your commit history for sensitive data
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {phase === 'details' && topSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: hasSecurityWarnings ? 0.5 : 0.2 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-600">
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
                          className={`flex items-start gap-3 p-3 bg-white rounded-xl border shadow-sm ${priorityColors[suggestion.priority]}`}
                        >
                          <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{suggestion.title}</p>
                            <p className="text-xs opacity-80 mt-0.5">{suggestion.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {!hasSecurityWarnings && codeQuality.hygieneGrade === 'A' && phase === 'details' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-full border border-emerald-200"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700">
                    Clean code champion!
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WrappedSlide>
  );
}
