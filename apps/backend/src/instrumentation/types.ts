export type InstrumentationTagValue = string | number | boolean;
export type InstrumentationTags = Record<string, InstrumentationTagValue>;

export type SseEventType =
  | 'sse_connection_started'
  | 'sse_message_sent'
  | 'sse_connection_ended'
  | 'sse_connection_error';

export interface OperationMetadata {
  traceId?: string;
  applicationId?: string;
  userId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TimedOperation {
  startTime: number;
  metadata?: OperationMetadata;
}

export interface InstrumentationConfig {
  app?: any;
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface EventContext {
  applicationId?: string;
  traceId?: string;
  userId?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface BreadcrumbData {
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: EventProperties;
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
  initialize(config?: InstrumentationConfig): void;
  setupPerformanceMonitoring?(app: InstrumentationConfig['app']): void;
  addTags(tags: InstrumentationTags): void;
  addMeasurement(name: string, value: number, unit?: string): void;
  setContext(key: string, data: Record<string, unknown>): void;
  addBreadcrumb(breadcrumb: BreadcrumbData): void;

  startTimedOperation(
    operationName: string,
    metadata?: OperationMetadata,
  ): TimedOperation;
  endTimedOperation(
    operationName: string,
    operation: TimedOperation,
    status?: string,
  ): void;

  // event tracking methods
  trackEvent(eventName: string, properties?: EventProperties): void;
  trackSseEvent(eventType: SseEventType, data?: EventProperties): void;
  trackUserMessage(message: string): void;
  trackPlatformMessage(messageType: string): void;
  captureError(error: Error, context?: ErrorContext): void;
}
