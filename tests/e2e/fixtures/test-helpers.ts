import { Page, expect } from '@playwright/test';

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

export async function getByTestId(page: Page, testId: string) {
  return page.getByTestId(testId);
}

export async function expectVisible(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toBeVisible();
}

export async function expectNotVisible(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).not.toBeVisible();
}
