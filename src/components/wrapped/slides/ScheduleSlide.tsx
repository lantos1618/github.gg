'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';
import { Flame, Moon, Calendar } from 'lucide-react';

interface ScheduleSlideProps {
  commitsByHour: number[];
  commitsByDay: number[];
  peakHour: number;
  peakDay: string;
  lateNightCommits: number;
  weekendCommits: number;
  longestStreak: number;
}

const HOUR_LABELS_FULL = [
  '12am', '1am', '2am', '3am', '4am', '5am',
  '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm',
  '6pm', '7pm', '8pm', '9pm', '10pm', '11pm',
];

function getScheduleRoast(peakHour: number, lateNight: number, weekend: number): { message: string; emoji: string } {
  if (peakHour >= 0 && peakHour < 5) {
    return {
      message: 'A creature of the night. Your melatonin levels are in shambles.',
      emoji: '🦇',
    };
  }
  if (peakHour >= 5 && peakHour < 9) {
    return {
      message: 'An early bird! Either you wake up motivated or never slept.',
      emoji: '🐦',
    };
  }
  if (peakHour >= 9 && peakHour < 17) {
    return {
      message: "A 9-to-5 coder? In THIS economy? Respect.",
      emoji: '💼',
    };
  }
  if (peakHour >= 17 && peakHour < 21) {
    return {
      message: 'After-hours grinding. The real work happens when the meetings stop.',
      emoji: '🌆',
    };
  }
  if (lateNight > 100) {
    return {
      message: 'Your commit history looks like a horror movie schedule.',
      emoji: '👻',
    };
  }
  if (weekend > 100) {
    return {
      message: 'Weekends are for coding apparently. Your friends miss you.',
      emoji: '📅',
    };
  }
  return {
    message: 'The night shift programmer. Coffee is your co-pilot.',
    emoji: '☕',
  };
}

function getTimePeriod(hour: number): { period: string; icon: string } {
  if (hour >= 5 && hour < 12) return { period: 'morning', icon: '🌅' };
  if (hour >= 12 && hour < 17) return { period: 'afternoon', icon: '☀️' };
  if (hour >= 17 && hour < 21) return { period: 'evening', icon: '🌆' };
  return { period: 'night', icon: '🌙' };
}

