import { Router, Response } from 'express';
import { z } from 'zod';
import { carrierService } from '../services';
import { validate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const createCarrierSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1),
  description: z.string().optional(),
  trackingUrl: z.string().url(),
  apiKey: z.string().optional(),
  active: z.boolean().default(true),
  services: z.array(z.object({
    name: z.string(),
    code: z.string(),
    estimatedDays: z.number().optional(),
    pricePerKg: z.number().optional()
  })).optional()
});

const updateCarrierSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  active: z.boolean().optional(),
  services: z.array(z.object({
    name: z.string(),
    code: z.string(),
    estimatedDays: z.number().optional(),
    pricePerKg: z.number().optional()
  })).optional()
});

const listQuerySchema = z.object({
  active: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  skip: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional()
});

/**
 * GET /api/carriers
 * List all carriers
 */
router.get('/', validate(listQuerySchema), async (req: AuthenticatedRequest, res: Response) => {
  const { active, skip, limit } = req.query as any;
  const result = await carrierService.listCarriers({
    active: active !== undefined ? active === true : undefined,
    skip: skip ? Number(skip) : undefined,
    limit: limit ? Number(limit) : undefined
  });

  res.json({
    success: true,
    data: result.carriers,
    pagination: {
      total: result.total,
      skip: skip ? Number(skip) : 0,
      limit: limit ? Number(limit) : 50
    }
  });
});

/**
 * GET /api/carriers/active
 * List active carriers
 */
router.get('/active', async (req: AuthenticatedRequest, res: Response) => {
  const carriers = await carrierService.getActiveCarriers();
  res.json({
    success: true,
    data: carriers
  });
});

/**
 * POST /api/carriers
 * Create a new carrier
 */
router.post('/', validate(createCarrierSchema), async (req: AuthenticatedRequest, res: Response) => {
  const carrier = await carrierService.createCarrier(req.body);
  res.status(201).json({
    success: true,
    data: carrier
  });
});

/**
 * GET /api/carriers/:code
 * Get carrier by code
 */
router.get('/:code', async (req: AuthenticatedRequest, res: Response) => {
  const carrier = await carrierService.getCarrier(req.params.code);
  res.json({
    success: true,
    data: carrier
  });
});

/**
 * PATCH /api/carriers/:code
 * Update carrier
 */
router.patch('/:code', validate(updateCarrierSchema), async (req: AuthenticatedRequest, res: Response) => {
  const carrier = await carrierService.updateCarrier(req.params.code, req.body);
  res.json({
    success: true,
    data: carrier
  });
});

/**
 * DELETE /api/carriers/:code
 * Deactivate carrier
 */
router.delete('/:code', async (req: AuthenticatedRequest, res: Response) => {
  const carrier = await carrierService.deactivateCarrier(req.params.code);
  res.json({
    success: true,
    data: carrier,
    message: 'Carrier deactivated'
  });
});

/**
 * GET /api/carriers/:code/track/:trackingNumber
 * Get tracking URL for a shipment
 */
router.get('/:code/track/:trackingNumber', async (req: AuthenticatedRequest, res: Response) => {
  const url = await carrierService.getTrackingUrl(
    req.params.code,
    req.params.trackingNumber
  );
  res.json({
    success: true,
    data: { trackingUrl: url }
  });
});

/**
 * POST /api/carriers/seed
 * Seed default carriers
 */
router.post('/seed', async (req: AuthenticatedRequest, res: Response) => {
  await carrierService.seedDefaults();
  res.json({
    success: true,
    message: 'Default carriers seeded'
  });
});

export default router;
