import { ILogger, LogMetadata } from '../types';
import { LogContext } from '../context';

/**
 * Browser-compatible logger that uses console
 * Used as fallback when Winston is not available (client-side)
 */
export class BrowserLogger implements ILogger {
  private context: LogMetadata = {};

  private mergeMetadata(metadata?: LogMetadata): LogMetadata {
    const globalContext = LogContext.get();
    return {
      ...globalContext,
      ...this.context,
      ...metadata
    };
  }

  private log(level: string, message: string, metadata?: LogMetadata): void {
    const mergedMeta = this.mergeMetadata(metadata);
    const hasMetadata = Object.keys(mergedMeta).length > 0;

    if (hasMetadata) {
      console[level as 'log' | 'warn' | 'error'](`[${level.toUpperCase()}] ${message}`, mergedMeta);
    } else {
      console[level as 'log' | 'warn' | 'error'](`[${level.toUpperCase()}] ${message}`);
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('log', message, metadata);
    }
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log('log', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: LogMetadata): void {
    this.log('error', message, metadata);
  }

  fatal(message: string, metadata?: LogMetadata): void {
    this.log('error', `FATAL: ${message}`, metadata);
  }

  logRequest(method: string, url: string, metadata?: LogMetadata): void {
    this.info(`→ ${method} ${url}`, {
      type: 'request',
      method,
      url,
      ...metadata
    });
  }

  logResponse(method: string, url: string, statusCode: number, duration: number, metadata?: LogMetadata): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    if (level === 'error') {
      this.error(`← ${method} ${url} ${statusCode} ${duration}ms`, {
        type: 'response',
        method,
        url,
        statusCode,
        duration,
        ...metadata
      });
    } else if (level === 'warn') {
      this.warn(`← ${method} ${url} ${statusCode} ${duration}ms`, {
        type: 'response',
        method,
        url,
        statusCode,
        duration,
        ...metadata
      });
    } else {
      this.info(`← ${method} ${url} ${statusCode} ${duration}ms`, {
        type: 'response',
        method,
        url,
        statusCode,
        duration,
        ...metadata
      });
    }
  }

  logError(error: Error, metadata?: LogMetadata): void {
    this.error(error.message, {
      type: 'error',
      errorName: error.name,
      stack: error.stack,
      ...metadata
    });
  }

  setContext(context: LogMetadata): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }
}
