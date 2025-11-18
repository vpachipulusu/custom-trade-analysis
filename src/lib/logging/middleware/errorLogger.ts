import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '../index';

export function errorLoggingMiddleware(error: Error, request: NextRequest): NextResponse {
  const logger = getLogger();

  // Determine error severity
  const statusCode = 'statusCode' in error ? (error as any).statusCode : 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  // Log error with appropriate level
  if (isClientError) {
    logger.warn(`Client error: ${error.message}`, {
      type: 'client_error',
      statusCode,
      method: request.method,
      url: request.url,
      errorName: error.name,
      stack: error.stack
    });
  } else {
    logger.error(`Server error: ${error.message}`, {
      type: 'server_error',
      statusCode,
      method: request.method,
      url: request.url,
      errorName: error.name,
      stack: error.stack
    });
  }

  // Return error response
  return NextResponse.json(
    {
      error: isClientError ? error.message : 'Internal server error',
      requestId: request.headers.get('x-request-id')
    },
    { status: statusCode }
  );
}
