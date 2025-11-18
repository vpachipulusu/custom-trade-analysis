# Application Logging System

A comprehensive, production-ready logging system with Winston as the default implementation, architected to easily swap to other libraries (Pino, Bunyan, etc.) in the future.

## Features

- **Structured Logging** - Multiple levels (debug, info, warn, error, fatal)
- **Request/Response Tracking** - Automatic logging with request IDs
- **Error Tracking** - Stack traces and context
- **Performance Monitoring** - API response times and slow query detection
- **Multiple Transports** - Console, file rotation, remote services
- **Context-Aware** - User ID, request ID, trace ID propagation
- **Environment-Specific** - Dev (pretty print) vs Production (JSON)
- **Swappable Architecture** - Change logging library without touching app code

## Quick Start

### Basic Usage

```typescript
import { getLogger } from '@/lib/logging';

const logger = getLogger();

logger.info('User logged in', { userId: 'user-123' });
logger.warn('Slow database query', { duration: 1500 });
logger.error('Failed to process payment', { orderId: 'order-456' });
```

### With Context (Recommended for API Routes)

```typescript
import { getLogger, LogContext } from '@/lib/logging';

export async function POST(request: NextRequest) {
  const logger = getLogger();

  // Set context for all logs in this request
  LogContext.set({
    userId: user.id,
    requestId: generateRequestId()
  });

  // All logs will automatically include userId and requestId
  logger.info('Processing request');
  logger.info('Operation completed');
}
```

### Performance Monitoring

```typescript
import { performanceLogger } from '@/lib/logging/middleware/performanceLogger';

// Measure async operations
const result = await performanceLogger.measure(
  'database_query',
  async () => {
    return await database.query('SELECT * FROM users');
  },
  { table: 'users' }
);

// Logs warning if operation takes > 1000ms
```

### Helper Functions

```typescript
import {
  logExternalAPI,
  logUserAction,
  logAuth,
  logDatabaseQuery,
  logBusinessMetric
} from '@/lib/logging/helpers';

// Log external API calls
logExternalAPI('OpenAI', '/v1/chat/completions', 'POST', 200, 850);

// Log user actions
logUserAction('user-123', 'analyze_chart', { snapshotId: 'snap-456' });

// Log authentication events
logAuth('login', 'user-123', { method: 'google' });

// Log database queries
logDatabaseQuery('SELECT * FROM analyses WHERE userId = ?', 450, 15);

// Log business metrics
logBusinessMetric('analyses_created', 1, { plan: 'premium' });
```

## Configuration

### Environment Variables

Add to your `.env.local`:

```bash
# Logging Configuration
LOG_LEVEL=debug                          # debug, info, warn, error
LOG_ENABLE_CONSOLE=true                  # Console output
LOG_ENABLE_FILE=false                    # File output (enable in production)
LOG_FILE_PATH=./logs                     # Log file directory
LOG_MAX_FILE_SIZE=20m                    # Max size per file
LOG_MAX_FILES=14                         # Keep 14 days of logs
LOG_PRETTY_PRINT=true                    # Pretty format (disable in prod)
LOG_REMOTE_ENDPOINT=                     # Optional: remote logging service
```

### Development vs Production

**Development:**
```bash
LOG_LEVEL=debug
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=false
LOG_PRETTY_PRINT=true
```

**Production:**
```bash
LOG_LEVEL=info
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_PRETTY_PRINT=false
LOG_REMOTE_ENDPOINT=https://your-logging-service.com
```

## Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `debug` | Detailed info for debugging | Variable values, function entry/exit |
| `info` | General informational messages | Request started, operation completed |
| `warn` | Warning conditions | Slow queries, deprecated API usage |
| `error` | Error events | Failed operations, caught exceptions |
| `fatal` | Critical errors | Service unavailable, data corruption |

## Architecture

### Abstraction Layer

The system uses an abstraction layer that makes it easy to swap logging libraries:

```
┌─────────────────┐
│   Your Code     │
└────────┬────────┘
         │
    ┌────▼────┐
    │ ILogger │ ← Interface (abstraction)
    └────┬────┘
         │
    ┌────▼────────┐
    │ WinstonLogger│ ← Current implementation
    └─────────────┘
```

All app code depends on the `ILogger` interface, not Winston specifically.

### Swapping Logging Libraries

To switch from Winston to another library (e.g., Pino):

1. **Create implementation:**

```typescript
// src/lib/logging/implementations/PinoLogger.ts
import pino from 'pino';
import { ILogger, LoggerConfig } from '../types';

export class PinoLogger implements ILogger {
  private logger: pino.Logger;

  constructor(config: LoggerConfig) {
    this.logger = pino({ level: config.level });
  }

  // Implement all ILogger methods...
  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(metadata, message);
  }
  // ... etc
}

export class PinoLoggerFactory implements ILoggerFactory {
  createLogger(config: LoggerConfig): ILogger {
    return new PinoLogger(config);
  }
}
```

2. **Switch factory in your app startup:**

```typescript
// app/layout.tsx or similar
import { setLoggerFactory } from '@/lib/logging';
import { PinoLoggerFactory } from '@/lib/logging/implementations/PinoLogger';

// Switch to Pino
setLoggerFactory(new PinoLoggerFactory());
```

**That's it!** No other code changes needed. The entire app now uses Pino.

## File Structure

