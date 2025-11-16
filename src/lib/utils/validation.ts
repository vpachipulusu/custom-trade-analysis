/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 6) {
    return {
      valid: false,
      message: "Password must be at least 6 characters long",
    };
  }

  return { valid: true };
}

/**
 * Validates trading symbol format
 */
export function validateSymbol(symbol: string): boolean {
  if (!symbol || symbol.trim().length === 0) {
    return false;
  }
  // Allow alphanumeric characters, colons (for exchanges), and underscores
  const symbolRegex = /^[A-Z0-9:_]+$/i;
  return symbolRegex.test(symbol);
}

/**
 * Validates trading interval
 */
export function validateInterval(interval: string): boolean {
  const validIntervals = [
    "1",
    "3",
    "5",
    "15",
    "30",
    "45", // minutes
    "60",
    "120",
    "180",
    "240", // hours
    "D",
    "W",
    "M", // day, week, month
    "1D",
    "1W",
    "1M", // alternate formats
  ];
  return validIntervals.includes(interval);
}

/**
 * Validates layout data
 */
export function validateLayoutData(data: {
  layoutId?: string | null;
  symbol?: string | null;
  interval?: string | null;
}): { valid: boolean; message?: string } {
  // Either layoutId OR (symbol + interval) must be provided
  if (!data.layoutId && (!data.symbol || !data.interval)) {
    return {
      valid: false,
      message: "Either layoutId OR both symbol and interval must be provided",
    };
  }

  // Validate symbol if provided
  if (data.symbol && !validateSymbol(data.symbol)) {
    return {
      valid: false,
      message: "Invalid symbol format",
    };
  }

  // Validate interval if provided
  if (data.interval && !validateInterval(data.interval)) {
    return {
      valid: false,
      message:
        "Invalid interval. Must be one of: 1, 3, 5, 15, 30, 45, 60, 120, 180, 240, D, W, M",
    };
  }

  return { valid: true };
}

/**
 * Validates confidence score
 */
export function validateConfidence(confidence: number): boolean {
  return Number.isInteger(confidence) && confidence >= 0 && confidence <= 100;
}

/**
 * Validates action
 */
export function validateAction(action: string): boolean {
  const validActions = ["BUY", "SELL", "HOLD"];
  return validActions.includes(action);
}

/**
 * Validates timeframe
 */
export function validateTimeframe(timeframe: string): boolean {
  const validTimeframes = ["intraday", "swing", "long"];
  return validTimeframes.includes(timeframe);
}
