/**
 * RBAC - Role-Based Access Control
 *
 * Features:
 * - Role hierarchy
 * - Permission-based access
 * - Resource-level permissions
 * - Audit logging
 */

import { Request, Response, NextFunction } from 'express';

// ============================================================================
// Types
// ============================================================================

export type Role =
  | 'super_admin'
  | 'admin'
  | 'distributor_owner'
  | 'distributor_manager'
  | 'franchise_owner'
  | 'franchise_manager'
  | 'supplier_owner'
  | 'supplier_manager'
  | 'merchant_owner'
  | 'merchant_staff'
  | 'auditor'
  | 'support';

export type Resource =
  | 'distributors'
  | 'franchises'
  | 'manufacturers'
  | 'suppliers'
  | 'orders'
  | 'rfqs'
  | 'credits'
  | 'reports'
  | 'settings'
  | 'users'
  | 'audit';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';

export interface Permission {
  resource: Resource;
  actions: Action[];
  conditions?: {
    ownOnly?: boolean;
    status?: string[];
  };
}

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
  inherits?: Role[];
}

// ============================================================================
// Role Hierarchy
// ============================================================================

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 100,
  admin: 90,
  distributor_owner: 70,
  distributor_manager: 60,
  franchise_owner: 70,
  franchise_manager: 60,
  supplier_owner: 70,
  supplier_manager: 60,
  merchant_owner: 50,
  merchant_staff: 40,
  auditor: 20,
  support: 10,
};

// ============================================================================
// Role Permissions
// ============================================================================

