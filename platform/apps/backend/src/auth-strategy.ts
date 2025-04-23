import type { FastifyRequest, FastifyReply } from "fastify";
import * as jose from "jose";
import { logger } from ".";

type AuthError = {
  error: string;
  statusCode: number;
};

type OAuthProvider = {
  id: string;
  account_id: string;
  email: string;
};

type User = {
  id: string;
  display_name: string;
  primary_email: string;
  primary_email_verified: boolean;
  primary_email_auth_enabled: boolean;
  profile_image_url: string;
  signed_up_at_millis: number;
  client_metadata: Record<string, any> | null;
  client_read_only_metadata: Record<string, any> | null;
  server_metadata: Record<string, any> | null;
  has_password: boolean;
  otp_auth_enabled: boolean;
  auth_with_email: boolean;
  requires_totp_mfa: boolean;
  passkey_auth_enabled: boolean;
  oauth_providers: OAuthProvider[];
  selected_team_id: string | null;
  selected_team: any | null;
  last_active_at_millis: number;
  is_anonymous: boolean;
};

// Bearer token authentication strategy
export async function validateAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<User | AuthError> {
  const jwks = jose.createRemoteJWKSet(
    new URL(
      `https://api.stack-auth.com/api/v1/projects/${process.env.STACK_PROJECT_ID}/.well-known/jwks.json`,
    ),
  );

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: "Missing or invalid authorization header",
      statusCode: 401,
    };
  }

  const accessToken = authHeader.split(" ")[1];

  let payload;
  try {
    payload = (await jose.jwtVerify(accessToken, jwks)).payload;
  } catch (error) {
    logger.error("JWT verification failed", { error });
    return {
      error: "Invalid authentication token",
      statusCode: 401,
    };
  }

  if (!payload.sub) {
    logger.warn("No subject found in JWT payload");
    return {
      error: "Invalid authentication token",
      statusCode: 401,
    };
  }

  try {
    const response = await fetch(
      `https://api.stack-auth.com/api/v1/users/${payload.sub}`,
      {
        method: "GET",
        headers: {
          "X-Stack-Project-Id": process.env.STACK_PROJECT_ID!,
          "X-Stack-Access-Type": "server",
          "X-Stack-Publishable-Client-Key":
            process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
          "X-Stack-Secret-Server-Key": process.env.STACK_SECRET_SERVER_KEY!,
        },
      },
    );

    if (!response.ok) {
      logger.error("Failed to fetch user data from Stack Auth", {
        statusText: response.statusText,
        status: response.status,
      });
      return {
        error: "Failed to validate user",
        statusCode: 401,
      };
    }

    const responseJson = (await response.json()) as User;
    if (!responseJson.primary_email?.endsWith("@neon.tech")) {
      logger.warn("Unauthorized email domain attempt", {
        email: responseJson.primary_email,
      });
      return {
        error: "Unauthorized email domain",
        statusCode: 403,
      };
    }

    return responseJson;
  } catch (error) {
    logger.error("Stack Auth API call failed", { error });
    return {
      error: "Authentication service error",
      statusCode: 500,
    };
  }
}
