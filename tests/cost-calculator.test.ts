import { describe, expect, test } from 'bun:test';
import {
  calculateDailyCostAndRevenue,
  calculatePerUserCostAndUsage,
  calculatePlatformCost,
  calculateTokenCost,
  calculateTotalCost,
  formatCost,
} from '../src/lib/utils/cost-calculator';

function usage(model: string, inputTokens = 1_000_000, outputTokens = 1_000_000, createdAt?: Date) {
  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    createdAt,
  };
}

describe('Gemini Standard paid-tier token estimates', () => {
  test('prices 3.1 Pro on both sides of the 200k input threshold', () => {
    const small = calculateTokenCost(usage('models/gemini-3.1-pro-preview', 200_000, 1_000));
    expect(small.inputCost).toBeCloseTo(0.4);
    expect(small.outputCost).toBeCloseTo(0.012);

    const large = calculateTokenCost(usage('gemini-3.1-pro-preview', 200_001, 1_000));
    expect(large.inputCost).toBeCloseTo(0.800004);
    expect(large.outputCost).toBeCloseTo(0.018);
  });

  test('prices 3.1 Flash-Lite and its historically mislabeled usage rows', () => {
    for (const model of ['gemini-3.1-flash-lite', 'gemini-3.1-flash']) {
      const cost = calculateTokenCost(usage(model));
      expect(cost.inputCost).toBeCloseTo(0.25);
      expect(cost.outputCost).toBeCloseTo(1.5);
    }
  });

  test('prices 3.5 Flash-Lite and 3 Flash separately from 2.5 Flash', () => {
    const flashLite = calculateTokenCost(usage('gemini-3.5-flash-lite'));
    expect(flashLite.inputCost).toBeCloseTo(0.3);
    expect(flashLite.outputCost).toBeCloseTo(2.5);

    const flash = calculateTokenCost(usage('gemini-3-flash-preview'));
    expect(flash.inputCost).toBeCloseTo(0.5);
    expect(flash.outputCost).toBeCloseTo(3);
  });

  test('uses the usage date for the 3.8 Flash January 2027 price change', () => {
    const intro = calculateTokenCost(usage('gemini-3.8-flash', 1_000_000, 1_000_000, new Date('2026-12-31T23:59:59Z')));
    expect(intro.inputCost).toBeCloseTo(0.75);
    expect(intro.outputCost).toBeCloseTo(3.75);

    const standard = calculateTokenCost(usage('gemini-3.8-flash', 1_000_000, 1_000_000, new Date('2027-01-01T00:00:00Z')));
    expect(standard.inputCost).toBeCloseTo(1.5);
    expect(standard.outputCost).toBeCloseTo(7.5);
  });

  test('retains sub-cent costs across small usage records', () => {
    const record = usage('gemini-3.1-flash-lite', 1_000, 100);
    expect(calculateTokenCost(record).totalCost).toBeCloseTo(0.0004);
    expect(calculateTotalCost(Array.from({ length: 100 }, () => record)).totalCost).toBeCloseTo(0.04);
    expect(formatCost(0.0004)).toBe('$0.0004');
  });

  test('counts BYOK tokens but excludes them from platform cost', () => {
    const managed = { ...usage('gemini-3.1-flash-lite', 1_000_000, 0), isByok: false };
    const byok = { ...usage('gemini-3.1-pro-preview', 1_000_000, 1_000_000), isByok: true };

    expect(calculatePlatformCost([managed, byok]).totalCost).toBeCloseTo(0.25);
    expect(calculateTotalCost([managed, byok]).totalCost).toBeGreaterThan(0.25);

    const perUser = calculatePerUserCostAndUsage([
      { ...managed, userId: 'user-a' },
      { ...byok, userId: 'user-a' },
    ]);
    expect(perUser.get('user-a')).toMatchObject({
      totalCost: 0.25,
      totalTokens: 3_000_000,
      managedTokens: 1_000_000,
      byokTokens: 2_000_000,
    });
  });

  test('passes usage dates through daily and per-user calculations', () => {
    const oldUsage = { ...usage('gemini-3.8-flash', 1_000_000, 0, new Date('2026-12-31T12:00:00Z')), isByok: false };
    const newUsage = { ...usage('gemini-3.8-flash', 1_000_000, 0, new Date('2027-01-01T12:00:00Z')), isByok: false };
    const daily = calculateDailyCostAndRevenue({
      usages: [oldUsage, newUsage],
      subscriptions: [],
      days: [new Date('2026-12-31T00:00:00Z'), new Date('2027-01-01T00:00:00Z')],
      getPlanPrice: () => 0,
    });
    expect(daily.map(day => day.cost)).toEqual([0.75, 1.5]);

    const byokDaily = calculateDailyCostAndRevenue({
      usages: [{ ...oldUsage, isByok: true }, newUsage],
      subscriptions: [],
      days: [new Date('2026-12-31T00:00:00Z'), new Date('2027-01-01T00:00:00Z')],
      getPlanPrice: () => 0,
    });
    expect(byokDaily.map(day => day.cost)).toEqual([0, 1.5]);

    const perUser = calculatePerUserCostAndUsage([
      { ...oldUsage, userId: 'user-a', isByok: false },
      { ...newUsage, userId: 'user-a', isByok: false },
    ]);
    expect(perUser.get('user-a')?.totalCost).toBeCloseTo(2.25);
  });
});
