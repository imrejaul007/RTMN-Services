import { Router, Request, Response } from 'express';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { ShipmentSync } from '../services/shipmentSync';
import { logger } from '../services/logger';
import {
  KHAIRMOVETrip,
  KHAIRMOVEPackage,
  KHAIRMOVECoordinates,
  KHAIRMOVETripWithTwins
} from '../models/KHAIRMOVEProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();
const shipmentSync = new ShipmentSync();

// In-memory delivery storage (replace with database in production)
const deliveries: Map<string, KHAIRMOVETrip> = new Map();

/**
 * Create a new delivery request
 * POST /api/delivery/request
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      pickup,
      dropoff,
      package: packageInfo,
      serviceType,
      estimatedFare,
      distance,
      duration,
      paymentMethod,
      orderId
    } = req.body;

    if (!customerId || !pickup || !dropoff || !packageInfo) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['customerId', 'pickup', 'dropoff', 'package']
      });
    }

    const tripId = `DEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const delivery: KHAIRMOVETrip = {
      tripId,
      type: 'delivery',
      status: 'requested',
      customerId,
      pickup: {
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        address: pickup.address,
        city: pickup.city,
        pincode: pickup.pincode
      },
      dropoff: {
        latitude: dropoff.latitude,
        longitude: dropoff.longitude,
        address: dropoff.address,
        city: dropoff.city,
        pincode: dropoff.pincode
      },
      package: {
        packageId: packageInfo.packageId || `PKG-${Date.now()}`,
        description: packageInfo.description,
        weight: packageInfo.weight,
        dimensions: packageInfo.dimensions,
        fragile: packageInfo.fragile,
        temperatureSensitive: packageInfo.temperatureSensitive,
        value: packageInfo.value,
        category: packageInfo.category || 'parcel'
      },
      estimatedFare,
      distance,
      duration,
      createdAt: new Date(),
      updatedAt: new Date(),
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'pending'
    };

    deliveries.set(tripId, delivery);

    // Link to Customer Twin
    const customerTwin = await customerOpsBridge.linkToCustomerTwin(customerId, tripId, 'delivery');

    // Link to Order Twin if orderId provided
    let orderTwin = null;
    if (orderId) {
      orderTwin = await customerOpsBridge.linkToOrderTwin(orderId, tripId, 'delivery');
    }

    // Create shipment twin entry for tracking
    const shipmentTwin = await shipmentSync.createShipmentForDelivery(tripId, {
      origin: pickup,
      destination: dropoff,
      type: 'delivery',
      customerId,
      package: packageInfo,
      orderId
    });

    // Publish delivery requested event
    customerOpsBridge.publishDeliveryEvent('delivery.requested', {
      tripId,
      customerId,
      pickup,
      dropoff,
      package: packageInfo,
      customerTwinId: customerTwin?.twinId,
      orderTwinId: orderTwin?.twinId,
      shipmentTwinId: shipmentTwin?.shipmentTwinId
    });

    logger.info(`Delivery requested: ${tripId}`, { customerId, package: packageInfo.category });

    const deliveryWithTwins: KHAIRMOVETripWithTwins = {
      ...delivery,
      linkedTwins: [
        { twinType: 'customer', twinId: customerTwin?.twinId || '', linkType: 'operates' },
        { twinType: 'shipment', twinId: shipmentTwin?.shipmentTwinId || '', linkType: 'contains' },
        ...(orderTwin?.twinId ? [{ twinType: 'order', twinId: orderTwin.twinId, linkType: 'delivers_to' }] : [])
      ],
      customerTwinId: customerTwin?.twinId,
      orderTwinId: orderTwin?.twinId,
      shipmentTwinId: shipmentTwin?.shipmentTwinId
    };

    res.status(201).json({
      success: true,
      delivery: deliveryWithTwins
    });
  } catch (error) {
    logger.error('Error creating delivery request:', error);
    res.status(500).json({ error: 'Failed to create delivery request' });
  }
});

/**
 * Assign driver to delivery
 * POST /api/delivery/:tripId/assign
 */
router.post('/:tripId/assign', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { driverId, vehicleId } = req.body;

    const delivery = deliveries.get(tripId);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (delivery.status !== 'requested') {
      return res.status(400).json({ error: 'Delivery is not available for assignment' });
    }

    delivery.driverId = driverId;
    delivery.status = 'accepted';
    delivery.updatedAt = new Date();
    deliveries.set(tripId, delivery);

    // Link driver to Agent Twin
    const agentTwin = await customerOpsBridge.linkToAgentTwin(driverId, tripId, 'delivery');

    // Update shipment twin with driver info
    await shipmentSync.updateShipment(tripId, {
      driverId,
      vehicleId,
      status: 'assigned',
      agentTwinId: agentTwin?.twinId
    });

    // Publish delivery assigned event
    customerOpsBridge.publishDeliveryEvent('delivery.assigned', {
      tripId,
      driverId,
      customerId: delivery.customerId,
      agentTwinId: agentTwin?.twinId
    });

    logger.info(`Delivery assigned: ${tripId}`, { driverId });

    res.json({
      success: true,
      delivery,
      agentTwinId: agentTwin?.twinId
    });
  } catch (error) {
    logger.error('Error assigning delivery:', error);
    res.status(500).json({ error: 'Failed to assign delivery' });
  }
});

/**
 * Update delivery status
 * POST /api/delivery/:tripId/status
 */
