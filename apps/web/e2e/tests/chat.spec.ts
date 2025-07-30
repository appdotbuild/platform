import { test, expect } from '@playwright/test';
import { getUrl } from '../utils/get-url';

test.describe('chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(getUrl());
  });

  test('should ask for more details when asking what can you build?', async ({
    page,
  }) => {
    const chatInput = page.getByRole('textbox', {
      name: 'Describe the app you want to',
    });

    // With this we ensure that the agent want go into creating any app
    await chatInput.fill('What can you build?');
    await chatInput.press('Enter');

    const thinking = page.getByText('Thinking...').filter({ visible: true });

    await thinking.waitFor();

    expect(thinking).toBeVisible();

    const moreInfo = page
      .getByText('I need more information to continue')
      .filter({ visible: true });

    await moreInfo.waitFor();

    expect(moreInfo).toBeVisible();
  });
});
