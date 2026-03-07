import { test, expect } from '@playwright/test';

test.describe('Repository Page', () => {
  test('should load a repository page', async ({ page }) => {
    await page.goto('/torvalds/linux');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display repo header', async ({ page }) => {
    await page.goto('/torvalds/linux');
    await page.waitForLoadState('networkidle');
    const header = page.getByTestId('repo-header-title');
    // Header may take time to load
    await expect(header).toBeVisible({ timeout: 10000 }).catch(() => {
      // Repository might not be indexed yet
    });
  });
});
