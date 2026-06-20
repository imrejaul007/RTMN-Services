/**
 * Governance Service - Privacy & Tenant Isolation
 *
 * CRITICAL for multi-tenant security.
 *
 * Features:
 * - Tenant isolation
 * - RBAC
 * - Audit logging
 * - Consent management
 * - Policy engine
 *
 * Port: 5132
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

interface Tenant {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'trial';
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'inactive';
  permissions: string[];
  dataResidency: string;
  createdAt: Date;
}

interface User {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'manager' | 'advertiser' | 'viewer';
  permissions: string[];
  mfaEnabled: boolean;
  lastLogin?: Date;
}

interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  result: 'success' | 'denied' | 'error';
  metadata?: Record<string, unknown>;
}

interface Policy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  actions: string[];
  resources: string[];
  conditions?: Record<string, unknown>;
}

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json());
const PORT = parseInt(process.env.PORT || '5132', 10);

// In-memory stores
const tenants: Tenant[] = [
  { id: 'internal', name: 'REZ Internal', type: 'internal', tier: 'enterprise', status: 'active', permissions: ['*'], dataResidency: 'india', createdAt: new Date('2024-01-01') },
  { id: 'tenant_001', name: 'Pizza Palace', type: 'external', tier: 'pro', status: 'active', permissions: ['campaigns:read', 'campaigns:write', 'analytics:read'], dataResidency: 'india', createdAt: new Date('2024-06-01') },
];

const users: User[] = [
  { id: 'user_001', tenantId: 'internal', email: 'admin@rez.money', role: 'admin', permissions: ['*'], mfaEnabled: true, lastLogin: new Date() },
];

const auditLogs: AuditLog[] = [];
const policies: Policy[] = [
  { id: 'pol_001', name: 'External Tenant Data Isolation', effect: 'deny', actions: ['*'], resources: ['internal:*'], conditions: { tenantType: 'external' } },
  { id: 'pol_002', name: 'Internal Tenant Full Access', effect: 'allow', actions: ['*'], resources: ['*'], conditions: { tenantType: 'internal' } },
];

// Middleware: Tenant isolation
function tenantMiddleware(req: Request, res: Response, next: express.NextFunction) {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) return res.status(400).json({ success: false, error: 'TENANT_REQUIRED' });
  (req as any).tenantId = tenantId;
  next();
}

// Middleware: RBAC
function rbacMiddleware(requiredPermission: string) {
  return (req: Request, res: Response, next: express.NextFunction) => {
    const tenantId = (req as any).tenantId;
    const user = users.find(u => u.tenantId === tenantId);
    if (!user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    if (!user.permissions.includes('*') && !user.permissions.includes(requiredPermission)) {
      logAudit(req, 'ACCESS_DENIED', requiredPermission, 'denied');
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }
    logAudit(req, 'ACCESS_GRANTED', requiredPermission, 'success');
    next();
  };
}

function logAudit(req: Request, action: string, resource: string, result: AuditLog['result']) {
  auditLogs.push({
    id: `log_${Date.now()}`,
    tenantId: (req as any).tenantId || 'unknown',
    userId: (req.headers['x-user-id'] as string) || 'unknown',
    action,
    resource,
    resourceId: req.params.id,
    ip: req.ip || '0.0.0.0',
    userAgent: req.headers['user-agent'] || '',
    timestamp: new Date(),
    result,
  });
  if (auditLogs.length > 10000) auditLogs.shift();
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'governance' }));

// Tenant management
app.get('/api/tenants', tenantMiddleware, (req, res) => {
  const tenantId = (req as any).tenantId;
  const tenant = tenants.find(t => t.id === tenantId);
  res.json({ success: true, data: tenant ? [tenant] : [] });
});

app.get('/api/tenants/:id', tenantMiddleware, rbacMiddleware('tenants:read'), (req, res) => {
  const tenant = tenants.find(t => t.id === req.params.id);
  if (!tenant) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  res.json({ success: true, data: tenant });
});

app.post('/api/tenants', (req, res) => {
  const { name, type, tier, permissions } = req.body;
  const tenant: Tenant = { id: `tenant_${Date.now()}`, name, type, tier, status: 'active', permissions: permissions || [], dataResidency: 'india', createdAt: new Date() };
  tenants.push(tenant);
  res.json({ success: true, data: tenant });
});

// RBAC
app.get('/api/users', tenantMiddleware, (req, res) => {
  const tenantId = (req as any).tenantId;
  res.json({ success: true, data: users.filter(u => u.tenantId === tenantId) });
});

app.get('/api/permissions', (_, res) => {
  res.json({ success: true, data: ['campaigns:read', 'campaigns:write', 'campaigns:delete', 'analytics:read', 'analytics:write', 'inventory:read', 'inventory:write', 'billing:read', 'billing:write', 'users:read', 'users:write', 'settings:read', 'settings:write'] });
});

// Audit logs
app.get('/api/audit', tenantMiddleware, rbacMiddleware('audit:read'), (req, res) => {
  const tenantId = (req as any).tenantId;
  const logs = auditLogs.filter(l => l.tenantId === tenantId).slice(-100);
  res.json({ success: true, data: logs });
});

app.post('/api/audit', tenantMiddleware, rbacMiddleware('audit:write'), (req, res) => {
  logAudit(req, req.body.action, req.body.resource, 'success');
  res.json({ success: true });
});

// Policy engine
app.get('/api/policies', (_, res) => res.json({ success: true, data: policies }));

app.post('/api/policies/evaluate', (req, res) => {
  const { action, resource, tenantType } = req.body;
  const policy = policies.find(p => p.actions.includes(action) && p.resources.some(r => resource.startsWith(r)));
  const denied = policies.find(p => p.effect === 'deny' && p.conditions?.tenantType === tenantType);
  res.json({ success: true, data: { allowed: !denied && (!policy || policy.effect === 'allow') } });
});

// Consent management
app.get('/api/consent/:userId', (_, res) => {
  res.json({ success: true, data: { userId: req.params.userId, consents: { marketing: true, analytics: true, personalization: true }, updatedAt: new Date() } });
});

app.post('/api/consent/:userId', (req, res) => {
  res.json({ success: true, data: { userId: req.params.userId, ...req.body, updatedAt: new Date() } });
});

app.listen(PORT, () => logger.info(`[Governance] Running on port ${PORT}`));
export default app;
