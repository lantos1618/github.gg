import { expect, mock, test } from 'bun:test';

const update = mock(() => {
  throw new Error('Signing out must not change the GitHub App installation link');
});

// A browser tab loaded before this fix still POSTs to the compatibility route.
// Keep the test fail-closed if that route starts writing account state again.
mock.module('../src/db', () => ({ db: { update } }));
mock.module('../src/lib/auth', () => ({
  auth: { api: { getSession: async () => ({ user: { id: 'signed-in-user' } }) } },
}));

const { POST } = await import('../src/app/api/auth/sign-out-cleanup/route');

test('legacy sign-out cleanup leaves a signed-in account installation linked', async () => {
  const response = await POST();

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });
  expect(update).not.toHaveBeenCalled();
});
