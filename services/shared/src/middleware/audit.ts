/**
 * Audit Logging Middleware
 * Logs all mutations with user context
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Audit entry structure
interface AuditEntry {
  id: string;
  timestamp: string;
  requestId: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  query: Record<string, any>;
  bodySize: number;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

// In-memory audit store (use external log service in production)
const auditStore: AuditEntry[] = [];
const MAX_ENTRIES = 10000;

// Cleanup old entries periodically
setInterval(() => {
  if (auditStore.length > MAX_ENTRIES) {
    auditStore.splice(0, auditStore.length - MAX_ENTRIES);
  }
}, 60000); // Every minute

/**
 * Audit middleware - logs all mutation operations
 */
export function auditLog(req: Request, res: Response, next: NextFunction) {
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  const isApi = req.path.startsWith('/api/');

  // Skip non-mutations and non-API routes
  if (!isMutation || !isApi) {
    return next();
  }

  const startTime = Date.now();
  const requestId = (req as any).requestId || crypto.randomUUID();
  const user = (req as any).user;
  const userId = user?.id;
  const userEmail = user?.email;

  // Capture original end
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;

    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      requestId,
      userId,
      userEmail,
      action: `${req.method} ${req.path}`,
      resource: extractResource(req.path),
      resourceId: req.params.id,
      method: req.method,
      path: req.path,
      query: sanitizeQuery(req.query),
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      success,
    };

    // Add to store
    auditStore.push(entry);
    if (auditStore.length > MAX_ENTRIES) {
      auditStore.shift();
    }

    // Console log for critical actions
    if (!success || userId) {
      console.log(`[AUDIT] ${entry.action} by ${userId || 'anonymous'} - ${entry.statusCode} (${duration}ms)`);
    }

    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

/**
 * Extract resource name from path
 */
function extractResource(path: string): string {
  const parts = path.split('/').filter(Boolean);

  // /api/v1/strategy -> strategy
  // /api/v1/strategies/123 -> strategy
  // /api/v1/rfqs -> rfq
  if (parts.length >= 2) {
    let resource = parts[1];
    // Remove trailing 's' for plural forms
    if (resource.endsWith('s') && !resource.endsWith('ss')) {
      resource = resource.slice(0, -1);
    }
    return resource;
  }

  return 'unknown';
}

/**
 * Sanitize query parameters (remove sensitive data)
 */
function sanitizeQuery(query: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const sensitive = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

  for (const [key, value] of Object.entries(query)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Get audit log entries with optional filtering
 */
export function getAuditLog(options: {
  userId?: string;
  resource?: string;
  since?: Date;
  limit?: number;
} = {}): AuditEntry[] {
  let entries = [...auditStore];

  if (options.userId) {
    entries = entries.filter(e => e.userId === options.userId);
  }

  if (options.resource) {
    entries = entries.filter(e => e.resource === options.resource);
  }

  if (options.since) {
    entries = entries.filter(e => new Date(e.timestamp) >= options.since!);
  }

  // Sort by timestamp descending
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (options.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

/**
 * Get audit statistics
 */
export function getAuditStats(): {
  total: number;
  byResource: Record<string, number>;
  byStatus: Record<string, number>;
  averageDuration: number;
} {
  const byResource: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalDuration = 0;

  for (const entry of auditStore) {
    byResource[entry.resource] = (byResource[entry.resource] || 0) + 1;

    const statusGroup = entry.statusCode < 400 ? 'success' : 'error';
    byStatus[statusGroup] = (byStatus[statusGroup] || 0) + 1;

    totalDuration += entry.duration;
  }

  return {
    total: auditStore.length,
    byResource,
    byStatus,
    averageDuration: auditStore.length > 0 ? totalDuration / auditStore.length : 0,
  };
}

/**
 * Clear audit log
 */
export function clearAuditLog(): void {
  auditStore.length = 0;
}

export default {
  auditLog,
  getAuditLog,
  getAuditStats,
  clearAuditLog,
};
