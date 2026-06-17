/**
 * Links Routes
 * Endpoints for cross-service link management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CrossServiceLink } from '../models/CrossServiceLink';
import { EcosystemService } from '../types';

const router = Router();

// Validation schemas
const createLinkSchema = z.object({
  tenantId: z.string().min(1),
  type: z.enum(['account', 'household', 'business', 'referral', 'transaction']),
  entities: z.array(z.object({
    service: z.enum(['hojai', 'rez-consumer', 'rez-merchant', 'rez-pos', 'stayown', 'adbazaar', 'corpid', 'rtmn-gateway']),
    entityType: z.enum(['user', 'account', 'profile', 'guest', 'customer', 'merchant', 'device', 'household']),
    entityId: z.string().min(1),
    role: z.enum(['primary', 'secondary', 'dependent']).optional(),
    metadata: z.record(z.unknown()).optional(),
  })).min(2),
  properties: z.object({
    sharedPhone: z.string().optional(),
    sharedEmail: z.string().email().optional(),
    sharedAddress: z.string().optional(),
    relationshipType: z.string().optional(),
  }).optional(),
});

const addEntitySchema = z.object({
  service: z.enum(['hojai', 'rez-consumer', 'rez-merchant', 'rez-pos', 'stayown', 'adbazaar', 'corpid', 'rtmn-gateway']),
  entityType: z.enum(['user', 'account', 'profile', 'guest', 'customer', 'merchant', 'device', 'household']),
  entityId: z.string().min(1),
  role: z.enum(['primary', 'secondary', 'dependent']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const findByEntitySchema = z.object({
  tenantId: z.string().min(1),
  service: z.enum(['hojai', 'rez-consumer', 'rez-merchant', 'rez-pos', 'stayown', 'adbazaar', 'corpid', 'rtmn-gateway']),
  entityId: z.string().min(1),
  status: z.enum(['active', 'pending', 'suspended', 'terminated']).optional(),
  type: z.enum(['account', 'household', 'business', 'referral', 'transaction']).optional(),
});

// Helper function for API responses
const sendResponse = <T>(res: Response, status: number, data?: T, error?: { code: string; message: string }) => {
  const response = {
    success: error ? false : true,
    data: error ? undefined : data,
    error: error,
  };
  res.status(status).json(response);
};

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /api/links
 * List links with optional filtering
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');
  const { type, status, service, limit = 20, offset = 0 } = req.query;

  const query: Record<string, unknown> = { tenantId };

  if (type) query.type = type;
  if (status) query.status = status;
  if (service) {
    query['entities.service'] = service;
  }

  const [links, total] = await Promise.all([
    CrossServiceLink.find(query)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    CrossServiceLink.countDocuments(query),
  ]);

  sendResponse(res, 200, links);
  res.setHeader('X-Total-Count', String(total));
}));

/**
 * POST /api/links
 * Create a new cross-service link
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validated = createLinkSchema.parse(req.body);

  const { tenantId, type, entities, properties } = validated;

  // Check if a link already exists between these entities
  const existingLink = await CrossServiceLink.findOne({
    tenantId,
    type,
    status: { $ne: 'terminated' },
    entities: {
      $all: entities.map(e => ({ $elemMatch: { service: e.service, entityId: e.entityId } })),
    },
  });

  if (existingLink) {
    return sendResponse(res, 409, existingLink, {
      code: 'LINK_EXISTS',
      message: 'A link already exists between these entities',
    });
  }

  const link = await CrossServiceLink.createLink(tenantId, type, entities, properties);

  sendResponse(res, 201, link);
}));

/**
 * GET /api/links/:linkId
 * Get a specific link by ID
 */
router.get('/:linkId', asyncHandler(async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const link = await CrossServiceLink.findOne({ linkId, tenantId });

  if (!link) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Link not found' });
  }

  sendResponse(res, 200, link);
}));

/**
 * DELETE /api/links/:linkId
 * Delete/terminate a link
 */
router.delete('/:linkId', asyncHandler(async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const link = await CrossServiceLink.findOne({ linkId, tenantId });

  if (!link) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Link not found' });
  }

  await link.terminate();

  sendResponse(res, 200, { terminated: true, linkId });
}));

/**
 * POST /api/links/:linkId/entities
 * Add an entity to an existing link
 */
router.post('/:linkId/entities', asyncHandler(async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const validated = addEntitySchema.parse(req.body);

  const link = await CrossServiceLink.findOne({ linkId, tenantId });

  if (!link) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Link not found' });
  }

  try {
    const updatedLink = await link.addEntity(
      validated.service as EcosystemService,
      validated.entityType,
      validated.entityId,
      validated.role,
      validated.metadata
    );
    sendResponse(res, 200, updatedLink);
  } catch (error: any) {
    sendResponse(res, 400, undefined, { code: 'ADD_ENTITY_FAILED', message: error.message });
  }
}));

