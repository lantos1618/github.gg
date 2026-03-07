import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test('should load a user profile', async ({ page }) => {
    await page.goto('/torvalds');
    await page.waitForLoadState('networkidle');
    // Profile page should render without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show profile content or empty state', async ({ page }) => {
    await page.goto('/torvalds');
    await page.waitForLoadState('networkidle');
    // Either the profile content or generate button should be present
    const hasProfile = await page.getByTestId('profile-content').isVisible().catch(() => false);
    const hasEmptyState = await page.getByTestId('profile-generate-btn').isVisible().catch(() => false);
    expect(hasProfile || hasEmptyState).toBeTruthy();
  });
});
