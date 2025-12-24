'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { WrappedSlide } from '../WrappedSlide';
import { Calendar } from 'lucide-react';

interface ContributionCalendarSlideProps {
  contributionCalendar: Record<string, number>;
  year: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

function getContributionColor(level: number): string {
  switch (level) {
    case 0: return 'bg-gray-100';
    case 1: return 'bg-green-200';
    case 2: return 'bg-green-400';
    case 3: return 'bg-green-600';
    case 4: return 'bg-green-800';
    default: return 'bg-gray-100';
  }
}

export function ContributionCalendarSlide({ contributionCalendar, year }: ContributionCalendarSlideProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [animatedDays, setAnimatedDays] = useState(0);

  // Build calendar data for the year
  const calendarData = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const days: Array<{ date: Date; count: number; dayOfWeek: number }> = [];
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const count = contributionCalendar[dateKey] || 0;
      days.push({
        date: new Date(currentDate),
        count,
        dayOfWeek: currentDate.getDay(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
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
    
    const totalDays = calendarData.length;
    const interval = setInterval(() => {
      setAnimatedDays(prev => {
        if (prev >= totalDays) {
          clearInterval(interval);
          return totalDays;
        }
        return prev + 10;
      });
    }, 20);
    
    return () => clearInterval(interval);
  }, [showCalendar, calendarData.length]);

  // Group days by month for display
  const months = useMemo(() => {
    const grouped: Record<number, typeof calendarData> = {};
    calendarData.forEach(day => {
      const month = day.date.getMonth();
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(day);
    });
    return grouped;
  }, [calendarData]);

  const totalContributions = Object.values(contributionCalendar).reduce((sum, count) => sum + count, 0);

  return (
    <WrappedSlide
      gradientFrom="#ffffff"
      gradientVia="#f0fdf4"
      gradientTo="#ecfeff"
    >
      <div className="text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <p className="text-sm uppercase tracking-widest text-gray-500">Your Contribution Calendar</p>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            {totalContributions.toLocaleString()} contributions in {year}
          </h2>
        </motion.div>

        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-lg max-w-4xl mx-auto"
          >
            {/* Calendar Grid */}
            <div className="space-y-3">
              {/* Day labels */}
              <div className="flex gap-1 mb-2">
                <div className="w-8"></div>
                {DAY_NAMES.map(day => (
                  <div key={day} className="flex-1 text-center text-[9px] text-gray-500 font-medium">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar squares */}
              <div className="space-y-1">
                {Object.entries(months).map(([monthIndex, days]) => {
                  const monthNum = parseInt(monthIndex);
                  const firstDayOfWeek = days[0]?.dayOfWeek ?? 0;
                  
                  return (
                    <div key={monthNum} className="flex gap-1 items-start">
                      {/* Month label */}
                      <div className="w-8 text-[9px] text-gray-600 font-medium pt-1">
                        {MONTH_NAMES[monthNum]}
                      </div>
                      
                      {/* Days grid */}
                      <div className="flex-1 flex gap-1 flex-wrap">
                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                          <div key={`empty-${i}`} className="w-3 h-3" />
                        ))}
                        
                        {/* Actual days */}
                        {days.map((day, idx) => {
                          const isAnimated = idx < animatedDays;
                          const level = getContributionLevel(day.count, maxCount);
                          const color = getContributionColor(level);
                          
                          return (
                            <motion.div
                              key={day.date.toISOString()}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={isAnimated ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                              transition={{ delay: idx * 0.001 }}
                              className={`w-3 h-3 rounded-sm ${color} border border-gray-200 hover:scale-125 transition-transform cursor-pointer`}
                              title={`${day.date.toLocaleDateString()}: ${day.count} ${day.count === 1 ? 'contribution' : 'contributions'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                <span className="text-[10px] text-gray-500">Less</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className={`w-3 h-3 rounded-sm ${getContributionColor(level)} border border-gray-200`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-500">More</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </WrappedSlide>
  );
}