/**
 * DELETE /api/links/:linkId/entities
 * Remove an entity from a link
 */
router.delete('/:linkId/entities', asyncHandler(async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');
  const { service, entityId } = req.body;

  if (!service || !entityId) {
    return sendResponse(res, 400, undefined, { code: 'VALIDATION_ERROR', message: 'service and entityId are required' });
  }

  const link = await CrossServiceLink.findOne({ linkId, tenantId });

  if (!link) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Link not found' });
  }

  try {
    const updatedLink = await link.removeEntity(service as EcosystemService, entityId);
    sendResponse(res, 200, updatedLink);
  } catch (error: any) {
    sendResponse(res, 400, undefined, { code: 'REMOVE_ENTITY_FAILED', message: error.message });
  }
}));

/**
 * POST /api/links/:linkId/verify
 * Verify a pending link
 */
router.post('/:linkId/verify', asyncHandler(async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');
  const { verifiedBy } = req.body;

  const link = await CrossServiceLink.findOne({ linkId, tenantId });

  if (!link) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Link not found' });
  }

  await link.verify(verifiedBy || 'system');

  sendResponse(res, 200, link);
}));

/**
 * POST /api/links/:linkId/suspend
 * Suspend a link
 */
router.post('/:linkId/suspend', asyncHandler(async (req: Request, res: Response) => {
  const { linkId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');
  const { reason } = req.body;

  const link = await CrossServiceLink.findOne({ linkId, tenantId });

  if (!link) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Link not found' });
  }

  await link.suspend(reason);

  sendResponse(res, 200, link);
}));

/**
 * POST /api/links/by-entity
 * Find links by entity
 */
router.post('/by-entity', asyncHandler(async (req: Request, res: Response) => {
  const validated = findByEntitySchema.parse(req.body);

  const { tenantId, service, entityId, status, type } = validated;

  const links = await CrossServiceLink.findByEntity(tenantId, service, entityId, { status, type });

  sendResponse(res, 200, links);
}));

/**
 * POST /api/links/household
 * Find or create household link
 */
router.post('/household', asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, phone, entities } = req.body;

  if (!tenantId || !phone || !entities || entities.length < 2) {
    return sendResponse(res, 400, undefined, {
      code: 'VALIDATION_ERROR',
      message: 'tenantId, phone, and at least 2 entities are required',
    });
  }

  const link = await CrossServiceLink.findOrCreateHousehold(
    tenantId,
    phone,
    entities.map((e: any) => ({
      service: e.service,
      entityType: e.entityType,
      entityId: e.entityId,
    }))
  );

  sendResponse(res, 200, link);
}));

/**
 * POST /api/links/referral-chain
 * Get referral chain for an entity
 */
router.post('/referral-chain', asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, service, entityId, maxDepth } = req.body;

  if (!tenantId || !service || !entityId) {
    return sendResponse(res, 400, undefined, {
      code: 'VALIDATION_ERROR',
      message: 'tenantId, service, and entityId are required',
    });
  }

  const chain = await CrossServiceLink.findReferralChain(
    tenantId,
    service,
    entityId,
    maxDepth || 3
  );

  sendResponse(res, 200, { chain, depth: chain.length });
}));

/**
 * GET /api/links/services
 * Get available services for linking
 */
router.get('/services', (req: Request, res: Response) => {
  sendResponse(res, 200, {
    services: [
      { id: 'hojai', name: 'HOJAI AI', types: ['user', 'account'] },
      { id: 'rez-consumer', name: 'REZ Consumer', types: ['user', 'customer', 'profile'] },
      { id: 'rez-merchant', name: 'REZ Merchant', types: ['merchant', 'account'] },
      { id: 'rez-pos', name: 'REZ POS', types: ['user', 'account', 'device'] },
      { id: 'stayown', name: 'StayOwn Hospitality', types: ['guest', 'profile', 'household'] },
      { id: 'adbazaar', name: 'AdBazaar', types: ['profile', 'user'] },
      { id: 'corpid', name: 'CorpID', types: ['user', 'account'] },
      { id: 'rtmn-gateway', name: 'RTMN Gateway', types: ['user', 'account'] },
    ],
    linkTypes: [
      { id: 'account', name: 'Account Link', description: 'Link accounts across services' },
      { id: 'household', name: 'Household', description: 'Family/household members' },
      { id: 'business', name: 'Business', description: 'Business entity relationships' },
      { id: 'referral', name: 'Referral', description: 'Referral chain' },
      { id: 'transaction', name: 'Transaction', description: 'Transaction-based link' },
    ],
  });
});

export default router;
