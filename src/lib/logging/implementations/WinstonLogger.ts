import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ILogger, LogLevel, LogMetadata, LoggerConfig } from '../types';
import { LogContext } from '../context';

export class WinstonLogger implements ILogger {
  private logger: winston.Logger;
  private context: LogMetadata = {};

  constructor(config: LoggerConfig) {
    this.logger = this.createWinstonLogger(config);
  }

  private createWinstonLogger(config: LoggerConfig): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: config.prettyPrint
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                  return `${timestamp} [${level}]: ${message} ${metaStr}`;
                })
              )
            : winston.format.json()
        })
      );
    }

    // File transport with rotation
    if (config.enableFile && config.filePath) {
      transports.push(
        new DailyRotateFile({
          filename: `${config.filePath}/app-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: config.maxFileSize,
          maxFiles: config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // Separate error log file
      transports.push(
        new DailyRotateFile({
          filename: `${config.filePath}/error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: config.maxFileSize,
          maxFiles: config.maxFiles,
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    // Remote transport (e.g., Logtail, Papertrail, CloudWatch)
    if (config.enableRemote && config.remoteEndpoint) {
      // Example: HTTP transport for remote logging
      transports.push(
        new winston.transports.Http({
          host: config.remoteEndpoint,
          path: '/logs',
          ssl: true
        })
      );
    }

    return winston.createLogger({
      level: config.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'tradingview-ai', environment: config.environment },
      transports
    });
  }

  private mergeMetadata(metadata?: LogMetadata): LogMetadata {
    const globalContext = LogContext.get();
    return {
      ...globalContext,
      ...this.context,
      ...metadata
    };
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, this.mergeMetadata(metadata));
  }

  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, this.mergeMetadata(metadata));
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, this.mergeMetadata(metadata));
  }

  error(message: string, metadata?: LogMetadata): void {
    this.logger.error(message, this.mergeMetadata(metadata));
  }

  fatal(message: string, metadata?: LogMetadata): void {
    this.logger.error(message, { ...this.mergeMetadata(metadata), fatal: true });
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

    this.logger.log(level, `← ${method} ${url} ${statusCode} ${duration}ms`, {
      type: 'response',
      method,
      url,
      statusCode,
      duration,
      ...this.mergeMetadata(metadata)
    });
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
