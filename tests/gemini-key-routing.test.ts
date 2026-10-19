import { expect, test } from 'bun:test';
import {
  createGeminiModels, geminiTokenUsage, geminiUsageRows,
  GEMINI_FLASH_MODEL_NAME, GEMINI_PRO_MODEL_NAME,
} from '../src/lib/ai/models';

test('Gemini requests use each selected key even when requests overlap', async () => {
  const originalFetch = globalThis.fetch;
  const seenKeys: string[] = [];
  globalThis.fetch = async (_input, init) => {
    seenKeys.push(new Headers(init?.headers).get('x-goog-api-key') || '');
    throw new Error('Intercepted before network access');
  };

  try {
    const prompt = [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'test' }] }];
    const results = await Promise.allSettled([
      createGeminiModels('first-test-key').pro.doGenerate({ prompt }),
      createGeminiModels('second-test-key').flash.doGenerate({ prompt }),
    ]);
    expect(results.every(result => result.status === 'rejected')).toBe(true);
    expect(seenKeys.sort()).toEqual(['first-test-key', 'second-test-key']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Gemini provider rejects a missing selected key', () => {
  expect(() => createGeminiModels('')).toThrow('Gemini API key is not configured');
});

test('mixed analysis usage retains the model that incurred each charge', () => {
  expect(geminiUsageRows({
    flash: geminiTokenUsage({ inputTokens: 100, outputTokens: 20 }),
    pro: geminiTokenUsage({ inputTokens: 50, outputTokens: 10 }),
  })).toEqual([
    { model: GEMINI_FLASH_MODEL_NAME, usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 } },
    { model: GEMINI_PRO_MODEL_NAME, usage: { inputTokens: 50, outputTokens: 10, totalTokens: 60 } },
  ]);
});

test('Gemini usage includes reasoning tokens in billed output and monthly quota', () => {
  expect(geminiTokenUsage({
    inputTokens: 100,
    outputTokens: 20,
    reasoningTokens: 30,
    totalTokens: 150,
  })).toEqual({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });

  expect(geminiTokenUsage({
    inputTokens: 100,
    outputTokens: 20,
    totalTokens: 145,
  })).toEqual({ inputTokens: 100, outputTokens: 45, totalTokens: 145 });
});
