/**
 * Constants for the Year Wrapped feature
 */

// Animation timing constants (in milliseconds)
export const INTRO_ANIMATION_TIMINGS = {
  SHATTER_DELAY: 1200,
  LINES_DELAY: 2000,
  LINE_1_DELAY: 3000,
  LINE_2_DELAY: 4000,
  READY_DELAY: 5000,
} as const;

// Commit count thresholds for fallback messages
export const COMMIT_THRESHOLDS = {
  LEGENDARY: 2000,   // "You're basically the machine now"
  EXCEPTIONAL: 1000, // "Commit machine engaged"
  IMPRESSIVE: 500,   // "Solid work ethic detected"
  SOLID: 100,        // "Quality over quantity"
} as const;

// Code symbols used in shatter animation
export const CODE_SYMBOLS = [
  '<', '/', '>', '{', '}', '(', ')', ';', '=', '+', '-', '*', '0', '1', 'fn', 'if', '[]'
] as const;

// Fragment animation settings
export const FRAGMENT_ANIMATION = {
  COUNT: 40,
  SPREAD: 400,
  MAX_ROTATION: 720,
  MIN_SCALE: 0.3,
  SCALE_RANGE: 0.5,
  MAX_DELAY: 0.2,
} as const;

// Count animation duration
export const COUNT_ANIMATION_DURATION = 1500;
