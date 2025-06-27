import type {
  BreadcrumbData,
  ErrorContext,
  EventInstrumentation,
  EventProperties,
  InstrumentationConfig,
  InstrumentationTags,
  OperationMetadata,
  SseEventType,
  TimedOperation,
} from './types';

export class CompositeInstrumentation implements EventInstrumentation {
  private providers: EventInstrumentation[] = [];

  constructor(providers: EventInstrumentation[]) {
    this.providers = providers;
  }

  initialize(config?: InstrumentationConfig): void {
    this.providers.forEach((provider) => provider.initialize(config));
  }

  setupPerformanceMonitoring(app: InstrumentationConfig['app']): void {
    this.providers.forEach((provider) => {
      if (provider.setupPerformanceMonitoring) {
        provider.setupPerformanceMonitoring(app);
      }
    });
  }

  addTags(tags: InstrumentationTags): void {
    this.providers.forEach((provider) => provider.addTags(tags));
  }

  addMeasurement(name: string, value: number, unit?: string): void {
    this.providers.forEach((provider) =>
      provider.addMeasurement(name, value, unit),
    );
  }

  setContext(key: string, data: Record<string, unknown>): void {
    this.providers.forEach((provider) => provider.setContext(key, data));
  }

  addBreadcrumb(breadcrumb: BreadcrumbData): void {
    this.providers.forEach((provider) => provider.addBreadcrumb(breadcrumb));
  }

  captureError(error: Error, context?: ErrorContext): void {
    this.providers.forEach((provider) => provider.captureError(error, context));
  }

  startTimedOperation(
    operationName: string,
    metadata?: OperationMetadata,
  ): TimedOperation {
    let operation: TimedOperation | null = null;

    this.providers.forEach((provider) => {
      const op = provider.startTimedOperation(operationName, metadata);
      if (!operation) operation = op;
    });

    return operation || { startTime: Date.now(), metadata };
  }

  endTimedOperation(
    operationName: string,
    operation: TimedOperation,
    status?: string,
  ): void {
    this.providers.forEach((provider) =>
      provider.endTimedOperation(operationName, operation, status),
    );
  }

  trackEvent(eventName: string, properties?: EventProperties): void {
    this.providers.forEach((provider) =>
      provider.trackEvent(eventName, properties),
    );
  }

  trackSseEvent(eventType: SseEventType, data?: EventProperties): void {
    this.providers.forEach((provider) =>
      provider.trackSseEvent(eventType, data),
    );
  }

  trackUserMessage(message: string): void {
    this.providers.forEach((provider) => provider.trackUserMessage(message));
  }

  trackPlatformMessage(messageType: string): void {
    this.providers.forEach((provider) =>
      provider.trackPlatformMessage(messageType),
    );
  }
}
