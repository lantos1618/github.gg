'use client';

import posthog from 'posthog-js';
import type { PostHog } from 'posthog-js';

// Check if PostHog is properly configured
const isPostHogConfigured = () => {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY &&
         process.env.NEXT_PUBLIC_POSTHOG_KEY !== 'undefined' &&
         process.env.NEXT_PUBLIC_POSTHOG_KEY !== '';
};

// Lazy initialization - only initialize when needed
let posthogInstance: PostHog | null = null;
let initAttempted = false;

// Initialize PostHog with development fallbacks
export const initializePostHog = () => {
  // Return cached instance if already initialized
  if (initAttempted) {
    return posthogInstance;
  }

  initAttempted = true;

  if (!isPostHogConfigured()) {
    console.log('📊 PostHog not configured - running in development mode without analytics');
    return null;
  }

  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug();
          console.log('📊 PostHog initialized in development mode');
        }
      }
    });
    posthogInstance = posthog;
    return posthog;
  } catch (error) {
    console.error('Failed to initialize PostHog:', error);
    return null;
  }
};

// Get PostHog instance (lazy init)
export const getPostHog = () => {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    return null;
  }

  if (!posthogInstance && !initAttempted) {
    initializePostHog();
  }
  return posthogInstance;
};

// Safe PostHog wrapper functions
export const safePostHog = {
  capture: (event: string, properties?: Record<string, unknown>) => {
    const ph = getPostHog();
    if (ph && isPostHogConfigured()) {
      ph.capture(event, properties);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('📊 [DEV] PostHog Event:', event, properties);
    }
  },

  identify: (distinctId: string, properties?: Record<string, unknown>) => {
    const ph = getPostHog();
    if (ph && isPostHogConfigured()) {
      ph.identify(distinctId, properties);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('📊 [DEV] PostHog Identify:', distinctId, properties);
    }
  },

  reset: () => {
    const ph = getPostHog();
    if (ph && isPostHogConfigured()) {
      ph.reset();
    } else if (process.env.NODE_ENV === 'development') {
      console.log('📊 [DEV] PostHog Reset');
    }
  },

  isFeatureEnabled: (flag: string) => {
    const ph = getPostHog();
    if (ph && isPostHogConfigured()) {
      return ph.isFeatureEnabled(flag);
    }
    return false;
  }
};

// Export lazy getter for posthog instance
export { getPostHog as posthogInstance }; 