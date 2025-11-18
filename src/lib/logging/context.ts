import { LogMetadata } from './types';

// Check if we're in a Node.js environment
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Use AsyncLocalStorage only in Node.js environment (server-side)
let asyncLocalStorage: any = null;

if (isNode) {
  try {
    // Dynamic import for Node.js only
    const { AsyncLocalStorage } = require('async_hooks');
    asyncLocalStorage = new AsyncLocalStorage<LogMetadata>();
  } catch (e) {
    // Fallback if async_hooks is not available
    console.warn('async_hooks not available, using fallback context storage');
  }
}

// Fallback storage for browser/edge runtime
let fallbackContext: LogMetadata = {};

export class LogContext {
  static set(context: LogMetadata): void {
    if (asyncLocalStorage) {
      const current = asyncLocalStorage.getStore() || {};
      asyncLocalStorage.enterWith({ ...current, ...context });
    } else {
      // Browser fallback
      fallbackContext = { ...fallbackContext, ...context };
    }
  }

  static get(): LogMetadata {
    if (asyncLocalStorage) {
      return asyncLocalStorage.getStore() || {};
    }
    // Browser fallback
    return fallbackContext;
  }

  static clear(): void {
    if (asyncLocalStorage) {
      asyncLocalStorage.disable();
    } else {
      // Browser fallback
      fallbackContext = {};
    }
  }

  static run<T>(context: LogMetadata, callback: () => T): T {
    if (asyncLocalStorage) {
      return asyncLocalStorage.run(context, callback);
    }
    // Browser fallback - just set and run
    const previousContext = fallbackContext;
    fallbackContext = { ...fallbackContext, ...context };
    try {
      return callback();
    } finally {
      fallbackContext = previousContext;
    }
  }
}
