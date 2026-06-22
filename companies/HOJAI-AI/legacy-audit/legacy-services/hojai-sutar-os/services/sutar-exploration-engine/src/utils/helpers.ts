// ============================================================================
// SUTAR Exploration Engine - Helper Utilities
// ============================================================================

/**
 * Create a standardized API response
 */
export function apiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string
): {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
} {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Handle Zod validation errors
 */
export function handleZodError(error: { errors: Array<{ path: (string | number)[]; message: string }> }): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

/**
 * Parse pagination parameters
 */
export function parsePagination(query: Record<string, unknown>): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 100, maxDelay = 5000 } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Format number with K/M/B suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

/**
 * Calculate percentage change
 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return Math.round(((newValue - oldValue) / oldValue) * 10000) / 100;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
