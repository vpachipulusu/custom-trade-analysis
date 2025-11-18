import { getLogger } from '../index';

export class PerformanceLogger {
  private startTimes: Map<string, number> = new Map();

  start(operation: string): void {
    this.startTimes.set(operation, Date.now());
  }

  end(operation: string, metadata?: Record<string, any>): void {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      getLogger().warn(`Performance timing not found for operation: ${operation}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(operation);

    const logger = getLogger();

    // Log slow operations as warnings
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${operation}`, {
        type: 'performance',
        operation,
        duration,
        ...metadata
      });
    } else {
      logger.debug(`Operation completed: ${operation}`, {
        type: 'performance',
        operation,
        duration,
        ...metadata
      });
    }
  }

  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, metadata);
      return result;
    } catch (error) {
      this.end(operation, { ...metadata, error: true });
      throw error;
    }
  }
}

export const performanceLogger = new PerformanceLogger();
