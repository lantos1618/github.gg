'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WrappedSlide, SlideCard, UserHeader, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';
import { Flame, Moon, Calendar } from 'lucide-react';

interface ScheduleSlideProps {
  commitsByHour: number[];
  commitsByDay: number[];
  peakHour: number;
  peakDay: string;
  lateNightCommits: number;
  weekendCommits: number;
  longestStreak: number;
  user?: { username: string; avatarUrl: string };
}

const HOUR_LABELS_FULL = [
  '12am', '1am', '2am', '3am', '4am', '5am',
  '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm',
  '6pm', '7pm', '8pm', '9pm', '10pm', '11pm',
];

function getScheduleRoast(peakHour: number, lateNight: number, weekend: number): string {
  if (peakHour >= 0 && peakHour < 5) {
    return 'A creature of the night. Your melatonin levels are in shambles.';
  }
  if (peakHour >= 5 && peakHour < 9) {
    return 'An early bird! Either you wake up motivated or never slept.';
  }
  if (peakHour >= 9 && peakHour < 17) {
    return 'A 9-to-5 coder? In this economy? Respect.';
  }
  if (peakHour >= 17 && peakHour < 21) {
    return 'After-hours grinding. The real work happens when the meetings stop.';
  }
  if (lateNight > 100) {
    return 'Your commit history looks like a horror movie schedule.';
  }
  if (weekend > 100) {
    return 'Weekends are for coding apparently. Your friends miss you.';
  }
  return 'The night shift programmer. Coffee is your co-pilot.';
}

function getTimePeriodIcon(hour: number): string {
  if (hour >= 5 && hour < 12) return '☀️';
  if (hour >= 12 && hour < 17) return '🌤️';
  if (hour >= 17 && hour < 21) return '🌆';
  return '🌙';
}

export function ScheduleSlide({
  commitsByHour,
  commitsByDay,
  peakHour,
  peakDay,
  lateNightCommits,
  weekendCommits,
  longestStreak,
  user,
}: ScheduleSlideProps) {
  const [phase, setPhase] = useState<'clock' | 'reveal' | 'details'>('clock');
  const maxCommits = Math.max(...commitsByHour, 1);
  const roast = getScheduleRoast(peakHour, lateNightCommits, weekendCommits);
  const timeIcon = getTimePeriodIcon(peakHour);

  void commitsByDay;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 1800),
      setTimeout(() => setPhase('details'), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <WrappedSlide glowPosition="center">
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[500px] md:min-h-[600px]">
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 md:mb-8"
        >
          <p className={WRAPPED_STYLES.sectionLabel}>
            Your Coding Rhythm
          </p>
        </motion.div>

        {/* Radial Clock */}
        <div className="relative w-[260px] h-[260px] md:w-[300px] md:h-[300px]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Outer ring */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(63, 63, 70, 0.3)"
              strokeWidth="1"
            />

            {/* Hour markers */}
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
                  stroke={isMainHour ? 'rgba(161, 161, 170, 0.4)' : 'rgba(113, 113, 122, 0.2)'}
                  strokeWidth={isMainHour ? 2 : 1}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.02 }}
                />
              );
            })}

            {/* Hour labels */}
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
                  fill="rgba(161, 161, 170, 0.5)"
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

            {/* Activity bars */}
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
                  fill={isPeak ? WRAPPED_THEME.accent : `rgba(6, 182, 212, ${0.2 + intensity * 0.4})`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.3 + hour * 0.04,
                    duration: 0.4,
                    ease: 'easeOut',
                  }}
                  style={{ transformOrigin: 'center' }}
                  className={isPeak ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''}
                />
              );
            })}

            {/* Inner dashed circle */}
            <motion.circle
              cx="100"
              cy="100"
              r="42"
              fill="none"
              stroke="rgba(63, 63, 70, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            />
          </svg>

          {/* Center content */}
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
                    className="text-3xl"
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
                    className="text-2xl mb-1"
                  >
                    {timeIcon}
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl md:text-4xl font-black"
                    style={{ color: WRAPPED_THEME.accent, textShadow: `0 0 20px ${WRAPPED_THEME.accentGlow}` }}
                  >
                    {HOUR_LABELS_FULL[peakHour]}
                  </motion.div>
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xs md:text-sm text-slate-600 uppercase tracking-wider mt-1"
                  >
                    peak hour
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pulsing ring */}
          {phase !== 'clock' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: [0, 0.3, 0],
                scale: [0.9, 1.05, 0.9],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 rounded-full border border-violet-400/30"
            />
          )}
        </div>

        {/* Peak day */}
        {(phase === 'reveal' || phase === 'details') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 md:mt-8 text-center"
          >
            <p className="text-slate-600 text-sm mb-1">Most productive on</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800">
              {peakDay}s
            </p>
          </motion.div>
        )}

        {/* Details */}
        {phase === 'details' && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 space-y-4 w-full max-w-sm"
          >
            <SlideCard className="text-center">
              <p className="text-slate-700 text-sm">{roast}</p>
            </SlideCard>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center gap-2 flex-wrap"
            >
              <StatPillSmall
                icon={<Flame className="w-3.5 h-3.5" />}
                value={longestStreak}
                label="day streak"
              />
              <StatPillSmall
                icon={<Moon className="w-3.5 h-3.5" />}
                value={lateNightCommits}
                label="late nights"
              />
              <StatPillSmall
                icon={<Calendar className="w-3.5 h-3.5" />}
                value={weekendCommits}
                label="weekends"
              />
            </motion.div>
          </motion.div>
        )}
      </div>
    </WrappedSlide>
  );
}

function StatPillSmall({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-slate-200/60 rounded-full shadow-sm shadow-violet-200/50">
      <span className="text-violet-400">{icon}</span>
      <span className="text-slate-800 font-semibold text-sm">{value}</span>
      <span className="text-slate-600 text-xs">{label}</span>
    </div>
  );
}
