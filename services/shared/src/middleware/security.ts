/**
 * SUTAR OS Shared Security Middleware
 * Strict CORS, Security Headers, Audit Logging, Request ID Tracing
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ============================================================================
// Strict CORS Configuration
// ============================================================================
interface CorsOptions {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

const defaultCorsOptions: CorsOptions = {
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Internal-Token', 'X-Idempotency-Key'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

export function strictCors(options: Partial<CorsOptions> = {}) {
  const opts = { ...defaultCorsOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && opts.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    if (opts.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', opts.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', opts.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', opts.maxAge.toString());

    // Preflight
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

// ============================================================================
// Strict Security Headers (CSP, HSTS, etc.)
// ============================================================================
export function strictSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Frame protection
  res.setHeader('X-Frame-Options', 'DENY');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Force HTTPS (production only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '));

  // Cache control for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

// ============================================================================
// Request ID Tracing
// ============================================================================
export function requestIdTracing(req: Request, res: Response, next: NextFunction) {
  // Get or generate request ID
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  // Attach to request
  (req as any).requestId = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  // Log request start
  const startTime = Date.now();
  (req as any).startTime = startTime;

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 400) {
      console.error(`[REQUEST] ${JSON.stringify(logData)}`);
    } else {
      console.log(`[REQUEST] ${JSON.stringify(logData)}`);
    }
  });

  next();
}

// ============================================================================
// Audit Logging for Mutations
// ============================================================================
interface AuditEntry {
  timestamp: string;
  requestId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
  details?: any;
}

// In-memory audit log (use external log service in production)
const auditLog: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 10000;

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  const isApi = req.path.startsWith('/api/');

  if (!isMutation || !isApi) {
    return next();
  }

  const startTime = Date.now();
  const requestId = (req as any).requestId || crypto.randomUUID();
  const userId = (req as any).userId;

  // Capture original end
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - startTime;

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      userId,
      action: `${req.method} ${req.path}`,
      resource: extractResource(req.path),
      resourceId: req.params.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      details: {
        query: req.query,
        bodySize: req.body ? JSON.stringify(req.body).length : 0,
      },
    };

    // Add to audit log
    auditLog.push(entry);
    if (auditLog.length > MAX_AUDIT_ENTRIES) {
      auditLog.shift();
    }

    // Log immediately for critical actions
    if (res.statusCode >= 400 || userId) {
      console.log(`[AUDIT] ${JSON.stringify(entry)}`);
    }

    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

// Extract resource name from path
function extractResource(path: string): string {
  const parts = path.split('/').filter(Boolean);
  // /api/v1/strategy -> strategy
  // /api/v1/trust/123 -> trust
  if (parts.length >= 2) {
    return parts[1].replace(/s$/, ''); // Remove trailing 's' for plural
  }
  return 'unknown';
}

// Get audit log entries
export function getAuditLog(filter?: { userId?: string; resource?: string; since?: Date }): AuditEntry[] {
  let entries = [...auditLog];

  if (filter?.userId) {
    entries = entries.filter(e => e.userId === filter.userId);
  }
  if (filter?.resource) {
    entries = entries.filter(e => e.resource === filter.resource);
  }
  if (filter?.since) {
    entries = entries.filter(e => new Date(e.timestamp) >= filter.since!);
  }

  return entries;
}

// ============================================================================
// Idempotency Key Validation
// ============================================================================
const idempotencyStore = new Map<string, { status: number; response: any; createdAt: number }>();

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (!isMutation || !idempotencyKey) {
    return next();
  }

  const existing = idempotencyStore.get(idempotencyKey);
  if (existing) {
    // Return cached response
    res.status(existing.status).json(existing.response);
    return;
  }

  // Store response on finish
  const originalJson = res.json;
  res.json = function(body: any) {
    idempotencyStore.set(idempotencyKey, {
      status: res.statusCode,
      response: body,
      createdAt: Date.now(),
    });

    // Cleanup old entries (24 hours)
    const now = Date.now();
    for (const [key, value] of idempotencyStore.entries()) {
      if (now - value.createdAt > 86400000) {
        idempotencyStore.delete(key);
      }
    }

    return originalJson.call(this, body);
  };

  next();
}

// ============================================================================
// Combined Security Middleware
// ============================================================================
export function securityMiddleware() {
  return [
    requestIdTracing,
    strictSecurityHeaders,
    strictCors(),
    auditMiddleware,
    idempotencyMiddleware,
  ];
}

export default {
  strictCors,
  strictSecurityHeaders,
  requestIdTracing,
  auditMiddleware,
  idempotencyMiddleware,
  securityMiddleware,
  getAuditLog,
};
