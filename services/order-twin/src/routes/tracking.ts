import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Tracking } from '../models/Tracking';
import { Order } from '../models/Order';
import { logger } from '../index';

const router = Router();

// Validation schemas
const CreateTrackingSchema = z.object({
  tenantId: z.string().min(1),
  orderId: z.string().min(1),
  carrier: z.string().min(1),
  trackingNumber: z.string().min(1),
  estimatedDelivery: z.string().datetime().optional(),
});

const AddEventSchema = z.object({
  status: z.enum(['label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'attempted_delivery', 'exception', 'returned']),
  description: z.string().min(1),
  location: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  rawData: z.record(z.unknown()).optional(),
});

const SyncTrackingSchema = z.object({
  carrier: z.string().min(1),
  trackingData: z.record(z.unknown()),
});

// Middleware to extract tenant
function extractTenant(req: Request, res: Response, next: Function) {
  const tenantId = req.headers['x-tenant-id'] as string || req.body?.tenantId || 'default';
  (req as any).tenantId = tenantId;
  next();
}

// GET /api/tracking - List all tracking records
router.get('/', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const {
      orderId,
      carrier,
      status,
      page = '1',
      limit = '20',
    } = req.query;

    const query: Record<string, any> = { tenantId, isActive: true };

    if (orderId) query.orderId = orderId;
    if (carrier) query.carrier = carrier;
    if (status) query.currentStatus = status;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const [trackingRecords, total] = await Promise.all([
      Tracking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Tracking.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: trackingRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching tracking records:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking records' });
  }
});

// GET /api/tracking/:trackingId - Get single tracking record
router.get('/:trackingId', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { trackingId } = req.params;

    const tracking = await Tracking.findOne({ trackingId, tenantId }).lean();

    if (!tracking) {
      return res.status(404).json({ success: false, error: 'Tracking record not found' });
    }

    res.json({ success: true, data: tracking });
  } catch (error) {
    logger.error('Error fetching tracking record:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking record' });
  }
});

// GET /api/tracking/by-order/:orderId - Get tracking for order
router.get('/by-order/:orderId', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { orderId } = req.params;

    const tracking = await Tracking.findOne({ orderId, tenantId, isActive: true }).lean();

    if (!tracking) {
      return res.status(404).json({ success: false, error: 'Tracking record not found for this order' });
    }

    res.json({ success: true, data: tracking });
  } catch (error) {
    logger.error('Error fetching tracking for order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking' });
  }
});

// GET /api/tracking/by-number/:carrier/:trackingNumber - Get by tracking number
router.get('/by-number/:carrier/:trackingNumber', async (req: Request, res: Response) => {
  try {
    const { carrier, trackingNumber } = req.params;

    const tracking = await Tracking.findByTrackingNumber(carrier, trackingNumber);

    if (!tracking) {
      return res.status(404).json({ success: false, error: 'Tracking record not found' });
    }

    res.json({ success: true, data: tracking });
  } catch (error) {
    logger.error('Error fetching tracking by number:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking' });
  }
});

// POST /api/tracking - Create tracking record
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = CreateTrackingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // Verify order exists
    const order = await Order.findOne({ orderId: data.orderId, tenantId: data.tenantId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Check if tracking already exists
    const existingTracking = await Tracking.findOne({
      orderId: data.orderId,
      carrier: data.carrier,
      trackingNumber: data.trackingNumber,
      isActive: true,
    });

    if (existingTracking) {
      return res.status(409).json({
        success: false,
        error: 'Tracking record already exists for this order',
        data: existingTracking,
      });
    }

    const trackingId = `TRK-${uuidv4().substring(0, 8).toUpperCase()}`;

    const tracking = new Tracking({
      trackingId,
      orderId: data.orderId,
      tenantId: data.tenantId,
      carrier: data.carrier,
      trackingNumber: data.trackingNumber,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
      currentStatus: 'label_created',
      events: [
        {
          status: 'label_created',
          timestamp: new Date(),
          description: 'Shipping label created',
        },
      ],
    });

    await tracking.save();

    // Update order with tracking info
    order.shipping.trackingNumber = data.trackingNumber;
    order.shipping.carrier = data.carrier;
    order.shipping.estimatedDelivery = tracking.estimatedDelivery;
    order.timeline.push({
      status: 'shipped',
      timestamp: new Date(),
      note: `Tracking: ${data.trackingNumber} via ${data.carrier}`,
    });

    if (!['pending', 'confirmed'].includes(order.status)) {
      order.status = 'shipped';
    }

    await order.save();

    logger.info(`Tracking created: ${trackingId} for order ${data.orderId}`);
    res.status(201).json({ success: true, data: tracking });
  } catch (error) {
    logger.error('Error creating tracking record:', error);
    res.status(500).json({ success: false, error: 'Failed to create tracking record' });
  }
});

