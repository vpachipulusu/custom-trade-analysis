/**
 * Rate Limiter for FMP API
 * Free tier: 250 requests/day
 * Tracks daily usage and prevents exceeding limits
 */

interface RateLimitState {
  count: number;
  resetTime: number; // Midnight UTC timestamp
}

const rateLimiters = new Map<string, RateLimitState>();

/**
 * Get current UTC midnight timestamp
 */
function getMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return midnight.getTime();
}

/**
 * Check if rate limit allows request
 * @param apiName - Name of the API (e.g., 'FMP')
 * @param limit - Daily request limit
 * @returns true if request is allowed, false if limit reached
 */
export function checkRateLimit(apiName: string, limit: number = 250): boolean {
  const now = Date.now();
  let state = rateLimiters.get(apiName);

  // Initialize or reset if past midnight
  if (!state || now >= state.resetTime) {
    state = {
      count: 0,
      resetTime: getMidnightUTC(),
    };
    rateLimiters.set(apiName, state);
  }

  // Check if limit reached
  if (state.count >= limit) {
    console.warn(
      `[RateLimiter] ${apiName} daily limit reached (${state.count}/${limit})`
    );
    return false;
  }

  return true;
}

/**
 * Increment rate limit counter
 * @param apiName - Name of the API
 */
export function incrementRateLimit(apiName: string): void {
  const state = rateLimiters.get(apiName);
  if (state) {
    state.count++;

    // Log warning at 80% capacity
    if (state.count === Math.floor(250 * 0.8)) {
      console.warn(
        `[RateLimiter] ${apiName} approaching daily limit (${state.count}/250)`
      );
    }

    console.log(`[RateLimiter] ${apiName} requests today: ${state.count}/250`);
  }
}

/**
 * Get current request count
 * @param apiName - Name of the API
 * @returns current request count
 */
export function getRateLimitCount(apiName: string): number {
  const state = rateLimiters.get(apiName);
  return state?.count || 0;
}

/**
 * Reset rate limit (for testing purposes)
 * @param apiName - Name of the API
 */
export function resetRateLimit(apiName: string): void {
  rateLimiters.delete(apiName);
}
