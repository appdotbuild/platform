export type InstrumentationTagValue = string | number | boolean;
export type InstrumentationTags = Record<string, InstrumentationTagValue>;

export type SseEventType =
  | 'sse_connection_started'
  | 'sse_message_sent'
  | 'sse_connection_ended'
  | 'sse_connection_error';

export interface TimedOperation {
  startTime: number;
  metadata?: Record<string, any>;
}

export interface EventContext {
  applicationId?: string;
  traceId?: string;
  userId?: string;
  [key: string]: any;
}

export interface BreadcrumbData {
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
  timestamp?: number;
}

export interface ErrorContext {
  applicationId?: string;
  traceId?: string;
  userId?: string;
  context?: string;
  [key: string]: any;
}

export interface EventInstrumentation {
  initialize(config?: any): void;
  setupPerformanceMonitoring?(app: any): void;
  addTags(tags: InstrumentationTags): void;
  addMeasurement(name: string, value: number, unit?: string): void;
  setContext(key: string, data: Record<string, unknown>): void;
  addBreadcrumb(breadcrumb: BreadcrumbData): void;

  startTimedOperation(
    operationName: string,
    metadata?: Record<string, any>,
  ): TimedOperation;
  endTimedOperation(
    operationName: string,
    operation: TimedOperation,
    status?: string,
  ): void;

  // event tracking methods
  trackEvent(eventName: string, properties?: Record<string, any>): void;
  trackSseEvent(eventType: SseEventType, data?: Record<string, any>): void;
  trackUserMessage(message: string): void;
  trackPlatformMessage(messageType: string): void;
  captureError(error: Error, context?: ErrorContext): void;
}