export const ROLE_PERMISSIONS: RolePermissions[] = [
  // Super Admin - Full access
  {
    role: 'super_admin',
    permissions: [
      { resource: 'distributors', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'franchises', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'manufacturers', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'suppliers', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'rfqs', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'credits', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'reports', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'settings', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'users', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'audit', actions: ['read', 'export'] },
    ],
  },

  // Admin - Full access except audit log
  {
    role: 'admin',
    permissions: [
      { resource: 'distributors', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'franchises', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'manufacturers', actions: ['read', 'update', 'approve', 'export'] },
      { resource: 'suppliers', actions: ['create', 'read', 'update', 'approve', 'export'] },
      { resource: 'orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { resource: 'rfqs', actions: ['create', 'read', 'update', 'approve', 'export'] },
      { resource: 'credits', actions: ['create', 'read', 'update', 'approve', 'export'] },
      { resource: 'reports', actions: ['read', 'export'] },
      { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    ],
  },

  // Distributor Owner
  {
    role: 'distributor_owner',
    permissions: [
      { resource: 'orders', actions: ['create', 'read', 'update', 'approve'], conditions: { ownOnly: true } },
      { resource: 'rfqs', actions: ['read', 'update', 'approve'], conditions: { ownOnly: true } },
      { resource: 'reports', actions: ['read', 'export'], conditions: { ownOnly: true } },
      { resource: 'users', actions: ['create', 'read', 'update'] },
    ],
  },

  // Distributor Manager
  {
    role: 'distributor_manager',
    permissions: [
      { resource: 'orders', actions: ['create', 'read', 'update'], conditions: { ownOnly: true } },
      { resource: 'rfqs', actions: ['read'], conditions: { ownOnly: true } },
      { resource: 'reports', actions: ['read'], conditions: { ownOnly: true } },
    ],
  },

  // Franchise Owner
  {
    role: 'franchise_owner',
    permissions: [
      { resource: 'orders', actions: ['create', 'read', 'update', 'approve'], conditions: { ownOnly: true } },
      { resource: 'reports', actions: ['read', 'export'], conditions: { ownOnly: true } },
      { resource: 'users', actions: ['create', 'read', 'update'] },
    ],
  },

  // Franchise Manager
  {
    role: 'franchise_manager',
    permissions: [
      { resource: 'orders', actions: ['create', 'read', 'update'], conditions: { ownOnly: true } },
      { resource: 'reports', actions: ['read'], conditions: { ownOnly: true } },
    ],
  },

  // Supplier Owner
  {
    role: 'supplier_owner',
    permissions: [
      { resource: 'orders', actions: ['read', 'update', 'approve'], conditions: { ownOnly: true } },
      { resource: 'rfqs', actions: ['read', 'update'], conditions: { ownOnly: true } },
      { resource: 'reports', actions: ['read', 'export'], conditions: { ownOnly: true } },
    ],
  },

  // Supplier Manager
  {
    role: 'supplier_manager',
    permissions: [
      { resource: 'orders', actions: ['read', 'update'], conditions: { ownOnly: true } },
      { resource: 'rfqs', actions: ['read'], conditions: { ownOnly: true } },
    ],
  },

  // Merchant Owner
  {
    role: 'merchant_owner',
    permissions: [
      { resource: 'orders', actions: ['create', 'read', 'update'], conditions: { ownOnly: true } },
      { resource: 'rfqs', actions: ['create', 'read', 'update'], conditions: { ownOnly: true } },
      { resource: 'credits', actions: ['read'], conditions: { ownOnly: true } },
    ],
  },

  // Merchant Staff
  {
    role: 'merchant_staff',
    permissions: [
      { resource: 'orders', actions: ['create', 'read', 'update'], conditions: { ownOnly: true } },
      { resource: 'rfqs', actions: ['read'], conditions: { ownOnly: true } },
    ],
  },

  // Auditor
  {
    role: 'auditor',
    permissions: [
      { resource: 'orders', actions: ['read', 'export'] },
      { resource: 'rfqs', actions: ['read', 'export'] },
      { resource: 'credits', actions: ['read', 'export'] },
      { resource: 'reports', actions: ['read', 'export'] },
      { resource: 'audit', actions: ['read', 'export'] },
    ],
  },

  // Support
  {
    role: 'support',
    permissions: [
      { resource: 'orders', actions: ['read'] },
      { resource: 'rfqs', actions: ['read'] },
      { resource: 'reports', actions: ['read'] },
    ],
  },
];

// ============================================================================
// RBAC Service
// ============================================================================

export class RBACService {
  private rolePermissions: Map<Role, Permission[]>;

  constructor() {
    this.rolePermissions = new Map();
    this.initializePermissions();
  }

  private initializePermissions(): void {
    for (const roleConfig of ROLE_PERMISSIONS) {
      const allPermissions = this.getAllPermissions(roleConfig.role);
      this.rolePermissions.set(roleConfig.role, allPermissions);
    }
  }

  /**
   * Get all permissions for a role (including inherited)
   */
  getAllPermissions(role: Role): Permission[] {
    const roleConfig = ROLE_PERMISSIONS.find(r => r.role === role);
    if (!roleConfig) return [];

    const permissions = [...roleConfig.permissions];

    // Add inherited permissions
    if (roleConfig.inherits) {
      for (const inheritedRole of roleConfig.inherits) {
        const inherited = ROLE_PERMISSIONS.find(r => r.role === inheritedRole);
        if (inherited) {
          permissions.push(...inherited.permissions);
        }
      }
    }

    return permissions;
  }

  /**
   * Check if role has permission for action on resource
   */
  hasPermission(
    role: Role,
    resource: Resource,
    action: Action,
    context?: { userId?: string; resourceOwnerId?: string }
  ): boolean {
    const permissions = this.rolePermissions.get(role);
    if (!permissions) return false;

    const resourcePermission = permissions.find(p => p.resource === resource);
    if (!resourcePermission) return false;

    if (!resourcePermission.actions.includes(action)) return false;

    // Check conditions
    if (resourcePermission.conditions?.ownOnly && context) {
      if (context.userId && context.resourceOwnerId) {
        if (context.userId !== context.resourceOwnerId) {
          // Check hierarchy - higher roles can access lower
          const userLevel = ROLE_HIERARCHY[role] || 0;
          // Owner level is typically 70+
          return userLevel >= 70;
        }
      }
    }

    if (resourcePermission.conditions?.status) {
      // Status conditions handled at route level
    }

    return true;
  }

  /**
   * Get role level
   */
  getRoleLevel(role: Role): number {
    return ROLE_HIERARCHY[role] || 0;
  }

  /**
   * Check if role can manage another role
   */
  canManage(managerRole: Role, targetRole: Role): boolean {
    return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
  }
}

// ============================================================================
// Express Middleware
// ============================================================================

const rbac = new RBACService();

export function requirePermission(resource: Resource, action: Action) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const user = (req as any).user;

    if (!user?.role) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const role = user.role as Role;
    const hasAccess = rbac.hasPermission(role, resource, action, {
      userId: user.id,
      resourceOwnerId: (req as any).resourceOwnerId,
    });

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Role '${role}' cannot perform '${action}' on '${resource}'`,
        },
      });
      return;
    }

    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const user = (req as any).user;

    if (!user?.role) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!roles.includes(user.role as Role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Required role: ${roles.join(' or ')}`,
        },
      });
      return;
    }

    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const user = (req as any).user;

    if (!user?.role) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const userLevel = rbac.getRoleLevel(user.role as Role);
    const requiredLevel = rbac.getRoleLevel(minRole);

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}

// ============================================================================
// Audit Logging
// ============================================================================

interface AuditLog {
  id: string;
  userId: string;
  role: Role;
  action: Action;
  resource: Resource;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

const auditLogs: AuditLog[] = [];

export function auditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
  const entry: AuditLog = {
    ...log,
    id: randomUUID(),
    timestamp: new Date(),
  };

  auditLogs.push(entry);

  // In production, this would write to database
  logger.info([AUDIT] ${log.userId} (${log.role}) ${log.action} ${log.resource}${log.resourceId ? `:${log.resourceId}` : ''}`);
}

export function getAuditLogs(filters?: {
  userId?: string;
  resource?: Resource;
  action?: Action;
  startDate?: Date;
  endDate?: Date;
}): AuditLog[] {
  let results = [...auditLogs];

  if (filters?.userId) {
    results = results.filter(l => l.userId === filters.userId);
  }
  if (filters?.resource) {
    results = results.filter(l => l.resource === filters.resource);
  }
  if (filters?.action) {
    results = results.filter(l => l.action === filters.action);
  }
  if (filters?.startDate) {
    results = results.filter(l => l.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    results = results.filter(l => l.timestamp <= filters.endDate!);
  }

  return results;
}

// ============================================================================
// Exports
// ============================================================================

export { rbac };
