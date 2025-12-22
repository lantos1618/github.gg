'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';
import { Clock, Flame, Moon, Calendar } from 'lucide-react';

interface ScheduleSlideProps {
  commitsByHour: number[];
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

export function ScheduleSlide({
  commitsByHour,
  peakHour,
  peakDay,
  lateNightCommits,
  weekendCommits,
  longestStreak,
}: ScheduleSlideProps) {
  const [showDetails, setShowDetails] = useState(false);
  const maxCommits = Math.max(...commitsByHour, 1);
  const roast = getScheduleRoast(peakHour, lateNightCommits, weekendCommits);

  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <WrappedSlide variant="gradient">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">Your Coding Schedule</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">When do you code?</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-end justify-between h-28 md:h-36 gap-px">
            {commitsByHour.map((commits, hour) => {
              const height = (commits / maxCommits) * 100;
              const isPeak = hour === peakHour;
              
              return (
                <motion.div
                  key={hour}
                  className="flex-1 flex flex-col items-center"
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                >
                  <div className="relative w-full flex justify-center" style={{ height: '100%' }}>
                    {isPeak && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.5, type: 'spring' }}
                        className="absolute -top-6 left-1/2 -translate-x-1/2 z-10"
                      >
                        <div className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          PEAK
                        </div>
                        <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-purple-600 mx-auto" />
                      </motion.div>
                    )}
                    <motion.div
                      className={`w-full max-w-[10px] md:max-w-[12px] rounded-t-sm ${
                        isPeak 
                          ? 'bg-purple-600' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      } transition-colors`}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 4)}%` }}
                      transition={{
                        duration: 0.4,
                        delay: 0.4 + hour * 0.03,
                        ease: 'easeOut',
                      }}
                      style={{ minHeight: '2px' }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          <div className="flex justify-between text-[9px] md:text-[10px] text-gray-400 mt-3 px-0">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>11pm</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm text-center"
        >
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-3">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Peak productivity</span>
          </div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl md:text-5xl font-black text-purple-600">
              {HOUR_LABELS_FULL[peakHour]}
            </span>
            <span className="text-gray-400 text-lg">on</span>
            <span className="text-4xl md:text-5xl font-black text-gray-900">
              {peakDay}s
            </span>
          </div>
        </motion.div>

        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
              <span className="text-2xl mr-2">{roast.emoji}</span>
              <p className="text-gray-700 inline">{roast.message}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={<Flame className="w-4 h-4 text-orange-500" />} value={longestStreak} label="day streak" />
              <StatCard icon={<Moon className="w-4 h-4 text-indigo-500" />} value={lateNightCommits} label="late night" />
              <StatCard icon={<Calendar className="w-4 h-4 text-blue-500" />} value={weekendCommits} label="weekend" />
            </div>
          </motion.div>
        )}
      </div>
    </WrappedSlide>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-200 text-center shadow-sm">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-[9px] text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}
