import * as Sentry from '@sentry/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  BreadcrumbData,
  ErrorContext,
  EventInstrumentation,
  InstrumentationTags,
  SseEventType,
  TimedOperation,
} from './types';

interface SentryRequest extends FastifyRequest {
  sentryStartTime?: number;
}

export class SentryAdapter implements EventInstrumentation {
  private _requestData = new Map<
    string,
    { startTime: number; transaction: any; timeoutId: NodeJS.Timeout }
  >();

  private sseEventCount: Record<string, number> = {};
  private sseStartTime = 0;
  private firstEventTime = 0;

  initialize(): void {
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
  }

  setupPerformanceMonitoring(app: FastifyInstance): void {
    Sentry.setupFastifyErrorHandler(app);
    this.addPerformanceHooks(app);
  }

  private addPerformanceHooks(app: FastifyInstance): void {
    app.addHook(
      'onRequest',
      (request: SentryRequest, _: FastifyReply, done) => {
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
      },
    );

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

  addTags(tags: InstrumentationTags): void {
    const scope = Sentry.getCurrentScope();
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
  }

  addMeasurement(name: string, value: number, unit: string = 'ms'): void {
    try {
      const scope = Sentry.getCurrentScope();
      scope.setTag(`measurement_${name}`, `${value}${unit}`);
    } catch (_) {
      // silently ignore errors
    }
  }

  setContext(key: string, data: Record<string, unknown>): void {
    const scope = Sentry.getCurrentScope();
    scope.setContext(key, data);
  }

  addBreadcrumb(breadcrumb: BreadcrumbData): void {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level,
      data: breadcrumb.data,
      timestamp: breadcrumb.timestamp || Date.now() / 1000,
    });
  }

  captureError(error: Error, context?: ErrorContext): void {
    Sentry.captureException(error, {
      tags: context,
    });
  }

  startTimedOperation(
    operationName: string,
    metadata?: Record<string, any>,
  ): TimedOperation {
    const startTime = Date.now();

    switch (operationName) {
      case 'ai.agent.process': {
        const traceId = metadata?.traceId;
        const applicationId = metadata?.applicationId;

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
          const data = this._requestData.get(traceId);
          if (data) {
            if (data.transaction) {
              data.transaction.setStatus('deadline_exceeded');
              data.transaction.end();
            }
            this._requestData.delete(traceId);
          }
        }, 2 * 60 * 60 * 1000); // 2 hours

        this._requestData.set(traceId, {
          startTime,
          transaction,
          timeoutId,
        });

        this.addTags({
          'ai.agent.trace_id': traceId,
          'ai.agent.application_id': applicationId,
          'ai.agent.started': 'true',
        });

        this.addBreadcrumb({
          category: 'ai_agent',
          message: 'AI Agent request started',
          level: 'info',
          data: { traceId, applicationId },
        });
        break;
      }

      case 'github.repo_creation':
        this.addBreadcrumb({
          category: 'github',
          message: 'GitHub repo creation started',
          level: 'info',
        });
        this.addTags({ 'github.repo_creation.started': 'true' });
        this.setContext('github_repo_creation', { startTime });
        break;

      case 'github.commit':
        this.addBreadcrumb({
          category: 'github',
          message: 'GitHub commit started',
          level: 'info',
        });
        this.addTags({ 'github.commit.started': 'true' });
        this.setContext('github_commit', { startTime });
        break;

      case 'deployment':
        this.addBreadcrumb({
          category: 'deployment',
          message: 'Deployment started',
          level: 'info',
        });
        this.addTags({ 'deploy.app_id': metadata?.applicationId || '' });
        this.setContext('deployment', { startTime, status: 'started' });
        break;

      case 'app_creation':
        this.addBreadcrumb({
          category: 'app_creation',
          message: 'App creation started',
          level: 'info',
        });
        this.addTags({
          'app_creation.started': 'true',
          'app_creation.type': 'new',
        });
        this.setContext('app_creation', { startTime });
        break;
    }

    return { startTime, metadata };
  }

  endTimedOperation(
    operationName: string,
    operation: TimedOperation,
    status?: string,
  ): void {
    const duration = Date.now() - operation.startTime;

    switch (operationName) {
      case 'ai.agent.process': {
        const traceId = operation.metadata?.traceId;
        const requestData = this._requestData.get(traceId);

        if (!requestData) {
          console.warn(`No request data found for traceId: ${traceId}`);
          return;
        }

        const { transaction, timeoutId } = requestData;
        clearTimeout(timeoutId);

        this.addMeasurement('ai.agent.duration', duration);

        if (transaction) {
          transaction.setAttributes({
            'ai.agent.status': status || 'success',
            'ai.agent.completed': 'true',
            'ai.agent.duration_ms': duration,
            'ai.agent.duration_bucket': this.getDurationBucket(duration),
          });

          transaction.setStatus(status === 'success' ? 'ok' : 'internal_error');
          transaction.end();
        }

        this.addTags({
          'ai.agent.status': status || 'success',
          'ai.agent.completed': 'true',
          'ai.agent.duration_ms': duration,
          'ai.agent.duration_bucket': this.getDurationBucket(duration),
        });

        this.addBreadcrumb({
          category: 'ai_agent',
          message: `AI Agent request ${status || 'success'}`,
          level: status === 'error' ? 'error' : 'info',
        });

        this._requestData.delete(traceId);
        break;
      }

      case 'github.repo_creation':
        this.addBreadcrumb({
          category: 'github',
          message: 'GitHub repo creation completed',
          level: 'info',
          data: { duration: `${duration}ms` },
        });
        this.addTags({
          'github.repo_creation.duration_ms': duration,
          'github.repo_creation.status': 'success',
        });
        break;

      case 'github.commit':
        this.addBreadcrumb({
          category: 'github',
          message: 'GitHub commit completed',
          level: 'info',
          data: { duration: `${duration}ms` },
        });
        this.addTags({
          'github.commit.duration_ms': duration,
          'github.commit.status': 'success',
        });
        break;

      case 'deployment':
        this.addBreadcrumb({
          category: 'deployment',
          message: `Deployment ${status || 'complete'}`,
          level: status === 'error' ? 'error' : 'info',
          data: { duration: `${duration}ms` },
        });
        this.addTags({
          'deployment.status': status || 'complete',
          'deployment.duration_ms': duration,
        });
        break;

      case 'app_creation':
        this.addBreadcrumb({
          category: 'app_creation',
          message: 'App creation completed',
          level: 'info',
          data: { duration: `${duration}ms` },
        });
        this.addTags({
          'app_creation.completed': 'true',
          'app_creation.duration_ms': duration,
        });
        break;
    }
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    this.addBreadcrumb({
      category: 'event',
      message: eventName,
      level: 'info',
      data: properties,
    });

    if (properties) {
      const tags: InstrumentationTags = {};
      Object.entries(properties).forEach(([key, value]) => {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          tags[`event.${eventName}.${key}`] = value;
        }
      });
      this.addTags(tags);
    }
  }

  trackSseEvent(eventType: SseEventType, data?: Record<string, any>): void {
    if (eventType === 'sse_connection_started') {
      this.sseStartTime = Date.now();
      this.firstEventTime = 0;
      this.sseEventCount = {};
    }

    if (!this.sseEventCount[eventType]) {
      this.sseEventCount[eventType] = 0;
    }
    this.sseEventCount[eventType]++;

    if (
      eventType === 'sse_message_sent' &&
      this.firstEventTime === 0 &&
      this.sseStartTime > 0
    ) {
      this.firstEventTime = Date.now();
      const timeToFirstEvent = this.firstEventTime - this.sseStartTime;
      this.addMeasurement('sse.time_to_first_event', timeToFirstEvent);
      this.addTags({
        'sse.time_to_first_event_ms': timeToFirstEvent,
      });
    }

    this.addTags({
      'sse.event.type': eventType,
      'sse.event.count': this.sseEventCount[eventType],
    });

    if (eventType === 'sse_message_sent' && data?.messageKind) {
      this.addTags({
        'sse.message.kind': data.messageKind,
        'sse.message.status': data.status,
      });
    }

    if (
      eventType === 'sse_connection_ended' ||
      eventType === 'sse_connection_error'
    ) {
      const totalEvents = Object.values(this.sseEventCount).reduce(
        (a, b) => a + b,
        0,
      );
      this.addMeasurement('sse.total_event_count', totalEvents, 'none');
      this.addTags({
        'sse.total_event_count': totalEvents,
      });
    }

    this.addBreadcrumb({
      category: 'sse',
      message: eventType,
      level: 'info',
      data: data,
    });
  }

  trackUserMessage(message: string): void {
    const messageLength = message?.length || 0;

    this.addMeasurement('user.message_length', messageLength, 'none');
    this.addTags({
      'user.message_length': messageLength,
      'user.message_length_bucket': this.getMessageLengthBucket(messageLength),
    });
  }

  trackPlatformMessage(messageType: string): void {
    this.addBreadcrumb({
      category: 'platform_message',
      message: `Platform message sent: ${messageType}`,
      level: 'info',
    });

    this.addTags({
      'platform_message.type': messageType,
      'platform_message.sent': 'true',
    });

    switch (messageType) {
      case 'repo_created':
        this.addTags({ 'github.repo_created': 'true' });
        break;
      case 'commit_created':
        this.addTags({ 'github.commit_created': 'true' });
        break;
      case 'deployment_in_progress':
        this.addTags({ 'deploy.in_progress_sent': 'true' });
        break;
      case 'deployment_complete':
        this.addTags({ 'deploy.complete_sent': 'true' });
        break;
      case 'deployment_failed':
        this.addTags({ 'deploy.failed_sent': 'true' });
        break;
    }
  }

  private getDurationBucket(duration: number): string {
    if (duration < 1000) return '<1s';
    if (duration < 3000) return '1-3s';
    if (duration < 5000) return '3-5s';
    if (duration < 10000) return '5-10s';
    return '>10s';
  }

  private getMessageLengthBucket(length: number): string {
    if (length < 50) return '<50';
    if (length < 200) return '50-200';
    if (length < 500) return '200-500';
    if (length < 1000) return '500-1k';
    return '>1k';
  }
}
