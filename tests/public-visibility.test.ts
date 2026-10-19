import { describe, expect, test } from 'bun:test';
import { getCurrentlyPublicRepositoryKeys } from '../src/lib/github/public-visibility';

describe('public repository sitemap visibility', () => {
  test('includes only repositories GitHub currently confirms as public', async () => {
    const request: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { query: string };
      expect(body.query).toContain('repository(owner: "public-owner", name: "repo")');
      return new Response(JSON.stringify({
        data: {
          r0: { isPrivate: false },
          r1: { isPrivate: true },
          r2: null,
        },
      }), { status: 200 });
    };

    const keys = await getCurrentlyPublicRepositoryKeys([
      { owner: 'public-owner', name: 'repo' },
      { owner: 'private-owner', name: 'repo' },
      { owner: 'missing-owner', name: 'repo' },
    ], 'test-token', request);

    expect([...keys]).toEqual(['public-owner/repo']);
  });

  test('fails closed when GitHub does not return visibility', async () => {
    const request: typeof fetch = async () => new Response('GitHub unavailable', { status: 503 });
    const keys = await getCurrentlyPublicRepositoryKeys([
      { owner: 'owner', name: 'repo' },
    ], 'test-token', request);
    expect(keys.size).toBe(0);
  });
});
