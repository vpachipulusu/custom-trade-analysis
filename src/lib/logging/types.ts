export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogMetadata {
  [key: string]: any;
  userId?: string;
  requestId?: string;
  traceId?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
  errorName?: string;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  environment: 'development' | 'production' | 'test';
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  filePath?: string;
  maxFileSize?: string;
  maxFiles?: number;
  remoteEndpoint?: string;
  prettyPrint?: boolean;
}

export interface ILogger {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
  fatal(message: string, metadata?: LogMetadata): void;

  // Convenience methods
  logRequest(method: string, url: string, metadata?: LogMetadata): void;
  logResponse(method: string, url: string, statusCode: number, duration: number, metadata?: LogMetadata): void;
  logError(error: Error, metadata?: LogMetadata): void;

  // Context management
  setContext(context: LogMetadata): void;
  clearContext(): void;
}

export interface ILoggerFactory {
  createLogger(config: Partial<LoggerConfig>): ILogger;
}
