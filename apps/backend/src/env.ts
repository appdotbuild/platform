import process from 'node:process';

type RequiredEnvVars =
  | 'AWS_ACCESS_KEY_ID'
  | 'AWS_SECRET_ACCESS_KEY'
  | 'AWS_REGION'
  | 'AWS_ECR_URL'
  | 'AWS_ECR_NAMESPACE'
  | 'NEON_API_KEY'
  | 'AGENT_API_SECRET_AUTH'
  | 'STACK_PROJECT_ID'
  | 'STACK_PUBLISHABLE_CLIENT_KEY'
  | 'STACK_SECRET_SERVER_KEY'
  | 'GITHUB_APP_ID'
  | 'GITHUB_APP_PRIVATE_KEY'
  | 'GITHUB_APP_BOT_EMAIL'
  | 'DATABASE_URL'
  | 'DATABASE_URL_DEV'
  | 'KOYEB_CLI_TOKEN';

type EnvVars = {
  [K in RequiredEnvVars]: string;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvVars {}
  }
}

export const isDev = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// We might want to use zod to validate the env vars instead of this mechanism.
export const requiredVars: RequiredEnvVars[] = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_ECR_URL',
  'AWS_ECR_NAMESPACE',
  'NEON_API_KEY',
  'AGENT_API_SECRET_AUTH',
  'STACK_PROJECT_ID',
  'STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY',
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_APP_BOT_EMAIL',
  isDev ? 'DATABASE_URL_DEV' : 'DATABASE_URL',
  'KOYEB_CLI_TOKEN',
] as const;

function assertEnvVarsPresent(vars: RequiredEnvVars[]) {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

export function validateEnv() {
  assertEnvVarsPresent(requiredVars);
}
