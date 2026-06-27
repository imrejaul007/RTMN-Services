import { describe, it, expect, beforeEach } from 'vitest';

const DEFAULT_PERMISSIONS = {
  'workflow:read': { name: 'Read Workflows' },
  'workflow:write': { name: 'Write Workflows' },
  'workflow:execute': { name: 'Execute Workflows' },
  'workflow:admin': { name: 'Workflow Admin' },
};

const DEFAULT_ROLES = {
  admin: { key: 'admin', name: 'Administrator', permissions: Object.keys(DEFAULT_PERMISSIONS) },
  editor: { key: 'editor', name: 'Editor', permissions: ['workflow:read', 'workflow:write'] },
  viewer: { key: 'viewer', name: 'Viewer', permissions: ['workflow:read'] },
};

const createService = () => {
  const users = new Map();
  const roles = new Map();
  const auditLogs = [];

  // Init defaults
  for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
    roles.set(key, { ...role });
  }

  const createUser = (data) => {
    const user = {
      id: crypto.randomUUID(),
      username: data.username,
      email: data.email,
      roles: data.roles || [],
      status: 'active',
      createdAt: Date.now(),
      lastLoginAt: null,
    };
    users.set(user.id, user);
    return user;
  };

  const getUser = (id) => users.get(id) || null;

  const assignRole = (userId, roleKey) => {
    const user = users.get(userId);
    if (!user) throw new Error('User not found');
    if (!roles.has(roleKey)) throw new Error('Role not found');
    if (!user.roles.includes(roleKey)) {
      user.roles.push(roleKey);
    }
    return user;
  };

  const checkPermission = (userId, permission) => {
    const user = users.get(userId);
    if (!user || user.status !== 'active') return false;
    for (const roleKey of user.roles) {
      const role = roles.get(roleKey);
      if (role && role.permissions.includes(permission)) return true;
    }
    return false;
  };

  const logAudit = (userId, action, resource, details = {}) => {
    const log = {
      id: crypto.randomUUID(),
      userId, action, resource,
      details,
      timestamp: Date.now(),
    };
    auditLogs.push(log);
    return log;
  };

  const queryAuditLogs = (options = {}) => {
    let results = [...auditLogs];
    if (options.userId) results = results.filter(l => l.userId === options.userId);
    if (options.action) results = results.filter(l => l.action === options.action);
    if (options.limit) results = results.slice(-options.limit);
    return results.sort((a, b) => b.timestamp - a.timestamp);
  };

  const runComplianceCheck = () => {
    const checks = [];
    let passed = 0;
    checks.push({ check: 'Audit Logging', status: auditLogs.length > 0 ? 'pass' : 'fail' });
    if (auditLogs.length > 0) passed++;
    checks.push({ check: 'User Management', status: users.size > 0 ? 'pass' : 'fail' });
    if (users.size > 0) passed++;
    const activeUsers = Array.from(users.values()).filter(u => u.status === 'active');
    const usersWithRoles = activeUsers.filter(u => u.roles.length > 0);
    checks.push({ check: 'Role Assignment', status: usersWithRoles.length === activeUsers.length ? 'pass' : 'warning' });
    return { passed, failed: checks.length - passed, checks };
  };

  const createRole = (key, data) => {
    const role = { key, ...data };
    roles.set(key, role);
    return role;
  };

  return { users, roles, auditLogs, createUser, getUser, assignRole, checkPermission, logAudit, queryAuditLogs, runComplianceCheck, createRole };
};

import crypto from 'crypto';

