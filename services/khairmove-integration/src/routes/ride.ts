import { Router, Request, Response } from 'express';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { ShipmentSync } from '../services/shipmentSync';
import { logger } from '../services/logger';
import {
  KHAIRMOVETrip,
  KHAIRMOVECoordinates,
  KHAIRMOVETripWithTwins
} from '../models/KHAIRMOVEProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();
const shipmentSync = new ShipmentSync();

// In-memory ride storage (replace with database in production)
const rides: Map<string, KHAIRMOVETrip> = new Map();

/**
 * Create a new ride request
 * POST /api/ride/request
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      pickup,
      dropoff,
      serviceType,
      estimatedFare,
      distance,
      duration,
      paymentMethod
    } = req.body;

    if (!customerId || !pickup || !dropoff || !serviceType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['customerId', 'pickup', 'dropoff', 'serviceType']
      });
    }

    const tripId = `RIDE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const ride: KHAIRMOVETrip = {
      tripId,
      type: 'ride',
      status: 'requested',
      customerId,
      pickup: {
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        address: pickup.address,
        city: pickup.city
      },
      dropoff: {
        latitude: dropoff.latitude,
        longitude: dropoff.longitude,
        address: dropoff.address,
        city: dropoff.city
      },
      estimatedFare,
      distance,
      duration,
      createdAt: new Date(),
      updatedAt: new Date(),
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'pending'
    };

    rides.set(tripId, ride);

    // Link to Customer Twin
    const customerTwin = await customerOpsBridge.linkToCustomerTwin(customerId, tripId, 'ride');

    // Create shipment twin entry for tracking
    const shipmentTwin = await shipmentSync.createShipmentForRide(tripId, {
      origin: pickup,
      destination: dropoff,
      type: 'ride',
      customerId
    });

    // Publish ride requested event
    customerOpsBridge.publishRideEvent('ride.requested', {
      tripId,
      customerId,
      pickup,
      dropoff,
      customerTwinId: customerTwin?.twinId,
      shipmentTwinId: shipmentTwin?.shipmentTwinId
    });

    logger.info(`Ride requested: ${tripId}`, { customerId, pickup, dropoff });

    const rideWithTwins: KHAIRMOVETripWithTwins = {
      ...ride,
      linkedTwins: [
        { twinType: 'customer', twinId: customerTwin?.twinId || '', linkType: 'operates' },
        { twinType: 'shipment', twinId: shipmentTwin?.shipmentTwinId || '', linkType: 'contains' }
      ],
      customerTwinId: customerTwin?.twinId,
      shipmentTwinId: shipmentTwin?.shipmentTwinId
    };

    res.status(201).json({
      success: true,
      ride: rideWithTwins
    });
  } catch (error) {
    logger.error('Error creating ride request:', error);
    res.status(500).json({ error: 'Failed to create ride request' });
  }
});

/**
 * Accept a ride (driver side)
 * POST /api/ride/:tripId/accept
 */
router.post('/:tripId/accept', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { driverId, vehicleId } = req.body;

    const ride = rides.get(tripId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ error: 'Ride is not available for acceptance' });
    }

    ride.driverId = driverId;
    ride.status = 'accepted';
    ride.updatedAt = new Date();
    rides.set(tripId, ride);

    // Link driver to Agent Twin
    const agentTwin = await customerOpsBridge.linkToAgentTwin(driverId, tripId, 'ride');

    // Update shipment twin with driver info
    await shipmentSync.updateShipment(tripId, {
      driverId,
      vehicleId,
      status: 'assigned',
      agentTwinId: agentTwin?.twinId
    });

    // Publish ride accepted event
    customerOpsBridge.publishRideEvent('ride.accepted', {
      tripId,
      driverId,
      customerId: ride.customerId,
      agentTwinId: agentTwin?.twinId
    });

    logger.info(`Ride accepted: ${tripId}`, { driverId });

    res.json({
      success: true,
      ride,
      agentTwinId: agentTwin?.twinId
    });
  } catch (error) {
    logger.error('Error accepting ride:', error);
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

/**
 * Update ride status
 * POST /api/ride/:tripId/status
 */
router.post('/:tripId/status', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { status, location, driverId } = req.body;

    const validStatuses = ['requested', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid: validStatuses
      });
    }

    const ride = rides.get(tripId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    ride.status = status;
    ride.updatedAt = new Date();

    if (status === 'delivered' || status === 'completed') {
      ride.completedAt = new Date();
      ride.paymentStatus = 'paid';
    }

    rides.set(tripId, ride);

    // Update shipment twin
    await shipmentSync.updateShipment(tripId, {
      status: status === 'picked_up' ? 'picked_up' : status === 'in_transit' ? 'in_transit' : status,
      currentLocation: location,
      completedAt: status === 'delivered' ? new Date() : undefined
    });

    // Publish ride status event
    customerOpsBridge.publishRideEvent(`ride.${status}`, {
      tripId,
      customerId: ride.customerId,
      driverId: driverId || ride.driverId,
      location,
      timestamp: new Date()
    });

    logger.info(`Ride status updated: ${tripId}`, { status });

    res.json({
      success: true,
      ride
    });
  } catch (error) {
    logger.error('Error updating ride status:', error);
    res.status(500).json({ error: 'Failed to update ride status' });
  }
});

