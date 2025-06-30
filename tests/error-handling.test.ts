#!/usr/bin/env bun

import { test, expect, describe } from 'bun:test';
import { isSubscriptionError, getErrorDisplayConfig } from '../src/lib/utils/errorHandling';

describe('Error Handling Tests', () => {
  describe('Subscription Error Detection', () => {
    test('detects subscription required errors', () => {
      const error = 'Active subscription required for AI features';
      expect(isSubscriptionError(error)).toBe(true);
    });

    test('detects forbidden errors', () => {
      const error = 'FORBIDDEN: Subscription required';
      expect(isSubscriptionError(error)).toBe(true);
    });

    test('detects 403 errors', () => {
      const error = '403: Access denied';
      expect(isSubscriptionError(error)).toBe(true);
    });

    test('detects API key errors', () => {
      const error = 'Please add your Gemini API key in settings to use this feature';
      expect(isSubscriptionError(error)).toBe(true);
    });

    test('does not detect non-subscription errors', () => {
      const error = 'Rate limit exceeded';
      expect(isSubscriptionError(error)).toBe(false);
    });

    test('handles null errors', () => {
      expect(isSubscriptionError(null)).toBe(false);
    });

    test('handles empty errors', () => {
      expect(isSubscriptionError('')).toBe(false);
    });
  });

  describe('Error Display Configuration', () => {
    test('returns subscription config for subscription errors', () => {
      const error = 'Active subscription required for AI features';
      const config = getErrorDisplayConfig(error);
      
      expect(config.isSubscription).toBe(true);
      expect(config.isRateLimit).toBe(false);
      expect(config.icon).toBe('🔒');
      expect(config.title).toBe('Subscription Required');
      expect(config.titleColor).toBe('text-blue-600');
      expect(config.showUpgradeButton).toBe(true);
    });

    test('returns rate limit config for rate limit errors', () => {
      const error = 'Rate limit exceeded';
      const config = getErrorDisplayConfig(error);
      
      expect(config.isSubscription).toBe(false);
      expect(config.isRateLimit).toBe(true);
      expect(config.icon).toBe('🚫');
      expect(config.title).toBe('Rate Limit Exceeded');
      expect(config.titleColor).toBe('text-orange-600');
      expect(config.showUpgradeButton).toBe(false);
    });

    test('returns generic config for other errors', () => {
      const error = 'Some other error occurred';
      const config = getErrorDisplayConfig(error);
      
      expect(config.isSubscription).toBe(false);
      expect(config.isRateLimit).toBe(false);
      expect(config.icon).toBe('❌');
      expect(config.title).toBe('Error');
      expect(config.titleColor).toBe('text-red-600');
      expect(config.showUpgradeButton).toBe(false);
    });

    test('handles null errors', () => {
      const config = getErrorDisplayConfig(null);
      
      expect(config.isSubscription).toBe(false);
      expect(config.isRateLimit).toBe(false);
      expect(config.icon).toBe('❌');
      expect(config.title).toBe('Error');
    });
  });

  describe('Error Message Patterns', () => {
    test('detects various subscription error patterns', () => {
      const subscriptionErrors = [
        'Active subscription required for AI features',
        'Subscription required',
        'FORBIDDEN',
        '403',
        'Please add your Gemini API key',
        'You need a subscription to access this feature',
        'This feature requires a paid plan'
      ];

      subscriptionErrors.forEach(error => {
        expect(isSubscriptionError(error)).toBe(true);
      });
    });

    test('detects various rate limit error patterns', () => {
      const rateLimitErrors = [
        'Rate limit exceeded',
        '429 Too Many Requests',
        'Quota exceeded',
        'Resource exhausted',
        'Too many requests'
      ];

      rateLimitErrors.forEach(error => {
        const config = getErrorDisplayConfig(error);
        expect(config.isRateLimit).toBe(true);
      });
    });
  });
}); 