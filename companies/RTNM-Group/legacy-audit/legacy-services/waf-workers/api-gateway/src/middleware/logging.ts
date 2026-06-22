/**
 * Request Logging — Structured logging for all requests
 */

import type { Middleware } from 'itty-router';

export function withRequestLogging(): Middleware {
  return async (request: Request): Promise<Response | undefined> => {
    const start = Date.now();
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Real-IP') ||
               'unknown';
    const country = request.headers.get('CF-IPCountry') || 'XX';
    const ua = request.headers.get('User-Agent') || '';

    // Attach request ID to request for downstream use
    (request as any).__requestId = requestId;
    (request as any).__startTime = start;

    // Log incoming request
    console.info('[Request]', JSON.stringify({
      requestId,
      method: request.method,
      path: url.pathname,
      query: url.search,
      ip,
      country,
      ua: ua.slice(0, 100),
      timestamp: new Date().toISOString(),
    }));

    return undefined;
  };
}
