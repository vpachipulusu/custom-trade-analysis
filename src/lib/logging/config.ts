import { LogLevel, LoggerConfig } from './types';

export const DEFAULT_LOG_CONFIG: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) ||
         (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
  environment: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE === 'true',
  enableRemote: !!process.env.LOG_REMOTE_ENDPOINT,
  filePath: process.env.LOG_FILE_PATH || './logs',
  maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '14'),
  prettyPrint: process.env.LOG_PRETTY_PRINT !== 'false',
  remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT
};

export function getLogConfig(overrides?: Partial<LoggerConfig>): LoggerConfig {
  return {
    ...DEFAULT_LOG_CONFIG,
    ...overrides
  };
}
