import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display hero section', async ({ page }) => {
    await expect(page.getByTestId('home-hero-section')).toBeVisible();
  });

  test('should have repository input', async ({ page }) => {
    await expect(page.getByTestId('home-hero-repo-input')).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await expect(page.getByTestId('nav-logo-link')).toBeVisible();
  });

  test('should navigate to pricing', async ({ page }) => {
    await page.getByTestId('home-cta-pricing-link').click();
    await expect(page).toHaveURL(/pricing/);
  });
});
