/**
 * HOJAI Logistics Fleet Service
 * Vehicle management, tracking, maintenance
 * Reuses: KHAIRMOVE pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Vehicle {
  id: string;
  registrationNo: string;
  type: 'bike' | 'car' | 'van' | 'truck';
  capacity: { weight: number; volume: number };
  status: 'available' | 'on_trip' | 'maintenance' | 'inactive';
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  location?: { lat: number; lng: number; updatedAt: string };
  fuelType: 'petrol' | 'diesel' | 'electric';
  avgMileage: number;
  lastService?: string;
  nextServiceDue?: string;
  insuranceExpiry?: string;
  createdAt: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  licenseExpiry: string;
  status: 'available' | 'on_trip' | 'off_duty';
  vehicleId?: string;
  totalTrips: number;
  rating: number;
  shiftStart?: string;
  shiftEnd?: string;
}

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: 'service' | 'repair' | 'inspection';
  description: string;
  cost: number;
  date: string;
  nextDue?: string;
  mechanic?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

const vehicles = new Map<string, Vehicle>();
const drivers = new Map<string, Driver>();
const maintenanceRecords = new Map<string, MaintenanceRecord>();

// Vehicle CRUD
router.post('/vehicles', async (req, res) => {
  try {
    const vehicle: Vehicle = {
      ...req.body,
      id: uuidv4(),
      status: 'available',
      createdAt: new Date().toISOString(),
    };
    vehicles.set(vehicle.id, vehicle);
    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

router.get('/vehicles', async (req, res) => {
  try {
    const { status, type } = req.query;
    let result = Array.from(vehicles.values());

    if (status) result = result.filter(v => v.status === status);
    if (type) result = result.filter(v => v.type === type);

    res.json({ vehicles: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

router.get('/vehicles/:id', async (req, res) => {
  try {
    const vehicle = vehicles.get(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Get driver's maintenance history
    const history = Array.from(maintenanceRecords.values())
      .filter(m => m.vehicleId === req.params.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ vehicle, maintenanceHistory: history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

router.patch('/vehicles/:id/location', async (req, res) => {
  try {
    const vehicle = vehicles.get(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    vehicle.location = { ...req.body, updatedAt: new Date().toISOString() };
    vehicles.set(vehicle.id, vehicle);

    res.json({ success: true, location: vehicle.location });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

router.patch('/vehicles/:id/status', async (req, res) => {
  try {
    const vehicle = vehicles.get(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    vehicle.status = req.body.status;
    vehicles.set(vehicle.id, vehicle);

    res.json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Driver CRUD
router.post('/drivers', async (req, res) => {
  try {
    const driver: Driver = {
      ...req.body,
      id: uuidv4(),
      status: 'off_duty',
      totalTrips: 0,
      rating: 5.0,
    };
    drivers.set(driver.id, driver);
    res.status(201).json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add driver' });
  }
});

router.get('/drivers', async (req, res) => {
  try {
    const { status } = req.query;
    let result = Array.from(drivers.values());

    if (status) result = result.filter(d => d.status === status);

    res.json({ drivers: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

router.patch('/drivers/:id/status', async (req, res) => {
  try {
    const driver = drivers.get(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    driver.status = req.body.status;
    drivers.set(driver.id, driver);

    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Maintenance
router.post('/maintenance', async (req, res) => {
  try {
    const record: MaintenanceRecord = {
      ...req.body,
      id: uuidv4(),
      status: 'scheduled',
    };
    maintenanceRecords.set(record.id, record);
    res.status(201).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule maintenance' });
  }
});

router.patch('/maintenance/:id', async (req, res) => {
  try {
    const record = maintenanceRecords.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    Object.assign(record, req.body);
    maintenanceRecords.set(record.id, record);

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance' });
  }
});

router.get('/maintenance/upcoming', async (req, res) => {
  try {
    const upcoming = Array.from(maintenanceRecords.values())
      .filter(m => m.status === 'scheduled' && new Date(m.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ upcoming });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch upcoming maintenance' });
  }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const available = Array.from(vehicles.values()).filter(v => v.status === 'available').length;
    const onTrip = Array.from(vehivers.values()).filter(v => v.status === 'on_trip').length;
    const maintenance = Array.from(vehicles.values()).filter(v => v.status === 'maintenance').length;
    const driversAvailable = Array.from(drivers.values()).filter(d => d.status === 'available').length;

    res.json({
      vehicles: { total: vehicles.size, available, onTrip, maintenance },
      drivers: { total: drivers.size, available: driversAvailable },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

export { router, vehicles, drivers, maintenanceRecords };
