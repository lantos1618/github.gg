import { beforeEach, describe, expect, mock, test } from 'bun:test';

let activeSubscription = true;
let isByok = false;
let denyQuota = true;
let quotaCalls = 0;
let rateCalls = 0;
let rateStatus: 'allowed' | 'limited' | 'unavailable' = 'allowed';
let generationCalls = 0;
let installationCalls = 0;

const quotaMessage = 'Monthly Pro AI token limit reached. Your allowance resets on 2026-11-01 UTC.';
const rateMessage = 'Too many AI requests. Please try again in 60 seconds.';

mock.module('../src/lib/utils/user-plan', () => ({
  getUserPlanAndKey: async () => ({
    subscription: activeSubscription ? { status: 'active', plan: isByok ? 'byok' : 'pro' } : null,
    plan: activeSubscription ? (isByok ? 'byok' : 'pro') : 'free',
  }),
  getApiKeyForUser: async () => ({ apiKey: 'test-only-key', isByok }),
}));

mock.module('../src/lib/ai/monthly-quota', () => ({
  checkMonthlyTokenQuota: async ({ isByok: keyIsByok }: { isByok: boolean }) => {
    quotaCalls += 1;
    if (keyIsByok) return { allowed: true, status: 'unlimited' };
    return denyQuota
      ? { allowed: false, status: 'exhausted', message: quotaMessage }
      : { allowed: true, status: isByok ? 'unlimited' : 'available' };
  },
}));

mock.module('../src/lib/rate-limit', () => ({
  checkPaidAIRateLimit: async () => {
    rateCalls += 1;
    return rateStatus === 'allowed'
      ? { status: 'allowed', limit: 5, remaining: 4, reset: Date.now() + 60_000 }
      : { status: rateStatus, limit: 5, remaining: 0, reset: Date.now() + 60_000, message: rateMessage };
  },
}));

const procedure = {
  input() { return this; },
  query(handler: unknown) { return handler; },
  mutation(handler: unknown) { return handler; },
  subscription(handler: unknown) { return handler; },
};
mock.module('../src/lib/trpc/trpc', () => ({
  router: (routes: unknown) => routes,
  protectedProcedure: procedure,
  publicProcedure: procedure,
}));

mock.module('../src/db', () => ({ db: {} }));
mock.module('../src/lib/github', () => ({ createGitHubServiceForRepo: async () => { throw new Error('GitHub must not be called'); } }));
mock.module('../src/lib/github/repository-access', () => ({ getAccessibleRepositoryInfo: async () => { throw new Error('GitHub must not be called'); } }));
mock.module('../src/lib/ai/diagram', () => ({ generateRepoDiagramVercel: async () => {
  generationCalls += 1;
  throw new Error('Gemini must not be called');
} }));
mock.module('../src/lib/github/app', () => ({
  getUserFromInstallation: async () => ({ id: 'user-1' }),
  getInstallationOctokit: async () => {
    installationCalls += 1;
    throw new Error('GitHub must not be called');
  },
}));
mock.module('../src/lib/ai/commit-analysis', () => ({ analyzeCommit: async () => {
  generationCalls += 1;
  throw new Error('Gemini must not be called');
} }));
mock.module('../src/lib/ai/issue-analysis', () => ({ analyzeIssue: async () => {
  generationCalls += 1;
  throw new Error('Gemini must not be called');
} }));
mock.module('../src/lib/github/free-tier', () => ({
  getPlatformApiKey: () => null,
  getFreeTierStatus: async () => ({ used: 0, remaining: 3, total: 3 }),
  incrementFreeReviewsUsed: async () => {},
  freeTierFooter: () => '',
}));

const { validatePlanAndKey } = await import('../src/lib/trpc/helpers/validate-plan-and-key');
const { diagramRouter } = await import('../src/lib/trpc/routes/diagram');
const { postCommitAnalysisComment } = await import('../src/lib/github/commit-issue-comment-service');
const { postPRReviewComment } = await import('../src/lib/github/pr-comment-service');

beforeEach(() => {
  activeSubscription = true;
  isByok = false;
  denyQuota = true;
  quotaCalls = 0;
  rateCalls = 0;
  rateStatus = 'allowed';
  generationCalls = 0;
  installationCalls = 0;
});