```
src/lib/logging/
├── index.ts                           # Main exports, factory management
├── types.ts                           # Interfaces (ILogger, ILoggerFactory)
├── config.ts                          # Configuration management
├── context.ts                         # Request-scoped context
├── helpers.ts                         # Convenience logging functions
├── implementations/
│   ├── WinstonLogger.ts              # Winston implementation
│   └── WinstonFactory.ts             # Winston factory
├── middleware/
│   ├── requestLogger.ts              # Request/response logging
│   ├── errorLogger.ts                # Error logging
│   └── performanceLogger.ts          # Performance tracking
└── transports/
    └── logtail.ts                    # Optional: Logtail integration
```

## Integration Examples

### API Route (Full Example)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getLogger, LogContext } from '@/lib/logging';
import { performanceLogger } from '@/lib/logging/middleware/performanceLogger';
import { logExternalAPI, logUserAction } from '@/lib/logging/helpers';

export async function POST(request: NextRequest) {
  const logger = getLogger();

  try {
    // Authenticate
    const { uid, email } = await authenticateRequest(request);

    // Set user context
    LogContext.set({ userId: uid, userEmail: email });

    logger.info('Analysis request started');

    // Log user action
    logUserAction(uid, 'analyze_chart', { snapshotId });

    // Measure performance
    const result = await performanceLogger.measure(
      'openai_analysis',
      async () => {
        const startTime = Date.now();
        const analysis = await analyzeChart(imageUrl);
        const duration = Date.now() - startTime;

        logExternalAPI('OpenAI', '/v1/chat/completions', 'POST', 200, duration);

        return analysis;
      },
      { snapshotId }
    );

    logger.info('Analysis completed successfully', {
      action: result.action,
      confidence: result.confidence
    });

    return NextResponse.json({ result });

  } catch (error) {
    logger.error('Analysis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
```

### Background Job

```typescript
import { getLogger } from '@/lib/logging';
import { performanceLogger } from '@/lib/logging/middleware/performanceLogger';

export async function runAutoAnalysis(frequency: string): Promise<void> {
  const logger = getLogger();
  const jobId = `auto-analysis-${frequency}-${Date.now()}`;

  logger.info('Starting auto-analysis job', {
    type: 'job_start',
    jobId,
    frequency
  });

  try {
    const layouts = await performanceLogger.measure(
      'fetch_monitored_layouts',
      () => getMonitoredLayouts(frequency),
      { frequency }
    );

    logger.info('Found layouts to analyze', {
      jobId,
      count: layouts.length
    });

    for (const layout of layouts) {
      try {
        await processLayout(layout, { jobId });
      } catch (error) {
        logger.error('Failed to process layout', {
          jobId,
          layoutId: layout.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Auto-analysis job completed', {
      type: 'job_complete',
      jobId
    });

  } catch (error) {
    logger.error('Auto-analysis job failed', {
      type: 'job_error',
      jobId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

## Best Practices

### ✅ DO

- Use structured metadata for filtering/searching
- Include relevant context (userId, requestId, etc.)
- Log important business events
- Use appropriate log levels
- Measure performance of external API calls
- Log errors with stack traces

```typescript
// Good
logger.info('User logged in', {
  userId: user.id,
  method: 'google',
  ip: request.ip
});
```

### ❌ DON'T

- Log sensitive data (passwords, tokens, credit cards)
- Use console.log (use logger instead)
- Log inside tight loops
- Stringify objects manually (logger handles it)

```typescript
// Bad
console.log('User:', JSON.stringify(user));
logger.info(`Password: ${password}`); // Never log passwords!
```

## Testing

Run the test script to verify logging works:

```bash
node test-logging.js
```

You should see formatted logs in your console.

## External Integrations (Optional)

### Logtail

```bash
npm install @logtail/node @logtail/winston
```

Add to `.env.local`:
```bash
LOGTAIL_SOURCE_TOKEN=your-token-here
```

### Sentry (Error Tracking)

```bash
npm install @sentry/node
```

Add to `.env.local`:
```bash
SENTRY_DSN=your-dsn-here
```

## Troubleshooting

### Logs not appearing?

Check your `LOG_LEVEL` - debug logs won't show if level is `info` or higher.

### File logs not working?

1. Ensure `LOG_ENABLE_FILE=true`
2. Check `LOG_FILE_PATH` directory exists and is writable
3. Verify logs directory is not in `.gitignore` (it should be)

### Performance impact?

Winston is async and very fast. Typical overhead is < 1ms per log.

## Migration Guide

### Replacing console.log

**Before:**
```typescript
console.log('User created:', userId);
console.error('Failed to process:', error);
```

**After:**
```typescript
import { getLogger } from '@/lib/logging';

const logger = getLogger();
logger.info('User created', { userId });
logger.error('Failed to process', {
  error: error.message,
  stack: error.stack
});
```

### Adding to Existing Routes

1. Import logger: `import { getLogger, LogContext } from '@/lib/logging';`
2. Set context at start: `LogContext.set({ userId: user.id });`
3. Replace console.* calls with logger calls
4. Add performance tracking for slow operations
5. Log important business events

## Support

For issues or questions:
1. Check this README
2. Review existing implementations in `src/app/api/analyze/route.ts`
3. Test with `node test-logging.js`

## License

This logging system is part of your TradingView Analysis application.
