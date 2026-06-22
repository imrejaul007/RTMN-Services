/**
 * HOJAI Audit Logs
 * Compliance trail
 * Port: 4604
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4604;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  ip?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  status: 'success' | 'failure';
  error?: string;
}

interface AuditQuery {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  limit?: number;
  offset?: number;
}

interface AuditSummary {
  totalActions: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  byUser: Record<string, number>;
  byStatus: Record<string, number>;
}

interface ComplianceReport {
  id: string;
  name: string;
  type: 'sox' | 'gdpr' | 'hipaa' | 'pci' | 'custom';
  dateRange: { start: Date; end: Date };
  logs: AuditLog[];
  summary: AuditSummary;
  generatedAt: Date;
}

const logs = new Map();
const reports = new Map();

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-audit-logs',
  status: 'healthy',
  port: PORT,
  tagline: 'Compliance trail'
}));

// Create audit log
app.post('/api/logs', (req, res) => {
  const { userId, action, resourceType, resourceId, resourceName, ip, userAgent, metadata, status, error } = req.body;

  const log: AuditLog = {
    id: uuidv4().slice(0, 12),
    timestamp: new Date(),
    userId,
    action,
    resourceType,
    resourceId,
    resourceName,
    ip,
    userAgent,
    metadata: metadata || {},
    status: status || 'success',
    error
  };

  logs.set(log.id, log);

  res.status(201).json({ success: true, data: log });
});

// Batch create
app.post('/api/logs/batch', (req, res) => {
  const { entries } = req.body;

  const created = entries.map((entry: Partial<AuditLog>) => {
    const log: AuditLog = {
      id: uuidv4().slice(0, 12),
      timestamp: new Date(),
      ...entry
    } as AuditLog;

    logs.set(log.id, log);
    return log;
  });

  res.status(201).json({ success: true, data: { count: created.length, logs: created } });
});

// Query logs
app.get('/api/logs', (req, res) => {
  const { userId, action, resourceType, startDate, endDate, status, limit = 100, offset = 0 } = req.query;

  let result = Array.from(logs.values());

  if (userId) result = result.filter(l => l.userId === userId);
  if (action) result = result.filter(l => l.action.includes(action as string));
  if (resourceType) result = result.filter(l => l.resourceType === resourceType);
  if (status) result = result.filter(l => l.status === status);
  if (startDate) result = result.filter(l => l.timestamp >= new Date(startDate as string));
  if (endDate) result = result.filter(l => l.timestamp <= new Date(endDate as string));

  result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json({
    success: true,
    data: {
      logs: result.slice(Number(offset), Number(offset) + Number(limit)),
      total: result.length,
      limit: Number(limit),
      offset: Number(offset)
    }
  });
});

// Get log by ID
app.get('/api/logs/:id', (req, res) => {
  const log = logs.get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });
  res.json({ success: true, data: log });
});

// User activity
app.get('/api/users/:userId/activity', (req, res) => {
  const userLogs = Array.from(logs.values())
    .filter(l => l.userId === req.params.userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const summary: AuditSummary = {
    totalActions: userLogs.length,
    byAction: {},
    byResource: {},
    byUser: { [req.params.userId]: userLogs.length },
    byStatus: { success: 0, failure: 0 }
  };

  userLogs.forEach(l => {
    summary.byAction[l.action] = (summary.byAction[l.action] || 0) + 1;
    summary.byResource[l.resourceType] = (summary.byResource[l.resourceType] || 0) + 1;
    summary.byStatus[l.status] = (summary.byStatus[l.status] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      logs: userLogs.slice(0, 50),
      summary
    }
  });
});

// Resource history
app.get('/api/resources/:type/:id/history', (req, res) => {
  const resourceLogs = Array.from(logs.values())
    .filter(l => l.resourceType === req.params.type && l.resourceId === req.params.id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json({ success: true, data: resourceLogs });
});

// Summary
app.get('/api/summary', (req, res) => {
  const { startDate, endDate } = req.query;

  let result = Array.from(logs.values());

  if (startDate) result = result.filter(l => l.timestamp >= new Date(startDate as string));
  if (endDate) result = result.filter(l => l.timestamp <= new Date(endDate as string));

  const summary: AuditSummary = {
    totalActions: result.length,
    byAction: {},
    byResource: {},
    byUser: {},
    byStatus: {}
  };

  result.forEach(l => {
    summary.byAction[l.action] = (summary.byAction[l.action] || 0) + 1;
    summary.byResource[l.resourceType] = (summary.byResource[l.resourceType] || 0) + 1;
    summary.byUser[l.userId] = (summary.byUser[l.userId] || 0) + 1;
    summary.byStatus[l.status] = (summary.byStatus[l.status] || 0) + 1;
  });

  res.json({ success: true, data: summary });
});

// Generate compliance report
app.post('/api/reports', (req, res) => {
  const { name, type, startDate, endDate } = req.body;

  const reportLogs = Array.from(logs.values())
    .filter(l =>
      l.timestamp >= new Date(startDate) &&
      l.timestamp <= new Date(endDate)
    );

  const reportLogs2 = reportLogs;
  const summary: AuditSummary = {
    totalActions: reportLogs2.length,
    byAction: {},
    byResource: {},
    byUser: {},
    byStatus: {}
  };

  reportLogs2.forEach(l => {
    summary.byAction[l.action] = (summary.byAction[l.action] || 0) + 1;
    summary.byResource[l.resourceType] = (summary.byResource[l.resourceType] || 0) + 1;
    summary.byUser[l.userId] = (summary.byUser[l.userId] || 0) + 1;
    summary.byStatus[l.status] = (summary.byStatus[l.status] || 0) + 1;
  });

  const report: ComplianceReport = {
    id: uuidv4().slice(0, 8),
    name,
    type,
    dateRange: { start: new Date(startDate), end: new Date(endDate) },
    logs: reportLogs2.slice(0, 1000),
    summary,
    generatedAt: new Date()
  };

  reports.set(report.id, report);

  res.status(201).json({ success: true, data: report });
});

app.get('/api/reports', (_, res) => {
  res.json({ success: true, data: Array.from(reports.values()) });
});

app.get('/api/reports/:id', (req, res) => {
  const report = reports.get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json({ success: true, data: report });
});

// Export logs
app.get('/api/logs/export', (req, res) => {
  const { format = 'json', ...filters } = req.query;

  let result = Array.from(logs.values());

  if (filters.userId) result = result.filter(l => l.userId === filters.userId);
  if (filters.action) result = result.filter(l => l.action.includes(filters.action as string));
  if (filters.startDate) result = result.filter(l => l.timestamp >= new Date(filters.startDate as string));
  if (filters.endDate) result = result.filter(l => l.timestamp <= new Date(filters.endDate as string));

  if (format === 'csv') {
    const csv = [
      'id,timestamp,userId,action,resourceType,resourceId,status',
      ...result.map(l =>
        `${l.id},${l.timestamp.toISOString()},${l.userId},${l.action},${l.resourceType},${l.resourceId},${l.status}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  } else {
    res.json({ success: true, data: result });
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI AUDIT LOGS                           ║
║   Compliance trail                            ║
║   Port: ${PORT}                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
