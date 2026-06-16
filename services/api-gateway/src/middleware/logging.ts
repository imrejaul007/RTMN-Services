import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

export function requestLogger(req: Request, res: Response, next: Function) {
  const traceId = req.headers['x-trace-id'] as string || uuidv4();
  (req as any).traceId = traceId;
  (req as any).startTime = Date.now();

  // Add trace ID to response headers
  res.setHeader('X-Trace-Id', traceId);

  next();
}

export function responseLogger(req: Request, res: Response, next: Function) {
  const start = (req as any).startTime || Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      traceId: (req as any).traceId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      tenantId: req.auth?.tenantId || 'anonymous',
      userId: req.auth?.userId || 'anonymous',
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };

    // Log to console (in production, send to Loki/ELK)
    console.log(JSON.stringify(log));
  });

  next();
}

// Morgan format with trace ID
const traceFormat = ':traceId :method :url :status :response-time ms - :res[content-length]';

morgan.token('traceId', (req) => (req as any).traceId || '-');
morgan.token('response-time', (_req: Request, res: Response) => {
  const start = (res as any).startTime || Date.now();
  return `${Date.now() - start}`;
});

export { morgan };
