import { PlaywrightTestConfig, expect } from '@playwright/test';
import * as OTPAuth from 'otpauth';
import path from 'node:path';
import fs from 'node:fs';
import { getUrl } from '../utils/get-url';
import { isMainBranchInCI } from '../utils/environment';
import { chromium } from '@playwright/test';

const userAgentStrings = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.2227.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.3497.92 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
];

const isCIMainBranch = isMainBranchInCI();

export async function loginIfNeeded(
  config: PlaywrightTestConfig,
): Promise<void> {
  const isCI = !!process.env.CI;
  const { storageState } = config.projects?.[0]?.use as {
    storageState: string;
  };

  if (!needsLogin(storageState)) {
    console.log('User session already exists, skipping login');
    return;
  }

  const { E2E_EMAIL, E2E_PASSWORD, TOTP_SECRET } = process.env as {
    E2E_EMAIL: string;
    E2E_PASSWORD: string;
    TOTP_SECRET: string;
  };
  const loginPageURL = getUrl('/handler/sign-in');
  const browser = await chromium.launch({ headless: isCI });

  const context = await browser.newContext({
    extraHTTPHeaders: isCIMainBranch
      ? {
          'x-vercel-protection-bypass':
            process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
        }
      : {},
    userAgent:
      userAgentStrings[Math.floor(Math.random() * userAgentStrings.length)],
  });

  const page = await context.newPage();

  await page.route('**', async (route, request) => {
    const url = route.request().url();

    if (url.includes('github.com')) {
      const headers = request.headers();

      delete headers['x-vercel-protection-bypass'];

      route.continue({ headers });
    } else {
      route.continue();
    }
  });

  await context.tracing.start({ name: 'login' });
  await page.goto(loginPageURL);

  try {
    await page.getByRole('button', { name: 'Sign in with GitHub' }).click();

    await page
      .getByRole('textbox', { name: 'Username or email address' })
      .fill(E2E_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(E2E_PASSWORD);

    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    const totp = new OTPAuth.TOTP({ secret: TOTP_SECRET });
    const code = totp.generate();

    await page
      .getByRole('textbox', { name: 'Enter the verification code' })
      .fill(code);
    await page.keyboard.press('Enter');

    const authorizeButton = page.getByRole('button', {
      name: 'Authorize AppDotBuild',
    });

    await expect(authorizeButton).toBeEnabled();

    await authorizeButton.click();

    await page.screenshot({
      path: path.join(process.cwd(), 'playwright-report/login.png'),
    });

    await page
      .getByRole('heading', { name: 'An open-source AI agent that' })
      .waitFor({ state: 'visible' });

    await context.storageState({ path: storageState });
  } catch (error) {
    await context.tracing.stop({
      path: path.join(process.cwd(), 'playwright-report2/login.zip'),
    });
    fs.mkdirSync(path.join(process.cwd(), 'playwright-report2'), {
      recursive: true,
    });

    await page.screenshot({
      path: path.join(process.cwd(), 'playwright-report2/login.png'),
    });

    throw error;
  }

  await browser.close();
}

export function createSessionsDirectory() {
  const sessionsDirectory = path.join(process.cwd(), 'e2e', 'sessions');

  if (!fs.existsSync(sessionsDirectory)) {
    fs.mkdirSync(sessionsDirectory, { recursive: true });
  }
}

function needsLogin(storageState: string | undefined) {
  if (!storageState) {
    return true;
  }

  const storageStatePath = path.join(process.cwd(), storageState);

  if (!fs.existsSync(storageStatePath)) {
    return true;
  }

  const storageStateContent = fs.readFileSync(storageStatePath, 'utf8');
  const storageStateJson = JSON.parse(storageStateContent);

  const ghCookie = storageStateJson.cookies.find(
    (cookie) => cookie.name === '_octo',
  );

  if (!ghCookie) {
    return true;
  }

  return ghCookie.expires < Date.now() / 1000;
}

export function verifyEnvironmentVariables(envVars: string[]): void {
  const missingVariables = envVars.filter((variable) => !process.env[variable]);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(', ')}`,
    );
  }
}