describe('FlowSecurity', () => {
  let service;

  beforeEach(() => { service = createService(); });

  describe('users', () => {
    it('should create user', () => {
      const user = service.createUser({ username: 'john', email: 'john@test.com' });
      expect(user).toBeDefined();
      expect(user.username).toBe('john');
      expect(user.roles).toEqual([]);
    });

    it('should create user with roles', () => {
      const user = service.createUser({ username: 'admin', email: 'admin@test.com', roles: ['admin'] });
      expect(user.roles).toContain('admin');
    });

    it('should get user by id', () => {
      const created = service.createUser({ username: 'test' });
      const retrieved = service.getUser(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent user', () => {
      expect(service.getUser('non-existent')).toBeNull();
    });
  });

  describe('RBAC', () => {
    it('should assign role to user', () => {
      const user = service.createUser({ username: 'test' });
      const updated = service.assignRole(user.id, 'editor');
      expect(updated.roles).toContain('editor');
    });

    it('should check permission granted by role', () => {
      const user = service.createUser({ username: 'test', roles: ['viewer'] });
      expect(service.checkPermission(user.id, 'workflow:read')).toBe(true);
    });

    it('should deny permission not in role', () => {
      const user = service.createUser({ username: 'test', roles: ['viewer'] });
      expect(service.checkPermission(user.id, 'workflow:write')).toBe(false);
    });

    it('should deny permission for inactive user', () => {
      const user = service.createUser({ username: 'test', roles: ['admin'] });
      user.status = 'inactive';
      expect(service.checkPermission(user.id, 'workflow:read')).toBe(false);
    });

    it('should check multiple roles', () => {
      const user = service.createUser({ username: 'test', roles: ['viewer', 'editor'] });
      expect(service.checkPermission(user.id, 'workflow:read')).toBe(true);
      expect(service.checkPermission(user.id, 'workflow:write')).toBe(true);
    });

    it('should not assign duplicate role', () => {
      const user = service.createUser({ username: 'test' });
      service.assignRole(user.id, 'editor');
      service.assignRole(user.id, 'editor');
      expect(user.roles.filter(r => r === 'editor').length).toBe(1);
    });

    it('should throw for non-existent role', () => {
      const user = service.createUser({ username: 'test' });
      expect(() => service.assignRole(user.id, 'non-existent')).toThrow('Role not found');
    });

    it('should give admin all permissions', () => {
      const user = service.createUser({ username: 'admin', roles: ['admin'] });
      expect(service.checkPermission(user.id, 'workflow:admin')).toBe(true);
    });
  });

  describe('audit logging', () => {
    it('should log audit event', () => {
      const user = service.createUser({ username: 'test' });
      const log = service.logAudit(user.id, 'login', 'auth', { ip: '127.0.0.1' });
      expect(log).toBeDefined();
      expect(log.action).toBe('login');
      expect(log.resource).toBe('auth');
    });

    it('should query logs by user', () => {
      const user1 = service.createUser({ username: 'user1' });
      const user2 = service.createUser({ username: 'user2' });
      service.logAudit(user1.id, 'login', 'auth');
      service.logAudit(user1.id, 'logout', 'auth');
      service.logAudit(user2.id, 'login', 'auth');
      const logs = service.queryAuditLogs({ userId: user1.id });
      expect(logs.length).toBe(2);
    });

    it('should query logs by action', () => {
      const user = service.createUser({ username: 'test' });
      service.logAudit(user.id, 'login', 'auth');
      service.logAudit(user.id, 'logout', 'auth');
      service.logAudit(user.id, 'read', 'workflow');
      const logs = service.queryAuditLogs({ action: 'login' });
      expect(logs.every(l => l.action === 'login')).toBe(true);
    });

    it('should limit log results', () => {
      const user = service.createUser({ username: 'test' });
      for (let i = 0; i < 10; i++) {
        service.logAudit(user.id, 'action', 'resource');
      }
      const logs = service.queryAuditLogs({ limit: 5 });
      expect(logs.length).toBe(5);
    });
  });

  describe('compliance', () => {
    it('should run compliance check', () => {
      const user = service.createUser({ username: 'test', roles: ['admin'] });
      service.logAudit(user.id, 'login', 'auth');
      const result = service.runComplianceCheck();
      expect(result.passed).toBeGreaterThan(0);
    });

    it('should fail audit logging check when no logs', () => {
      const result = service.runComplianceCheck();
      const auditCheck = result.checks.find(c => c.check === 'Audit Logging');
      expect(auditCheck.status).toBe('fail');
    });

    it('should pass audit logging when logs exist', () => {
      const user = service.createUser({ username: 'test' });
      service.logAudit(user.id, 'login', 'auth');
      const result = service.runComplianceCheck();
      const auditCheck = result.checks.find(c => c.check === 'Audit Logging');
      expect(auditCheck.status).toBe('pass');
    });

    it('should warn for users without roles', () => {
      const user = service.createUser({ username: 'norole' });
      const result = service.runComplianceCheck();
      const roleCheck = result.checks.find(c => c.check === 'Role Assignment');
      expect(roleCheck.status).toBe('warning');
    });
  });

  describe('role management', () => {
    it('should create custom role', () => {
      const role = service.createRole('custom', { name: 'Custom Role', permissions: ['workflow:read'] });
      expect(role.key).toBe('custom');
      expect(role.permissions).toContain('workflow:read');
    });

    it('should add permission to custom role', () => {
      const role = service.createRole('custom', { name: 'Custom', permissions: ['workflow:read'] });
      role.permissions.push('workflow:write');
      expect(role.permissions).toContain('workflow:write');
    });
  });

  describe('integration', () => {
    it('should handle complete auth flow', () => {
      // Create user
      const user = service.createUser({ username: 'john', email: 'john@test.com' });

      // Assign role
      service.assignRole(user.id, 'editor');
      expect(service.checkPermission(user.id, 'workflow:write')).toBe(true);

      // Perform action and audit
      service.logAudit(user.id, 'create', 'workflow', { workflowId: 'wf-123' });
      service.logAudit(user.id, 'execute', 'workflow', { workflowId: 'wf-123' });

      // Query audit
      const logs = service.queryAuditLogs({ userId: user.id });
      expect(logs.length).toBe(2);

      // Check compliance
      const compliance = service.runComplianceCheck();
      expect(compliance.passed).toBeGreaterThan(0);
    });
  });
});