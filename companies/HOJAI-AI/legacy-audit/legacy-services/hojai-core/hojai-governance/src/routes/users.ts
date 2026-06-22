/**
 * Users Routes
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

interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

const tenantUsers: TenantUser[] = [];

/**
 * GET /api/users
 * List users in tenant
 */
router.get('/', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { role, search } = req.query;

  let users = tenantUsers.filter(u => u.tenantId === ctx.tenant_id);

  if (role) {
    users = users.filter(u => u.roles.includes(role as string));
  }

  if (search) {
    const searchLower = (search as string).toLowerCase();
    users = users.filter(u =>
      u.email.toLowerCase().includes(searchLower) ||
      u.name?.toLowerCase().includes(searchLower)
    );
  }

  res.json(createResponse({ users }, ctx.tenant_id));
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const user = tenantUsers.find(u => u.id === id && u.tenantId === ctx.tenant_id);
  if (!user) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `User ${id} not found`));
  }

  res.json(createResponse({ user }, ctx.tenant_id));
});

/**
 * POST /api/users
 * Create a user
 */
router.post('/', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { email, name, roles } = req.body;

  if (!email) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'email is required'));
  }

  // Check if already exists
  const existing = tenantUsers.find(
    u => u.email === email && u.tenantId === ctx.tenant_id
  );

  if (existing) {
    return res.status(400).json(createErrorResponse('ALREADY_EXISTS', 'User with this email already exists'));
  }

  const user: TenantUser = {
    id: uuidv4(),
    tenantId: ctx.tenant_id,
    email,
    name,
    roles: roles || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  tenantUsers.push(user);

  logAudit({
    tenantId: ctx.tenant_id,
    userId: ctx.user_id,
    action: 'user.created',
    resource: 'users',
    resourceId: user.id,
    details: { email }
  });

  res.status(201).json(createResponse({ user }, ctx.tenant_id));
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;
  const { name, roles } = req.body;

  const user = tenantUsers.find(u => u.id === id && u.tenantId === ctx.tenant_id);
  if (!user) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `User ${id} not found`));
  }

  if (name !== undefined) user.name = name;
  if (roles) user.roles = roles;
  user.updatedAt = new Date().toISOString();

  logAudit({
    tenantId: ctx.tenant_id,
    userId: ctx.user_id,
    action: 'user.updated',
    resource: 'users',
    resourceId: user.id
  });

  res.json(createResponse({ user }, ctx.tenant_id));
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const index = tenantUsers.findIndex(u => u.id === id && u.tenantId === ctx.tenant_id);
  if (index === -1) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `User ${id} not found`));
  }

  const user = tenantUsers[index];
  tenantUsers.splice(index, 1);

  logAudit({
    tenantId: ctx.tenant_id,
    userId: ctx.user_id,
    action: 'user.deleted',
    resource: 'users',
    resourceId: id,
    details: { email: user.email }
  });

  res.json(createResponse({ deleted: true }));
});

export { router as userRoutes };
