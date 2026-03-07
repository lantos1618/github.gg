import { test, expect } from '@playwright/test';

test.describe('Arena Page', () => {
  test('should load arena page', async ({ page }) => {
    await page.goto('/arena');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display leaderboard tab', async ({ page }) => {
    await page.goto('/arena');
    const leaderboardTab = page.getByTestId('arena-tab-leaderboard-btn');
    await expect(leaderboardTab).toBeVisible({ timeout: 10000 });
  });

  test('should display battle tab', async ({ page }) => {
    await page.goto('/arena');
    const battleTab = page.getByTestId('arena-tab-battle-btn');
    await expect(battleTab).toBeVisible({ timeout: 10000 });
  });

  test('should have search input on leaderboard', async ({ page }) => {
    await page.goto('/arena');
    const leaderboardTab = page.getByTestId('arena-tab-leaderboard-btn');
    if (await leaderboardTab.isVisible()) {
      await leaderboardTab.click();
    }
    const searchInput = page.getByTestId('arena-leaderboard-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });
});
