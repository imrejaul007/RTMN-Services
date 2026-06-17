/**
 * Transport OS - Complete Transport/Logistics Management
 *
 * Industry: Transport & Logistics
 * Port: 5240
 *
 * Features:
 * - Fleet/Vehicle Management
 * - Route Management
 * - Driver Management
 * - Trip/Booking Management
 * - Load/Cargo Management
 * - Fuel/Expense Tracking
 * - Maintenance Scheduling
 * - GPS/Tracking Integration (mock)
 * - Analytics
 * - RTMN Layer Integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5240;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// SAMPLE DATA - RTMN Transport OS
// ============================================

// Users & Auth
const authUsers = new Map([
  ['admin', { id: 'U001', username: 'admin', role: 'admin', name: 'Transport Admin' }],
  ['operator', { id: 'U002', username: 'operator', role: 'operator', name: 'Operations Manager' }],
  ['dispatcher', { id: 'U003', username: 'dispatcher', role: 'dispatcher', name: 'Dispatch Manager' }]
]);

const authSessions = new Map();

// Vehicles - Fleet
const vehicles = new Map([
  ['V001', {
    id: 'V001', plateNumber: 'KA01AB1234', type: 'truck', capacity: '10 tons',
    make: 'Tata', model: 'Signa', year: 2023, status: 'active',
    fuelType: 'diesel', mileage: 45, currentLocation: { lat: 12.9716, lng: 77.5946 },
    lastMaintenance: '2026-05-15', nextMaintenance: '2026-07-15'
  }],
  ['V002', {
    id: 'V002', plateNumber: 'MH12CD5678', type: 'truck', capacity: '15 tons',
    make: 'Ashok Leyland', model: 'Falcon', year: 2022, status: 'active',
    fuelType: 'diesel', mileage: 38, currentLocation: { lat: 18.5204, lng: 73.8567 },
    lastMaintenance: '2026-04-20', nextMaintenance: '2026-06-20'
  }],
  ['V003', {
    id: 'V003', plateNumber: 'DL01EF9012', type: 'van', capacity: '2 tons',
    make: 'Mahindra', model: 'Supro', year: 2024, status: 'active',
    fuelType: 'diesel', mileage: 55, currentLocation: { lat: 28.6139, lng: 77.2090 },
    lastMaintenance: '2026-06-01', nextMaintenance: '2026-08-01'
  }],
  ['V004', {
    id: 'V004', plateNumber: 'TN01GH3456', type: 'truck', capacity: '20 tons',
    make: 'BharatBenz', model: '2820', year: 2023, status: 'maintenance',
    fuelType: 'diesel', mileage: 42, currentLocation: { lat: 13.0827, lng: 80.2707 },
    lastMaintenance: '2026-06-10', nextMaintenance: '2026-06-25'
  }],
  ['V005', {
    id: 'V005', plateNumber: 'KA05IJ7890', type: 'trailer', capacity: '30 tons',
    make: 'Volvo', model: 'FMX', year: 2021, status: 'active',
    fuelType: 'diesel', mileage: 35, currentLocation: { lat: 12.2958, lng: 76.6394 },
    lastMaintenance: '2026-03-15', nextMaintenance: '2026-09-15'
  }]
]);

// Drivers
const drivers = new Map([
  ['D001', {
    id: 'D001', name: 'Rajesh Kumar', phone: '+919876543210',
    licenseNumber: 'DL123456789', licenseExpiry: '2028-06-15',
    status: 'available', assignedVehicle: 'V001',
    totalTrips: 145, rating: 4.8, experience: 8
  }],
  ['D002', {
    id: 'D002', name: 'Mohan Singh', phone: '+919876543211',
    licenseNumber: 'MH987654321', licenseExpiry: '2027-12-01',
    status: 'on_trip', assignedVehicle: 'V002',
    totalTrips: 98, rating: 4.6, experience: 5
  }],
  ['D003', {
    id: 'D003', name: 'Suresh Patil', phone: '+919876543212',
    licenseNumber: 'KA456789123', licenseExpiry: '2029-03-20',
    status: 'available', assignedVehicle: 'V003',
    totalTrips: 210, rating: 4.9, experience: 12
  }],
  ['D004', {
    id: 'D004', name: 'Anil Verma', phone: '+919876543213',
    licenseNumber: 'UP789012345', licenseExpiry: '2026-08-10',
    status: 'on_leave', assignedVehicle: null,
    totalTrips: 78, rating: 4.5, experience: 4
  }]
]);

// Routes
const routes = new Map([
  ['R001', {
    id: 'R001', name: 'Bangalore - Mumbai Express',
    origin: { city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    destination: { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    distance: 984, estimatedTime: 14, waypoints: ['Pune'],
    tollCost: 2500, status: 'active'
  }],
  ['R002', {
    id: 'R002', name: 'Delhi - Chandigarh',
    origin: { city: 'Delhi', lat: 28.6139, lng: 77.2090 },
    destination: { city: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
    distance: 250, estimatedTime: 4, waypoints: ['Ambala', 'Panchkula'],
    tollCost: 450, status: 'active'
  }],
  ['R003', {
    id: 'R003', name: 'Chennai - Bangalore',
    origin: { city: 'Chennai', lat: 13.0827, lng: 80.2707 },
    destination: { city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    distance: 350, estimatedTime: 5, waypoints: ['Vellore', 'Krishnagiri'],
    tollCost: 850, status: 'active'
  }]
]);

// Trips
const trips = new Map([
  ['T001', {
    id: 'T001', vehicleId: 'V001', driverId: 'D001', routeId: 'R001',
    status: 'in_transit', startTime: '2026-06-15T06:00:00Z',
    estimatedEndTime: '2026-06-15T20:00:00Z',
    cargo: { type: 'Electronics', weight: 8.5, value: 2500000 },
    from: 'Bangalore', to: 'Mumbai', distance: 984,
    fuelCost: 12000, tollCost: 2500, totalCost: 14500,
    currentLocation: { lat: 16.5075, lng: 74.8621 }
  }],
  ['T002', {
    id: 'T002', vehicleId: 'V002', driverId: 'D002', routeId: 'R001',
    status: 'loading', startTime: null, estimatedEndTime: null,
    cargo: { type: 'Textiles', weight: 12.0, value: 1800000 },
    from: 'Mumbai', to: 'Bangalore', distance: 984,
    fuelCost: 0, tollCost: 0, totalCost: 0,
    currentLocation: { lat: 18.5204, lng: 73.8567 }
  }],
  ['T003', {
    id: 'T003', vehicleId: 'V003', driverId: 'D003', routeId: 'R002',
    status: 'completed', startTime: '2026-06-14T08:00:00Z',
    estimatedEndTime: '2026-06-14T12:00:00Z',
    cargo: { type: 'Pharmaceuticals', weight: 1.5, value: 5000000 },
    from: 'Delhi', to: 'Chandigarh', distance: 250,
    fuelCost: 3200, tollCost: 450, totalCost: 3650,
    currentLocation: null
  }],
  ['T004', {
    id: 'T004', vehicleId: 'V001', driverId: 'D001', routeId: 'R003',
    status: 'scheduled', startTime: '2026-06-16T07:00:00Z',
    estimatedEndTime: '2026-06-16T12:00:00Z',
    cargo: { type: 'Auto Parts', weight: 9.0, value: 3500000 },
    from: 'Chennai', to: 'Bangalore', distance: 350,
    fuelCost: 0, tollCost: 0, totalCost: 0,
    currentLocation: null
  }],
  ['T005', {
    id: 'T005', vehicleId: 'V005', driverId: null, routeId: 'R001',
    status: 'available', startTime: null, estimatedEndTime: null,
    cargo: { type: 'Machinery', weight: 25.0, value: 8000000 },
    from: 'Bangalore', to: 'Hyderabad', distance: 570,
    fuelCost: 0, tollCost: 0, totalCost: 0,
    currentLocation: { lat: 12.2958, lng: 76.6394 }
  }]
]);

// Expenses
const expenses = new Map([
  ['E001', { id: 'E001', tripId: 'T001', type: 'fuel', amount: 12000, date: '2026-06-15', notes: 'HP Petrol Pump, Pune' }],
  ['E002', { id: 'E002', tripId: 'T001', type: 'toll', amount: 2500, date: '2026-06-15', notes: 'Mahalunge Toll' }],
  ['E003', { id: 'E003', tripId: 'T003', type: 'fuel', amount: 3200, date: '2026-06-14', notes: 'HP Petrol, Delhi' }],
  ['E004', { id: 'E004', tripId: 'T003', type: 'toll', amount: 450, date: '2026-06-14', notes: 'Kurukshetra Toll' }],
  ['E005', { id: 'E005', vehicleId: 'V004', type: 'maintenance', amount: 45000, date: '2026-06-10', notes: 'Brake replacement' }]
]);

// Maintenance Records
const maintenanceRecords = new Map([
  ['M001', { id: 'M001', vehicleId: 'V001', type: 'service', date: '2026-05-15', cost: 8500, description: 'Regular service' }],
  ['M002', { id: 'M002', vehicleId: 'V002', type: 'repair', date: '2026-04-20', cost: 12000, description: 'Engine repair' }],
  ['M003', { id: 'M003', vehicleId: 'V003', type: 'service', date: '2026-06-01', cost: 6000, description: 'Oil change & inspection' }],
  ['M004', { id: 'M004', vehicleId: 'V004', type: 'repair', date: '2026-06-10', cost: 45000, description: 'Brake system overhaul' }]
]);

// GPS Tracking Mock Data
const gpsTracking = new Map([
  ['T001', { tripId: 'T001', liveLocation: { lat: 16.5075, lng: 74.8621 }, speed: 65, heading: 'N', lastUpdate: '2026-06-15T10:30:00Z' }],
  ['T002', { tripId: 'T002', liveLocation: { lat: 18.5204, lng: 73.8567 }, speed: 0, heading: 'N', lastUpdate: '2026-06-15T10:25:00Z' }]
]);

// ============================================
// AUTH MIDDLEWARE
// ============================================

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No valid token provided' });
  }
  const token = authHeader.substring(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session' });
  }
  req.user = session.user;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = authSessions.get(token);
    if (session) req.user = session.user;
  }
  next();
}

// ============================================
// HEALTH & INFO
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Transport OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Transport OS',
    industry: 'Transport & Logistics',
    version: '1.0.0',
    port: PORT,
    capabilities: [
      'fleet-management', 'route-management', 'driver-management',
      'trip-booking', 'cargo-management', 'fuel-tracking',
      'maintenance-scheduling', 'gps-tracking', 'analytics'
    ],
    stats: {
      vehicles: vehicles.size,
      drivers: drivers.size,
      routes: routes.size,
      trips: trips.size,
      expenses: expenses.size
    }
  });
});

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = authUsers.get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  authSessions.set(token, { user, createdAt: new Date() });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization.substring(7);
  authSessions.delete(token);
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ============================================
// VEHICLE/FLEET MANAGEMENT
// ============================================

app.get('/api/vehicles', optionalAuth, (req, res) => {
  const { status, type } = req.query;
  let result = Array.from(vehicles.values());
  if (status) result = result.filter(v => v.status === status);
  if (type) result = result.filter(v => v.type === type);
  res.json({ vehicles: result, total: result.length });
});

app.get('/api/vehicles/:id', optionalAuth, (req, res) => {
  const vehicle = vehicles.get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  // Include related data
  const vehicleTrips = Array.from(trips.values()).filter(t => t.vehicleId === req.params.id);
  const vehicleMaintenance = Array.from(maintenanceRecords.values()).filter(m => m.vehicleId === req.params.id);

  res.json({ vehicle, trips: vehicleTrips, maintenance: vehicleMaintenance });
});

app.post('/api/vehicles', requireAuth, (req, res) => {
  if (req.user.role === 'operator' || req.user.role === 'admin') {
    const id = `V${String(vehicles.size + 1).padStart(3, '0')}`;
    const vehicle = { id, ...req.body, status: req.body.status || 'active' };
    vehicles.set(id, vehicle);
    res.status(201).json({ vehicle });
  } else {
    res.status(403).json({ error: 'Insufficient permissions' });
  }
});

app.put('/api/vehicles/:id', requireAuth, (req, res) => {
  if (!vehicles.has(req.params.id)) return res.status(404).json({ error: 'Vehicle not found' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  const vehicle = { ...vehicles.get(req.params.id), ...req.body, id: req.params.id };
  vehicles.set(req.params.id, vehicle);
  res.json({ vehicle });
});

app.delete('/api/vehicles/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  if (!vehicles.delete(req.params.id)) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ message: 'Vehicle deleted' });
});

// ============================================
// DRIVER MANAGEMENT
// ============================================

app.get('/api/drivers', optionalAuth, (req, res) => {
  const { status } = req.query;
  let result = Array.from(drivers.values());
  if (status) result = result.filter(d => d.status === status);
  res.json({ drivers: result, total: result.length });
});

app.get('/api/drivers/:id', optionalAuth, (req, res) => {
  const driver = drivers.get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const driverTrips = Array.from(trips.values()).filter(t => t.driverId === req.params.id);
  res.json({ driver, trips: driverTrips });
});

app.post('/api/drivers', requireAuth, (req, res) => {
  if (req.user.role === 'operator' || req.user.role === 'admin') {
    const id = `D${String(drivers.size + 1).padStart(3, '0')}`;
    const driver = { id, ...req.body, status: req.body.status || 'available' };
    drivers.set(id, driver);
    res.status(201).json({ driver });
  } else {
    res.status(403).json({ error: 'Insufficient permissions' });
  }
});

app.put('/api/drivers/:id', requireAuth, (req, res) => {
  if (!drivers.has(req.params.id)) return res.status(404).json({ error: 'Driver not found' });
  if (req.user.role !== 'admin' && req.user.role !== 'operator') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const driver = { ...drivers.get(req.params.id), ...req.body, id: req.params.id };
  drivers.set(req.params.id, driver);
  res.json({ driver });
});

// ============================================
// ROUTE MANAGEMENT
// ============================================

app.get('/api/routes', optionalAuth, (req, res) => {
  const result = Array.from(routes.values());
  res.json({ routes: result, total: result.length });
});

app.get('/api/routes/:id', optionalAuth, (req, res) => {
  const route = routes.get(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json({ route });
});

app.post('/api/routes', requireAuth, (req, res) => {
  if (req.user.role === 'admin' || req.user.role === 'dispatcher') {
    const id = `R${String(routes.size + 1).padStart(3, '0')}`;
    const route = { id, ...req.body, status: req.body.status || 'active' };
    routes.set(id, route);
    res.status(201).json({ route });
  } else {
    res.status(403).json({ error: 'Insufficient permissions' });
  }
});

// ============================================
// TRIP MANAGEMENT
// ============================================

app.get('/api/trips', optionalAuth, (req, res) => {
  const { status, vehicleId, driverId } = req.query;
  let result = Array.from(trips.values());
  if (status) result = result.filter(t => t.status === status);
  if (vehicleId) result = result.filter(t => t.vehicleId === vehicleId);
  if (driverId) result = result.filter(t => t.driverId === driverId);
  res.json({ trips: result, total: result.length });
});

app.get('/api/trips/:id', optionalAuth, (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  // Include GPS tracking if available
  const gps = gpsTracking.get(req.params.id);
  res.json({ trip, gps });
});

app.post('/api/trips', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
    return res.status(403).json({ error: 'Dispatch permission required' });
  }
  const id = `T${String(trips.size + 1).padStart(3, '0')}`;
  const trip = { id, ...req.body, status: 'scheduled' };
  trips.set(id, trip);
  res.status(201).json({ trip });
});

app.put('/api/trips/:id', requireAuth, (req, res) => {
  if (!trips.has(req.params.id)) return res.status(404).json({ error: 'Trip not found' });
  const trip = { ...trips.get(req.params.id), ...req.body, id: req.params.id };
  trips.set(req.params.id, trip);
  res.json({ trip });
});

app.post('/api/trips/:id/start', requireAuth, (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'scheduled' && trip.status !== 'loading') {
    return res.status(400).json({ error: 'Trip cannot be started' });
  }
  trip.status = 'in_transit';
  trip.startTime = new Date().toISOString();
  trips.set(req.params.id, trip);
  res.json({ trip, message: 'Trip started' });
});

app.post('/api/trips/:id/complete', requireAuth, (req, res) => {
  const trip = trips.get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'in_transit') {
    return res.status(400).json({ error: 'Trip must be in transit to complete' });
  }
  trip.status = 'completed';
  trip.actualEndTime = new Date().toISOString();
  trips.set(req.params.id, trip);
  res.json({ trip, message: 'Trip completed' });
});

// ============================================
// CARGO/LOAD MANAGEMENT
// ============================================

app.get('/api/cargo', optionalAuth, (req, res) => {
  const { status } = req.query;
  let result = Array.from(trips.values()).map(t => ({
    tripId: t.id,
    cargo: t.cargo,
    status: t.status,
    from: t.from,
    to: t.to
  }));
  if (status) result = result.filter(c => c.status === status);
  res.json({ cargo: result, total: result.length });
});

// ============================================
// EXPENSE TRACKING
// ============================================

app.get('/api/expenses', optionalAuth, (req, res) => {
  const { type, tripId } = req.query;
  let result = Array.from(expenses.values());
  if (type) result = result.filter(e => e.type === type);
  if (tripId) result = result.filter(e => e.tripId === tripId);
  res.json({ expenses: result, total: result.length });
});

app.post('/api/expenses', requireAuth, (req, res) => {
  const id = `E${String(expenses.size + 1).padStart(3, '0')}`;
  const expense = { id, ...req.body };
  expenses.set(id, expense);
  res.status(201).json({ expense });
});

// ============================================
// MAINTENANCE SCHEDULING
// ============================================

app.get('/api/maintenance', optionalAuth, (req, res) => {
  const { vehicleId, status } = req.query;
  let result = Array.from(maintenanceRecords.values());
  if (vehicleId) result = result.filter(m => m.vehicleId === vehicleId);

  // Calculate upcoming maintenance
  const upcoming = Array.from(vehicles.values()).filter(v => {
    const nextDate = new Date(v.nextMaintenance);
    const now = new Date();
    const diffDays = (nextDate - now) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).map(v => ({ vehicleId: v.id, vehicle: v.plateNumber, dueDate: v.nextMaintenance }));

  res.json({ records: result, upcoming, total: result.length });
});

app.post('/api/maintenance', requireAuth, (req, res) => {
  const id = `M${String(maintenanceRecords.size + 1).padStart(3, '0')}`;
  const record = { id, ...req.body, date: req.body.date || new Date().toISOString().split('T')[0] };
  maintenanceRecords.set(id, record);

  // Update vehicle's next maintenance date
  if (vehicles.has(req.body.vehicleId)) {
    const vehicle = vehicles.get(req.body.vehicleId);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 90); // Default 90 days
    vehicle.nextMaintenance = nextDate.toISOString().split('T')[0];
    vehicles.set(vehicle.id, vehicle);
  }

  res.status(201).json({ record });
});

// ============================================
// GPS TRACKING (Mock)
// ============================================

app.get('/api/tracking/:tripId', optionalAuth, (req, res) => {
  const tracking = gpsTracking.get(req.params.tripId);
  if (!tracking) return res.status(404).json({ error: 'Tracking data not available' });
  res.json({ tracking });
});

app.get('/api/tracking/vehicle/:vehicleId', optionalAuth, (req, res) => {
  const vehicleTrips = Array.from(trips.values()).filter(t => t.vehicleId === req.params.vehicleId && t.status === 'in_transit');
  const tracking = vehicleTrips.map(t => gpsTracking.get(t.id)).filter(Boolean);
  res.json({ tracking });
});

// ============================================
// ANALYTICS & DASHBOARD
// ============================================

app.get('/api/analytics/dashboard', requireAuth, (req, res) => {
  const allTrips = Array.from(trips.values());
  const activeTrips = allTrips.filter(t => t.status === 'in_transit');

  const completedTrips = allTrips.filter(t => t.status === 'completed');
  const totalRevenue = completedTrips.reduce((sum, t) => sum + (t.cargo?.value || 0), 0);
  const totalCosts = completedTrips.reduce((sum, t) => sum + t.totalCost, 0);

  const fleetUtilization = ((activeTrips.length / vehicles.size) * 100).toFixed(1);

  res.json({
    overview: {
      totalVehicles: vehicles.size,
      activeVehicles: vehicles.values().filter(v => v.status === 'active').length,
      totalDrivers: drivers.size,
      availableDrivers: drivers.values().filter(d => d.status === 'available').length,
      totalTrips: allTrips.length,
      activeTrips: activeTrips.length,
      completedTrips: completedTrips.length
    },
    financials: {
      totalRevenue,
      totalCosts,
      netProfit: totalRevenue - totalCosts,
      fuelCosts: expenses.values().filter(e => e.type === 'fuel').reduce((sum, e) => sum + e.amount, 0),
      tollCosts: expenses.values().filter(e => e.type === 'toll').reduce((sum, e) => sum + e.amount, 0),
      maintenanceCosts: expenses.values().filter(e => e.type === 'maintenance').reduce((sum, e) => sum + e.amount, 0)
    },
    fleet: {
      utilization: parseFloat(fleetUtilization),
      inMaintenance: vehicles.values().filter(v => v.status === 'maintenance').length
    },
    tripsByStatus: {
      scheduled: allTrips.filter(t => t.status === 'scheduled').length,
      loading: allTrips.filter(t => t.status === 'loading').length,
      in_transit: activeTrips.length,
      completed: completedTrips.length,
      cancelled: allTrips.filter(t => t.status === 'cancelled').length
    }
  });
});

app.get('/api/analytics/performance', requireAuth, (req, res) => {
  const completedTrips = Array.from(trips.values()).filter(t => t.status === 'completed');
  const avgTripCost = completedTrips.length > 0
    ? completedTrips.reduce((sum, t) => sum + t.totalCost, 0) / completedTrips.length
    : 0;

  const driverPerformance = Array.from(drivers.values()).map(d => {
    const dTrips = completedTrips.filter(t => t.driverId === d.id);
    return {
      driverId: d.id,
      name: d.name,
      totalTrips: dTrips.length,
      totalDistance: dTrips.reduce((sum, t) => sum + t.distance, 0),
      rating: d.rating
    };
  }).sort((a, b) => b.totalTrips - a.totalTrips);

  const vehiclePerformance = Array.from(vehicles.values()).map(v => {
    const vTrips = completedTrips.filter(t => t.vehicleId === v.id);
    return {
      vehicleId: v.id,
      plateNumber: v.plateNumber,
      totalTrips: vTrips.length,
      totalDistance: vTrips.reduce((sum, t) => sum + t.distance, 0),
      mileage: v.mileage
    };
  }).sort((a, b) => b.totalTrips - a.totalTrips);

  res.json({
    averageTripCost: Math.round(avgTripCost),
    driverPerformance,
    vehiclePerformance,
    totalDistanceCovered: completedTrips.reduce((sum, t) => sum + t.distance, 0)
  });
});

// ============================================
// RTMN LAYER INTEGRATION
// ============================================

app.get('/api/layers', (req, res) => {
  res.json({
    layers: [
      { layer: 1, name: 'Intelligence', available: true, endpoints: ['/api/ai/intent', '/api/ai/sentiment'] },
      { layer: 2, name: 'Customer Growth', available: false },
      { layer: 3, name: 'Commerce', available: false },
      { layer: 4, name: 'Financial', available: true, endpoints: ['/api/wallet', '/api/payments'] },
      { layer: 5, name: 'Workforce', available: false },
      { layer: 6, name: 'Legal & Trust', available: false },
      { layer: 7, name: 'Property', available: false },
      { layer: 8, name: 'Health', available: false },
      { layer: 9, name: 'Mobility', available: true, endpoints: ['/api/routes', '/api/tracking'] },
      { layer: 10, name: 'Identity', available: true, endpoints: ['/api/auth'] },
      { layer: 11, name: 'Memory', available: true, endpoints: ['/api/memory'] },
      { layer: 12, name: 'Digital Twins', available: true, endpoints: ['/api/twins'] },
      { layer: 13, name: 'Automation', available: false },
      { layer: 14, name: 'Autonomous', available: false },
      { layer: 15, name: 'Network', available: false }
    ]
  });
});

app.get('/api/layer/:name', (req, res) => {
  const layerName = req.params.name.toLowerCase();
  const layerMap = {
    'intelligence': { layer: 1, name: 'Intelligence', service: 'Transport AI', status: 'active' },
    'finance': { layer: 4, name: 'Financial', service: 'Transport Finance', status: 'active' },
    'mobility': { layer: 9, name: 'Mobility', service: 'Route & Tracking', status: 'active' },
    'identity': { layer: 10, name: 'Identity', service: 'CorpID', status: 'active' },
    'memory': { layer: 11, name: 'Memory', service: 'MemoryOS', status: 'active' },
    'twins': { layer: 12, name: 'Digital Twins', service: 'TwinOS Hub', status: 'active' }
  };
  const layer = layerMap[layerName];
  if (!layer) return res.status(404).json({ error: 'Layer not available' });
  res.json({ layer });
});

app.get('/api/twins', optionalAuth, (req, res) => {
  res.json({
    twins: [
      { type: 'vehicle', count: vehicles.size, service: 'Vehicle Twin' },
      { type: 'driver', count: drivers.size, service: 'Driver Twin' },
      { type: 'trip', count: trips.size, service: 'Trip Twin' },
      { type: 'route', count: routes.size, service: 'Route Twin' },
      { type: 'cargo', count: trips.size, service: 'Cargo Twin' }
    ]
  });
});

app.get('/api/memory', optionalAuth, (req, res) => {
  res.json({
    memory: {
      conversations: 0,
      context: { industry: 'transport', focus: 'logistics' },
      recentTrips: Array.from(trips.values()).slice(-5),
      fleetStats: {
        totalVehicles: vehicles.size,
        activeDrivers: drivers.values().filter(d => d.status !== 'on_leave').length
      }
    }
  });
});

// ============================================
// RTMN ECOSYSTEM INTEGRATION
// ============================================

app.get('/api/ecosystem/status', (req, res) => {
  res.json({
    connected: true,
    services: {
      'corpId': { status: 'active', url: 'http://localhost:4702' },
      'memoryOS': { status: 'active', url: 'http://localhost:4703' },
      'goalOS': { status: 'active', url: 'http://localhost:4242' },
      'eventBus': { status: 'active', url: 'http://localhost:4510' },
      'serviceRegistry': { status: 'active', url: 'http://localhost:4399' }
    }
  });
});

app.post('/api/ecosystem/publish', requireAuth, (req, res) => {
  const { event, data } = req.body;
  console.log(`[RTMN Event] ${event}:`, data);
  res.json({ published: true, event, timestamp: new Date().toISOString() });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           TRANSPORT OS - Transport & Logistics           ║
╠═══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                             ║
║  Industry: Transport & Logistics                          ║
║  Version: 1.0.0                                          ║
╠═══════════════════════════════════════════════════════════╣
║  Sample Data:                                             ║
║  - 5 Vehicles (Fleet)                                    ║
║  - 4 Drivers                                              ║
║  - 3 Routes                                               ║
║  - 5 Trips                                                ║
║  - Expenses & Maintenance Records                          ║
╠═══════════════════════════════════════════════════════════╣
║  API Endpoints:                                           ║
║  - GET  /health              Health check                 ║
║  - GET  /api/info            Service info                 ║
║  - POST /api/auth/login      Login                        ║
║  - GET  /api/vehicles        List vehicles               ║
║  - GET  /api/drivers         List drivers                ║
║  - GET  /api/routes          List routes                 ║
║  - GET  /api/trips           List trips                  ║
║  - GET  /api/tracking/:id    GPS tracking                ║
║  - GET  /api/analytics/dashboard  Dashboard               ║
║  - GET  /api/layers          RTMN layers                 ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
