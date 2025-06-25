import * as Sentry from '@sentry/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface SentryRequest extends FastifyRequest {
  sentryStartTime?: number;
}

type SseEventType =
  | 'sse_connection_started'
  | 'sse_message_sent'
  | 'sse_connection_ended'
  | 'sse_connection_error';

type SentryTagValue = string | number | boolean;
type SentryTags = Record<string, SentryTagValue>;

export function initializeSentry(app?: FastifyInstance) {
  Sentry.init({
    dsn: 'https://30c51d264305db0af58cba176d3fb6c2@o1373725.ingest.us.sentry.io/4509434420264960',
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 0.01,
    sendDefaultPii: true,
    integrations: (integrations) => {
      return integrations.filter((integration) => {
        return integration.name !== 'Http'; // we must exclude this integration to avoid closing http requests prematurely
      });
    },
  });

  if (app) Sentry.setupFastifyErrorHandler(app);
}

export function setupSentryPerformanceMonitoring(app: FastifyInstance) {
  app.addHook('onRequest', (request: SentryRequest, _: FastifyReply, done) => {
    const scope = Sentry.getCurrentScope();
    const transactionName = `${request.method} ${request.url}`;
    scope.setTransactionName(transactionName);

    scope.setContext('request', {
      method: request.method,
      url: request.url,
      query: request.query,
      headers: request.headers,
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

        if (request.url?.includes('/message')) {
          scope.setContext('sse', {
            duration: `${duration}ms`,
            type: 'server-sent-events',
          });
        }
      }

      done();
    },
  );
}

export const SentryMetrics = {
  addMeasurement: (name: string, value: number, unit: string = 'ms') => {
    try {
      const scope = Sentry.getCurrentScope();
      scope.setTag(`measurement_${name}`, `${value}${unit}`);
    } catch (_) {
      // silently ignore errors
    }
  },

  addTags: (tags: SentryTags) => {
    const scope = Sentry.getCurrentScope();
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
  },

  _requestData: new Map<
    string,
    { startTime: number; transaction: any; timeoutId: NodeJS.Timeout }
  >(),

  trackAiAgentStart: (traceId: string, applicationId: string) => {
    const startTime = Date.now();
    const transaction = Sentry.startInactiveSpan({
      op: 'ai.agent.process',
      name: 'AI Agent Processing',
    });

    if (transaction) {
      transaction.setAttributes({
        'ai.agent.trace_id': traceId,
        'ai.agent.application_id': applicationId,
        'ai.agent.started': 'true',
      });
    }

    const timeoutId = setTimeout(() => {
      const data = SentryMetrics._requestData.get(traceId);
      if (data) {
        if (data.transaction) {
          data.transaction.setStatus('deadline_exceeded');
          data.transaction.end();
        }
        SentryMetrics._requestData.delete(traceId);
      }
    }, 2 * 60 * 60 * 1000); // 2 hours

    SentryMetrics._requestData.set(traceId, {
      startTime,
      transaction,
      timeoutId,
    });

    SentryMetrics.addTags({
      'ai.agent.trace_id': traceId,
      'ai.agent.application_id': applicationId,
      'ai.agent.started': 'true',
    });

    Sentry.addBreadcrumb({
      category: 'ai_agent',
      message: 'AI Agent request started',
      level: 'info',
      data: { traceId, applicationId },
    });
  },

  trackAiAgentEnd: (traceId: string, status: 'success' | 'error') => {
    const requestData = SentryMetrics._requestData.get(traceId);
    if (!requestData) {
      console.warn(`No request data found for traceId: ${traceId}`);
      return;
    }

    const { startTime, transaction, timeoutId } = requestData;

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    SentryMetrics.addMeasurement('ai.agent.duration', duration);

    if (transaction) {
      transaction.setAttributes({
        'ai.agent.status': status,
        'ai.agent.completed': 'true',
        'ai.agent.duration_ms': duration,
        'ai.agent.duration_bucket':
          duration < 1000
            ? '<1s'
            : duration < 3000
            ? '1-3s'
            : duration < 5000
            ? '3-5s'
            : duration < 10000
            ? '5-10s'
            : '>10s',
      });

      transaction.setStatus(status === 'success' ? 'ok' : 'internal_error');
      transaction.end();
    }

    SentryMetrics.addTags({
      'ai.agent.status': status,
      'ai.agent.completed': 'true',
      'ai.agent.duration_ms': duration,
      'ai.agent.duration_bucket':
        duration < 1000
          ? '<1s'
          : duration < 3000
          ? '1-3s'
          : duration < 5000
          ? '3-5s'
          : duration < 10000
          ? '5-10s'
          : '>10s',
    });

    Sentry.addBreadcrumb({
      category: 'ai_agent',
      message: `AI Agent request ${status}`,
      level: status === 'error' ? 'error' : 'info',
    });

    SentryMetrics._requestData.delete(traceId);
  },

  sseEventCount: {} as Record<string, number>,
  sseStartTime: 0,
  firstEventTime: 0,

  trackSseEvent: (eventType: SseEventType, data?: Record<string, any>) => {
    if (eventType === 'sse_connection_started') {
      SentryMetrics.sseStartTime = Date.now();
      SentryMetrics.firstEventTime = 0;
      SentryMetrics.sseEventCount = {};
    }

    if (!SentryMetrics.sseEventCount[eventType]) {
      SentryMetrics.sseEventCount[eventType] = 0;
    }
    SentryMetrics.sseEventCount[eventType]++;

    if (
      eventType === 'sse_message_sent' &&
      SentryMetrics.firstEventTime === 0 &&
      SentryMetrics.sseStartTime > 0
    ) {
      SentryMetrics.firstEventTime = Date.now();
      const timeToFirstEvent =
        SentryMetrics.firstEventTime - SentryMetrics.sseStartTime;
      SentryMetrics.addMeasurement('sse.time_to_first_event', timeToFirstEvent);
      SentryMetrics.addTags({
        'sse.time_to_first_event_ms': timeToFirstEvent,
      });
    }

    SentryMetrics.addTags({
      'sse.event.type': eventType,
      'sse.event.count': SentryMetrics.sseEventCount[eventType],
    });

    if (eventType === 'sse_message_sent' && data?.messageKind) {
      SentryMetrics.addTags({
        'sse.message.kind': data.messageKind,
        'sse.message.status': data.status,
      });
    }

    if (
      eventType === 'sse_connection_ended' ||
      eventType === 'sse_connection_error'
    ) {
      const totalEvents = Object.values(SentryMetrics.sseEventCount).reduce(
        (a, b) => a + b,
        0,
      );
      SentryMetrics.addMeasurement(
        'sse.total_event_count',
        totalEvents,
        'none',
      );
      SentryMetrics.addTags({
        'sse.total_event_count': totalEvents,
      });
    }

    Sentry.addBreadcrumb({
      category: 'sse',
      message: eventType,
      level: 'info',
      data: data,
      timestamp: Date.now() / 1000,
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

  trackUserMessage: (message: string): void => {
    const messageLength = message?.length || 0;

    SentryMetrics.addMeasurement('user.message_length', messageLength, 'none');
    SentryMetrics.addTags({
      'user.message_length': messageLength,
      'user.message_length_bucket':
        messageLength < 50
          ? '<50'
          : messageLength < 200
          ? '50-200'
          : messageLength < 500
          ? '200-500'
          : messageLength < 1000
          ? '500-1k'
          : '>1k',
    });
  },
};
