/**
 * Request Logging Utility
 * Logs API requests with relevant metadata for monitoring and debugging
 */

export interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  duration?: number;
  status?: number;
  error?: string;
}

/**
 * Log levels
 */
export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * Get client IP from request
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Format log message
 */
function formatLog(level: LogLevel, log: RequestLog): string {
  const parts = [
    `[${level}]`,
    `[${log.timestamp}]`,
    `${log.method} ${log.url}`,
    `IP: ${log.ip}`,
  ];

  if (log.userId) {
    parts.push(`User: ${log.userId}`);
  }

  if (log.duration !== undefined) {
    parts.push(`Duration: ${log.duration}ms`);
  }

  if (log.status !== undefined) {
    parts.push(`Status: ${log.status}`);
  }

  if (log.error) {
    parts.push(`Error: ${log.error}`);
  }

  return parts.join(" | ");
}

/**
 * Log an API request
 */
export function logRequest(
  level: LogLevel,
  request: Request,
  options: {
    userId?: string;
    duration?: number;
    status?: number;
    error?: string;
  } = {}
): void {
  const log: RequestLog = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: new URL(request.url).pathname,
    ip: getClientIP(request),
    userAgent: request.headers.get("user-agent") || undefined,
    ...options,
  };

  const message = formatLog(level, log);

  // Log to console (in production, send to logging service like Datadog, Sentry, etc.)
  switch (level) {
    case LogLevel.INFO:
      console.log(message);
      break;
    case LogLevel.WARN:
      console.warn(message);
      break;
    case LogLevel.ERROR:
      console.error(message);
      break;
  }

  // In production, you would send logs to an external service:
  // - Vercel Analytics
  // - Datadog
  // - Sentry
  // - LogDNA / Mezmo
  // - CloudWatch (AWS)
  // Example:
  // await fetch('https://logs.example.com/api/log', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(log),
  // });
}

/**
 * Create a request logger wrapper
 * Use in API routes to automatically log requests and responses
 */
export function withRequestLogging<T>(
  handler: (request: Request) => Promise<Response>,
  options: { userId?: string } = {}
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const startTime = Date.now();

    try {
      // Log incoming request
      logRequest(LogLevel.INFO, request, {
        userId: options.userId,
      });

      // Execute handler
      const response = await handler(request);
      const duration = Date.now() - startTime;

      // Log successful response
      logRequest(LogLevel.INFO, request, {
        userId: options.userId,
        duration,
        status: response.status,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Log error
      logRequest(LogLevel.ERROR, request, {
        userId: options.userId,
        duration,
        error: errorMessage,
      });

      throw error;
    }
  };
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  const log = {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  };

  if (duration > 1000) {
    console.warn(`[PERFORMANCE] Slow operation:`, log);
  } else {
    console.log(`[PERFORMANCE]`, log);
  }
}

/**
 * Measure operation duration
 */
export async function measureDuration<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logPerformance(operation, duration, metadata);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logPerformance(operation, duration, {
      ...metadata,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
