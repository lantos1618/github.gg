import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display navbar', async ({ page }) => {
    await expect(page.getByTestId('nav-logo-link')).toBeVisible();
  });

  test('should have sign in button for unauthenticated users', async ({ page }) => {
    await expect(page.getByTestId('nav-signin-btn')).toBeVisible();
  });

  test('should show skip to content link on tab', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('layout-skip-to-content-link')).toBeVisible();
  });

  test('should have footer', async ({ page }) => {
    await expect(page.getByTestId('layout-footer')).toBeVisible();
  });
});
