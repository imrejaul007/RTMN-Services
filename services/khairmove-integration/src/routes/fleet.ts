import { Router, Request, Response } from 'express';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { logger } from '../services/logger';
import {
  KHAIRMOVEFleet,
  KHAIRMOVEDriver,
  KHAIRMOVEVehicle
} from '../models/KHAIRMOVEProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();

// In-memory fleet storage (replace with database in production)
const fleets: Map<string, KHAIRMOVEFleet> = new Map();
const drivers: Map<string, KHAIRMOVEDriver> = new Map();
const vehicles: Map<string, KHAIRMOVEVehicle> = new Map();

/**
 * Register a new fleet
 * POST /api/fleet/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { ownerId, name, zones, services } = req.body;

    if (!ownerId || !name) {
      return res.status(400).json({ error: 'Missing required fields', required: ['ownerId', 'name'] });
    }

    const fleetId = `FLEET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fleet: KHAIRMOVEFleet = {
      fleetId,
      name,
      ownerId,
      vehicles: [],
      drivers: [],
      status: 'active',
      zones: zones || [],
      averageRating: 5.0
    };

    fleets.set(fleetId, fleet);

    // Link fleet owner to Customer Twin
    const ownerTwin = await customerOpsBridge.linkToCustomerTwin(ownerId, fleetId, 'fleet_owner');

    logger.info(`Fleet registered: ${fleetId}`, { ownerId, name });

    res.status(201).json({
      success: true,
      fleet,
      ownerTwinId: ownerTwin?.twinId
    });
  } catch (error) {
    logger.error('Error registering fleet:', error);
    res.status(500).json({ error: 'Failed to register fleet' });
  }
});

/**
 * Get fleet details
 * GET /api/fleet/:fleetId
 */
router.get('/:fleetId', async (req: Request, res: Response) => {
  try {
    const { fleetId } = req.params;

    const fleet = fleets.get(fleetId);
    if (!fleet) {
      return res.status(404).json({ error: 'Fleet not found' });
    }

    // Enrich with driver and vehicle details
    const fleetDrivers = fleet.drivers.map(d => drivers.get(d)).filter(Boolean);
    const fleetVehicles = fleet.vehicles.map(v => vehicles.get(v.vehicleId)).filter(Boolean);

    res.json({
      success: true,
      fleet: {
        ...fleet,
        driverDetails: fleetDrivers,
        vehicleDetails: fleetVehicles
      }
    });
  } catch (error) {
    logger.error('Error fetching fleet:', error);
    res.status(500).json({ error: 'Failed to fetch fleet' });
  }
});

/**
 * Add vehicle to fleet
 * POST /api/fleet/:fleetId/vehicles
 */
router.post('/:fleetId/vehicles', async (req: Request, res: Response) => {
  try {
    const { fleetId } = req.params;
    const vehicleData = req.body;

    const fleet = fleets.get(fleetId);
    if (!fleet) {
      return res.status(404).json({ error: 'Fleet not found' });
    }

    const vehicleId = `VEH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const vehicle: KHAIRMOVEVehicle = {
      vehicleId,
      type: vehicleData.type,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      licensePlate: vehicleData.licensePlate,
      color: vehicleData.color,
      capacity: vehicleData.capacity,
      registrationExpiry: new Date(vehicleData.registrationExpiry),
      insuranceExpiry: new Date(vehicleData.insuranceExpiry)
    };

    vehicles.set(vehicleId, vehicle);
    fleet.vehicles.push(vehicle);
    fleets.set(fleetId, fleet);

    logger.info(`Vehicle added to fleet: ${vehicleId}`, { fleetId });

    res.status(201).json({
      success: true,
      vehicle,
      fleet
    });
  } catch (error) {
    logger.error('Error adding vehicle to fleet:', error);
    res.status(500).json({ error: 'Failed to add vehicle to fleet' });
  }
});

/**
 * Add driver to fleet
 * POST /api/fleet/:fleetId/drivers
 */
router.post('/:fleetId/drivers', async (req: Request, res: Response) => {
  try {
    const { fleetId } = req.params;
    const driverData = req.body;

    const fleet = fleets.get(fleetId);
    if (!fleet) {
      return res.status(404).json({ error: 'Fleet not found' });
    }

    const driverId = `DRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const driver: KHAIRMOVEDriver = {
      driverId,
      name: driverData.name,
      phone: driverData.phone,
      email: driverData.email,
      rating: 5.0,
      totalTrips: 0,
      verified: false,
      documents: {
        license: driverData.license,
        aadhar: driverData.aadhar,
        pan: driverData.pan
      },
      status: 'offline',
      vehicle: driverData.vehicleId ? vehicles.get(driverData.vehicleId) : undefined
    };

    drivers.set(driverId, driver);
    fleet.drivers.push(driverId);
    fleets.set(fleetId, fleet);

    // Link driver to Agent Twin
    const agentTwin = await customerOpsBridge.linkToAgentTwin(driverId, fleetId, 'fleet_driver');

    logger.info(`Driver added to fleet: ${driverId}`, { fleetId, name: driverData.name });

    res.status(201).json({
      success: true,
      driver,
      agentTwinId: agentTwin?.twinId,
      fleet
    });
  } catch (error) {
    logger.error('Error adding driver to fleet:', error);
    res.status(500).json({ error: 'Failed to add driver to fleet' });
  }
});

