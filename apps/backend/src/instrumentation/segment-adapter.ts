import { Analytics } from '@segment/analytics-node';
import type {
  BreadcrumbData,
  ErrorContext,
  EventInstrumentation,
  InstrumentationTags,
  SseEventType,
  TimedOperation,
} from './types';

export class SegmentAdapter implements EventInstrumentation {
  private analytics: Analytics | null = null;
  private currentContext: Record<string, any> = {};
  private currentTags: InstrumentationTags = {};
  private timedOperations = new Map<string, TimedOperation>();
  private conversationStartTime = 0;
  private lastMessageTime = 0;

  initialize(): void {
    const writeKey = process.env.SEGMENT_WRITE_KEY;

    if (!writeKey) {
      console.warn(
        'Segment write key not provided, analytics will be disabled',
      );
      return;
    }

    this.analytics = new Analytics({ writeKey });
  }

  addTags(tags: InstrumentationTags): void {
    this.currentTags = { ...this.currentTags, ...tags };
  }

  addMeasurement(name: string, value: number, unit: string = 'ms'): void {
    if (!this.analytics) return;

    this.currentTags[`measurement_${name}`] =
      unit === 'none' ? value : `${value}${unit}`;
  }

  setContext(key: string, data: Record<string, unknown>): void {
    this.currentContext[key] = data;
  }

  addBreadcrumb(_breadcrumb: BreadcrumbData): void {
    // breadcrumb is for debug and not tracked with segment
    return;
  }

  captureError(error: Error, context?: ErrorContext): void {
    if (!this.analytics) return;

    this.analytics.track({
      userId: context?.userId || this.getAnonymousId(),
      event: 'Error Captured',
      properties: {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name,
        ...context,
      },
      context: this.buildContext(),
    });
  }

  startTimedOperation(
    operationName: string,
    metadata?: Record<string, any>,
  ): TimedOperation {
    const operation: TimedOperation = {
      startTime: Date.now(),
      metadata,
    };

    this.timedOperations.set(operationName, operation);

    return operation;
  }

  endTimedOperation(
    operationName: string,
    _operation: TimedOperation,
    _status?: string,
  ): void {
    // these operations are tracked via platform messages or ignored
    if (
      operationName === 'github.repo_creation' ||
      operationName === 'github.commit' ||
      operationName === 'deployment' ||
      operationName === 'app_creation' ||
      operationName === 'ai.agent.process'
    ) {
      return;
    }

    // clean up
    const storedOperation = this.timedOperations.get(operationName);
    if (storedOperation) {
      this.timedOperations.delete(operationName);
    }
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.analytics) return;

    this.analytics.track({
      userId: properties?.userId || this.getAnonymousId(),
      event: eventName,
      properties: {
        ...properties,
        ...this.currentTags,
      },
      context: this.buildContext(),
    });
  }

  trackSseEvent(eventType: SseEventType, data?: Record<string, any>): void {
    if (!this.analytics) return;

    // conversation start event
    if (eventType === 'sse_connection_started') {
      this.conversationStartTime = Date.now();
      this.lastMessageTime = Date.now();
      this.analytics.track({
        userId: data?.userId || this.getAnonymousId(),
        event: 'Conversation Started',
        properties: {
          application_id: data?.applicationId,
          is_new_app: !data?.applicationId,
          ...this.currentTags,
        },
        context: this.buildContext(),
      });
      return;
    }

    // agent message sent event
    if (eventType === 'sse_message_sent' && data?.messageKind) {
      const now = Date.now();
      const duration =
        this.lastMessageTime > 0
          ? now - this.lastMessageTime
          : now - this.conversationStartTime;

      this.lastMessageTime = now;

      this.analytics.track({
        userId: data?.userId || this.getAnonymousId(),
        event: 'Agent Message',
        properties: {
          message_kind: data.messageKind,
          message_status: data.status,
          application_id: data?.applicationId,
          duration_ms: duration,
          duration_seconds: duration / 1000,
          duration_bucket: this.getDurationBucket(duration),
          ...this.currentTags,
        },
        context: this.buildContext(),
      });
      return;
    }

    // conversation end event
    if (eventType === 'sse_connection_ended') {
      const totalDuration = this.conversationStartTime
        ? Date.now() - this.conversationStartTime
        : 0;

      this.analytics.track({
        userId: data?.userId || this.getAnonymousId(),
        event: 'Conversation Completed',
        properties: {
          application_id: data?.applicationId,
          total_duration_ms: totalDuration,
          total_duration_seconds: totalDuration / 1000,
          ...data,
          ...this.currentTags,
        },
        context: this.buildContext(),
      });

      // clear state for each conversation
      this.currentTags = {};
      this.conversationStartTime = 0;
      this.lastMessageTime = 0;
      return;
    }

    // error event
    if (eventType === 'sse_connection_error') {
      this.analytics.track({
        userId: data?.userId || this.getAnonymousId(),
        event: 'Conversation Error',
        properties: {
          error: data?.error,
          application_id: data?.applicationId,
          ...this.currentTags,
        },
        context: this.buildContext(),
      });
    }
  }

  // user message event
  trackUserMessage(message: string, userId: string): void {
    if (!this.analytics) return;

    const messageLength = message?.length || 0;
    this.lastMessageTime = Date.now();

    this.analytics.track({
      userId: userId || this.getAnonymousId(),
      event: 'User Message Sent',
      properties: {
        message_length: messageLength,
        message_length_bucket: this.getMessageLengthBucket(messageLength),
        ...this.currentTags,
      },
      context: this.buildContext(),
    });
  }

  // platform message event
  trackPlatformMessage(messageType: string, userId: string): void {
    if (!this.analytics) return;

    let duration = 0;
    let operationName = '';

    switch (messageType) {
      case 'repo_created':
        operationName = 'github.repo_creation';
        break;
      case 'commit_created':
        operationName = 'github.commit';
        break;
      case 'deployment_in_progress':
      case 'deployment_complete':
      case 'deployment_failed':
        operationName = 'deployment';
        break;
    }

    if (operationName) {
      const operation = this.timedOperations.get(operationName);
      if (operation) {
        duration = Date.now() - operation.startTime;
      }
    }

    this.analytics.track({
      userId: userId || this.getAnonymousId(),
      event: 'Platform Message',
      properties: {
        message_type: messageType,
        duration_ms: duration,
        duration_seconds: duration / 1000,
        duration_bucket:
          duration > 0 ? this.getDurationBucket(duration) : 'unknown',
        ...this.currentTags,
      },
      context: this.buildContext(),
    });
  }

  private getAnonymousId(): string {
    return this.currentContext.userId || 'anonymous';
  }

  private buildContext(): Record<string, any> {
    return {
      app: {
        name: 'app.build-backend',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      ...this.currentContext,
    };
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
