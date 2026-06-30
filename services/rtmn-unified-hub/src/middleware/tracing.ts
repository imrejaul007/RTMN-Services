/**
 * Request tracing middleware — adds correlation IDs to every request.
 *
 * Every proxied request gets a unique `x-correlation-id` header so you can
 * trace a request through the Hub → downstream → back.
 *
 * Behavior:
 *   - If the request already carries an `x-correlation-id`, use it (propagation).
 *   - Otherwise, generate a fresh UUID v4 and attach it to the request + response.
 *
 * The Hub also forwards the correlation ID to downstream services via the same header.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/** Header name for correlation IDs */
export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Middleware that ensures every request has a correlation ID.
 * Attaches `req.correlationId` and sets the response header.
 */
export function addCorrelationId(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers[CORRELATION_HEADER];
  const id = Array.isArray(existing) ? existing[0] : existing;

  const correlationId = (typeof id === 'string' && id.length > 0) ? id : randomUUID();
  (req as any).correlationId = correlationId;

  res.setHeader(CORRELATION_HEADER, correlationId);
  next();
}

/**
 * Build axios headers for downstream calls, including correlation ID.
 * Call this in proxy.ts to propagate the ID to downstream services.
 */
export function downstreamHeaders(correlationId: string): Record<string, string> {
  return {
    [CORRELATION_HEADER]: correlationId,
    'x-forwarded-by': 'rtmn-hub',
  };
}
