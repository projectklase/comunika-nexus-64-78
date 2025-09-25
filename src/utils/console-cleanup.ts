/**
 * Console cleanup utilities for production
 */

/**
 * Clean up development console logs in production
 */
export function cleanupConsoleInProduction() {
  if (process.env.NODE_ENV === 'production') {
    // Override console methods in production
    const noop = () => {};
    
    // Keep error and warn for important issues
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
    
    // Replace console.error with filtered version
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Only show critical errors in production
      const message = args.join(' ').toLowerCase();
      
      // Filter out known non-critical errors
      if (
        message.includes('minified react error') ||
        message.includes('warning:') ||
        message.includes('development mode') ||
        message.includes('strict mode')
      ) {
        return;
      }
      
      originalError(...args);
    };
  }
}

/**
 * Development-only console logging
 */
export function devLog(message: string, ...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] ${message}`, ...args);
  }
}

/**
 * Performance logging helper
 */
export function perfLog(operation: string, startTime?: number) {
  if (process.env.NODE_ENV === 'development') {
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
    } else {
      return performance.now();
    }
  }
}

/**
 * Error boundary logging
 */
export function logError(error: Error, errorInfo?: any, context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error${context ? ` in ${context}` : ''}`);
    console.error('Error:', error);
    if (errorInfo) {
      console.error('Error Info:', errorInfo);
    }
    console.groupEnd();
  } else {
    // In production, send to monitoring service
    // Example: Sentry.captureException(error, { extra: errorInfo, tags: { context } });
  }
}
