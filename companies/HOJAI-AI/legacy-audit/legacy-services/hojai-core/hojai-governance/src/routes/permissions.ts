/**
 * Permissions Routes
 */

import { Router, Request, Response } from 'express';
import {
  PERMISSION_DEFINITIONS,
  createResponse,
  createErrorResponse,
  tenantMiddleware
} from '../index.js';

const router = Router();

/**
 * GET /api/permissions
 * List all permission definitions
 */
router.get('/', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { category } = req.query;

  let permissions = PERMISSION_DEFINITIONS;

  if (category) {
    permissions = permissions.filter(p => p.category === category);
  }

  res.json(createResponse({ permissions }, ctx.tenant_id));
});

/**
 * GET /api/permissions/categories
 * Get all permission categories
 */
router.get('/categories', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;

  const categories = [...new Set(PERMISSION_DEFINITIONS.map(p => p.category))];

  res.json(createResponse({ categories }, ctx.tenant_id));
});

/**
 * GET /api/permissions/:id
 * Get permission by ID
 */
router.get('/:id', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const permission = PERMISSION_DEFINITIONS.find(p => p.id === id);
  if (!permission) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Permission ${id} not found`));
  }

  res.json(createResponse({ permission }, ctx.tenant_id));
});

/**
 * GET /api/permissions/check
 * Check if a user has a specific permission
 */
router.post('/check', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId, permission } = req.body;

  if (!userId || !permission) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'userId and permission required'));
  }

  // In production, check against user roles
  // For now, return a placeholder
  res.json(createResponse({
    hasPermission: false,
    userId,
    permission
  }, ctx.tenant_id));
});

export { router as permissionRoutes };
