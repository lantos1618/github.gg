import { describe, expect, test } from 'bun:test';
import { DELETE, isTestSessionAllowed, POST } from '../src/app/api/auth/test-session/route';

const testSecret = 'f8c5a832fa1d437b9e2a064b705dc6a1f86c51d24709bce3a50468d2f27e9134';

function request(url: string, host: string, extraHeaders: Record<string, string> = {}) {
  return new Request(url, {
    method: 'POST',
    body: JSON.stringify({ username: 'victim' }),
    headers: { 'Content-Type': 'application/json', Host: host, 'x-test-session-secret': testSecret, ...extraHeaders },
  });
}

describe('test-session endpoint', () => {
  test('rejects session creation and cleanup in production and previews even when enabled', async () => {
    const previous = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      enabled: process.env.ENABLE_TEST_SESSION,
      secret: process.env.TEST_SESSION_SECRET,
    };

    try {
      process.env.ENABLE_TEST_SESSION = 'true';
      process.env.TEST_SESSION_SECRET = testSecret;
      for (const [nodeEnv, vercelEnv] of [
        ['production', 'production'],
        ['production', 'preview'],
        ['development', 'preview'],
      ]) {
        process.env.NODE_ENV = nodeEnv;
        process.env.VERCEL_ENV = vercelEnv;
        const localRequest = request('http://localhost:3000/api/auth/test-session', 'localhost:3000');
        expect((await POST(localRequest)).status).toBe(403);
        expect((await DELETE(localRequest)).status).toBe(403);
      }
    } finally {
      if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous.nodeEnv;
      if (previous.vercelEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous.vercelEnv;
      if (previous.enabled === undefined) delete process.env.ENABLE_TEST_SESSION;
      else process.env.ENABLE_TEST_SESSION = previous.enabled;
      if (previous.secret === undefined) delete process.env.TEST_SESSION_SECRET;
      else process.env.TEST_SESSION_SECRET = previous.secret;
    }
  });

  test('accepts only matching loopback URL, Host, and Origin in local development', async () => {
    const previous = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      enabled: process.env.ENABLE_TEST_SESSION,
      secret: process.env.TEST_SESSION_SECRET,
      betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    };

    try {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;
      process.env.ENABLE_TEST_SESSION = 'true';
      process.env.TEST_SESSION_SECRET = testSecret;

      expect(isTestSessionAllowed(request('http://localhost:3000/api/auth/test-session', 'localhost:3000'))).toBe(true);
      expect(isTestSessionAllowed(request('http://127.0.0.1:3000/api/auth/test-session', '127.0.0.1:3000', {
        Origin: 'http://127.0.0.1:3000', 'X-Forwarded-For': '127.0.0.1',
      }))).toBe(true);
      expect(isTestSessionAllowed(request('http://[::1]:3000/api/auth/test-session', '[::1]:3000'))).toBe(true);

      const rejected = [
        request('https://github.gg/api/auth/test-session', 'github.gg'),
        request('http://localhost:3000/api/auth/test-session', 'github.gg'),
        request('https://github.gg/api/auth/test-session', 'localhost:3000'),
        request('http://localhost:3000/api/auth/test-session', 'localhost:3000', { Origin: 'https://attacker.example' }),
        request('http://localhost:3000/api/auth/test-session', 'localhost:3000', { Origin: 'null' }),
        request('http://localhost:3000/api/auth/test-session', 'localhost:3000', { 'X-Forwarded-For': '203.0.113.9' }),
        request('http://localhost:3000/api/auth/test-session', 'localhost:3000', { 'X-Real-IP': '203.0.113.9' }),
        request('http://localhost:3000/api/auth/test-session', 'localhost:3000', { 'x-test-session-secret': '' }),
        request('http://localhost:3000/api/auth/test-session', 'localhost:3000', { 'x-test-session-secret': 'wrong' }),
      ];
      for (const candidate of rejected) {
        expect(isTestSessionAllowed(candidate)).toBe(false);
        expect((await POST(candidate.clone())).status).toBe(403);
        expect((await DELETE(candidate)).status).toBe(403);
      }

      delete process.env.TEST_SESSION_SECRET;
      expect(isTestSessionAllowed(request('http://localhost:3000/api/auth/test-session', 'localhost:3000'))).toBe(false);
      process.env.TEST_SESSION_SECRET = 'too-short';
      expect(isTestSessionAllowed(request('http://localhost:3000/api/auth/test-session', 'localhost:3000'))).toBe(false);
      process.env.TEST_SESSION_SECRET = testSecret;
      process.env.BETTER_AUTH_SECRET = testSecret;
      expect(isTestSessionAllowed(request('http://localhost:3000/api/auth/test-session', 'localhost:3000'))).toBe(false);
    } finally {
      if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous.nodeEnv;
      if (previous.vercelEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous.vercelEnv;
      if (previous.enabled === undefined) delete process.env.ENABLE_TEST_SESSION;
      else process.env.ENABLE_TEST_SESSION = previous.enabled;
      if (previous.secret === undefined) delete process.env.TEST_SESSION_SECRET;
      else process.env.TEST_SESSION_SECRET = previous.secret;
      if (previous.betterAuthSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
      else process.env.BETTER_AUTH_SECRET = previous.betterAuthSecret;
    }
  });
});
