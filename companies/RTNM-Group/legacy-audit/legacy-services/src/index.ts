/**
 * RTNM Group - Central Admin Dashboard
 *
 * Unified control plane for all ecosystem services
 * Port: 4080
 *
 * Features:
 * - Multi-tenant management
 * - Audit log aggregation
 * - Global rate limiting
 * - Compliance reporting
 * - Access control overview
 * - Service health aggregation
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const PORT = parseInt(process.env.PORT || '4080', 10);

// Types
interface Tenant {
  id: string;
  name: string;
  type: 'company' | 'partner' | 'internal';
  tier: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'terminated';
  services: string[];
  quota: {
    requests_per_minute: number;
    storage_gb: number;
    users: number;
  };
  created_at: string;
  metadata: Record<string, unknown>;
}

interface AuditEntry {
  id: string;
  tenant_id: string;
  service: string;
  action: string;
  actor: string;
  actor_type: 'user' | 'system' | 'api';
  resource: string;
  status: 'success' | 'failure';
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

interface GlobalAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  tenant_id?: string;
  message: string;
  affected_services: string[];
  created_at: string;
  acknowledged: boolean;
  resolved_at?: string;
}

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  uptime: number;
  latency_p50: number;
  latency_p99: number;
  error_rate: number;
  last_check: string;
}

// In-memory storage
const tenants = new Map<string, Tenant>();
const auditLog = new Map<string, AuditEntry[]>();
const alerts = new Map<string, GlobalAlert>();
const serviceHealth = new Map<string, ServiceHealth>();

// Initialize sample tenants
const sampleTenants: Tenant[] = [
  {
    id: 'tenant_hojai',
    name: 'HOJAI AI',
    type: 'company',
    tier: 'enterprise',
    status: 'active',
    services: ['memory', 'agents', 'intelligence', 'workflow'],
    quota: { requests_per_minute: 10000, storage_gb: 1000, users: 100 },
    created_at: new Date().toISOString(),
    metadata: { industry: 'AI', founded: '2024' }
  },
  {
    id: 'tenant_rabtul',
    name: 'RABTUL Technologies',
    type: 'company',
    tier: 'enterprise',
    status: 'active',
    services: ['auth', 'wallet', 'payments', 'notifications'],
    quota: { requests_per_minute: 20000, storage_gb: 500, users: 50 },
    created_at: new Date().toISOString(),
    metadata: { industry: 'FinTech', founded: '2023' }
  },
  {
    id: 'tenant_corpperks',
    name: 'CorpPerks',
    type: 'company',
    tier: 'pro',
    status: 'active',
    services: ['hr', 'payroll', 'talent'],
    quota: { requests_per_minute: 5000, storage_gb: 200, users: 25 },
    created_at: new Date().toISOString(),
    metadata: { industry: 'HR Tech', founded: '2024' }
  }
];

sampleTenants.forEach(t => tenants.set(t.id, t));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rtnm-group-admin',
    version: '1.0.0',
    tenants_count: tenants.size,
    alerts_count: Array.from(alerts.values()).filter(a => !a.acknowledged).length,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// TENANT MANAGEMENT
// ============================================

app.get('/api/tenants', (req: Request, res: Response) => {
  const { type, tier, status } = req.query;

  let result = Array.from(tenants.values());

  if (type) result = result.filter(t => t.type === type);
  if (tier) result = result.filter(t => t.tier === tier);
  if (status) result = result.filter(t => t.status === status);

  res.json({ tenants: result, count: result.length });
});

app.get('/api/tenants/:id', (req: Request, res: Response) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  res.json({ tenant });
});

app.post('/api/tenants', (req: Request, res: Response) => {
  try {
    const { name, type, tier, services, quota, metadata } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    const tenant: Tenant = {
      id: `tenant_${uuidv4()}`,
      name,
      type: type || 'partner',
      tier: tier || 'basic',
      status: 'active',
      services: services || [],
      quota: quota || { requests_per_minute: 100, storage_gb: 10, users: 5 },
      created_at: new Date().toISOString(),
      metadata: metadata || {}
    };

    tenants.set(tenant.id, tenant);
    auditLog.set(tenant.id, []);

    // Record audit
    recordAudit(tenant.id, 'rtnm-group', 'tenant.created', 'system', 'system', tenant.id, 'success', { tenant });

    res.json({ success: true, tenant });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/tenants/:id', (req: Request, res: Response) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const { name, tier, status, services, quota, metadata } = req.body;

  if (name) tenant.name = name;
  if (tier) tenant.tier = tier;
  if (status) tenant.status = status;
  if (services) tenant.services = services;
  if (quota) tenant.quota = { ...tenant.quota, ...quota };
  if (metadata) tenant.metadata = { ...tenant.metadata, ...metadata };

  tenants.set(tenant.id, tenant);

  recordAudit(tenant.id, 'rtnm-group', 'tenant.updated', 'system', 'system', tenant.id, 'success', { changes: req.body });

  res.json({ success: true, tenant });
});

app.delete('/api/tenants/:id', (req: Request, res: Response) => {
  const tenant = tenants.get(req.params.id);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  tenant.status = 'terminated';
  tenants.set(tenant.id, tenant);

  recordAudit(tenant.id, 'rtnm-group', 'tenant.terminated', 'system', 'system', tenant.id, 'success', {});

  res.json({ success: true, message: 'Tenant terminated' });
});

// ============================================
// AUDIT LOG AGGREGATION
// ============================================

function recordAudit(
  tenantId: string,
  service: string,
  action: string,
  actor: string,
  actorType: 'user' | 'system' | 'api',
  resource: string,
  status: 'success' | 'failure',
  details: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): void {
  const entry: AuditEntry = {
    id: uuidv4(),
    tenant_id: tenantId,
    service,
    action,
    actor,
    actor_type: actorType,
    resource,
    status,
    details,
    ip_address: ipAddress,
    user_agent: userAgent,
    timestamp: new Date().toISOString()
  };

  const tenantLogs = auditLog.get(tenantId) || [];
  tenantLogs.push(entry);
  auditLog.set(tenantId, tenantLogs);

  // Global aggregation
  auditLog.set('global', [...(auditLog.get('global') || []), entry]);

  // Keep last 10000 entries per tenant
  if (auditLog.get(tenantId)!.length > 10000) {
    auditLog.set(tenantId, auditLog.get(tenantId)!.slice(-10000));
  }

  // Keep last 100000 global entries
  const global = auditLog.get('global') || [];
  if (global.length > 100000) {
    auditLog.set('global', global.slice(-100000));
  }
}

app.post('/api/audit', (req: Request, res: Response) => {
  const { tenant_id, service, action, actor, actor_type, resource, status, details, ip_address, user_agent } = req.body;

  if (!tenant_id || !service || !action) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  recordAudit(tenant_id, service, action, actor || 'unknown', actor_type || 'system', resource || '', status || 'success', details || {}, ip_address, user_agent);

  res.json({ success: true });
});

app.get('/api/audit', (req: Request, res: Response) => {
  const { tenant_id, service, action, actor, status, since, until, limit = 100 } = req.query;

  const logs = (tenant_id ? auditLog.get(tenant_id as string) : auditLog.get('global')) || [];

  let result = [...logs];

  if (service) result = result.filter(l => l.service === service);
  if (action) result = result.filter(l => l.action.includes(action as string));
  if (actor) result = result.filter(l => l.actor === actor);
  if (status) result = result.filter(l => l.status === status);
  if (since) result = result.filter(l => new Date(l.timestamp) >= new Date(since as string));
  if (until) result = result.filter(l => new Date(l.timestamp) <= new Date(until as string));

  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  result = result.slice(0, parseInt(limit as string));

  res.json({ logs: result, count: result.length });
});

app.get('/api/audit/summary', (req: Request, res: Response) => {
  const global = auditLog.get('global') || [];
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const lastHour = global.filter(l => new Date(l.timestamp).getTime() > hourAgo);
  const lastDay = global.filter(l => new Date(l.timestamp).getTime() > dayAgo);

  const byService = global.reduce((acc, log) => {
    acc[log.service] = (acc[log.service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byAction = global.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    summary: {
      total: global.length,
      last_hour: lastHour.length,
      last_day: lastDay.length,
      failures_last_hour: lastHour.filter(l => l.status === 'failure').length,
      by_service: byService,
      by_action: byAction
    }
  });
});

// ============================================
// GLOBAL ALERTS
// ============================================

app.post('/api/alerts', (req: Request, res: Response) => {
  const { severity, source, tenant_id, message, affected_services } = req.body;

  if (!severity || !source || !message) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const alert: GlobalAlert = {
    id: uuidv4(),
    severity,
    source,
    tenant_id,
    message,
    affected_services: affected_services || [],
    created_at: new Date().toISOString(),
    acknowledged: false
  };

  alerts.set(alert.id, alert);

  res.json({ success: true, alert });
});

app.get('/api/alerts', (req: Request, res: Response) => {
  const { severity, tenant_id, acknowledged } = req.query;

  let result = Array.from(alerts.values());

  if (severity) result = result.filter(a => a.severity === severity);
  if (tenant_id) result = result.filter(a => a.tenant_id === tenant_id);
  if (acknowledged !== undefined) result = result.filter(a => a.acknowledged === (acknowledged === 'true'));

  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ alerts: result, count: result.length });
});

app.post('/api/alerts/:id/acknowledge', (req: Request, res: Response) => {
  const alert = alerts.get(req.params.id);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  alert.acknowledged = true;
  alerts.set(alert.id, alert);

  res.json({ success: true, alert });
});

app.post('/api/alerts/:id/resolve', (req: Request, res: Response) => {
  const alert = alerts.get(req.params.id);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  alert.resolved_at = new Date().toISOString();
  alerts.set(alert.id, alert);

  res.json({ success: true, alert });
});

// ============================================
// SERVICE HEALTH
// ============================================

app.get('/api/services/health', (req: Request, res: Response) => {
  const services = Array.from(serviceHealth.values());
  res.json({ services, count: services.length });
});

app.post('/api/services/:service/health', (req: Request, res: Response) => {
  const { status, uptime, latency_p50, latency_p99, error_rate } = req.body;

  const health: ServiceHealth = {
    service: req.params.service,
    status: status || 'unknown',
    uptime: uptime || 0,
    latency_p50: latency_p50 || 0,
    latency_p99: latency_p99 || 0,
    error_rate: error_rate || 0,
    last_check: new Date().toISOString()
  };

  serviceHealth.set(health.service, health);

  // Alert on unhealthy
  if (status === 'unhealthy' || error_rate > 0.05) {
    const alert: GlobalAlert = {
      id: uuidv4(),
      severity: status === 'unhealthy' ? 'error' : 'warning',
      source: req.params.service,
      message: `Service ${req.params.service} is ${status} (error rate: ${(error_rate * 100).toFixed(2)}%)`,
      affected_services: [req.params.service],
      created_at: new Date().toISOString(),
      acknowledged: false
    };
    alerts.set(alert.id, alert);
  }

  res.json({ success: true, health });
});

// ============================================
// GLOBAL STATS
// ============================================

app.get('/api/stats', (req: Request, res: Response) => {
  const global = auditLog.get('global') || [];

  const stats = {
    tenants: {
      total: tenants.size,
      active: Array.from(tenants.values()).filter(t => t.status === 'active').length,
      enterprise: Array.from(tenants.values()).filter(t => t.tier === 'enterprise').length,
      pro: Array.from(tenants.values()).filter(t => t.tier === 'pro').length,
      basic: Array.from(tenants.values()).filter(t => t.tier === 'basic').length
    },
    audit: {
      total_events: global.length,
      last_hour: global.filter(l => new Date(l.timestamp).getTime() > Date.now() - 3600000).length,
      failures: global.filter(l => l.status === 'failure').length
    },
    alerts: {
      total: alerts.size,
      unacknowledged: Array.from(alerts.values()).filter(a => !a.acknowledged).length,
      critical: Array.from(alerts.values()).filter(a => a.severity === 'critical' && !a.acknowledged).length
    },
    services: {
      healthy: Array.from(serviceHealth.values()).filter(s => s.status === 'healthy').length,
      degraded: Array.from(serviceHealth.values()).filter(s => s.status === 'degraded').length,
      unhealthy: Array.from(serviceHealth.values()).filter(s => s.status === 'unhealthy').length
    }
  };

  res.json({ stats });
});

// ============================================
// COMPLIANCE REPORTS
// ============================================

app.get('/api/reports/compliance', (req: Request, res: Response) => {
  const { period } = req.query;
  const global = auditLog.get('global') || [];

  const now = Date.now();
  const periodMs = period === 'day' ? 24 * 3600000 : period === 'week' ? 7 * 24 * 3600000 : 30 * 24 * 3600000;
  const since = now - periodMs;

  const periodLogs = global.filter(l => new Date(l.timestamp).getTime() > since);

  const report = {
    period: period || 'month',
    generated_at: new Date().toISOString(),
    summary: {
      total_events: periodLogs.length,
      unique_actors: new Set(periodLogs.map(l => l.actor)).size,
      unique_services: new Set(periodLogs.map(l => l.service)).size,
      failure_rate: periodLogs.length > 0
        ? (periodLogs.filter(l => l.status === 'failure').length / periodLogs.length * 100).toFixed(2) + '%'
        : '0%'
    },
    by_service: periodLogs.reduce((acc, log) => {
      acc[log.service] = acc[log.service] || { success: 0, failure: 0 };
      acc[log.service][log.status]++;
      return acc;
    }, {} as Record<string, { success: number; failure: number }>),
    top_actions: Object.entries(
      periodLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([action, count]) => ({ action, count }))
  };

  res.json({ report });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[RTNM Group Error]', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(
╔═══════════════════════════════════════════════════════════╗
║           RTNM GROUP - Central Admin Dashboard          ║
╠═══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║                                                           ║
║  Features:                                             ║
║  ├── Multi-tenant Management                             ║
║  ├── Audit Log Aggregation (Global + Per-tenant)         ║
║  ├── Global Alert System                                ║
║  ├── Service Health Monitoring                          ║
║  ├── Compliance Reports                                ║
║  └── Global Stats Dashboard                             ║
║                                                           ║
║  Endpoints:                                             ║
║  ├── TENANTS: GET/POST /api/tenants                    ║
║  ├── AUDIT: GET/POST /api/audit                        ║
║  ├── ALERTS: GET/POST /api/alerts                      ║
║  ├── SERVICES: GET /api/services/health                ║
║  ├── STATS: GET /api/stats                              ║
║  └── REPORTS: GET /api/reports/compliance              ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;