import { expect, test } from 'bun:test';
import { generateWikiWithCacheStreaming } from '../src/lib/ai/wiki-generator';

const wikiInput = {
  apiKey: 'test-wiki-key',
  owner: 'demo',
  repo: 'repo',
  files: [{ path: 'README.md', content: 'A private test repository', language: 'md', size: 25 }],
};

test('BYOK wiki sends direct codebase context with the selected key', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const requests: Array<{ url: string; key: string | null; body: string }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      key: new Headers(init?.headers).get('x-goog-api-key'),
      body: String(init?.body),
    });
    throw new Error('Intercepted before network access');
  };
  console.error = () => {};

  try {
    const generator = generateWikiWithCacheStreaming({ ...wikiInput, useExplicitCache: false });
    for await (const _update of generator) { /* consume until intercepted request */ }
  } catch {
    // The mocked fetch ends generation after the first request.
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }

  expect(requests).toHaveLength(1);
  expect(requests[0].url).toContain('gemini-3.5-flash-lite:generateContent');
  expect(requests[0].key).toBe('test-wiki-key');
  expect(requests[0].body).toContain('A private test repository');
});

test('wiki falls back to direct context when explicit caching is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith('/cachedContents')) {
      return new Response(JSON.stringify({
        error: { code: 403, message: 'Cached content not available on free tier', status: 'PERMISSION_DENIED' },
      }), { status: 403, headers: { 'content-type': 'application/json' } });
    }
    throw new Error('Intercepted before network access');
  };
  console.error = () => {};

  try {
    const generator = generateWikiWithCacheStreaming(wikiInput);
    for await (const _update of generator) { /* consume until intercepted request */ }
  } catch {
    // The mocked fetch ends generation after the fallback request.
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }

  expect(urls).toHaveLength(2);
  expect(urls[0]).toContain('/cachedContents');
  expect(urls[1]).toContain('gemini-3.5-flash-lite:generateContent');
});
