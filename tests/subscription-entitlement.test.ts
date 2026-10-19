import { expect, test } from 'bun:test';
import { isSubscriptionCurrent } from '../src/lib/utils/user-plan';

const now = new Date('2026-10-19T12:00:00Z');

test('AI entitlement ends at the subscription period boundary', () => {
  expect(isSubscriptionCurrent({ status: 'active', currentPeriodEnd: new Date('2026-10-19T12:00:01Z') }, now)).toBe(true);
  expect(isSubscriptionCurrent({ status: 'active', currentPeriodEnd: now }, now)).toBe(false);
  expect(isSubscriptionCurrent({ status: 'active', currentPeriodEnd: new Date('2026-10-19T11:59:59Z') }, now)).toBe(false);
  expect(isSubscriptionCurrent({ status: 'canceled', currentPeriodEnd: new Date('2026-10-20T12:00:00Z') }, now)).toBe(false);
});
