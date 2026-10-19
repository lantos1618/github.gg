// Gemini API Standard paid-tier pricing, USD per 1M tokens, as of October 2026.
// Source: https://ai.google.dev/gemini-api/docs/pricing
// These are token-only estimates: usage records do not track cached input,
// audio input, batch requests, grounding, or other separately billed features.

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  createdAt?: Date | string;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

type ModelPricing = { input: number; output: number };

const GEMINI_2_5_FLASH_PRICING: ModelPricing = { input: 0.30, output: 2.50 };
const GEMINI_2_5_PRO_SMALL: ModelPricing = { input: 1.25, output: 10.00 };
const GEMINI_2_5_PRO_LARGE: ModelPricing = { input: 2.50, output: 15.00 };
const GEMINI_3_FLASH_PRICING: ModelPricing = { input: 0.50, output: 3.00 };
const GEMINI_3_1_FLASH_LITE_PRICING: ModelPricing = { input: 0.25, output: 1.50 };
const GEMINI_3_1_PRO_SMALL: ModelPricing = { input: 2.00, output: 12.00 };
const GEMINI_3_1_PRO_LARGE: ModelPricing = { input: 4.00, output: 18.00 };
const GEMINI_3_5_FLASH_LITE_PRICING: ModelPricing = { input: 0.30, output: 2.50 };
const GEMINI_3_8_FLASH_INTRO: ModelPricing = { input: 0.75, output: 3.75 };
const GEMINI_3_8_FLASH_STANDARD: ModelPricing = { input: 1.50, output: 7.50 };
const GEMINI_3_8_FLASH_PRICE_CHANGE = Date.parse('2027-01-01T00:00:00Z');

function getModelPricing({ model, inputTokens, createdAt }: TokenUsage): ModelPricing {
  const modelId = model.replace(/^models\//, '');

  if (modelId.startsWith('gemini-3.1-pro-preview')) {
    return inputTokens > 200_000 ? GEMINI_3_1_PRO_LARGE : GEMINI_3_1_PRO_SMALL;
  }
  if (modelId === 'gemini-3.1-flash-lite' || modelId === 'gemini-3.1-flash') {
    // Historical ai-slop rows logged "gemini-3.1-flash", but used Flash-Lite.
    return GEMINI_3_1_FLASH_LITE_PRICING;
  }
  if (modelId === 'gemini-3.5-flash-lite') {
    return GEMINI_3_5_FLASH_LITE_PRICING;
  }
  if (modelId === 'gemini-3.8-flash') {
    const usedAt = createdAt ? new Date(createdAt).getTime() : Date.now();
    return usedAt < GEMINI_3_8_FLASH_PRICE_CHANGE
      ? GEMINI_3_8_FLASH_INTRO
      : GEMINI_3_8_FLASH_STANDARD;
  }
  if (modelId === 'gemini-3-flash-preview') {
    return GEMINI_3_FLASH_PRICING;
  }
  if (modelId.startsWith('gemini-2.5-pro')) {
    return inputTokens > 200_000 ? GEMINI_2_5_PRO_LARGE : GEMINI_2_5_PRO_SMALL;
  }
  // Retain the previous 2.5 Flash fallback for older records with unknown IDs.
  return GEMINI_2_5_FLASH_PRICING;
}

/**
 * Calculate the cost for token usage based on the model used
 */
export function calculateTokenCost(usage: TokenUsage): CostBreakdown {
  const { inputTokens, outputTokens } = usage;
  const pricing = getModelPricing(usage);
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    currency: 'USD',
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 4, // Show 4 decimal places for small amounts
    maximumFractionDigits: 6,
  }).format(cost);
}

/**
 * Calculate total cost for multiple usage records
 */
export function calculateTotalCost(usages: TokenUsage[]): CostBreakdown {
  let totalInputCost = 0;
  let totalOutputCost = 0;
  
  usages.forEach(usage => {
    const cost = calculateTokenCost(usage);
    totalInputCost += cost.inputCost;
    totalOutputCost += cost.outputCost;
  });
  
  return {
    inputCost: totalInputCost,
    outputCost: totalOutputCost,
    totalCost: totalInputCost + totalOutputCost,
    currency: 'USD',
  };
}

/**
 * Calculate daily cost and revenue for a given set of usage and subscriptions.
 * @param usages Array of token usage records
 * @param subscriptions Array of subscription records
 * @param days Array of Date objects (each day to report on)
 * @param getPlanPrice Function to get plan price from plan string
 * @returns Array of { date, cost, revenue }
 */
export function calculateDailyCostAndRevenue({ usages, subscriptions, days, getPlanPrice }: {
  usages: Array<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model?: string;
    createdAt?: Date;
  }>;
  subscriptions: Array<{
    currentPeriodEnd: Date;
    status: string;
    plan: string;
  }>;
  days: Date[];
  getPlanPrice: (plan: string) => number;
}) {
  return days.map(date => {
    const dayStr = date.toISOString().slice(0, 10);
    // Cost: sum of token usage for this day
    const cost = usages.filter(u => u.createdAt && u.createdAt.toISOString().slice(0, 10) === dayStr)
      .reduce((sum, u) => {
        if (!u.createdAt) return sum;
        const costObj = calculateTokenCost({
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
          totalTokens: u.totalTokens,
          model: u.model || 'gemini-3.1-pro-preview',
          createdAt: u.createdAt,
        });
        return sum + costObj.totalCost;
      }, 0);
    // Revenue: sum of all active subscriptions on this day
    const revenue = subscriptions.filter(s => {
      // Subscription is active if currentPeriodEnd >= this day
      return new Date(s.currentPeriodEnd) >= date && s.status === 'active';
    }).reduce((sum, s) => sum + getPlanPrice(s.plan), 0);
    return { date: dayStr, cost, revenue };
  });
}

/**
 * Calculate per-user cost and token usage for a set of usage records.
 * @param usages Array of token usage records (must include userId)
 * @returns Map of userId to { totalCost, totalTokens, byokTokens, managedTokens }
 */
export function calculatePerUserCostAndUsage(usages: Array<{
  userId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  isByok: boolean;
  model?: string;
  createdAt?: Date | string;
}>): Map<string, { totalCost: number; totalTokens: number; byokTokens: number; managedTokens: number; }> {
  const userMap = new Map<string, { totalCost: number; totalTokens: number; byokTokens: number; managedTokens: number; }>();
  usages.forEach(u => {
    const costObj = calculateTokenCost({
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
      model: u.model || 'gemini-3.1-pro-preview',
      createdAt: u.createdAt,
    });
    const prev = userMap.get(u.userId) || { totalCost: 0, totalTokens: 0, byokTokens: 0, managedTokens: 0 };
    userMap.set(u.userId, {
      totalCost: prev.totalCost + costObj.totalCost,
      totalTokens: prev.totalTokens + u.totalTokens,
      byokTokens: prev.byokTokens + (u.isByok ? u.totalTokens : 0),
      managedTokens: prev.managedTokens + (!u.isByok ? u.totalTokens : 0),
    });
  });
  return userMap;
}
