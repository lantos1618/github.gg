import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display navbar with logo', async ({ page }) => {
    await expect(page.getByTestId('nav-logo-link')).toBeVisible();
  });

  test('should have profiles link pointing to /users', async ({ page }) => {
    const navLinks = page.getByTestId('nav-profiles-link');
    await expect(navLinks).toBeVisible();
    await expect(navLinks).toHaveAttribute('href', '/users');
  });

  test('should show sign-in button for unauthenticated users', async ({ page }) => {
    await expect(page.getByTestId('nav-signin-btn')).toBeVisible();
  });

  test('should show skip-to-content link on Tab press', async ({ page }) => {
    await page.keyboard.press('Tab');
    const skipLink = page.getByTestId('layout-skip-to-content-link');
    await expect(skipLink).toBeVisible();
  });

  test('should have accessible main content landmark', async ({ page }) => {
    const main = page.locator('#main-content');
    await expect(main).toBeAttached();
  });

  test('logo link navigates to home', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('nav-logo-link').click();
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});