export function ScheduleSlide({
  commitsByHour,
  commitsByDay,
  peakHour,
  peakDay,
  lateNightCommits,
  weekendCommits,
  longestStreak,
}: ScheduleSlideProps) {
  const [phase, setPhase] = useState<'clock' | 'reveal' | 'details'>('clock');
  const maxCommits = Math.max(...commitsByHour, 1);
  const roast = getScheduleRoast(peakHour, lateNightCommits, weekendCommits);
  const timePeriod = getTimePeriod(peakHour);

  void commitsByDay;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 1800),
      setTimeout(() => setPhase('details'), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <WrappedSlide
      gradientFrom="#0f0f1a"
      gradientVia="#1a1a2e"
      gradientTo="#16213e"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0) 70%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[500px] md:min-h-[600px]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 md:mb-8"
        >
          <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-purple-300/80 font-medium">
            Your Coding Rhythm
          </p>
        </motion.div>

        <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, transparent 45%, rgba(139, 92, 246, 0.1) 50%, transparent 55%)',
            }}
          />

          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
            
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 15 - 90) * (Math.PI / 180);
              const isMainHour = i % 6 === 0;
              const innerR = isMainHour ? 78 : 82;
              const outerR = 88;
              const x1 = 100 + innerR * Math.cos(angle);
              const y1 = 100 + innerR * Math.sin(angle);
              const x2 = 100 + outerR * Math.cos(angle);
              const y2 = 100 + outerR * Math.sin(angle);
              
              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMainHour ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}
                  strokeWidth={isMainHour ? 2 : 1}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.02 }}
                />
              );
            })}

            {[0, 6, 12, 18].map((hour) => {
              const angle = (hour * 15 - 90) * (Math.PI / 180);
              const r = 70;
              const x = 100 + r * Math.cos(angle);
              const y = 100 + r * Math.sin(angle);
              const labels = ['12a', '6a', '12p', '6p'];
              
              return (
                <motion.text
                  key={hour}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize="8"
                  fontWeight="500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + hour * 0.05 }}
                >
                  {labels[hour / 6]}
                </motion.text>
              );
            })}

            {commitsByHour.map((commits, hour) => {
              const intensity = commits / maxCommits;
              if (intensity < 0.05) return null;
              
              const startAngle = (hour * 15 - 90 - 7) * (Math.PI / 180);
              const endAngle = (hour * 15 - 90 + 7) * (Math.PI / 180);
              const innerR = 42;
              const outerR = 42 + intensity * 20;
              const isPeak = hour === peakHour;
              
              const x1 = 100 + innerR * Math.cos(startAngle);
              const y1 = 100 + innerR * Math.sin(startAngle);
              const x2 = 100 + outerR * Math.cos(startAngle);
              const y2 = 100 + outerR * Math.sin(startAngle);
              const x3 = 100 + outerR * Math.cos(endAngle);
              const y3 = 100 + outerR * Math.sin(endAngle);
              const x4 = 100 + innerR * Math.cos(endAngle);
              const y4 = 100 + innerR * Math.sin(endAngle);

              return (
                <motion.path
                  key={hour}
                  d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}`}
                  fill={isPeak 
                    ? 'url(#peakGradient)' 
                    : `rgba(139, 92, 246, ${0.3 + intensity * 0.5})`
                  }
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                  }}
                  transition={{ 
                    delay: 0.3 + hour * 0.04,
                    duration: 0.4,
                    ease: 'easeOut'
                  }}
                  style={{ transformOrigin: 'center' }}
                />
              );
            })}

            <motion.circle
              cx="100"
              cy="100"
              r="42"
              fill="none"
              stroke="rgba(139, 92, 246, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            />

            <defs>
              <linearGradient id="peakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {phase === 'clock' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <motion.div
                    className="text-4xl"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    ⏰
                  </motion.div>
                </motion.div>
              )}

              {(phase === 'reveal' || phase === 'details') && (
                <motion.div
                  key="time"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="text-center"
                >
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl mb-1"
                  >
                    {timePeriod.icon}
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent"
                  >
                    {HOUR_LABELS_FULL[peakHour]}
                  </motion.div>
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs md:text-sm text-white/50 uppercase tracking-wider mt-1"
                  >
                    peak hour
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {phase !== 'clock' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: [0, 0.5, 0],
                scale: [0.9, 1.05, 0.9]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute inset-0 rounded-full border-2 border-purple-400/30"
            />
          )}
        </div>

        {(phase === 'reveal' || phase === 'details') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 md:mt-8 text-center"
          >
            <p className="text-white/40 text-sm mb-1">Most productive on</p>
            <p className="text-2xl md:text-3xl font-bold text-white">
              {peakDay}s
            </p>
          </motion.div>
        )}

        {phase === 'details' && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 space-y-6 w-full max-w-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center"
            >
              <span className="text-2xl mr-2">{roast.emoji}</span>
              <p className="text-white/80 text-sm inline">{roast.message}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center gap-2 flex-wrap"
            >
              <StatPill 
                icon={<Flame className="w-3.5 h-3.5 text-orange-400" />} 
                value={longestStreak} 
                label="day streak" 
                delay={0.8}
              />
              <StatPill 
                icon={<Moon className="w-3.5 h-3.5 text-indigo-400" />} 
                value={lateNightCommits} 
                label="late nights" 
                delay={0.9}
              />
              <StatPill 
                icon={<Calendar className="w-3.5 h-3.5 text-cyan-400" />} 
                value={weekendCommits} 
                label="weekends" 
                delay={1.0}
              />
            </motion.div>
          </motion.div>
        )}
      </div>
    </WrappedSlide>
  );
}

function StatPill({
  icon,
  value,
  label,
  delay,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full"
    >
      {icon}
      <span className="text-white font-semibold text-sm">{value}</span>
      <span className="text-white/50 text-xs">{label}</span>
    </motion.div>
  );
}
