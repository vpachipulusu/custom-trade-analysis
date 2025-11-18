import { ILoggerFactory, ILogger, LoggerConfig } from '../types';
import { getLogConfig } from '../config';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export class WinstonLoggerFactory implements ILoggerFactory {
  createLogger(config?: Partial<LoggerConfig>): ILogger {
    const fullConfig = getLogConfig(config);

    // Use BrowserLogger in browser environment, WinstonLogger in Node.js
    if (isBrowser) {
      const { BrowserLogger } = require('./BrowserLogger');
      return new BrowserLogger();
    } else {
      const { WinstonLogger } = require('./WinstonLogger');
      return new WinstonLogger(fullConfig);
    }
  }
}
