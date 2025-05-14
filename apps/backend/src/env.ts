import process from 'node:process';

// We might want to use zod to validate the env vars instead of this mechanism.

const requiredVars: RequiredEnvVars[] = [
  'BACKEND_API_SECRET',
  'FLY_IO_TOKEN',
  'NEON_API_KEY',
  'AGENT_API_SECRET_AUTH',
  'DEPLOYED_BOT_AWS_ACCESS_KEY_ID',
  'DEPLOYED_BOT_AWS_SECRET_ACCESS_KEY',
  'DEPLOYED_BOT_PERPLEXITY_API_KEY',
  'DEPLOYED_BOT_PICA_SECRET_KEY',
  'STACK_PROJECT_ID',
  'STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY',
  'GITHUB_APP_ID',
  'GITHUB_APP_CLIENT_ID',
  'GITHUB_APP_CLIENT_SECRET',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_APP_BOT_EMAIL',
  'DATABASE_URL',
  'DATABASE_URL_DEV',
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
