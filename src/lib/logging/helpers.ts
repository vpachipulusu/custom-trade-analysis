import { getLogger } from './index';
import { performanceLogger } from './middleware/performanceLogger';

// Database query logging
export function logDatabaseQuery(query: string, duration: number, results: number) {
  getLogger().debug('Database query executed', {
    type: 'database',
    query: query.substring(0, 200), // Truncate long queries
    duration,
    results
  });

  if (duration > 1000) {
    getLogger().warn('Slow database query detected', {
      type: 'slow_query',
      query: query.substring(0, 200),
      duration
    });
  }
}

// API call logging
export function logExternalAPI(
  service: string,
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
) {
  const logger = getLogger();
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[level](`External API call: ${service}`, {
    type: 'external_api',
    service,
    endpoint,
    method,
    statusCode,
    duration
  });
}

// User action logging
export function logUserAction(userId: string, action: string, metadata?: Record<string, any>) {
  getLogger().info(`User action: ${action}`, {
    type: 'user_action',
    userId,
    action,
    ...metadata
  });
}

// Authentication logging
export function logAuth(event: 'login' | 'logout' | 'signup' | 'failed_login', userId?: string, metadata?: Record<string, any>) {
  getLogger().info(`Auth event: ${event}`, {
    type: 'auth',
    event,
    userId,
    ...metadata
  });
}

// Business metric logging
export function logBusinessMetric(metric: string, value: number, metadata?: Record<string, any>) {
  getLogger().info(`Metric: ${metric}`, {
    type: 'metric',
    metric,
    value,
    ...metadata
  });
}