/**
 * Get ride details
 * GET /api/ride/:tripId
 */
router.get('/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const ride = rides.get(tripId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Enrich with twin information
    const twinInfo = await customerOpsBridge.getTwinLinks(tripId, 'ride');
    const shipmentInfo = await shipmentSync.getShipment(tripId);

    const rideWithTwins: KHAIRMOVETripWithTwins = {
      ...ride,
      linkedTwins: twinInfo,
      shipmentTwinId: shipmentInfo?.shipmentTwinId,
      customerTwinId: ride.customerId ? (await customerOpsBridge.getCustomerTwin(ride.customerId))?.twinId : undefined
    };

    res.json({
      success: true,
      ride: rideWithTwins
    });
  } catch (error) {
    logger.error('Error fetching ride:', error);
    res.status(500).json({ error: 'Failed to fetch ride' });
  }
});

/**
 * Get customer rides
 * GET /api/ride/customer/:customerId
 */
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let customerRides = Array.from(rides.values()).filter(r => r.customerId === customerId);

    if (status) {
      customerRides = customerRides.filter(r => r.status === status);
    }

    customerRides = customerRides
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(Number(offset), Number(offset) + Number(limit));

    // Get twin info for each ride
    const ridesWithTwins = await Promise.all(
      customerRides.map(async (ride) => {
        const twinInfo = await customerOpsBridge.getTwinLinks(ride.tripId, 'ride');
        const shipmentInfo = await shipmentSync.getShipment(ride.tripId);
        return {
          ...ride,
          linkedTwins: twinInfo,
          shipmentTwinId: shipmentInfo?.shipmentTwinId
        } as KHAIRMOVETripWithTwins;
      })
    );

    res.json({
      success: true,
      rides: ridesWithTwins,
      total: Array.from(rides.values()).filter(r => r.customerId === customerId).length
    });
  } catch (error) {
    logger.error('Error fetching customer rides:', error);
    res.status(500).json({ error: 'Failed to fetch customer rides' });
  }
});

/**
 * Get nearby drivers
 * GET /api/ride/nearby-drivers
 */
router.get('/nearby-drivers', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 5, serviceType } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location required (latitude, longitude)' });
    }

    // In production, this would query the actual KHAIRMOVE driver service
    const nearbyDrivers = [
      {
        driverId: 'DRV-001',
        name: 'Demo Driver',
        rating: 4.8,
        distance: 1.2,
        eta: 5,
        vehicleType: serviceType || 'car',
        currentLocation: {
          latitude: Number(latitude) + 0.01,
          longitude: Number(longitude) + 0.01
        }
      }
    ];

    res.json({
      success: true,
      drivers: nearbyDrivers
    });
  } catch (error) {
    logger.error('Error fetching nearby drivers:', error);
    res.status(500).json({ error: 'Failed to fetch nearby drivers' });
  }
});

/**
 * Rate a ride
 * POST /api/ride/:tripId/rate
 */
router.post('/:tripId/rate', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const ride = rides.get(tripId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'delivered') {
      return res.status(400).json({ error: 'Can only rate completed rides' });
    }

    ride.rating = rating;
    ride.feedback = feedback;
    ride.updatedAt = new Date();
    rides.set(tripId, ride);

    // Update shipment twin with rating
    await shipmentSync.updateShipment(tripId, {
      rating,
      feedback
    });

    // Publish ride rated event
    customerOpsBridge.publishRideEvent('ride.rated', {
      tripId,
      rating,
      feedback,
      customerId: ride.customerId,
      driverId: ride.driverId
    });

    logger.info(`Ride rated: ${tripId}`, { rating });

    res.json({
      success: true,
      ride
    });
  } catch (error) {
    logger.error('Error rating ride:', error);
    res.status(500).json({ error: 'Failed to rate ride' });
  }
});

export default router;
