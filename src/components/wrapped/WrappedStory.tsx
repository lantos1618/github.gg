'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { WrappedData } from '@/lib/types/wrapped';
import { IntroSlide } from './slides/IntroSlide';
import { CommitsSlide } from './slides/CommitsSlide';
import { LanguagesSlide } from './slides/LanguagesSlide';
import { ScheduleSlide } from './slides/ScheduleSlide';
import { HighlightsSlide } from './slides/HighlightsSlide';
import { PersonalitySlide } from './slides/PersonalitySlide';
import { ShareSlide } from './slides/ShareSlide';
import { cn } from '@/lib/utils';

interface WrappedStoryProps {
  data: WrappedData;
  onClose?: () => void;
}

const SLIDE_COUNT = 7;

export function WrappedStory({ data, onClose }: WrappedStoryProps) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.push('/wrapped');
    }
  }, [onClose, router]);

  const goToSlide = useCallback((index: number) => {
    if (index < 0) return;
    if (index >= SLIDE_COUNT) {
      handleClose();
      return;
    }
    setCurrentSlide(index);
  }, [handleClose]);

  const goNext = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const goPrev = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'Escape':
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, handleClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  }, [goNext, goPrev]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    
    if (x < third) {
      goPrev();
    } else {
      goNext();
    }
  }, [goNext, goPrev]);

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return <IntroSlide username={data.username} year={data.year} />;
      case 1:
        return (
          <CommitsSlide
            totalCommits={data.stats.totalCommits}
            totalPRs={data.stats.totalPRs}
            totalPRsMerged={data.stats.totalPRsMerged}
            linesAdded={data.stats.linesAdded}
            linesDeleted={data.stats.linesDeleted}
          />
        );
      case 2:
        return <LanguagesSlide languages={data.stats.languages} />;
      case 3:
        return (
          <ScheduleSlide
            commitsByHour={data.stats.commitsByHour}
            peakHour={data.stats.peakHour}
            peakDay={data.stats.peakDay}
            lateNightCommits={data.stats.lateNightCommits}
            weekendCommits={data.stats.weekendCommits}
            longestStreak={data.stats.longestStreak}
          />
        );
      case 4:
        return (
          <HighlightsSlide
            username={data.username}
            avatarUrl={`https://github.com/${data.username}.png`}
            aiInsights={data.aiInsights}
            stats={data.stats}
          />
        );
      case 5:
        return (
          <PersonalitySlide
            aiInsights={data.aiInsights}
            stats={{
              peakHour: data.stats.peakHour,
              lateNightCommits: data.stats.lateNightCommits,
              longestStreak: data.stats.longestStreak,
              topLanguage: data.stats.languages[0]?.name,
            }}
          />
        );
      case 6:
        return <ShareSlide data={data} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gray-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      <div className="absolute top-0 left-0 right-0 z-50 p-3 flex gap-1.5">
        {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 rounded-full bg-gray-300 overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: index < currentSlide
                  ? '100%'
                  : index === currentSlide
                  ? '100%'
                  : '0%',
              }}
              transition={{
                duration: index === currentSlide ? 0.3 : 0,
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="absolute top-12 right-4 z-50 p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
      >
        <X className="w-5 h-5 text-gray-700" />
      </button>

      <div className="hidden md:flex absolute inset-y-0 left-4 z-50 items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className={cn(
            'p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-all shadow-sm',
            currentSlide === 0 && 'opacity-0 pointer-events-none'
          )}
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="hidden md:flex absolute inset-y-0 right-4 z-50 items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-all shadow-sm"
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-50">
        {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(index);
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentSlide
                ? 'bg-purple-500 scale-125'
                : 'bg-gray-300 hover:bg-gray-400'
            )}
          />
        ))}
      </div>
    </div>
  );
}
