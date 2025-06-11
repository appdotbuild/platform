import { StackClientApp } from '@stackframe/js';
import { decodeJwt } from 'jose';
import open from 'open';
import { tokenStorage } from './auth-storage.js';
import { useAuthStore } from './auth-store.js';
import { getAuthHost } from '../environment.js';
import { logger } from '../utils/logger.js';
import { apiClient } from '../api/api-client.js';

type TokenResponse = {
  access_token: string;
};

export const stackClientApp = new StackClientApp({
  projectId: process.env.PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  tokenStore: 'memory',
});

export async function fetchAccessToken(refreshToken: string): Promise<{
  value: string;
  expiresAt: number;
}> {
  const accessTokenResponse = await fetch(
    'https://api.stack-auth.com/api/v1/auth/sessions/current/refresh',
    {
      method: 'POST',
      headers: {
        'X-Stack-Project-Id': process.env.PUBLIC_STACK_PROJECT_ID!,
        'X-Stack-Access-Type': 'client',
        'x-stack-publishable-client-key':
          process.env.PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
        'X-Stack-Refresh-Token': refreshToken,
      },
    },
  );

  if (!accessTokenResponse.ok) {
    const errorData = await accessTokenResponse
      .json()
      .catch(() => ({ message: 'Could not parse error response' }));
    const status = accessTokenResponse.status;
    const statusText = accessTokenResponse.statusText;
    throw new Error(
      `Failed to refresh access token: ${status} ${statusText} - ${JSON.stringify(
        errorData,
      )}`,
    );
  }

  const tokenData = (await accessTokenResponse.json()) as TokenResponse;
  const decodedToken = decodeJwt(tokenData.access_token);
  const expiresAt = decodedToken.exp;

  if (!expiresAt) {
    throw new Error('Invalid token - no `exp` claim found');
  }

  return {
    value: tokenData.access_token,
    expiresAt: expiresAt * 1_000,
  };
}

export async function authenticate(): Promise<string> {
  // Check if we already have a valid access token
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken) {
    return accessToken.value;
  }

  // Check if we have a refresh token we can use
  const storedRefreshToken = tokenStorage.getRefreshToken();
  if (storedRefreshToken) {
    try {
      // Try to refresh the token
      const { value: accessTokenVal } = await fetchAccessToken(
        storedRefreshToken.value,
      );

      // Store the new tokens with their expiry times
      tokenStorage.saveTokens({
        accessToken: {
          value: accessTokenVal,
        },
      });

      return accessTokenVal;
    } catch (error) {
      logger.info('Token refresh failed, starting new authentication flow');
    }
  }

  // No valid tokens - start the browser auth flow
  logger.info('Starting authentication flow...');

  const newRefreshTokenResponse = await stackClientApp.promptCliLogin({
    appUrl: getAuthHost(),
    expiresInMillis: 300_000, // 5 minutes
    // @ts-expect-error - method exists, but types don't reflect it.
    promptLink: async (url: string) => {
      try {
        logger.link('💻 🔗 Opening auth link in your default browser:', url);
        await open(url);
      } catch {
        logger.warn(
          '⚠️ Unable to open the browser automatically. Please open the link above manually.',
        );
      }
    },
  });

  if (newRefreshTokenResponse.status === 'error') {
    throw new Error('Authentication failed: ' + newRefreshTokenResponse.error);
  }

  const newAccessToken = await fetchAccessToken(newRefreshTokenResponse.data);

  if (typeof newRefreshTokenResponse.data === 'string') {
    // Single token flow
    tokenStorage.saveTokens({
      accessToken: {
        value: newAccessToken.value,
      },
      refreshToken: {
        value: newRefreshTokenResponse.data,
        expiry: Date.now() + 31536000000, // 1 year
      },
    });

    return newAccessToken.value;
  }

  throw new Error('Unexpected token format received from authentication');
}

export async function ensureIsNeonEmployee(): Promise<boolean> {
  //check if already has stored the value to avoid unnecessary API calls
  const stored = tokenStorage.getIsNeonEmployee();

  if (stored !== undefined) {
    useAuthStore.getState().setIsNeonEmployee(stored);
    return stored;
  }

  try {
    const response = await apiClient.get('/auth/is-neon-employee');
    const isNeonEmployee = response.data.isNeonEmployee;

    tokenStorage.saveIfNeonEmployee(isNeonEmployee);

    useAuthStore.getState().setIsNeonEmployee(isNeonEmployee);

    return isNeonEmployee;
  } catch (error) {
    return false;
  }
}
