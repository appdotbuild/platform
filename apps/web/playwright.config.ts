import { defineConfig, devices } from '@playwright/test';
import { getUrl } from './e2e/utils/get-url';

export default defineConfig({
  testDir: 'e2e/tests',
  globalSetup: process.env.CI
    ? 'e2e/setup/global-setup.ci.ts'
    : 'e2e/setup/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    process.env.CI ? ['github'] : ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    headless: !!process.env.CI,
    baseURL: getUrl(),
    trace: 'on-first-retry',
    storageState: 'e2e/sessions/storageState.json',
    ...(process.env.CI
      ? {
          extraHTTPHeaders: {
            'x-vercel-protection-bypass':
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
          },
        }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        bypassCSP: true,
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
    },
    {
      name: 'iPhone',
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'bun run dev',
        url: getUrl(),
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
