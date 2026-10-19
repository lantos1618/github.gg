import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Centralized AI model configuration.
 * Change the model name here to update all AI features at once.
 */
export const GEMINI_PRO_MODEL_NAME = 'gemini-3.1-pro-preview';
// Flash-lite is GA as of the 3.1 family — use the stable channel name
// (no `-preview` suffix) so we don't get pulled out from under by Google's
// preview deprecation schedule. Full 3.1 Flash doesn't exist; if we ever
// want a beefier map-step model the alternative is `gemini-3-flash-preview`
// (3.0 family, "full" Flash).
export const GEMINI_FLASH_MODEL_NAME = 'gemini-3.1-flash-lite';

/** Bind a Gemini provider to the key selected for this request. Never mutate process.env. */
export function createGeminiModels(apiKey: string) {
  if (!apiKey) throw new Error('Gemini API key is not configured');
  const provider = createGoogleGenerativeAI({ apiKey });
  return {
    pro: provider(`models/${GEMINI_PRO_MODEL_NAME}`),
    flash: provider(`models/${GEMINI_FLASH_MODEL_NAME}`),
    embedding: provider.embedding('gemini-embedding-001'),
  };
}

export type GeminiModels = ReturnType<typeof createGeminiModels>;

export type GeminiTokenUsage = { inputTokens: number; outputTokens: number; totalTokens: number };
export type GeminiModelUsage = { flash: GeminiTokenUsage; pro: GeminiTokenUsage };

export function geminiTokenUsage(usage: { inputTokens?: number; outputTokens?: number }): GeminiTokenUsage {
  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

export function addGeminiTokenUsage(a: GeminiTokenUsage, b: GeminiTokenUsage): GeminiTokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

export function emptyGeminiTokenUsage(): GeminiTokenUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export function geminiUsageRows(modelUsage: GeminiModelUsage) {
  return [
    { model: GEMINI_FLASH_MODEL_NAME, usage: modelUsage.flash },
    { model: GEMINI_PRO_MODEL_NAME, usage: modelUsage.pro },
  ].filter(row => row.usage.totalTokens > 0);
}

/** One platform key suffices for managed AI and embeddings. Legacy name is accepted. */
export function getPlatformGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || null;
}

export function createPlatformGeminiModels(): GeminiModels {
  return createGeminiModels(getPlatformGeminiApiKey() || '');
}