router.post('/:tripId/status', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { status, location, timestamp } = req.body;

    const validStatuses = ['requested', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid: validStatuses
      });
    }

    const delivery = deliveries.get(tripId);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    delivery.status = status;
    delivery.updatedAt = new Date();

    if (status === 'delivered') {
      delivery.completedAt = new Date();
      delivery.paymentStatus = 'paid';
    }

    deliveries.set(tripId, delivery);

    // Update shipment twin
    const shipmentStatus = status === 'picked_up' ? 'picked_up' :
                           status === 'in_transit' ? 'in_transit' :
                           status === 'delivered' ? 'delivered' : status;

    await shipmentSync.updateShipment(tripId, {
      status: shipmentStatus,
      currentLocation: location,
      completedAt: status === 'delivered' ? new Date() : undefined
    });

    // Publish delivery status event
    customerOpsBridge.publishDeliveryEvent(`delivery.${status}`, {
      tripId,
      customerId: delivery.customerId,
      driverId: delivery.driverId,
      location,
      timestamp: timestamp || new Date()
    });

    logger.info(`Delivery status updated: ${tripId}`, { status });

    res.json({
      success: true,
      delivery
    });
  } catch (error) {
    logger.error('Error updating delivery status:', error);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

/**
 * Get delivery details
 * GET /api/delivery/:tripId
 */
router.get('/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const delivery = deliveries.get(tripId);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Enrich with twin information
    const twinInfo = await customerOpsBridge.getTwinLinks(tripId, 'delivery');
    const shipmentInfo = await shipmentSync.getShipment(tripId);

    const deliveryWithTwins: KHAIRMOVETripWithTwins = {
      ...delivery,
      linkedTwins: twinInfo,
      shipmentTwinId: shipmentInfo?.shipmentTwinId,
      customerTwinId: delivery.customerId ? (await customerOpsBridge.getCustomerTwin(delivery.customerId))?.twinId : undefined
    };

    res.json({
      success: true,
      delivery: deliveryWithTwins
    });
  } catch (error) {
    logger.error('Error fetching delivery:', error);
    res.status(500).json({ error: 'Failed to fetch delivery' });
  }
});

/**
 * Get customer deliveries
 * GET /api/delivery/customer/:customerId
 */
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { status, category, limit = 50, offset = 0 } = req.query;

    let customerDeliveries = Array.from(deliveries.values()).filter(d => d.customerId === customerId);

    if (status) {
      customerDeliveries = customerDeliveries.filter(d => d.status === status);
    }

    if (category) {
      customerDeliveries = customerDeliveries.filter(d => d.package?.category === category);
    }

    customerDeliveries = customerDeliveries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(Number(offset), Number(offset) + Number(limit)));

    // Get twin info for each delivery
    const deliveriesWithTwins = await Promise.all(
      customerDeliveries.map(async (delivery) => {
        const twinInfo = await customerOpsBridge.getTwinLinks(delivery.tripId, 'delivery');
        const shipmentInfo = await shipmentSync.getShipment(delivery.tripId);
        return {
          ...delivery,
          linkedTwins: twinInfo,
          shipmentTwinId: shipmentInfo?.shipmentTwinId
        } as KHAIRMOVETripWithTwins;
      })
    );

    res.json({
      success: true,
      deliveries: deliveriesWithTwins,
      total: Array.from(deliveries.values()).filter(d => d.customerId === customerId).length
    });
  } catch (error) {
    logger.error('Error fetching customer deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch customer deliveries' });
  }
});

/**
 * Get active deliveries (for driver)
 * GET /api/delivery/driver/:driverId/active
 */
router.get('/driver/:driverId/active', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const activeDeliveries = Array.from(deliveries.values())
      .filter(d => d.driverId === driverId && ['accepted', 'picked_up', 'in_transit'].includes(d.status))
      .sort((a, b) => a.status === 'picked_up' ? -1 : 1);

    const deliveriesWithTwins = await Promise.all(
      activeDeliveries.map(async (delivery) => {
        const twinInfo = await customerOpsBridge.getTwinLinks(delivery.tripId, 'delivery');
        const shipmentInfo = await shipmentSync.getShipment(delivery.tripId);
        return {
          ...delivery,
          linkedTwins: twinInfo,
          shipmentTwinId: shipmentInfo?.shipmentTwinId
        } as KHAIRMOVETripWithTwins;
      })
    );

    res.json({
      success: true,
      deliveries: deliveriesWithTwins
    });
  } catch (error) {
    logger.error('Error fetching active deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch active deliveries' });
  }
});

/**
 * Cancel delivery
 * POST /api/delivery/:tripId/cancel
 */
router.post('/:tripId/cancel', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { reason, cancelledBy } = req.body;

    const delivery = deliveries.get(tripId);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (['delivered', 'cancelled', 'failed'].includes(delivery.status)) {
      return res.status(400).json({ error: 'Cannot cancel this delivery' });
    }

    delivery.status = 'cancelled';
    delivery.updatedAt = new Date();
    delivery.feedback = reason;
    deliveries.set(tripId, delivery);

    // Update shipment twin
    await shipmentSync.updateShipment(tripId, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason
    });

    // Publish delivery cancelled event
    customerOpsBridge.publishDeliveryEvent('delivery.cancelled', {
      tripId,
      customerId: delivery.customerId,
      driverId: delivery.driverId,
      reason,
      cancelledBy: cancelledBy || 'customer'
    });

    logger.info(`Delivery cancelled: ${tripId}`, { reason, cancelledBy });

    res.json({
      success: true,
      delivery
    });
  } catch (error) {
    logger.error('Error cancelling delivery:', error);
    res.status(500).json({ error: 'Failed to cancel delivery' });
  }
});

export default router;
