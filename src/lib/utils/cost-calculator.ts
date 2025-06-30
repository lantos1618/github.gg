// Gemini API Pricing Calculator
// Based on official pricing: https://ai.google.dev/pricing

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

// Gemini 2.5 Flash pricing (per 1M tokens)
const GEMINI_2_5_FLASH_PRICING = {
  input: 0.30, // $0.30 per 1M tokens
  output: 2.50, // $2.50 per 1M tokens
};

// Gemini 2.5 Pro pricing (per 1M tokens)
const GEMINI_2_5_PRO_PRICING = {
  input: {
    small: 1.25, // $1.25 per 1M tokens for prompts <= 200k tokens
    large: 2.50, // $2.50 per 1M tokens for prompts > 200k tokens
  },
  output: {
    small: 10.00, // $10.00 per 1M tokens for prompts <= 200k tokens
    large: 15.00, // $15.00 per 1M tokens for prompts > 200k tokens
  },
};

// Default model pricing (fallback)
const DEFAULT_PRICING = GEMINI_2_5_FLASH_PRICING;

/**
 * Calculate the cost for token usage based on the model used
 */
export function calculateTokenCost(usage: TokenUsage): CostBreakdown {
  const { promptTokens, completionTokens, totalTokens, model } = usage;
  
  let inputCost = 0;
  let outputCost = 0;
  
  // Determine pricing based on model
  if (model.includes('gemini-2.5-flash')) {
    inputCost = (promptTokens / 1_000_000) * GEMINI_2_5_FLASH_PRICING.input;
    outputCost = (completionTokens / 1_000_000) * GEMINI_2_5_FLASH_PRICING.output;
  } else if (model.includes('gemini-2.5-pro')) {
    // Determine if this is a small or large prompt
    const isLargePrompt = promptTokens > 200_000;
    
    const inputRate = isLargePrompt 
      ? GEMINI_2_5_PRO_PRICING.input.large 
      : GEMINI_2_5_PRO_PRICING.input.small;
    
    const outputRate = isLargePrompt 
      ? GEMINI_2_5_PRO_PRICING.output.large 
      : GEMINI_2_5_PRO_PRICING.output.small;
    
    inputCost = (promptTokens / 1_000_000) * inputRate;
    outputCost = (completionTokens / 1_000_000) * outputRate;
  } else {
    // Fallback to default pricing
    inputCost = (promptTokens / 1_000_000) * DEFAULT_PRICING.input;
    outputCost = (completionTokens / 1_000_000) * DEFAULT_PRICING.output;
  }
  
  const totalCost = inputCost + outputCost;
  
  return {
    inputCost: Math.round(inputCost * 100) / 100, // Round to 2 decimal places
    outputCost: Math.round(outputCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
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
    maximumFractionDigits: 4,
  }).format(cost);
}

/**
 * Calculate total cost for multiple usage records
 */
export function calculateTotalCost(usages: TokenUsage[]): CostBreakdown {
  let totalInputCost = 0;
  let totalOutputCost = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  
  usages.forEach(usage => {
    const cost = calculateTokenCost(usage);
    totalInputCost += cost.inputCost;
    totalOutputCost += cost.outputCost;
    totalPromptTokens += usage.promptTokens;
    totalCompletionTokens += usage.completionTokens;
  });
  
  return {
    inputCost: Math.round(totalInputCost * 100) / 100,
    outputCost: Math.round(totalOutputCost * 100) / 100,
    totalCost: Math.round((totalInputCost + totalOutputCost) * 100) / 100,
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
    promptTokens: number;
    completionTokens: number;
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
          promptTokens: u.promptTokens,
          completionTokens: u.completionTokens,
          totalTokens: u.totalTokens,
          model: u.model || 'gemini-2.5-flash',
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
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  isByok: boolean;
  model?: string;
}>): Map<string, { totalCost: number; totalTokens: number; byokTokens: number; managedTokens: number; }> {
  const userMap = new Map<string, { totalCost: number; totalTokens: number; byokTokens: number; managedTokens: number; }>();
  usages.forEach(u => {
    const costObj = calculateTokenCost({
      promptTokens: u.promptTokens,
      completionTokens: u.completionTokens,
      totalTokens: u.totalTokens,
      model: u.model || 'gemini-2.5-flash',
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