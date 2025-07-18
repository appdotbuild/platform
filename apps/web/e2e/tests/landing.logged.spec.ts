import { test, expect } from '@playwright/test';
import { getUrl } from '../utils/get-url';

test.describe('user is logged in', () => {
  test.describe('landing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(getUrl());
    });

    test('should show the apps dropdown', async ({ page }) => {
      const appsDropdown = page.getByRole('button', { name: 'My Apps' });

      await appsDropdown.waitFor();

      await expect(appsDropdown).toBeVisible();
    });

    test('should show the message limit', async ({ page }) => {
      const messageLimit = page.getByText('messages remaining');

      await messageLimit.waitFor();

      await expect(messageLimit).toBeVisible();
    });
  });
});
