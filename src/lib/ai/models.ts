import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Centralized AI model configuration.
 * The quality role uses a stable Flash model with free-tier API access, so
 * BYOK users do not need a paid Google project for normal analyses.
 */
export const GEMINI_PRO_MODEL_NAME = 'gemini-3.8-flash';
export const GEMINI_FLASH_MODEL_NAME = 'gemini-3.5-flash-lite';

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

export function geminiTokenUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
}): GeminiTokenUsage {
  const count = (value?: number) =>
    value !== undefined && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
  const inputTokens = count(usage.inputTokens);
  // Google's candidatesTokenCount excludes thoughtsTokenCount. The provider
  // exposes both, and totalTokenCount can include additional billed tokens.
  const visibleOutput = count(usage.outputTokens);
  const reasoning = count(usage.reasoningTokens);
  const outputTokens = Math.max(
    visibleOutput + reasoning,
    count(usage.totalTokens) - inputTokens,
  );
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
