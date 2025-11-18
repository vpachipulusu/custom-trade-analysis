import { ILogger, ILoggerFactory, LoggerConfig } from './types';
import { WinstonLoggerFactory } from './implementations/WinstonFactory';

// Default factory (easily swappable!)
let loggerFactory: ILoggerFactory = new WinstonLoggerFactory();

// Singleton logger instance
let loggerInstance: ILogger | null = null;

// Function to switch logger implementation
export function setLoggerFactory(factory: ILoggerFactory): void {
  loggerFactory = factory;
  loggerInstance = null; // Force recreation with new factory
}

// Get or create logger
export function getLogger(config?: Partial<LoggerConfig>): ILogger {
  if (!loggerInstance) {
    loggerInstance = loggerFactory.createLogger(config || {});
  }
  return loggerInstance;
}

// Convenience exports
export { LogLevel } from './types';
export { LogContext } from './context';
export type { ILogger, ILoggerFactory, LogMetadata, LoggerConfig } from './types';

// Default logger instance
export const logger = getLogger();
