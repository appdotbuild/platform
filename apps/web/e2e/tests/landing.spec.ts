import { test, expect } from '@playwright/test';
import { getUrl } from '../utils/get-url';

// Clear the session so the user is logged out
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('user is logged out', () => {
  test.describe('landing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(getUrl());
    });

    test('should have app.build title', async ({ page }) => {
      await expect(page).toHaveTitle(/app.build/);
    });

    test('should redirect to login page when not authenticated and try to access chat', async ({
      page,
    }) => {
      const input = page.getByRole('textbox', {
        name: 'Describe the app you want to',
      });

      await input.waitFor({ state: 'visible' });
      await input.fill('a simple todo list');
      await input.press('Enter');

      const githubButton = page.getByRole('button', {
        name: 'Sign in with GitHub',
      });

      await githubButton.waitFor({ state: 'visible' });

      await expect(page).toHaveURL('/handler/sign-in');
      await expect(githubButton).toBeVisible();
    });
  });
});
