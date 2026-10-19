import { describe, expect, mock, test } from 'bun:test';

mock.module('@trpc/server/adapters/fetch', () => ({
  fetchRequestHandler: async () => new Response('{"result":{"data":"private"}}', {
    headers: { 'Content-Type': 'application/json' },
  }),
}));
mock.module('../src/lib/trpc/routes', () => ({ appRouter: {} }));
mock.module('../src/lib/trpc/trpc', () => ({ createContext: async () => ({}) }));

const { GET, POST } = await import('../src/app/api/trpc/[trpc]/route');

describe('tRPC response caching', () => {
  test('disables caching for wiki GET and POST responses', async () => {
    for (const method of ['GET', 'POST'] as const) {
      const request = new Request('https://github.gg/api/trpc/wiki.getWikiPage', { method });
      const response = method === 'GET' ? await GET(request) : await POST(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(await response.json()).toEqual({ result: { data: 'private' } });
    }
  });
});
