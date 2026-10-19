import { afterEach, describe, expect, test } from 'bun:test';
import { semanticSearchActorKey } from '../src/lib/rate-limit/semantic-search-identity';

const previousVercel = process.env.VERCEL;
afterEach(() => {
  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;
});

describe('semantic search actor identity', () => {
  test('uses Vercel-provided client IP and ignores a spoofed x-forwarded-for header', () => {
    process.env.VERCEL = '1';
    const first = new Request('https://www.github.gg', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.17', 'x-forwarded-for': '198.51.100.1' },
    });
    const spoofed = new Request('https://www.github.gg', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.17', 'x-forwarded-for': '198.51.100.2' },
    });
    const key = semanticSearchActorKey(first);
    expect(key).toBe(semanticSearchActorKey(spoofed));
    expect(key.startsWith('ip:')).toBe(true);
    expect(key).not.toContain('203.0.113.17');
  });

  test('uses account or coarse anonymous budget outside verified Vercel headers', () => {
    delete process.env.VERCEL;
    const request = new Request('https://www.github.gg', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.17', 'x-forwarded-for': '198.51.100.1' },
    });
    expect(semanticSearchActorKey(request)).toBe('anonymous');
    expect(semanticSearchActorKey(request, 'alice').startsWith('user:')).toBe(true);
    expect(semanticSearchActorKey(request, 'alice')).not.toContain('alice');
  });
});