// POST /api/tracking/:trackingId/events - Add tracking event
router.post('/:trackingId/events', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { trackingId } = req.params;

    const validation = AddEventSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const tracking = await Tracking.findOne({ trackingId, tenantId });

    if (!tracking) {
      return res.status(404).json({ success: false, error: 'Tracking record not found' });
    }

    const { status, description, location, timestamp, rawData } = validation.data;

    // Add event to tracking
    tracking.events.push({
      status,
      description,
      location,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      rawData,
    });
    tracking.currentStatus = status;

    // Update actual delivery if delivered
    if (status === 'delivered') {
      tracking.actualDelivery = new Date();
    }

    await tracking.save();

    // Update related order status and timeline
    const order = await Order.findOne({ orderId: tracking.orderId, tenantId });
    if (order) {
      order.timeline.push({
        status,
        timestamp: new Date(),
        note: description,
        location,
      });

      if (status === 'delivered' && order.status !== 'delivered') {
        order.status = 'delivered';
        order.shipping.actualDelivery = new Date();
        order.paymentStatus = 'paid';
      }

      if (status === 'returned') {
        order.status = 'returned';
      }

      await order.save();
    }

    logger.info(`Tracking event added: ${trackingId} - ${status}`);
    res.json({ success: true, data: tracking });
  } catch (error) {
    logger.error('Error adding tracking event:', error);
    res.status(500).json({ success: false, error: 'Failed to add tracking event' });
  }
});

// POST /api/tracking/:trackingId/sync - Sync with carrier API
router.post('/:trackingId/sync', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { trackingId } = req.params;

    const tracking = await Tracking.findOne({ trackingId, tenantId });

    if (!tracking) {
      return res.status(404).json({ success: false, error: 'Tracking record not found' });
    }

    // In production, this would call carrier APIs (UPS, FedEx, USPS, etc.)
    // For now, we just update the last sync timestamp
    tracking.lastSyncedAt = new Date();
    await tracking.save();

    logger.info(`Tracking synced: ${trackingId}`);
    res.json({
      success: true,
      data: tracking,
      message: 'Tracking synced with carrier (mock implementation)',
    });
  } catch (error) {
    logger.error('Error syncing tracking:', error);
    res.status(500).json({ success: false, error: 'Failed to sync tracking' });
  }
});

// PATCH /api/tracking/:trackingId - Update tracking
router.patch('/:trackingId', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { trackingId } = req.params;
    const { carrier, trackingNumber, estimatedDelivery, isActive } = req.body;

    const tracking = await Tracking.findOne({ trackingId, tenantId });

    if (!tracking) {
      return res.status(404).json({ success: false, error: 'Tracking record not found' });
    }

    if (carrier) tracking.carrier = carrier;
    if (trackingNumber) tracking.trackingNumber = trackingNumber;
    if (estimatedDelivery) tracking.estimatedDelivery = new Date(estimatedDelivery);
    if (isActive !== undefined) tracking.isActive = isActive;

    await tracking.save();

    logger.info(`Tracking updated: ${trackingId}`);
    res.json({ success: true, data: tracking });
  } catch (error) {
    logger.error('Error updating tracking:', error);
    res.status(500).json({ success: false, error: 'Failed to update tracking' });
  }
});

// DELETE /api/tracking/:trackingId - Deactivate tracking
router.delete('/:trackingId', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { trackingId } = req.params;

    const tracking = await Tracking.findOne({ trackingId, tenantId });

    if (!tracking) {
      return res.status(404).json({ success: false, error: 'Tracking record not found' });
    }

    tracking.isActive = false;
    await tracking.save();

    logger.info(`Tracking deactivated: ${trackingId}`);
    res.json({ success: true, message: 'Tracking record deactivated' });
  } catch (error) {
    logger.error('Error deactivating tracking:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate tracking' });
  }
});

export default router;
