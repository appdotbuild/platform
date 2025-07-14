import { PlaywrightTestConfig } from '@playwright/test';
import {
  createSessionsDirectory,
  loginIfNeeded,
  verifyEnvironmentVariables,
} from './shared';

const ENV_VARIABLES = ['E2E_EMAIL', 'E2E_PASSWORD', 'TOTP_SECRET'];

export default async function globalSetupLocal(config: PlaywrightTestConfig) {
  verifyEnvironmentVariables(ENV_VARIABLES);
  createSessionsDirectory();

  await loginIfNeeded(config);
}
