'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';
import { Calendar } from 'lucide-react';

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

const CONTRIBUTION_COLORS = ['bg-gray-100', 'bg-green-200', 'bg-green-400', 'bg-green-600', 'bg-green-800'];

const getContributionColor = (level: number): string => CONTRIBUTION_COLORS[level] || 'bg-gray-100';

type WeekData = {
  weekIndex: number;
  days: Array<{
    date: Date;
    count: number;
    dayOfWeek: number;
  } | null>;
  monthStart?: number; // If this week contains first day of a month
};

export function ContributionCalendarSlide({ contributionCalendar, year, totalCommits, user }: ContributionCalendarSlideProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [animatedWeeks, setAnimatedWeeks] = useState(0);

  // Build GitHub-style calendar: 7 rows (days), ~53 columns (weeks)
  const { weeks, monthLabels } = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Find the Sunday of the week containing Jan 1
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
        
        // Track month starts for labels
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
          week.days.push(null); // Empty cell for days outside the year
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Only add week if it has at least one day in the year
      if (week.days.some(d => d !== null)) {
        weeksData.push(week);
      }
      weekIndex++;
      
      // Safety break
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
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#f0fdf4"
      gradientTo="#ecfeff"
    >
      <div className="text-center space-y-4 md:space-y-6 w-full">
        {/* Header with Avatar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 md:gap-4 mb-4 md:mb-6"
        >
          {user && (
            <motion.img
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              src={user.avatarUrl}
              alt={user.username}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 md:border-4 border-white shadow-lg ring-1 md:ring-2 ring-gray-200/50"
            />
          )}
          <div className="text-left">
            {user && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xs md:text-sm font-medium text-gray-600 mb-0.5 md:mb-1"
              >
                @{user.username}
              </motion.p>
            )}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2"
            >
              <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
              <p className="text-[10px] md:text-xs uppercase tracking-wider md:tracking-widest text-gray-500">Your Contribution Calendar</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-1 md:space-y-2"
        >
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
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
            <div className="bg-white rounded-2xl p-2 md:p-4 border border-gray-200 shadow-lg overflow-hidden">
              {/* GitHub-style Calendar Grid - Scale to fit */}
              <div className="w-full flex justify-center overflow-hidden">
                <div className="scale-[0.7] sm:scale-[0.8] md:scale-90 lg:scale-100 origin-top-left md:origin-top">
                  <div className="inline-block">
                    {/* Month labels row */}
                    <div className="flex mb-1">
                      <div className="w-7 shrink-0" /> {/* Spacer for day labels */}
                      <div className="flex relative" style={{ gap: '3px' }}>
                        {weeks.map((week, weekIdx) => {
                          const monthLabel = monthLabels.find(m => m.weekIndex === week.weekIndex);
                          return (
                            <div key={`month-${weekIdx}`} className="w-[11px] text-[9px] text-gray-500 font-medium">
                              {monthLabel ? MONTH_NAMES[monthLabel.month] : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Calendar grid: 7 rows (days) x ~53 columns (weeks) */}
                    <div className="flex">
                      {/* Day labels column */}
                      <div className="flex flex-col shrink-0 mr-1" style={{ gap: '3px' }}>
                        {DAY_LABELS.map((label, idx) => (
                          <div key={`day-${idx}`} className="h-[11px] w-6 text-[9px] text-gray-500 font-medium flex items-center justify-end pr-1">
                            {label}
                          </div>
                        ))}
                      </div>
                      
                      {/* Weeks columns */}
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
                                    className={`w-[11px] h-[11px] rounded-sm ${color} border border-gray-200/50 hover:scale-150 transition-transform cursor-pointer hover:border-gray-400`}
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
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                      <span className="text-[10px] text-gray-500">Less</span>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map(level => (
                          <div
                            key={level}
                            className={`w-[11px] h-[11px] rounded-sm ${getContributionColor(level)} border border-gray-200/50`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500">More</span>
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

