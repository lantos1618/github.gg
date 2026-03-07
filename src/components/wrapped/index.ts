// Theme constants and types
export { WRAPPED_THEME, WRAPPED_STYLES } from './wrapped-theme';
export type { UserHeaderProps, SlideCardProps, StatPillProps, AnimatedCounterProps, StaggeredTextProps } from './wrapped-theme';

// Presentational primitives
export { UserHeader, SlideCard, AIBadge, StatPill } from './wrapped-primitives';

// Animation components
export { AnimatedCounter, StaggeredText, Confetti } from './wrapped-animations';

// Main slide container
export { WrappedSlide } from './WrappedSlide';

// Story & generation
export { WrappedStory } from './WrappedStory';
export { StarGate } from './StarGate';
export {
  useWrappedGeneration,
  useGenerateForFriend,
  type GenerationOptions,
  type GenerateForFriendOptions,
  type LogEntry,
} from './hooks/useWrappedGeneration';

// Slide components
export { IntroSlide } from './slides/IntroSlide';
export { CommitsSlide } from './slides/CommitsSlide';
export { LanguagesSlide } from './slides/LanguagesSlide';
export { ScheduleSlide } from './slides/ScheduleSlide';
export { ContributionCalendarSlide } from './slides/ContributionCalendarSlide';
export { HighlightsSlide } from './slides/HighlightsSlide';
export { TraumaSlide } from './slides/TraumaSlide';
export { PersonalitySlide } from './slides/PersonalitySlide';
export { PredictionSlide } from './slides/PredictionSlide';
export { CodeQualitySlide } from './slides/CodeQualitySlide';
export { ShareSlide } from './slides/ShareSlide';
