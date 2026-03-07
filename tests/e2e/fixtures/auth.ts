import { test as base, type Page } from '@playwright/test';

/**
 * Create an authenticated test session by calling the dev-only test-session endpoint.
 * Returns the cookie that Playwright needs to set.
 */
async function createTestSession(page: Page, username = 'e2e-test-user') {
  const response = await page.request.post('/api/auth/test-session', {
    data: { username },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test session: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Extend the base test with an authenticated fixture.
 * Usage: import { test } from './fixtures/auth';
 *        test('my test', async ({ authedPage }) => { ... });
 */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    // Create session — the response sets the cookie automatically via Set-Cookie header
    // But Playwright's page.request doesn't propagate cookies to the page context,
    // so we need to extract and set them manually.
    const response = await page.request.post('/api/auth/test-session', {
      data: { username: 'e2e-test-user' },
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test session: ${await response.text()}`);
    }

    // Extract Set-Cookie header from response
    const setCookieHeaders = response.headers()['set-cookie'];
    if (setCookieHeaders) {
      // Parse the cookie and add it to the browser context
      const cookies = setCookieHeaders.split(',').map(cookie => {
        const parts = cookie.trim().split(';');
        const [nameValue] = parts;
        const [name, ...valueParts] = nameValue.split('=');
        const value = valueParts.join('=');
        return {
          name: name.trim(),
          value: value.trim(),
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax' as const,
        };
      });
      await page.context().addCookies(cookies);
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
