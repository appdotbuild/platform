import { test, expect } from '@playwright/test';
import { getUrl } from '../utils/get-url';

test.describe('user is logged in', () => {
  test.describe('landing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(getUrl());
    });

    test('should render AuthenticatedHome for authenticated users', async ({
      page,
    }) => {
      // Check AuthenticatedHome is rendered
      const authenticatedHome = page.getByTestId('authenticated-home');
      await expect(authenticatedHome).toBeVisible();

      // PublicHome should NOT be rendered
      const publicHome = page.getByTestId('public-home');
      await expect(publicHome).not.toBeVisible();
    });

    test('should show the My Apps section', async ({ page }) => {
      const myAppsHeader = page.getByTestId('my-apps-header');

      await myAppsHeader.waitFor();

      await expect(myAppsHeader).toBeVisible();
      await expect(myAppsHeader).toContainText('My Apps');
    });

    test('should show the message limit', async ({ page }) => {
      const messageLimit = page.getByText('messages remaining');

      await messageLimit.waitFor();

      await expect(messageLimit).toBeVisible();
    });

    test('should display apps in carousel when user has apps', async ({
      page,
    }) => {
      // Wait for My Apps section to load
      const myAppsHeader = page.getByTestId('my-apps-header');
      await myAppsHeader.waitFor();

      // Check for app cards or empty state
      const appCard = page
        .locator('[role="button"]')
        .filter({ hasText: 'Created' })
        .first();
      const emptyState = page.getByText('No apps created yet. Start building!');

      // Either shows apps or empty state
      const hasApps = await appCard.isVisible().catch(() => false);
      if (hasApps) {
        await expect(appCard).toBeVisible();
      } else {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should navigate to app when clicking app card', async ({ page }) => {
      const myAppsHeader = page.getByTestId('my-apps-header');
      await myAppsHeader.waitFor();

      const appCard = page
        .locator('[role="button"]')
        .filter({ hasText: 'Created' })
        .first();

      if (await appCard.isVisible()) {
        await appCard.click();
        await expect(page).toHaveURL(/\/apps\/[a-zA-Z0-9-]+/);
      }
    });
  });
});
