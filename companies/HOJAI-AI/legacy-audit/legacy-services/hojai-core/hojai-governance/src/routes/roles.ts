/**
 * Roles Routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  ROLE_DEFINITIONS,
  createResponse,
  createErrorResponse,
  tenantMiddleware,
  logAudit
} from '../index.js';

const router = Router();

interface UserRole {
  userId: string;
  roleId: string;
  tenantId: string;
  assignedAt: string;
  assignedBy?: string;
}

const userRoles: UserRole[] = [];

/**
 * GET /api/roles
 * List all role definitions
 */
router.get('/', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  res.json(createResponse({ roles: ROLE_DEFINITIONS }, ctx.tenant_id));
});

/**
 * GET /api/roles/:id
 * Get role by ID
 */
router.get('/:id', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const role = ROLE_DEFINITIONS.find(r => r.id === id);
  if (!role) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Role ${id} not found`));
  }

  // Get users with this role
  const users = userRoles
    .filter(ur => ur.roleId === id && ur.tenantId === ctx.tenant_id)
    .map(ur => ur.userId);

  res.json(createResponse({ role: { ...role, userCount: users.length } }, ctx.tenant_id));
});

/**
 * GET /api/roles/user/:userId
 * Get roles for a user
 */
router.get('/user/:userId', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId } = req.params;

  const roles = userRoles
    .filter(ur => ur.userId === userId && ur.tenantId === ctx.tenant_id)
    .map(ur => {
      const roleDef = ROLE_DEFINITIONS.find(r => r.id === ur.roleId);
      return { ...ur, role: roleDef };
    });

  res.json(createResponse({ roles }, ctx.tenant_id));
});

/**
 * POST /api/roles/assign
 * Assign a role to a user
 */
router.post('/assign', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId, roleId } = req.body;

  if (!userId || !roleId) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'userId and roleId required'));
  }

  const role = ROLE_DEFINITIONS.find(r => r.id === roleId);
  if (!role) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Role ${roleId} not found`));
  }

  // Check if already assigned
  const existing = userRoles.find(
    ur => ur.userId === userId && ur.roleId === roleId && ur.tenantId === ctx.tenant_id
  );

  if (existing) {
    return res.status(400).json(createErrorResponse('ALREADY_ASSIGNED', 'User already has this role'));
  }

  const assignment: UserRole = {
    userId,
    roleId,
    tenantId: ctx.tenant_id,
    assignedAt: new Date().toISOString(),
    assignedBy: ctx.user_id
  };

  userRoles.push(assignment);

  logAudit({
    tenantId: ctx.tenant_id,
    userId: ctx.user_id,
    action: 'role.assigned',
    resource: 'user_roles',
    resourceId: assignment.userId,
    details: { roleId }
  });

  res.status(201).json(createResponse({ assignment }, ctx.tenant_id));
});

/**
 * DELETE /api/roles/revoke
 * Revoke a role from a user
 */
router.delete('/revoke', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId, roleId } = req.body;

  if (!userId || !roleId) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'userId and roleId required'));
  }

  const index = userRoles.findIndex(
    ur => ur.userId === userId && ur.roleId === roleId && ur.tenantId === ctx.tenant_id
  );

  if (index === -1) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', 'Role assignment not found'));
  }

  userRoles.splice(index, 1);

  logAudit({
    tenantId: ctx.tenant_id,
    userId: ctx.user_id,
    action: 'role.revoked',
    resource: 'user_roles',
    resourceId: userId,
    details: { roleId }
  });

  res.json(createResponse({ revoked: true }));
});

/**
 * GET /api/roles/:id/users
 * Get all users with a specific role
 */
router.get('/:id/users', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const role = ROLE_DEFINITIONS.find(r => r.id === id);
  if (!role) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Role ${id} not found`));
  }

  const users = userRoles
    .filter(ur => ur.roleId === id && ur.tenantId === ctx.tenant_id);

  res.json(createResponse({ users }, ctx.tenant_id));
});

export { router as roleRoutes };
