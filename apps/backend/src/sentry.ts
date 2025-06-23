import * as Sentry from '@sentry/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface SentryRequest extends FastifyRequest {
  sentryStartTime?: number;
}

export function initializeSentry(): void {
  const environment = process.env.NODE_ENV || 'development';

  Sentry.init({
    dsn:
      process.env.SENTRY_DSN ||
      'https://30c51d264305db0af58cba176d3fb6c2@o1373725.ingest.us.sentry.io/4509434420264960',
    environment,
    debug: environment !== 'production',
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    sendDefaultPii: true,
  });
}

export function setupSentryPerformanceMonitoring(app: FastifyInstance): void {
  app.addHook('onRequest', (request: SentryRequest, _: FastifyReply, done) => {
    const scope = Sentry.getCurrentScope();
    const transactionName = `${request.method} ${request.url}`;
    scope.setTransactionName(transactionName);

    scope.setContext('request', {
      method: request.method,
      url: request.url,
      query: request.query,
    });

    request.sentryStartTime = Date.now();
    done();
  });

  app.addHook(
    'onResponse',
    (request: SentryRequest, reply: FastifyReply, done) => {
      const scope = Sentry.getCurrentScope();
      const startTime = request.sentryStartTime;

      if (startTime) {
        const duration = Date.now() - startTime;
        scope.setContext('response', {
          statusCode: reply.statusCode,
          duration: `${duration}ms`,
        });

        scope.setTag('response_time_ms', duration);
      }

      done();
    },
  );
}

export const SentryMetrics = {
  trackAgentStart: (traceId: string, applicationId: string): number => {
    const startTime = Date.now();

    Sentry.addBreadcrumb({
      category: 'ai_agent',
      message: 'AI Agent request started',
      level: 'info',
      data: { traceId, applicationId },
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('ai_agent.trace_id', traceId);
    scope.setTag('ai_agent.application_id', applicationId);
    scope.setContext('ai_agent', {
      startTime,
      status: 'started',
    });

    return startTime;
  },

  trackAgentEnd: (startTime: number, status: 'success' | 'error'): void => {
    const duration = Date.now() - startTime;

    Sentry.addBreadcrumb({
      category: 'ai_agent',
      message: `AI Agent request ${status}`,
      level: status === 'error' ? 'error' : 'info',
      data: { duration: `${duration}ms` },
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('ai_agent.status', status);
    scope.setTag('ai_agent.duration_ms', duration);
    scope.setContext('ai_agent', {
      duration,
      status,
    });
  },

  trackGitHubRepoCreation: (): number => {
    const startTime = Date.now();

    Sentry.addBreadcrumb({
      category: 'github',
      message: 'GitHub repo creation started',
      level: 'info',
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('github.repo_creation.started', 'true');
    scope.setContext('github_repo_creation', { startTime });

    return startTime;
  },

  trackGitHubRepoCreationEnd: (startTime: number): void => {
    const duration = Date.now() - startTime;

    Sentry.addBreadcrumb({
      category: 'github',
      message: 'GitHub repo creation completed',
      level: 'info',
      data: { duration: `${duration}ms` },
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('github.repo_creation.duration_ms', duration);
    scope.setTag('github.repo_creation.status', 'success');
  },

  trackGitHubCommit: (): number => {
    const startTime = Date.now();

    Sentry.addBreadcrumb({
      category: 'github',
      message: 'GitHub commit started',
      level: 'info',
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('github.commit.started', 'true');
    scope.setContext('github_commit', { startTime });

    return startTime;
  },

  trackGitHubCommitEnd: (startTime: number): void => {
    const duration = Date.now() - startTime;

    Sentry.addBreadcrumb({
      category: 'github',
      message: 'GitHub commit completed',
      level: 'info',
      data: { duration: `${duration}ms` },
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('github.commit.duration_ms', duration);
    scope.setTag('github.commit.status', 'success');
  },

  trackDeploymentStart: (applicationId: string): number => {
    const startTime = Date.now();

    Sentry.addBreadcrumb({
      category: 'deployment',
      message: 'Deployment started',
      level: 'info',
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('deploy.app_id', applicationId);
    scope.setContext('deployment', { startTime, status: 'started' });

    return startTime;
  },

  trackDeploymentEnd: (
    startTime: number,
    status: 'complete' | 'error',
  ): void => {
    const duration = Date.now() - startTime;

    Sentry.addBreadcrumb({
      category: 'deployment',
      message: `Deployment ${status}`,
      level: status === 'error' ? 'error' : 'info',
      data: { duration: `${duration}ms` },
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('deployment.status', status);
    scope.setTag('deployment.duration_ms', duration);
  },

  trackAppCreationStart: (): number => {
    const startTime = Date.now();

    Sentry.addBreadcrumb({
      category: 'app_creation',
      message: 'App creation started',
      level: 'info',
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('app_creation.started', 'true');
    scope.setTag('app_creation.type', 'new');
    scope.setContext('app_creation', { startTime });

    return startTime;
  },

  trackAppCreationEnd: (startTime: number): void => {
    const duration = Date.now() - startTime;

    Sentry.addBreadcrumb({
      category: 'app_creation',
      message: 'App creation completed',
      level: 'info',
      data: { duration: `${duration}ms` },
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('app_creation.completed', 'true');
    scope.setTag('app_creation.duration_ms', duration);
  },

  trackSseEvent: (eventType: string, data?: Record<string, unknown>): void => {
    Sentry.addBreadcrumb({
      category: 'sse',
      message: eventType,
      level: 'info',
      data,
    });

    if (eventType === 'sse_message_sent') {
      const scope = Sentry.getCurrentScope();
      scope.setTag('sse.first_message_sent', 'true');
    }
  },

  trackPlatformMessage: (messageType: string): void => {
    Sentry.addBreadcrumb({
      category: 'platform_message',
      message: `Platform message sent: ${messageType}`,
      level: 'info',
    });

    const scope = Sentry.getCurrentScope();
    scope.setTag('platform_message.type', messageType);
    scope.setTag('platform_message.sent', 'true');

    switch (messageType) {
      case 'repo_created':
        scope.setTag('github.repo_created', 'true');
        break;
      case 'commit_created':
        scope.setTag('github.commit_created', 'true');
        break;
      case 'deployment_in_progress':
        scope.setTag('deploy.in_progress_sent', 'true');
        break;
      case 'deployment_complete':
        scope.setTag('deploy.complete_sent', 'true');
        break;
      case 'deployment_failed':
        scope.setTag('deploy.failed_sent', 'true');
        break;
    }
  },

  captureError: (
    error: Error,
    context?: Record<string, string | number | boolean>,
  ): void => {
    Sentry.captureException(error, {
      tags: context,
    });
  },

  addContext: (key: string, data: Record<string, unknown>): void => {
    const scope = Sentry.getCurrentScope();
    scope.setContext(key, data);
  },

  addTags: (tags: Record<string, string | number | boolean>): void => {
    const scope = Sentry.getCurrentScope();
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
  },
};
