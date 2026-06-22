import { describe, it, expect, beforeEach } from 'vitest';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('../src/utils/logger', () => ({
  logger: mockLogger,
  default: mockLogger,
}));

describe('RBACEngine', () => {
  let RBACEngine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../src/rbac/rbac-engine');
    RBACEngine = module.RBACEngine;
  });

  describe('Admin Role Permissions', () => {
    it('should have explicit permissions instead of wildcards', () => {
      const engine = new RBACEngine();
      const adminRole = engine.getRole('admin');

      expect(adminRole).toBeDefined();
      expect(adminRole.permissions).toBeInstanceOf(Array);
      expect(adminRole.permissions.length).toBeGreaterThan(1);

      // Check that no permission has resource: '*'
      for (const permission of adminRole.permissions) {
        expect(permission.resource).not.toBe('*');
        expect(permission.resource).toBeTruthy();
      }
    });

    it('should include specific resource permissions for admin', () => {
      const engine = new RBACEngine();
      const adminRole = engine.getRole('admin');

      const resources = adminRole.permissions.map((p: any) => p.resource);

      expect(resources).toContain('users');
      expect(resources).toContain('roles');
      expect(resources).toContain('policies');
      expect(resources).toContain('audit');
    });
  });

  describe('Permission Checking', () => {
    it('should deny access when user has no roles', async () => {
      const engine = new RBACEngine();
      const result = await engine.checkPermission('unknown-user', 'documents', 'read');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no assigned roles');
    });

    it('should allow access when user has matching role', async () => {
      const engine = new RBACEngine();
      engine.assignRole('user-123', 'viewer', 'admin');

      const result = await engine.checkPermission('user-123', 'documents', 'read');

      expect(result.allowed).toBe(true);
      expect(result.matchedRoles).toContain('viewer');
    });

    it('should deny access for unauthorized action', async () => {
      const engine = new RBACEngine();
      engine.assignRole('user-123', 'viewer', 'admin');

      const result = await engine.checkPermission('user-123', 'documents', 'delete');

      expect(result.allowed).toBe(false);
    });
  });

  describe('Role Assignment', () => {
    it('should assign role to user', () => {
      const engine = new RBACEngine();
      const assignment = engine.assignRole('user-123', 'editor', 'admin');

      expect(assignment).toBeDefined();
      expect(assignment.userId).toBe('user-123');
      expect(assignment.roleId).toBe('editor');
      expect(assignment.assignedBy).toBe('admin');
    });

    it('should revoke role from user', () => {
      const engine = new RBACEngine();
      engine.assignRole('user-123', 'viewer', 'admin');

      const revoked = engine.revokeRole('user-123', 'viewer');

      expect(revoked).toBe(true);
      expect(engine.getUserRoles('user-123')).toHaveLength(0);
    });

    it('should not revoke non-existent role', () => {
      const engine = new RBACEngine();

      const revoked = engine.revokeRole('user-123', 'nonexistent');

      expect(revoked).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    it('should inherit permissions from parent role', async () => {
      const engine = new RBACEngine();
      engine.assignRole('user-123', 'editor', 'admin');

      // Editor should have viewer permissions through inheritance
      const result = await engine.checkPermission('user-123', 'documents', 'read');

      expect(result.allowed).toBe(true);
    });

    it('should include inherited roles in resolved roles', () => {
      const engine = new RBACEngine();
      engine.assignRole('user-123', 'editor', 'admin');

      const roles = engine.getUserRoles('user-123');
      expect(roles).toContain('editor');
    });
  });
});

describe('ABACEngine Regex Validation', () => {
  let ABACEngine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../src/abac/abac-engine');
    ABACEngine = module.ABACEngine;
  });

  describe('isValidRegexPattern', () => {
    it('should reject patterns with multiple consecutive .*', () => {
      const engine = new ABACEngine();
      const isValid = (engine as any).isValidRegexPattern('(.*.*.*)');

      expect(isValid).toBe(false);
    });

    it('should reject patterns with nested quantifiers', () => {
      const engine = new ABACEngine();
      const isValid = (engine as any).isValidRegexPattern('(a+)+$');

      expect(isValid).toBe(false);
    });

    it('should reject excessively long patterns', () => {
      const engine = new ABACEngine();
      const longPattern = 'a'.repeat(150);
      const isValid = (engine as any).isValidRegexPattern(longPattern);

      expect(isValid).toBe(false);
    });

    it('should accept simple safe patterns', () => {
      const engine = new ABACEngine();
      const isValid = (engine as any).isValidRegexPattern('^[a-z]+$');

      expect(isValid).toBe(true);
    });

    it('should accept email-like patterns', () => {
      const engine = new ABACEngine();
      const isValid = (engine as any).isValidRegexPattern('^[\\w.-]+@[\\w.-]+\\.\\w+$');

      expect(isValid).toBe(true);
    });
  });
});

describe('Permission Audit', () => {
  let PermissionAudit: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../src/audit/permission-audit');
    PermissionAudit = module.PermissionAudit;
  });

  describe('Log Storage', () => {
    it('should have log storage mechanism', () => {
      const audit = new PermissionAudit();
      expect(audit).toBeDefined();
    });

    it('should support querying logs', async () => {
      const audit = new PermissionAudit();
      const logs = await audit.queryLogs({ limit: 100 });

      expect(logs).toBeInstanceOf(Array);
    });
  });

  describe('Log Retention', () => {
    it('should have retention policy', () => {
      const audit = new PermissionAudit();
      const policies = audit.getRetentionPolicies();

      expect(policies).toBeInstanceOf(Array);
      expect(policies.length).toBeGreaterThan(0);
    });
  });
});