describe('monthly quota gates', () => {
  test('shared plan gate returns a clear error before generation', async () => {
    await expect(validatePlanAndKey('user-1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: quotaMessage,
    });
    expect(quotaCalls).toBe(1);
    expect(rateCalls).toBe(0);
  });

  test('shared plan gate permits BYOK while managed allowance is exhausted', async () => {
    isByok = true;
    const result = await validatePlanAndKey('user-1');
    expect(result.keyInfo.isByok).toBe(true);
    expect(quotaCalls).toBe(1);
    expect(rateCalls).toBe(1);
  });

  test('a direct streamed route emits a quota error before GitHub or Gemini work', async () => {
    const generate = (diagramRouter as unknown as { generateDiagram: (args: unknown) => AsyncIterable<{ type: string; message?: string }> }).generateDiagram;
    const events = [];
    for await (const event of generate({
      input: { owner: 'alice', repo: 'code', diagramType: 'architecture' },
      ctx: { user: { id: 'user-1' }, session: {} },
    })) events.push(event);

    expect(events.at(-1)).toEqual({ type: 'error', message: quotaMessage });
    expect(quotaCalls).toBe(1);
    expect(rateCalls).toBe(0);
    expect(generationCalls).toBe(0);
  });

  test('paid webhook skips analysis before installation API or Gemini work', async () => {
    const result = await postCommitAnalysisComment({
      installationId: 1,
      owner: 'alice',
      repo: 'code',
      commitSha: 'abcdef123456',
    });

    expect(result).toMatchObject({ success: false, skipped: true, reason: 'monthly_token_limit_reached' });
    expect(quotaCalls).toBe(1);
    expect(rateCalls).toBe(0);
    expect(installationCalls).toBe(0);
    expect(generationCalls).toBe(0);
  });

  test('free-tier webhook path does not apply the paid Pro allowance', async () => {
    activeSubscription = false;
    const result = await postCommitAnalysisComment({
      installationId: 1,
      owner: 'alice',
      repo: 'code',
      commitSha: 'abcdef123456',
    });

    expect(result).toMatchObject({ success: false, skipped: true, reason: 'no_api_key' });
    expect(quotaCalls).toBe(0);
    expect(rateCalls).toBe(0);
    expect(generationCalls).toBe(0);
  });
});

describe('paid AI rate gates', () => {
  beforeEach(() => { denyQuota = false; rateStatus = 'limited'; });

  test('shared plan gate denies a paid request with a retryable error', async () => {
    await expect(validatePlanAndKey('user-1')).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: rateMessage,
    });
    expect(quotaCalls).toBe(1);
    expect(rateCalls).toBe(1);
  });

  test('shared plan gate reports limiter outages before generation', async () => {
    rateStatus = 'unavailable';
    await expect(validatePlanAndKey('user-1')).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: rateMessage,
    });
    expect(rateCalls).toBe(1);
  });

  test('BYOK is unlimited by token quota but still subject to the shared rate limit', async () => {
    isByok = true;
    await expect(validatePlanAndKey('user-1')).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    expect(quotaCalls).toBe(1);
    expect(rateCalls).toBe(1);
  });

  test('a streamed route refuses a limited request before GitHub or Gemini work', async () => {
    const generate = (diagramRouter as unknown as { generateDiagram: (args: unknown) => AsyncIterable<{ type: string; message?: string }> }).generateDiagram;
    const events = [];
    for await (const event of generate({
      input: { owner: 'alice', repo: 'code', diagramType: 'architecture' },
      ctx: { user: { id: 'user-1' }, session: {} },
    })) events.push(event);

    expect(events.at(-1)).toEqual({ type: 'error', message: rateMessage });
    expect(rateCalls).toBe(1);
    expect(generationCalls).toBe(0);
  });

  test('paid webhook skips generation when the shared rate limit is reached', async () => {
    const result = await postCommitAnalysisComment({
      installationId: 1,
      owner: 'alice',
      repo: 'code',
      commitSha: 'abcdef123456',
    });

    expect(result).toMatchObject({ success: false, skipped: true, reason: 'ai_rate_limit_reached' });
    expect(rateCalls).toBe(1);
    expect(installationCalls).toBe(0);
    expect(generationCalls).toBe(0);
  });

  test('paid PR review skips GitHub and Gemini calls when limited', async () => {
    const result = await postPRReviewComment({
      installationId: 1,
      owner: 'alice',
      repo: 'code',
      prNumber: 1,
      prTitle: 'Test change',
      prDescription: '',
      baseBranch: 'main',
      headBranch: 'feature',
    });

    expect(result).toMatchObject({ success: false, skipped: true, reason: 'ai_rate_limit_reached' });
    expect(rateCalls).toBe(1);
    expect(installationCalls).toBe(0);
    expect(generationCalls).toBe(0);
  });

  test('free-tier webhook does not consume a paid AI rate slot', async () => {
    activeSubscription = false;
    const result = await postCommitAnalysisComment({
      installationId: 1,
      owner: 'alice',
      repo: 'code',
      commitSha: 'abcdef123456',
    });

    expect(result).toMatchObject({ success: false, skipped: true, reason: 'no_api_key' });
    expect(rateCalls).toBe(0);
  });
});
