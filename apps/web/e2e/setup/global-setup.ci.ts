import { PlaywrightTestConfig } from '@playwright/test';
import {
  createSessionsDirectory,
  loginIfNeeded,
  verifyEnvironmentVariables,
} from './shared';

const ENV_VARIABLES = [
  'E2E_EMAIL',
  'E2E_PASSWORD',
  'TOTP_SECRET',
  'VERCEL_AUTOMATION_BYPASS_SECRET',
  'NEON_AUTH_API_KEY',
  'NEON_PROJECT_ID',
];

export default async function globalSetupCI(config: PlaywrightTestConfig) {
  verifyEnvironmentVariables(ENV_VARIABLES);
  createSessionsDirectory();

  await prepareNeonAuthDomain();

  await loginIfNeeded(config);

  await deleteNeonAuthDomain();
}

async function prepareNeonAuthDomain(): Promise<void> {
  const allowedDomain = process.env.BASE_URL;

  const projectId = process.env.NEON_PROJECT_ID;

  const endpoint = `https://console.neon.tech/api/v2/projects/${projectId}/auth/domains`;
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${process.env.NEON_AUTH_API_KEY}`,
    'content-type': 'application/json',
  };
  const body = {
    auth_provider: 'stack',
    domain: allowedDomain,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (response.ok) {
    console.log('neon auth domain added to allowed domains');
  } else {
    console.error('Failed to create Neon auth domain');
  }
}

async function deleteNeonAuthDomain(): Promise<void> {
  const allowedDomain = process.env.BASE_URL;
  const projectId = process.env.NEON_PROJECT_ID;
  const endpoint = `https://console.neon.tech/api/v2/projects/${projectId}/auth/domains`;
  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${process.env.NEON_AUTH_API_KEY}`,
    'content-type': 'application/json',
  };
  const body = {
    auth_provider: 'stack',
    domains: [{ domain: allowedDomain }],
  };

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(body),
  });

  if (response.ok) {
    console.log('NEON AUTH DOMAIN deleted');
  } else {
    const responseText = await response.text();
    console.error('Failed to delete Neon auth domain', responseText);
  }
}
