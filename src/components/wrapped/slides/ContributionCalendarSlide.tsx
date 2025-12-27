'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide, UserHeader, WRAPPED_THEME, WRAPPED_STYLES } from '../WrappedSlide';

interface ContributionCalendarSlideProps {
  contributionCalendar: Record<string, number>;
  year: number;
  totalCommits: number;
  user?: { username: string; avatarUrl: string };
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getContributionLevel(count: number, maxCount: number): number {
  if (count === 0) return 0;
  if (maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

// Violet-based contribution colors for light theme
const CONTRIBUTION_COLORS = [
  'bg-slate-100',           // Level 0 - empty
  'bg-violet-200',          // Level 1
  'bg-violet-400',          // Level 2
  'bg-violet-500',          // Level 3
  'bg-violet-600',          // Level 4 - max
];

const getContributionColor = (level: number): string => CONTRIBUTION_COLORS[level] || 'bg-slate-100';

type WeekData = {
  weekIndex: number;
  days: Array<{
    date: Date;
    count: number;
    dayOfWeek: number;
  } | null>;
  monthStart?: number;
};

export function ContributionCalendarSlide({ contributionCalendar, year, totalCommits, user }: ContributionCalendarSlideProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [animatedWeeks, setAnimatedWeeks] = useState(0);

  const { weeks, monthLabels } = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const firstSunday = new Date(startDate);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());

    const weeksData: WeekData[] = [];
    const monthLabelPositions: { month: number; weekIndex: number }[] = [];
    let currentDate = new Date(firstSunday);
    let weekIndex = 0;
    let lastMonthSeen = -1;

    while (currentDate <= endDate || currentDate.getDay() !== 0) {
      const week: WeekData = {
        weekIndex,
        days: [],
      };

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const isInYear = currentDate.getFullYear() === year;
        const dateKey = currentDate.toISOString().split('T')[0];
        const count = contributionCalendar[dateKey] || 0;

        const currentMonth = currentDate.getMonth();
        if (isInYear && currentMonth !== lastMonthSeen && currentDate.getDate() <= 7) {
          monthLabelPositions.push({ month: currentMonth, weekIndex });
          lastMonthSeen = currentMonth;
        }

        if (isInYear) {
          week.days.push({
            date: new Date(currentDate),
            count,
            dayOfWeek,
          });
        } else {
          week.days.push(null);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (week.days.some(d => d !== null)) {
        weeksData.push(week);
      }
      weekIndex++;

      if (weekIndex > 60) break;
    }

    return { weeks: weeksData, monthLabels: monthLabelPositions };
  }, [contributionCalendar, year]);

  const maxCount = useMemo(() => {
    return Math.max(...Object.values(contributionCalendar), 1);
  }, [contributionCalendar]);

  useEffect(() => {
    const timer = setTimeout(() => setShowCalendar(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showCalendar) return;

    const totalWeeks = weeks.length;
    const interval = setInterval(() => {
      setAnimatedWeeks(prev => {
        if (prev >= totalWeeks) {
          clearInterval(interval);
          return totalWeeks;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [showCalendar, weeks.length]);

  return (
    <WrappedSlide glowPosition="top">
      <div className="text-center space-y-6 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 md:gap-4 mb-4"
        >
          {user && (
            <UserHeader username={user.username} avatarUrl={user.avatarUrl} />
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={WRAPPED_STYLES.sectionLabel}
        >
          Contribution Calendar
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-1"
        >
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            {totalCommits.toLocaleString()} commits in {year}
          </h2>
        </motion.div>

        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-full mx-auto px-2"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-slate-200/60 shadow-sm overflow-hidden">
              {/* Calendar Grid */}
              <div className="w-full flex justify-center overflow-hidden">
                <div className="scale-[0.65] sm:scale-[0.75] md:scale-90 lg:scale-100 origin-top-left md:origin-top">
                  <div className="inline-block">
                    {/* Month labels row */}
                    <div className="flex mb-1">
                      <div className="w-7 shrink-0" />
                      <div className="flex relative" style={{ gap: '3px' }}>
                        {weeks.map((week, weekIdx) => {
                          const monthLabel = monthLabels.find(m => m.weekIndex === week.weekIndex);
                          return (
                            <div key={`month-${weekIdx}`} className="w-[11px] text-[9px] text-slate-500 font-medium">
                              {monthLabel ? MONTH_NAMES[monthLabel.month] : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Calendar grid */}
                    <div className="flex">
                      {/* Day labels */}
                      <div className="flex flex-col shrink-0 mr-1" style={{ gap: '3px' }}>
                        {DAY_LABELS.map((label, idx) => (
                          <div key={`day-${idx}`} className="h-[11px] w-6 text-[9px] text-slate-500 font-medium flex items-center justify-end pr-1">
                            {label}
                          </div>
                        ))}
                      </div>

                      {/* Weeks */}
                      <div className="flex" style={{ gap: '3px' }}>
                        {weeks.map((week, weekIdx) => {
                          const isAnimated = weekIdx < animatedWeeks;

                          return (
                            <div key={`week-${weekIdx}`} className="flex flex-col" style={{ gap: '3px' }}>
                              {week.days.map((day, dayIdx) => {
                                if (!day) {
                                  return <div key={`empty-${dayIdx}`} className="w-[11px] h-[11px]" />;
                                }

                                const level = getContributionLevel(day.count, maxCount);
                                const color = getContributionColor(level);

                                return (
                                  <motion.div
                                    key={day.date.toISOString()}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={isAnimated ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                                    transition={{ delay: dayIdx * 0.02 }}
                                    className={`w-[11px] h-[11px] rounded-sm ${color} border border-slate-200/40 hover:scale-150 transition-transform cursor-pointer hover:ring-2 hover:ring-violet-400/50`}
                                    title={`${day.date.toLocaleDateString()}: ${day.count} ${day.count === 1 ? 'contribution' : 'contributions'}`}
                                  />
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-200/50">
                      <span className="text-[10px] text-slate-500">Less</span>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map(level => (
                          <div
                            key={level}
                            className={`w-[11px] h-[11px] rounded-sm ${getContributionColor(level)} border border-slate-200/40`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500">More</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </WrappedSlide>
  );
}
