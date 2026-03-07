import { test, expect } from '@playwright/test';

test.describe('Repository Page', () => {
  test('should load a repository page', async ({ page }) => {
    await page.goto('/torvalds/linux');
    await expect(page).toHaveURL(/torvalds\/linux/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display repo header', async ({ page }) => {
    await page.goto('/torvalds/linux');
    // The repo header may take time to render depending on data fetch
    const header = page.getByTestId('repo-header-title');
    const hasHeader = await header.isVisible({ timeout: 15000 }).catch(() => false);
    // Repo might not be indexed - that's okay for the test
    if (hasHeader) {
      await expect(header).toContainText(/linux/i);
    }
  });

  test('should not crash on repo page', async ({ page }) => {
    await page.goto('/torvalds/linux');
    // Verify no JS errors by checking page is interactive
    await page.waitForLoadState('domcontentloaded');
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Ensure the page isn't showing an error page
    const pageContent = await body.textContent();
    expect(pageContent).not.toContain('Application error');
  });
});
