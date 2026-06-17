import { Router, Response } from 'express';
import { z } from 'zod';
import { trackingService } from '../services';
import { validate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const createTrackingEventSchema = z.object({
  status: z.enum([
    'label_created', 'picked_up', 'in_transit', 'out_for_delivery',
    'delivered', 'returned', 'failed', 'cancelled'
  ]),
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
  description: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  rawData: z.record(z.any()).optional()
});

const bulkUpdateSchema = z.object({
  events: z.array(z.object({
    trackingNumber: z.string(),
    status: z.enum([
      'label_created', 'picked_up', 'in_transit', 'out_for_delivery',
      'delivered', 'returned', 'failed', 'cancelled'
    ]),
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
    }),
    timestamp: z.string().datetime(),
    description: z.string()
  }))
});

/**
 * GET /api/tracking/:shipmentId
 * Get tracking timeline for a shipment
 */
router.get('/:shipmentId', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const timeline = await trackingService.getTrackingTimeline(
    req.params.shipmentId,
    tenantId
  );
  res.json({
    success: true,
    data: timeline
  });
});

/**
 * GET /api/tracking/:shipmentId/location
 * Get current location of a shipment
 */
router.get('/:shipmentId/location', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const location = await trackingService.getCurrentLocation(
    req.params.shipmentId,
    tenantId
  );
  res.json({
    success: true,
    data: location
  });
});

/**
 * POST /api/tracking/:shipmentId/events
 * Create a tracking event
 */
router.post('/:shipmentId/events', validate(createTrackingEventSchema), async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const event = await trackingService.createTrackingEvent(
    req.params.shipmentId,
    tenantId,
    {
      status: req.body.status,
      location: req.body.location || {},
      description: req.body.description || `Status: ${req.body.status}`,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : undefined,
      rawData: req.body.rawData
    }
  );
  res.status(201).json({
    success: true,
    data: event
  });
});

/**
 * POST /api/tracking/bulk
 * Bulk update tracking events (from carrier webhooks)
 */
router.post('/bulk', validate(bulkUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
  const results = await trackingService.bulkUpdateTracking(req.body.events);
  res.json({
    success: true,
    data: results
  });
});

/**
 * POST /api/tracking/subscribe/:shipmentId
 * Subscribe to shipment updates (webhook simulation)
 */
router.post('/subscribe/:shipmentId', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;

  // In production, this would register a webhook callback
  // For now, just return success
  const unsubscribe = await trackingService.subscribeToUpdates(
    req.params.shipmentId,
    tenantId,
    (event) => {
      // Handle event - in production, emit to registered callbacks
      console.log('Tracking event:', event);
    }
  );

  res.json({
    success: true,
    data: {
      subscriptionId: `sub_${Date.now()}`,
      shipmentId: req.params.shipmentId,
      message: 'Subscribed to tracking updates'
    }
  });
});

/**
 * GET /api/tracking/generate/:carrierCode
 * Generate a tracking number
 */
router.get('/generate/:carrierCode', async (req: AuthenticatedRequest, res: Response) => {
  const trackingNumber = trackingService.generateTrackingNumber(
    req.params.carrierCode
  );
  res.json({
    success: true,
    data: { trackingNumber }
  });
});

export default router;
