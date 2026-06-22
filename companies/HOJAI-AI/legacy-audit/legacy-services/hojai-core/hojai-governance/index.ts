/**
 * Hojai Governance Platform
 *
 * Multi-tenant RBAC, Audit, and Permissions
 *
 * PORT: 4501
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-governance');

// ============================================
// TYPES
// ============================================

export type Role = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';
export type Permission =
  | 'read' | 'write' | 'delete'
  | 'manage_users' | 'manage_settings' | 'manage_billing'
  | 'view_analytics' | 'manage_integrations';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
  status: 'active' | 'invited' | 'disabled';
  created_at: string;
  last_login_at?: string;
}

export interface AuditEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export interface Policy {
  id: string;
  tenant_id: string;
  name: string;
  rules: PolicyRule[];
  effect: 'allow' | 'deny';
  status: 'active' | 'inactive';
}

export interface PolicyRule {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt';
  value: any;
}

// ============================================
// ROLE PERMISSIONS
// ============================================

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['read', 'write', 'delete', 'manage_users', 'manage_settings', 'manage_billing', 'view_analytics', 'manage_integrations'],
  admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings', 'view_analytics', 'manage_integrations'],
  manager: ['read', 'write', 'manage_users', 'view_analytics'],
  agent: ['read', 'write'],
  viewer: ['read']
};

// ============================================
// STORAGE
// ============================================

const users = new Map<string, User>();
const auditLog = new Map<string, AuditEntry>();
const policies = new Map<string, Policy>();

// ============================================
// GOVERNANCE PLATFORM
// ============================================

export class HojaiGovernancePlatform {

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Create user
   */
  async createUser(
    tenantId: string,
    data: { email: string; name: string; role: Role }
  ): Promise<User> {
    const user: User = {
      id: this.generateId('user'),
      tenant_id: tenantId,
      email: data.email,
      name: data.name,
      role: data.role,
      permissions: ROLE_PERMISSIONS[data.role],
      status: 'invited',
      created_at: new Date().toISOString()
    };

    users.set(user.id, user);

    await this.auditLog(tenantId, user.id, 'user.created', 'user', user.id, { email: data.email, role: data.role });

    return user;
  }

  /**
   * Get user
   */
  async getUser(tenantId: string, userId: string): Promise<User | null> {
    const user = users.get(userId);
    if (!user || user.tenant_id !== tenantId) return null;
    return user;
  }

  /**
   * List users
   */
  async listUsers(tenantId: string): Promise<User[]> {
    const tenantUsers: User[] = [];
    for (const user of users.values()) {
      if (user.tenant_id === tenantId) {
        tenantUsers.push(user);
      }
    }
    return tenantUsers;
  }

  /**
   * Update user role
   */
  async updateUserRole(
    tenantId: string,
    userId: string,
    newRole: Role
  ): Promise<User | null> {
    const user = await this.getUser(tenantId, userId);
    if (!user) return null;

    user.role = newRole;
    user.permissions = ROLE_PERMISSIONS[newRole];
    users.set(userId, user);

    await this.auditLog(tenantId, userId, 'user.role_updated', 'user', userId, { new_role: newRole });

    return user;
  }

  /**
   * Disable user
   */
  async disableUser(tenantId: string, userId: string): Promise<boolean> {
    const user = await this.getUser(tenantId, userId);
    if (!user) return false;

    user.status = 'disabled';
    users.set(userId, user);

    await this.auditLog(tenantId, userId, 'user.disabled', 'user', userId);

    return true;
  }

  // ============================================
  // PERMISSION CHECKING
  // ============================================

  /**
   * Check if user has permission
   */
  hasPermission(user: User, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * Check permission with context
   */
  async checkPermission(
    tenantId: string,
    userId: string,
    permission: Permission
  ): Promise<{ allowed: boolean; reason?: string }> {
    const user = await this.getUser(tenantId, userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (user.status !== 'active') {
      return { allowed: false, reason: 'User is not active' };
    }

    if (!this.hasPermission(user, permission)) {
      return { allowed: false, reason: `Missing permission: ${permission}` };
    }

    return { allowed: true };
  }

  // ============================================
  // AUDIT LOG
  // ============================================

  /**
   * Log audit entry
   */
  async auditLog(
    tenantId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const entry: AuditEntry = {
      id: this.generateId('audit'),
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      timestamp: new Date().toISOString()
    };

    auditLog.set(entry.id, entry);

    logger.info('audit_logged', { tenantId, userId, action, resourceType });
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    tenantId: string,
    options: { userId?: string; action?: string; startDate?: string; endDate?: string; limit?: number } = {}
  ): Promise<AuditEntry[]> {
    const logs: AuditEntry[] = [];

    for (const entry of auditLog.values()) {
      if (entry.tenant_id !== tenantId) continue;

      if (options.userId && entry.user_id !== options.userId) continue;
      if (options.action && !entry.action.includes(options.action)) continue;

      logs.push(entry);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return logs.slice(0, options.limit || 100);
  }

  // ============================================
  // POLICY ENGINE
  // ============================================

  /**
   * Create policy
   */
  async createPolicy(
    tenantId: string,
    data: { name: string; rules: PolicyRule[]; effect: 'allow' | 'deny' }
  ): Promise<Policy> {
    const policy: Policy = {
      id: this.generateId('policy'),
      tenant_id: tenantId,
      name: data.name,
      rules: data.rules,
      effect: data.effect,
      status: 'active'
    };

    policies.set(policy.id, policy);

    await this.auditLog(tenantId, 'system', 'policy.created', 'policy', policy.id);

    return policy;
  }

  /**
   * Evaluate policy
   */
  async evaluatePolicy(
    tenantId: string,
    policyId: string,
    context: Record<string, any>
  ): Promise<boolean> {
    const policy = policies.get(policyId);
    if (!policy || policy.tenant_id !== tenantId || policy.status !== 'active') {
      return false;
    }

    // Check all rules
    for (const rule of policy.rules) {
      const contextValue = context[rule.field];
      let matches = false;

      switch (rule.operator) {
        case 'eq': matches = contextValue === rule.value; break;
        case 'neq': matches = contextValue !== rule.value; break;
        case 'in': matches = Array.isArray(rule.value) && rule.value.includes(contextValue); break;
        case 'not_in': matches = Array.isArray(rule.value) && !rule.value.includes(contextValue); break;
        case 'gt': matches = contextValue > rule.value; break;
        case 'lt': matches = contextValue < rule.value; break;
      }

      if (!matches) return false;
    }

    return policy.effect === 'allow';
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// EXPRESS INTEGRATION
// ============================================

export function createGovernanceRoutes(platform: HojaiGovernancePlatform) {
  const router = express.Router();

  // User Management
  router.post('/users', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { email, name, role } = req.body;

      const user = await platform.createUser(tenantId, { email, name, role });
      res.json(createResponse(user, { tenantId }));
    } catch (error) {
      logger.error('create_user_error', { error });
      res.status(500).json(createErrorResponse('CREATE_ERROR', 'Failed to create user'));
    }
  });

  router.get('/users', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const users = await platform.listUsers(tenantId);
      res.json(createResponse(users, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('LIST_ERROR', 'Failed to list users'));
    }
  });

  router.get('/users/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const user = await platform.getUser(tenantId, req.params.id);
      if (!user) return res.status(404).json(createErrorResponse('NOT_FOUND', 'User not found'));
      res.json(createResponse(user, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('GET_ERROR', 'Failed to get user'));
    }
  });

  router.patch('/users/:id/role', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { role } = req.body;
      const user = await platform.updateUserRole(tenantId, req.params.id, role);
      if (!user) return res.status(404).json(createErrorResponse('NOT_FOUND', 'User not found'));
      res.json(createResponse(user, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('UPDATE_ERROR', 'Failed to update role'));
    }
  });

  router.delete('/users/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const disabled = await platform.disableUser(tenantId, req.params.id);
      if (!disabled) return res.status(404).json(createErrorResponse('NOT_FOUND', 'User not found'));
      res.json(createResponse({ disabled: true }, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('DELETE_ERROR', 'Failed to disable user'));
    }
  });

  // Permission Check
  router.post('/check', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { userId, permission } = req.body;
      const result = await platform.checkPermission(tenantId, userId, permission);
      res.json(createResponse(result, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('CHECK_ERROR', 'Failed to check permission'));
    }
  });

  // Audit Logs
  router.get('/audit', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const logs = await platform.getAuditLogs(tenantId, {
        userId: req.query.userId as string,
        action: req.query.action as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      });
      res.json(createResponse(logs, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('AUDIT_ERROR', 'Failed to get audit logs'));
    }
  });

  // Policies
  router.post('/policies', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const policy = await platform.createPolicy(tenantId, req.body);
      res.json(createResponse(policy, { tenantId }));
    } catch (error) {
      res.status(500).json(createErrorResponse('CREATE_ERROR', 'Failed to create policy'));
    }
  });

  return router;
}

export async function bootstrap(port = 4501) {
  const platform = new HojaiGovernancePlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'hojai-governance', version: '1.0.0' });
  });

  app.use('/api/governance', createGovernanceRoutes(platform));

  app.listen(port, () => {
    logger.info('hojai_governance_started', { port });
  });

  return { platform, app };
}

export default { HojaiGovernancePlatform, createGovernanceRoutes, bootstrap };
