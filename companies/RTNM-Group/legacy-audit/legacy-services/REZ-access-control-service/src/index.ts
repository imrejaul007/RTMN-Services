import express, { Express, Request, Response, NextFunction } from 'express';
import { RBACEngine } from './rbac/rbac-engine';
import { ABACEngine } from './abac/abac-engine';
import { PermissionManager } from './permissions/permission-manager';
import { RoleDefinitions } from './roles/role-definitions';
import { PermissionAudit } from './audit/permission-audit';
import { PolicyEngine } from './policies/policy-engine';
import { logger } from './utils/logger';
import { internalServiceAuth, AuthenticatedRequest } from './middleware/auth';

export interface AccessContext {
  userId: string;
  resource: string;
  action: string;
  attributes?: Record<string, any>;
  environment?: Record<string, any>;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  evaluatedAt: Date;
  matchedPolicies: string[];
}

class AccessControlService {
  private app: Express;
  private rbac: RBACEngine;
  private abac: ABACEngine;
  private permissions: PermissionManager;
  private roles: RoleDefinitions;
  private audit: PermissionAudit;
  private policyEngine: PolicyEngine;

  constructor() {
    this.app = express();
    this.rbac = new RBACEngine();
    this.abac = new ABACEngine();
    this.permissions = new PermissionManager(this.rbac);
    this.roles = new RoleDefinitions();
    this.policyEngine = new PolicyEngine(this.rbac, this.abac);
    this.audit = new PermissionAudit();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // All /api/v1/* routes require internal service authentication
    this.app.use('/api/v1', internalServiceAuth);

    // Check access permission
    this.app.post('/api/v1/access/check', async (req: Request, res: Response) => {
      try {
        const context: AccessContext = req.body;
        const decision = await this.checkAccess(context);

        // Audit the access attempt
        await this.audit.logAccessAttempt(context, decision);

        res.json(decision);
      } catch (error) {
        logger.error('Access check error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get user permissions
    this.app.get('/api/v1/users/:userId/permissions', async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const permissions = await this.permissions.getUserPermissions(userId);
        res.json({ userId, permissions });
      } catch (error) {
        logger.error('Get permissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get audit logs (requires 'read' permission on audit)
    this.app.get('/api/v1/audit/logs', async (req: Request, res: Response) => {
      try {
        const { userId, resource, startDate, endDate } = req.query;
        const logs = await this.audit.queryLogs({
          userId: userId as string,
          resource: resource as string,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined
        });
        res.json({ logs });
      } catch (error) {
        logger.error('Audit query error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Role management (read-only by default)
    this.app.get('/api/v1/roles', (req: Request, res: Response) => {
      const roles = this.roles.getAllRoles();
      res.json({ roles });
    });

    this.app.get('/api/v1/roles/:roleId', (req: Request, res: Response) => {
      const role = this.roles.getRole(req.params.roleId);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      res.json({ role });
    });

    // Policy management
    this.app.get('/api/v1/policies', (req: Request, res: Response) => {
      const policies = this.policyEngine.getAllPolicies();
      res.json({ policies });
    });

    this.app.post('/api/v1/policies', async (req: Request, res: Response) => {
      try {
        const policy = req.body;
        await this.policyEngine.addPolicy(policy);
        res.status(201).json({ message: 'Policy created', policy });
      } catch (error) {
        logger.error('Create policy error:', error);
        res.status(400).json({ error: 'Invalid policy' });
      }
    });

    // Resource attributes
    this.app.get('/api/v1/resources/:resourceId/attributes', (req: Request, res: Response) => {
      const attributes = this.abac.getResourceAttributes(req.params.resourceId);
      res.json({ resourceId: req.params.resourceId, attributes });
    });

    this.app.put('/api/v1/resources/:resourceId/attributes', (req: Request, res: Response) => {
      this.abac.setResourceAttributes(req.params.resourceId, req.body);
      res.json({ message: 'Attributes updated' });
    });
  }

  async checkAccess(context: AccessContext): Promise<AccessDecision> {
    logger.info('Checking access:', context);

    // Step 1: Check RBAC permissions
    const rbacResult = await this.rbac.checkPermission(
      context.userId,
      context.resource,
      context.action
    );

    if (rbacResult.allowed) {
      return {
        allowed: true,
        reason: 'Allowed by RBAC role assignment',
        evaluatedAt: new Date(),
        matchedPolicies: rbacResult.matchedRoles
      };
    }

    // Step 2: Check ABAC policies
    const abacResult = await this.abac.evaluate(context);

    if (abacResult.allowed) {
      return {
        allowed: true,
        reason: 'Allowed by ABAC policy evaluation',
        evaluatedAt: new Date(),
        matchedPolicies: abacResult.matchedPolicies
      };
    }

    // Step 3: Check custom policies
    const policyResult = await this.policyEngine.evaluate(context);

    return {
      allowed: policyResult.allowed,
      reason: policyResult.reason,
      evaluatedAt: new Date(),
      matchedPolicies: policyResult.matchedPolicies
    };
  }

  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        logger.info(`REZ Access Control Service running on port ${port}`);
        resolve();
      });
    });
  }
}

// Export for testing and direct usage
export { AccessControlService, RBACEngine, ABACEngine, PermissionManager };

// Start server if run directly
if (require.main === module) {
  const service = new AccessControlService();
  const port = parseInt(process.env.PORT || '3000', 10);
  service.start(port).catch((err) => {
    logger.error('Failed to start service:', err);
    process.exit(1);
  });
}
