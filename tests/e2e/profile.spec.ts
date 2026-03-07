import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test('should load a user profile page', async ({ page }) => {
    await page.goto('/torvalds');
    await expect(page).toHaveURL(/torvalds/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should render profile page without errors', async ({ page }) => {
    await page.goto('/torvalds');
    await page.waitForLoadState('networkidle');

    // The profile page should render some content (not an error page)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Application error');
    // Should have some profile-related content
    expect(bodyText?.toLowerCase()).toContain('torvalds');
  });

  test('should have JSON-LD structured data', async ({ page }) => {
    await page.goto('/torvalds');
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
  });
});
