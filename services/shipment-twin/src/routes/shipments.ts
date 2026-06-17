import { Router, Response } from 'express';
import { z } from 'zod';
import { shipmentService } from '../services';
import { validate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const createShipmentSchema = z.object({
  tenantId: z.string().min(1),
  orderId: z.string().min(1),
  carrier: z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    trackingUrl: z.string().optional()
  }),
  origin: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }),
  destination: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  }).optional(),
  estimatedDelivery: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

const updateShipmentSchema = z.object({
  status: z.enum([
    'label_created', 'picked_up', 'in_transit', 'out_for_delivery',
    'delivered', 'returned', 'failed', 'cancelled'
  ]).optional(),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }).optional(),
  estimatedDelivery: z.string().datetime().optional(),
  actualDelivery: z.string().datetime().optional(),
  proof: z.object({
    signature: z.string().optional(),
    photo: z.string().optional(),
    otp: z.string().optional(),
    recipientName: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

const proofSchema = z.object({
  signature: z.string().optional(),
  photo: z.string().optional(),
  otp: z.string().min(4).max(6).optional(),
  recipientName: z.string().optional()
});

const listQuerySchema = z.object({
  status: z.enum([
    'label_created', 'picked_up', 'in_transit', 'out_for_delivery',
    'delivered', 'returned', 'failed', 'cancelled'
  ]).optional(),
  orderId: z.string().optional(),
  skip: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional()
});

/**
 * POST /api/shipments
 * Create a new shipment
 */
router.post('/', validate(createShipmentSchema), async (req: AuthenticatedRequest, res: Response) => {
  const shipment = await shipmentService.createShipment(req.body);
  res.status(201).json({
    success: true,
    data: shipment
  });
});

/**
 * GET /api/shipments
 * List shipments for tenant
 */
router.get('/', validate(listQuerySchema), async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { status, orderId, skip, limit } = req.query as any;

  const result = await shipmentService.listShipments(tenantId, {
    status,
    orderId,
    skip: skip ? Number(skip) : undefined,
    limit: limit ? Number(limit) : undefined
  });

  res.json({
    success: true,
    data: result.shipments,
    pagination: {
      total: result.total,
      skip: skip ? Number(skip) : 0,
      limit: limit ? Number(limit) : 50
    }
  });
});

/**
 * GET /api/shipments/stats
 * Get shipment statistics
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const stats = await shipmentService.getStats(tenantId);
  res.json({
    success: true,
    data: stats
  });
});

/**
 * GET /api/shipments/active
 * Get active shipments
 */
router.get('/active', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const shipments = await shipmentService.getActiveShipments(tenantId);
  res.json({
    success: true,
    data: shipments
  });
});

/**
 * GET /api/shipments/carrier/:code
 * Get shipments by carrier
 */
router.get('/carrier/:code', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const shipments = await shipmentService.getByCarrier(tenantId, req.params.code);
  res.json({
    success: true,
    data: shipments
  });
});

/**
 * GET /api/shipments/track/:trackingNumber
 * Track shipment by tracking number
 */
router.get('/track/:trackingNumber', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const shipment = await shipmentService.trackByTrackingNumber(
    req.params.trackingNumber,
    tenantId
  );
  if (!shipment) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Shipment not found' }
    });
    return;
  }
  res.json({
    success: true,
    data: shipment
  });
});

/**
 * GET /api/shipments/:shipmentId
 * Get shipment by ID
 */
router.get('/:shipmentId', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const shipment = await shipmentService.getShipment(req.params.shipmentId, tenantId);
  res.json({
    success: true,
    data: shipment
  });
});

/**
 * PATCH /api/shipments/:shipmentId
 * Update shipment
 */
router.patch('/:shipmentId', validate(updateShipmentSchema), async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const shipment = await shipmentService.updateShipment(
    req.params.shipmentId,
    tenantId,
    req.body
  );
  res.json({
    success: true,
    data: shipment
  });
});

/**
 * POST /api/shipments/:shipmentId/cancel
 * Cancel shipment
 */
router.post('/:shipmentId/cancel', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const shipment = await shipmentService.cancelShipment(req.params.shipmentId, tenantId);
  res.json({
    success: true,
    data: shipment
  });
});

/**
 * POST /api/shipments/:shipmentId/proof
 * Add proof of delivery
 */
router.post('/:shipmentId/proof', validate(proofSchema), async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const shipment = await shipmentService.addProofOfDelivery(
    req.params.shipmentId,
    tenantId,
    req.body
  );
  res.json({
    success: true,
    data: shipment
  });
});

export default router;
