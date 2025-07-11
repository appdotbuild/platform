import type { StreamLogFunction } from './message';

type QueuedFunction = {
  fn: () => Promise<void>;
  id: string;
  timestamp: number;
  description?: string;
};

export class MessageHandlerQueue {
  private queue: QueuedFunction[] = [];
  private processing = false;
  private logger: StreamLogFunction;

  constructor(logger: StreamLogFunction) {
    this.logger = logger;
  }

  enqueue(fn: () => Promise<void>, description?: string): void {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.queue.push({
      fn,
      id,
      timestamp: Date.now(),
      description,
    });

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }
  }

  private startProcessing(): void {
    if (this.processing) return;

    this.processing = true;

    this.logger({
      message: `[MessageHandlerQueue] Started processing`,
      queueLength: this.queue.length,
    });

    // Use setImmediate to not block the main thread
    setImmediate(() => this.processNext());
  }

  private async processNext(): Promise<void> {
    const queuedFunction = this.queue[0];
    if (!queuedFunction) {
      this.processing = false;
      return;
    }

    try {
      // Execute the async function and wait for completion
      await queuedFunction.fn();
    } catch (error) {
      this.logger(
        {
          message: `[MessageHandlerQueue] Function execution failed`,
          functionId: queuedFunction.id,
          description: queuedFunction.description,
          error: error instanceof Error ? error.message : String(error),
        },
        'error',
      );
    } finally {
      // Remove from queue only after successful completion
      this.queue.shift();
    }

    // Continue processing next function (non-blocking)
    setImmediate(() => this.processNext());
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  // Wait for queue to be empty
  async waitForCompletion(
    streamLog: StreamLogFunction,
    // This is a large timeout to allow for long-running deployments to databricks.
    timeoutMs = 1_000_000,
  ): Promise<void> {
    const startTime = Date.now();

    streamLog({
      message: `[MessageHandlerQueue] Wait for completion, handlers in queue: ${this.queue.length}`,
    });

    while (this.queue.length > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const timedOut = this.queue.length > 0;
    streamLog({
      message: `[MessageHandlerQueue] Wait for completion finished`,
      remainingFunctions: this.queue.length,
      timedOut,
    });

    if (timedOut) {
      streamLog(
        {
          message: `[MessageHandlerQueue] Wait for completion timed out`,
          remainingFunctions: this.queue.length,
        },
        'error',
      );
    }
  }
}
