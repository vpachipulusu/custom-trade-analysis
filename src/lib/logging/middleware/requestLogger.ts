import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '../index';
import { LogContext } from '../context';
import { v4 as uuidv4 } from 'uuid';

export async function loggingMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const logger = getLogger();
  const startTime = Date.now();

  // Generate request ID for tracing
  const requestId = request.headers.get('x-request-id') || uuidv4();

  // Set context for this request
  const context = {
    requestId,
    method: request.method,
    url: request.url,
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  };

  return await LogContext.run(context, async () => {
    // Log incoming request
    logger.logRequest(request.method, request.url, context);

    try {
      // Execute handler
      const response = await handler();

      // Log response
      const duration = Date.now() - startTime;
      logger.logResponse(
        request.method,
        request.url,
        response.status,
        duration,
        { requestId }
      );

      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);

      return response;

    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      logger.error(`Request failed: ${request.method} ${request.url}`, {
        requestId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;
    }
  });
}
