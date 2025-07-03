import type { FastifyInstance } from 'fastify';
import { isDev } from '../env';
import { CompositeInstrumentation } from './composite-instrumentation';
import { SegmentAdapter } from './segment-adapter';
import { SentryAdapter } from './sentry-adapter';
import type {
  EventInstrumentation,
  OperationMetadata,
  TimedOperation,
} from './types';

export * from './types';

let instrumentationInstance: EventInstrumentation | null = null;
const timedOperations = new Map<
  string,
  { operation: TimedOperation; timeoutId: NodeJS.Timeout }
>();

export function initializeInstrumentation(
  app?: FastifyInstance,
): EventInstrumentation {
  if (instrumentationInstance) {
    return instrumentationInstance;
  }

  try {
    const sentryAdapter = new SentryAdapter();
    const segmentAdapter = new SegmentAdapter();

    instrumentationInstance = new CompositeInstrumentation([
      sentryAdapter,
      segmentAdapter,
    ]);

    instrumentationInstance.initialize({ app });

    return instrumentationInstance;
  } catch (error) {
    console.error('Failed to initialize instrumentation:', error);

    // create a empty instrumentation to prevent crashing.
    instrumentationInstance = createNoOpInstrumentation();

    return instrumentationInstance;
  }
}

export function getInstrumentation(): EventInstrumentation {
  if (isDev) return createNoOpInstrumentation();

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

  trackUserMessage: (message: string, userId?: string) =>
    getInstrumentation().trackUserMessage(message, userId),

  trackPlatformMessage: (messageType: string, userId?: string) =>
    getInstrumentation().trackPlatformMessage(messageType, userId),

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

    // timeout to cleanup if trackAiAgentEnd is never called
    const timeoutId = setTimeout(() => {
      const data = timedOperations.get(traceId);
      if (data) {
        getInstrumentation().endTimedOperation(
          'ai.agent.process',
          data.operation,
          'deadline_exceeded',
        );
        timedOperations.delete(traceId);
      }
    }, 2 * 60 * 60 * 1000); // 2 hours

    timedOperations.set(traceId, { operation, timeoutId });
    return operation.startTime;
  },

  trackAiAgentEnd: (traceId: string, status: 'success' | 'error') => {
    const data = timedOperations.get(traceId);
    if (data) {
      clearTimeout(data.timeoutId);
      getInstrumentation().endTimedOperation(
        'ai.agent.process',
        data.operation,
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

function createNoOpInstrumentation(): EventInstrumentation {
  return {
    initialize: () => {},
    setupPerformanceMonitoring: () => {},
    addTags: () => {},
    addMeasurement: () => {},
    setContext: () => {},
    addBreadcrumb: () => {},
    startTimedOperation: (_: string, metadata?: OperationMetadata) => ({
      startTime: Date.now(),
      metadata,
    }),
    endTimedOperation: () => {},
    trackEvent: () => {},
    trackSseEvent: () => {},
    trackUserMessage: () => {},
    trackPlatformMessage: () => {},
    captureError: (error: Error) => {
      console.error('Instrumentation error (no-op mode):', error);
    },
  };
}
