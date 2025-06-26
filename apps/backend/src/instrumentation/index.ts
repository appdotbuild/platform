import type { FastifyInstance } from 'fastify';
import { CompositeInstrumentation } from './composite-instrumentation';
import { SegmentAdapter } from './segment-adapter';
import { SentryAdapter } from './sentry-adapter';
import type { EventInstrumentation, TimedOperation } from './types';

export * from './types';

let instrumentationInstance: EventInstrumentation | null = null;
const timedOperations = new Map<string, TimedOperation>();

export function initializeInstrumentation(
  app?: FastifyInstance,
): EventInstrumentation {
  if (instrumentationInstance) {
    return instrumentationInstance;
  }

  const sentryAdapter = new SentryAdapter();
  const segmentAdapter = new SegmentAdapter();

  instrumentationInstance = new CompositeInstrumentation([
    sentryAdapter,
    segmentAdapter,
  ]);

  instrumentationInstance.initialize(app);

  return instrumentationInstance;
}

export function getInstrumentation(): EventInstrumentation {
  if (!instrumentationInstance) {
    throw new Error(
      'Instrumentation not initialized. Call initializeInstrumentation() first.',
    );
  }
  return instrumentationInstance;
}

export const Instrumentation = {
  initialize: (app?: FastifyInstance) => initializeInstrumentation(app),

  setupPerformanceMonitoring: (app: FastifyInstance) => {
    const instance = getInstrumentation();
    if (instance.setupPerformanceMonitoring) {
      instance.setupPerformanceMonitoring(app);
    }
  },

  get instance(): EventInstrumentation {
    return getInstrumentation();
  },

  addTags: (tags: Parameters<EventInstrumentation['addTags']>[0]) =>
    getInstrumentation().addTags(tags),

  addMeasurement: (
    ...args: Parameters<EventInstrumentation['addMeasurement']>
  ) => getInstrumentation().addMeasurement(...args),

  trackEvent: (...args: Parameters<EventInstrumentation['trackEvent']>) =>
    getInstrumentation().trackEvent(...args),

  trackSseEvent: (...args: Parameters<EventInstrumentation['trackSseEvent']>) =>
    getInstrumentation().trackSseEvent(...args),

  trackUserMessage: (message: string) =>
    getInstrumentation().trackUserMessage(message),

  trackPlatformMessage: (messageType: string) =>
    getInstrumentation().trackPlatformMessage(messageType),

  captureError: (...args: Parameters<EventInstrumentation['captureError']>) =>
    getInstrumentation().captureError(...args),

  startTimedOperation: (
    ...args: Parameters<EventInstrumentation['startTimedOperation']>
  ) => getInstrumentation().startTimedOperation(...args),

  endTimedOperation: (
    ...args: Parameters<EventInstrumentation['endTimedOperation']>
  ) => getInstrumentation().endTimedOperation(...args),

  setContext: (...args: Parameters<EventInstrumentation['setContext']>) =>
    getInstrumentation().setContext(...args),

  addBreadcrumb: (...args: Parameters<EventInstrumentation['addBreadcrumb']>) =>
    getInstrumentation().addBreadcrumb(...args),

  trackAiAgentStart: (traceId: string, applicationId: string) => {
    const operation = getInstrumentation().startTimedOperation(
      'ai.agent.process',
      {
        traceId,
        applicationId,
      },
    );
    timedOperations.set(traceId, operation);
    return operation.startTime;
  },

  trackAiAgentEnd: (traceId: string, status: 'success' | 'error') => {
    const operation = timedOperations.get(traceId);
    if (operation) {
      getInstrumentation().endTimedOperation(
        'ai.agent.process',
        operation,
        status,
      );
      timedOperations.delete(traceId);
    }
  },

  trackGitHubRepoCreation: () => {
    const operation = getInstrumentation().startTimedOperation(
      'github.repo_creation',
    );
    return operation.startTime;
  },

  trackGitHubRepoCreationEnd: (startTime: number) => {
    const operation = { startTime };
    getInstrumentation().endTimedOperation(
      'github.repo_creation',
      operation,
      'success',
    );
  },

  trackGitHubCommit: () => {
    const operation = getInstrumentation().startTimedOperation('github.commit');
    return operation.startTime;
  },

  trackGitHubCommitEnd: (startTime: number) => {
    const operation = { startTime };
    getInstrumentation().endTimedOperation(
      'github.commit',
      operation,
      'success',
    );
  },

  trackDeploymentStart: (applicationId: string) => {
    const operation = getInstrumentation().startTimedOperation('deployment', {
      applicationId,
    });
    return operation.startTime;
  },

  trackDeploymentEnd: (startTime: number, status: 'complete' | 'error') => {
    const operation = { startTime };
    getInstrumentation().endTimedOperation('deployment', operation, status);
  },

  trackAppCreationStart: () => {
    const operation = getInstrumentation().startTimedOperation('app_creation');
    return operation.startTime;
  },

  trackAppCreationEnd: (startTime: number) => {
    const operation = { startTime };
    getInstrumentation().endTimedOperation(
      'app_creation',
      operation,
      'success',
    );
  },
};
