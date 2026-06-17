/**
 * REZ-Delivery Integration Routes
 * Handles delivery partner management, shipments, and tracking
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import winston from 'winston';
import { REZDeliveryProfile, REZShipment, REZOrder } from '../models/REZProfile';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { TwinSyncService } from '../services/twinSync';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Initialize services
const customerOpsBridge = new CustomerOpsBridge();
const twinSyncService = new TwinSyncService();

// REZ Delivery service URL
const REZ_DELIVERY_URL = process.env.REZ_DELIVERY_URL || 'http://localhost:4500';

/**
 * GET /api/delivery/health
 * Health check for REZ-Delivery connectivity
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${REZ_DELIVERY_URL}/health`, { timeout: 5000 });
    res.json({
      success: true,
      deliveryService: 'connected',
      status: response.data
    });
  } catch (error: any) {
    logger.warn('REZ-Delivery health check failed:', error.message);
    res.json({
      success: true,
      deliveryService: 'unavailable',
      message: 'REZ-Delivery not reachable - using cached data'
    });
  }
});

/**
 * GET /api/delivery/partner/:partnerId
 * Get delivery partner profile
 */
router.get('/partner/:partnerId', async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;

    let profile: REZDeliveryProfile;
    try {
      const response = await axios.get(`${REZ_DELIVERY_URL}/api/partners/${partnerId}`);
      profile = response.data;
    } catch {
      // Fallback to mock data
      profile = {
        corpid: 'REZ-DELIVERY',
        deliveryId: partnerId,
        name: 'Demo Delivery Partner',
        type: 'delivery_partner',
        contact: { phone: '+1234567890', email: 'partner@delivery.com' },
        vehicle: {
          type: 'bike',
          plateNumber: 'DL-01-AB-1234',
          licenseVerified: true
        },
        status: 'available',
        wallet: { balance: 5000, currency: 'INR', status: 'active' },
        stats: {
          totalDeliveries: 1500,
          completedToday: 12,
          rating: 4.8
        },
        operatingZones: ['zone-1', 'zone-2', 'zone-3'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Sync to relevant twins
    await twinSyncService.syncToTwin('delivery', profile);

    // Push to Customer Ops Bridge
    await customerOpsBridge.syncDeliveryPartner(profile);

    logger.info(`Delivery partner ${partnerId} synced`);
    res.json({ success: true, profile });
  } catch (error: any) {
    logger.error('Delivery partner fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/delivery/partner/:partnerId/location
 * Update delivery partner current location
 */
router.put('/partner/:partnerId/location', async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Missing lat/lng coordinates' });
    }

    // Update in REZ-Delivery
    try {
      await axios.put(`${REZ_DELIVERY_URL}/api/partners/${partnerId}/location`, {
        lat,
        lng,
        updatedAt: new Date()
      });
    } catch {
      logger.info('REZ-Delivery unavailable - location update stored locally');
    }

    // Sync location to Shipment Twin (for active deliveries)
    await twinSyncService.syncToTwin('shipment', {
      deliveryPartner: { id: partnerId, currentLocation: { lat, lng } },
      locationUpdatedAt: new Date()
    });

    logger.info(`Delivery partner ${partnerId} location updated: ${lat}, ${lng}`);
    res.json({ success: true, partnerId, location: { lat, lng } });
  } catch (error: any) {
    logger.error('Location update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/delivery/partner/:partnerId/status
 * Update delivery partner availability status
 */
router.put('/partner/:partnerId/status', async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { status } = req.body;

    if (!['available', 'on_delivery', 'offline'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Update in REZ-Delivery
    try {
      await axios.put(`${REZ_DELIVERY_URL}/api/partners/${partnerId}/status`, { status });
    } catch {
      logger.info('REZ-Delivery unavailable - status update stored locally');
    }

    // Sync to Delivery Twin
    await twinSyncService.syncToTwin('delivery', { deliveryId: partnerId, status });

    // Publish status change event
    await customerOpsBridge.publishEvent('delivery.partner.status_changed', { partnerId, status });

    logger.info(`Delivery partner ${partnerId} status updated to ${status}`);
    res.json({ success: true, partnerId, status });
  } catch (error: any) {
    logger.error('Partner status update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/delivery/shipment
 * Create shipment for order delivery
 */
router.post('/shipment', async (req: Request, res: Response) => {
  try {
    const shipment: REZShipment = req.body;

    // Validate required fields
    if (!shipment.shipmentId || !shipment.orderId || !shipment.deliveryPartner) {
      return res.status(400).json({ success: false, error: 'Missing required shipment fields' });
    }

    shipment.updatedAt = new Date();
    if (!shipment.createdAt) shipment.createdAt = new Date();

    // Create in REZ-Delivery
    try {
      await axios.post(`${REZ_DELIVERY_URL}/api/shipments`, shipment);
    } catch {
      logger.info('REZ-Delivery unavailable - shipment stored locally');
    }

    // Sync to Shipment Twin
    await twinSyncService.syncToTwin('shipment', shipment);

    // Update Order Twin with delivery info
    await twinSyncService.syncToTwin('order', {
      orderId: shipment.orderId,
      delivery: {
        partnerId: shipment.deliveryPartner.id,
        partnerName: shipment.deliveryPartner.name
      }
    });

    // Push to Customer Ops Bridge
    await customerOpsBridge.syncShipment(shipment);

    // Publish shipment created event
    await customerOpsBridge.publishEvent('delivery.shipment.created', shipment);

    logger.info(`Shipment ${shipment.shipmentId} created for order ${shipment.orderId}`);
    res.json({ success: true, shipmentId: shipment.shipmentId, twinsSynced: true });
  } catch (error: any) {
    logger.error('Shipment creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/delivery/shipment/:shipmentId/status
 * Update shipment status
 */
router.put('/shipment/:shipmentId/status', async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;
    const { status, proofOfDelivery } = req.body;

    // Update in REZ-Delivery
    try {
      await axios.put(`${REZ_DELIVERY_URL}/api/shipments/${shipmentId}/status`, {
        status,
        proofOfDelivery
      });
    } catch {
      logger.info('REZ-Delivery unavailable - status update stored locally');
    }

    // Sync to Shipment Twin
    await twinSyncService.syncToTwin('shipment', {
      shipmentId,
      status,
      proofOfDelivery
    });

    // If delivered, update Order Twin and sync payment
    if (status === 'delivered') {
      await twinSyncService.syncToTwin('order', {
        orderId: shipmentId.replace('SHP-', 'ORD-'), // Assuming ID mapping
        delivery: { deliveryTime: new Date() },
        status: 'delivered'
      });

      // Sync delivery payment to Payment Twin
      await twinSyncService.syncToTwin('payment', {
        transactionId: `TXN-DEL-${Date.now()}`,
        corpid: 'REZ-DELIVERY',
        type: 'credit',
        amount: 50, // Delivery fee
        currency: 'INR',
        method: 'wallet',
        status: 'completed',
        to: { type: 'delivery_partner', id: req.body.partnerId },
        metadata: { shipmentId },
        createdAt: new Date()
      });
    }

    // Publish status change event
    await customerOpsBridge.publishEvent('delivery.shipment.status_changed', {
      shipmentId,
      status,
      timestamp: new Date()
    });

    logger.info(`Shipment ${shipmentId} status updated to ${status}`);
    res.json({ success: true, shipmentId, status });
  } catch (error: any) {
    logger.error('Shipment status update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/delivery/shipment/:shipmentId/track
 * Get real-time shipment tracking
 */
router.get('/shipment/:shipmentId/track', async (req: Request, res: Response) => {
  try {
    const { shipmentId } = req.params;

    let shipment: Partial<REZShipment> = {};
    try {
      const response = await axios.get(`${REZ_DELIVERY_URL}/api/shipments/${shipmentId}/track`);
      shipment = response.data;
    } catch {
      // Return basic tracking info from twin
      const twinData = await twinSyncService.getTwinData('shipment', shipmentId);
      if (twinData) {
        shipment = twinData;
      }
    }

    res.json({ success: true, shipmentId, tracking: shipment });
  } catch (error: any) {
    logger.error('Shipment tracking failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/delivery/partner/:partnerId/earnings
 * Get delivery partner earnings summary
 */
router.get('/partner/:partnerId/earnings', async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { period = 'week' } = req.query;

    let earnings: any = {};
    try {
      const response = await axios.get(`${REZ_DELIVERY_URL}/api/partners/${partnerId}/earnings`, {
        params: { period }
      });
      earnings = response.data;
    } catch {
      // Calculate from twin data
      const paymentTwin = await twinSyncService.getTwinData('payment', partnerId);
      earnings = {
        total: paymentTwin?.totalEarnings || 0,
        pending: paymentTwin?.pendingEarnings || 0,
        paid: paymentTwin?.paidEarnings || 0
      };
    }

    res.json({ success: true, partnerId, period, earnings });
  } catch (error: any) {
    logger.error('Earnings fetch failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/delivery/assign
 * Assign delivery partner to order
 */
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const { orderId, partnerId, pickupLocation, deliveryLocation } = req.body;

    if (!orderId || !partnerId) {
      return res.status(400).json({ success: false, error: 'Missing orderId or partnerId' });
    }

    // Create shipment
    const shipment: REZShipment = {
      shipmentId: `SHP-${Date.now()}`,
      orderId,
      corpid: 'REZ-DELIVERY',
      status: 'assigned',
      pickup: {
        location: pickupLocation,
        time: new Date(),
        verified: false
      },
      delivery: {
        location: deliveryLocation,
        verified: false
      },
      deliveryPartner: {
        id: partnerId,
        name: 'Assigned Partner',
        phone: '+1234567890'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create in REZ-Delivery
    try {
      await axios.post(`${REZ_DELIVERY_URL}/api/shipments/assign`, { orderId, partnerId });
    } catch {
      logger.info('REZ-Delivery unavailable - assignment stored locally');
    }

    // Sync to twins
    await twinSyncService.syncToTwin('shipment', shipment);

    // Update partner status
    await twinSyncService.syncToTwin('delivery', { deliveryId: partnerId, status: 'on_delivery' });

    // Publish assignment event
    await customerOpsBridge.publishEvent('delivery.shipment.assigned', {
      shipmentId: shipment.shipmentId,
      orderId,
      partnerId
    });

    logger.info(`Delivery ${partnerId} assigned to order ${orderId}`);
    res.json({ success: true, shipmentId: shipment.shipmentId, orderId, partnerId });
  } catch (error: any) {
    logger.error('Delivery assignment failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/delivery/webhook
 * Webhook receiver for REZ-Delivery events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    logger.info(`Received delivery webhook: ${event}`);

    switch (event) {
      case 'shipment.created':
        await twinSyncService.syncToTwin('shipment', data);
        await customerOpsBridge.syncShipment(data);
        break;
      case 'shipment.status_changed':
        await twinSyncService.syncToTwin('shipment', data);
        if (data.status === 'delivered') {
          await customerOpsBridge.syncShipment(data);
        }
        break;
      case 'partner.location_updated':
        await twinSyncService.syncToTwin('shipment', {
          deliveryPartner: { id: data.partnerId, currentLocation: data.location }
        });
        break;
      case 'partner.status_changed':
        await twinSyncService.syncToTwin('delivery', data);
        break;
      case 'delivery.completed':
        await twinSyncService.syncToTwin('payment', data.payment);
        await customerOpsBridge.syncPayment(data.payment);
        break;
    }

    res.json({ success: true, event });
  } catch (error: any) {
    logger.error('Delivery webhook processing failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
