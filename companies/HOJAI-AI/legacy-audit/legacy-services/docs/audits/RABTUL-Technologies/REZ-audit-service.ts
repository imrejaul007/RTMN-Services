/**
 * Audit Logging Service - Compliance
 * All actions logged with immutable records
 */

import { v4 as uuid } from 'uuid';

const AUDIT_PREFIX = 'audit:';
const AUDIT_TTL = 86400 * 365 * 7; // 7 years

interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  service: string;
}

/**
 * Log audit entry
 */
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<string> {
  const id = `audit_${uuid()}`;
  const fullEntry: AuditEntry = {
    ...entry,
    id,
    timestamp: new Date(),
  };

  await redis.setex(`${AUDIT_PREFIX}${id}`, AUDIT_TTL, JSON.stringify(fullEntry));
  await redis.zadd('audit:index', Date.now(), id);

  return id;
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(filters: {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditEntry[]> {
  const start = filters.startDate?.getTime() || 0;
  const end = filters.endDate?.getTime() || Date.now();

  const ids = await redis.zrangebyscore('audit:index', start, end, 'LIMIT', 0, filters.limit || 100);
  const entries: AuditEntry[] = [];

  for (const id of ids) {
    const entry = await redis.get(`${AUDIT_PREFIX}${id}`);
    if (!entry) continue;

    const parsed = JSON.parse(entry);
    if (filters.userId && parsed.userId !== filters.userId) continue;
    if (filters.action && parsed.action !== filters.action) continue;
    if (filters.resource && parsed.resource !== filters.resource) continue;

    entries.push(parsed);
  }

  return entries;
}
