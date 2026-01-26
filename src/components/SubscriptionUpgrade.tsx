"use client";

import { ContextualUpgrade, type UpgradeFeature } from '@/components/ContextualUpgrade';

interface SubscriptionUpgradeProps {
  className?: string;
  onUpgrade?: () => void;
  feature?: UpgradeFeature;
  variant?: 'card' | 'inline' | 'banner';
}

/**
 * SubscriptionUpgrade - Shows contextual upgrade prompts
 *
 * Use the `feature` prop to customize messaging based on what the user was trying to do:
 * - 'wiki' - For wiki generation pages
 * - 'scorecard' - For scorecard/analysis pages
 * - 'diagram' - For architecture diagram pages
 * - 'ai-slop' - For AI slop detection pages
 * - 'review' - For code review features
 * - 'private' - For private repo access
 * - 'general' - Default generic upgrade prompt
 */
export function SubscriptionUpgrade({
  className = "",
  feature = 'general',
  variant = 'card',
}: SubscriptionUpgradeProps) {
  return (
    <ContextualUpgrade
      feature={feature}
      variant={variant}
      className={className}
    />
  );
} 