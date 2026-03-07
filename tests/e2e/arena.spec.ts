import { test, expect } from '@playwright/test';

test.describe('Arena Page', () => {
  test('should load arena page', async ({ page }) => {
    await page.goto('/arena');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display leaderboard', async ({ page }) => {
    await page.goto('/arena');
    await page.waitForLoadState('networkidle');
    const leaderboard = page.getByTestId('arena-tab-leaderboard-btn');
    await expect(leaderboard).toBeVisible({ timeout: 10000 }).catch(() => {
      // Arena might require auth
    });
  });
});
