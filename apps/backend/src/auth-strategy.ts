import type { FastifyRequest } from 'fastify';
import { StackServerApp, type ServerUser } from '@stackframe/stack';
import * as jose from 'jose';
import { logger } from './logger';
import { getUserData, isNeonEmployee } from './github';

type AuthError = {
  error: string;
  statusCode: number;
};

export async function validateAuth(request: FastifyRequest): Promise<
  | (ServerUser & {
      githubAccessToken: string;
      githubUsername: string;
      isNeonEmployee: boolean;
    })
  | AuthError
> {
  const jwks = jose.createRemoteJWKSet(
    new URL(
      `https://api.stack-auth.com/api/v1/projects/${process.env.STACK_PROJECT_ID}/.well-known/jwks.json`,
    ),
  );

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: 'Missing or invalid authorization header',
      statusCode: 401,
    };
  }

  const accessToken = authHeader.split(' ')[1];

  if (!accessToken) {
    return {
      error: 'Missing or invalid authorization header',
      statusCode: 401,
    };
  }

  let payload;
  try {
    payload = (await jose.jwtVerify(accessToken, jwks)).payload;
  } catch (error) {
    logger.error('JWT verification failed', { error });
    return {
      error: 'Invalid authentication token',
      statusCode: 401,
    };
  }

  if (!payload.sub) {
    logger.warn('No subject found in JWT payload');
    return {
      error: 'Invalid authentication token',
      statusCode: 401,
    };
  }

  try {
    const stackServerApp = new StackServerApp({
      tokenStore: {
        accessToken,
        refreshToken: payload.refreshTokenId as string,
      },
      publishableClientKey: process.env.STACK_PUBLISHABLE_CLIENT_KEY!,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
      projectId: process.env.STACK_PROJECT_ID!,
    });

    const user = await stackServerApp.getUser({ or: 'throw' });

    if (!user) {
      logger.error('Failed to fetch user data from Stack Auth');

      return {
        error: 'User not found',
        statusCode: 401,
      };
    }

    const connectedAccount = await user.getConnectedAccount('github');
    const githubAccessToken =
      (await connectedAccount?.getAccessToken()) || null;

    const userData = await getUserData(
      githubAccessToken?.accessToken as string,
    );
    const githubUsername = userData.data.login;

    const neonEmployee = await isNeonEmployee(
      githubAccessToken?.accessToken as string,
      githubUsername,
    );

    return {
      ...user,
      githubUsername,
      githubAccessToken: githubAccessToken?.accessToken as string,
      isNeonEmployee: neonEmployee,
    };
  } catch (error) {
    logger.error('Stack Auth API call failed', { error });
    return {
      error: 'Authentication service error',
      statusCode: 500,
    };
  }
}
