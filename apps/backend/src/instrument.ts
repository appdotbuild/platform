import * as Sentry from '@sentry/node';

let sentryInitialized = false;

/**
 * Initialize Sentry for error monitoring and performance tracking.
 * Safe to call multiple times - will only initialize once.
 *
 * @returns boolean indicating if Sentry was successfully initialized
 */
export function initializeSentry(): boolean {
  // Return early if already initialized
  if (sentryInitialized) {
    return true;
  }

  try {
    Sentry.init({
      dsn: 'https://30c51d264305db0af58cba176d3fb6c2@o1373725.ingest.us.sentry.io/4509434420264960',
      environment: process.env.NODE_ENV,
      // Adds request headers and IP for users, for more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#sendDefaultPii
      sendDefaultPii: true,
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });

    sentryInitialized = true;
    console.log(
      `✅ Sentry initialized for ${process.env.NODE_ENV} environment`,
    );
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
    return false;
  }
}
