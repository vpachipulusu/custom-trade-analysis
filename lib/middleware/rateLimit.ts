/**
 * Rate Limiting Middleware
 * Basic in-memory rate limiter for API routes
 * For production with multiple instances, consider Redis-based solution
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Custom identifier function (defaults to IP address)
   */
  identifier?: (request: Request) => string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @returns Rate limit result with headers
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs, identifier } = config;

  // Get identifier (IP address by default)
  const key = identifier ? identifier(request) : getClientIP(request);

  const now = Date.now();
  const resetAt = now + windowMs;

  // Get or create rate limit entry
  if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
    rateLimitStore[key] = {
      count: 0,
      resetAt,
    };
  }

  const entry = rateLimitStore[key];
  entry.count++;

  const success = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);

  return {
    success,
    limit: maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(request: Request): string {
  // Check for common proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a default value (should not happen in production)
  return "unknown";
}

/**
 * Create a rate limit response
 */
export function createRateLimitResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    }
  );
}

// Common rate limit configurations

/**
 * Standard rate limit: 100 requests per 15 minutes
 */
export const STANDARD_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
};

/**
 * Strict rate limit for expensive operations: 10 requests per 15 minutes
 */
export const STRICT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
};

/**
 * Auth rate limit: 5 requests per 15 minutes
 */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
};