/**
 * Update driver status
 * POST /api/fleet/drivers/:driverId/status
 */
router.post('/drivers/:driverId/status', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { status, location } = req.body;

    const validStatuses = ['available', 'busy', 'offline', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid: validStatuses
      });
    }

    const driver = drivers.get(driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    driver.status = status;
    if (location) {
      driver.currentLocation = location;
    }

    drivers.set(driverId, driver);

    // Publish driver status event
    customerOpsBridge.publishFleetEvent('fleet.driver.status', {
      driverId,
      status,
      location,
      fleetId: findDriverFleet(driverId),
      timestamp: new Date()
    });

    logger.info(`Driver status updated: ${driverId}`, { status });

    res.json({
      success: true,
      driver
    });
  } catch (error) {
    logger.error('Error updating driver status:', error);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
});

/**
 * Get available drivers in zone
 * GET /api/fleet/available
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const { zone, vehicleType, latitude, longitude } = req.query;

    let availableDrivers = Array.from(drivers.values())
      .filter(d => d.status === 'available');

    // Filter by zone if provided
    if (zone) {
      const zoneFleets = Array.from(fleets.values())
        .filter(f => f.zones.includes(zone as string) && f.status === 'active');
      const zoneFleetIds = zoneFleets.map(f => f.fleetId);
      availableDrivers = availableDrivers.filter(d => {
        const driverFleet = findDriverFleet(d.driverId);
        return driverFleet ? zoneFleetIds.includes(driverFleet) : false;
      });
    }

    // Filter by vehicle type if provided
    if (vehicleType) {
      availableDrivers = availableDrivers.filter(d => d.vehicle?.type === vehicleType);
    }

    // Calculate distance if coordinates provided
    if (latitude && longitude) {
      availableDrivers = availableDrivers
        .map(d => ({
          ...d,
          distance: d.currentLocation ? calculateDistance(
            Number(latitude),
            Number(longitude),
            d.currentLocation.latitude,
            d.currentLocation.longitude
          ) : Infinity
        }))
        .filter(d => d.distance <= 10) // Within 10km
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      drivers: availableDrivers.slice(0, 20),
      count: availableDrivers.length
    });
  } catch (error) {
    logger.error('Error fetching available drivers:', error);
    res.status(500).json({ error: 'Failed to fetch available drivers' });
  }
});

/**
 * Get fleet performance
 * GET /api/fleet/:fleetId/performance
 */
router.get('/:fleetId/performance', async (req: Request, res: Response) => {
  try {
    const { fleetId } = req.params;

    const fleet = fleets.get(fleetId);
    if (!fleet) {
      return res.status(404).json({ error: 'Fleet not found' });
    }

    // Calculate fleet metrics
    const fleetDrivers = fleet.drivers.map(d => drivers.get(d)).filter(Boolean);
    const fleetVehicles = fleet.vehicles.map(v => vehicles.get(v.vehicleId)).filter(Boolean);

    const activeDrivers = fleetDrivers.filter(d => d.status !== 'offline').length;
    const avgRating = fleetDrivers.reduce((sum, d) => sum + d.rating, 0) / (fleetDrivers.length || 1);
    const totalTrips = fleetDrivers.reduce((sum, d) => sum + d.totalTrips, 0);

    res.json({
      success: true,
      fleetId,
      performance: {
        totalDrivers: fleetDrivers.length,
        activeDrivers,
        totalVehicles: fleetVehicles.length,
        averageRating: Math.round(avgRating * 10) / 10,
        totalTrips,
        utilizationRate: Math.round((activeDrivers / (fleetDrivers.length || 1)) * 100),
        fleetStatus: fleet.status,
        zones: fleet.zones
      }
    });
  } catch (error) {
    logger.error('Error fetching fleet performance:', error);
    res.status(500).json({ error: 'Failed to fetch fleet performance' });
  }
});

/**
 * Update fleet status
 * POST /api/fleet/:fleetId/status
 */
router.post('/:fleetId/status', async (req: Request, res: Response) => {
  try {
    const { fleetId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid: validStatuses
      });
    }

    const fleet = fleets.get(fleetId);
    if (!fleet) {
      return res.status(404).json({ error: 'Fleet not found' });
    }

    fleet.status = status;
    fleets.set(fleetId, fleet);

    logger.info(`Fleet status updated: ${fleetId}`, { status });

    res.json({
      success: true,
      fleet
    });
  } catch (error) {
    logger.error('Error updating fleet status:', error);
    res.status(500).json({ error: 'Failed to update fleet status' });
  }
});

// Helper function to find fleet for a driver
function findDriverFleet(driverId: string): string | undefined {
  for (const [fleetId, fleet] of fleets.entries()) {
    if (fleet.drivers.includes(driverId)) {
      return fleetId;
    }
  }
  return undefined;
}

// Helper function to calculate distance between coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;
