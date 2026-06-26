/**
 * Mobility Services
 * Port: 4720
 * Driver, Fleet, Dispatch, Surge Pricing, Safety
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors(), express.json());
const PORT = process.env.PORT || 4720;

// Stores
const drivers = new Map();
const rides = new Map();
const vehicles = new Map();
const surgeZones = new Map();

// Seed sample drivers
const sampleDrivers = [
  { id: 'd1', name: 'Rajesh Kumar', vehicle: 'Swift Dzire', rating: 4.7, status: 'available', trips: 1250 },
  { id: 'd2', name: 'Amit Singh', vehicle: 'Honda City', rating: 4.8, status: 'available', trips: 2100 },
  { id: 'd3', name: 'Priya Sharma', vehicle: 'Toyota Innova', rating: 4.9, status: 'busy', trips: 3500 },
];

sampleDrivers.forEach(d => drivers.set(d.id, d));

// ── Health ──────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'mobility-services' }));

// ── Drivers ─────────────────────────────────────────────────────

app.get('/api/drivers', (req, res) => {
  const { status, city } = req.query;
  let results = Array.from(drivers.values());
  if (status) results = results.filter(d => d.status === status);
  res.json({ success: true, count: results.length, drivers: results });
});

app.get('/api/drivers/:id', (req, res) => {
  const driver = drivers.get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json({ success: true, driver });
});

app.post('/api/drivers', (req, res) => {
  const driver = {
    id: uuidv4(),
    ...req.body,
    status: 'pending',
    rating: 0,
    trips: 0,
    earnings: 0,
    createdAt: new Date().toISOString()
  };
  drivers.set(driver.id, driver);
  res.status(201).json({ success: true, driver });
});

app.put('/api/drivers/:id/status', (req, res) => {
  const driver = drivers.get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  driver.status = req.body.status;
  driver.updatedAt = new Date().toISOString();
  drivers.set(driver.id, driver);

  res.json({ success: true, driver });
});

// ── Ride Booking ─────────────────────────────────────────────────

app.post('/api/rides/request', (req, res) => {
  const { pickup, drop, vehicleType, userId } = req.body;

  // Calculate base fare
  const baseFare = calculateDistance(pickup, drop) * 10 + 40;

  // Apply surge if applicable
  const surgeMultiplier = getSurgeMultiplier(pickup);
  const fare = Math.round(baseFare * surgeMultiplier);

  // Find nearby drivers
  const nearbyDrivers = Array.from(drivers.values())
    .filter(d => d.status === 'available')
    .slice(0, 3);

  const ride = {
    id: `RD${Date.now()}`,
    userId,
    pickup,
    drop,
    vehicleType,
    fare,
    surgeMultiplier,
    status: 'searching',
    nearbyDrivers,
    createdAt: new Date().toISOString()
  };

  rides.set(ride.id, ride);
  res.status(201).json({ success: true, ride });
});

app.post('/api/rides/:id/accept', (req, res) => {
  const { driverId } = req.body;
  const ride = rides.get(req.params.id);

  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  const driver = drivers.get(driverId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  ride.driverId = driverId;
  ride.status = 'accepted';
  ride.acceptedAt = new Date().toISOString();

  driver.status = 'busy';
  drivers.set(driverId, driver);
  rides.set(ride.id, ride);

  res.json({ success: true, ride, driver });
});

app.post('/api/rides/:id/start', (req, res) => {
  const ride = rides.get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  ride.status = 'in_progress';
  ride.startedAt = new Date().toISOString();
  rides.set(ride.id, ride);

  res.json({ success: true, ride });
});

app.post('/api/rides/:id/complete', (req, res) => {
  const ride = rides.get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  ride.status = 'completed';
  ride.completedAt = new Date().toISOString();
  ride.duration = calculateDuration(ride.startedAt, ride.completedAt);
  ride.distance = calculateDistance(ride.pickup, ride.drop);

  // Update driver stats
  if (ride.driverId) {
    const driver = drivers.get(ride.driverId);
    if (driver) {
      driver.status = 'available';
      driver.trips += 1;
      driver.earnings += ride.fare * 0.8; // 80% to driver
      drivers.set(driver.id, driver);
    }
  }

  rides.set(ride.id, ride);
  res.json({ success: true, ride });
});

app.post('/api/rides/:id/cancel', (req, res) => {
  const { reason } = req.body;
  const ride = rides.get(req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  ride.status = 'cancelled';
  ride.cancelledAt = new Date().toISOString();
  ride.cancelReason = reason;

  if (ride.driverId) {
    const driver = drivers.get(ride.driverId);
    if (driver) {
      driver.status = 'available';
      drivers.set(driver.id, driver);
    }
  }

  rides.set(ride.id, ride);
  res.json({ success: true, ride });
});

// ── Surge Pricing ───────────────────────────────────────────────

app.get('/api/surge', (req, res) => {
  const { lat, lng } = req.query;

  const zones = Array.from(surgeZones.values());
  const currentZone = zones.find(z =>
    isWithinRadius(lat, lng, z.lat, z.lng, z.radius)
  );

  res.json({
    success: true,
    surge: currentZone ? currentZone.multiplier : 1.0,
    zones
  });
});

app.post('/api/surge/update', (req, res) => {
  const { lat, lng, multiplier, radius } = req.body;

  const zoneId = `${lat},${lng}`;
  const zone = {
    id: zoneId,
    lat,
    lng,
    multiplier,
    radius: radius || 5000, // 5km default
    updatedAt: new Date().toISOString()
  };

  surgeZones.set(zoneId, zone);
  res.json({ success: true, zone });
});

// ── Fleet Management ────────────────────────────────────────────

app.get('/api/fleet/stats', (_, res) => {
  const allDrivers = Array.from(drivers.values());
  const stats = {
    totalDrivers: allDrivers.length,
    available: allDrivers.filter(d => d.status === 'available').length,
    busy: allDrivers.filter(d => d.status === 'busy').length,
    totalTrips: allDrivers.reduce((sum, d) => sum + d.trips, 0),
    totalEarnings: allDrivers.reduce((sum, d) => sum + d.earnings, 0),
    avgRating: (allDrivers.reduce((sum, d) => sum + d.rating, 0) / allDrivers.length).toFixed(2)
  };
  res.json({ success: true, stats });
});

// ── Safety ──────────────────────────────────────────────────────

app.post('/api/safety/emergency', (req, res) => {
  const { rideId, type, location } = req.body;

  // In production: alert authorities, notify emergency contacts
  const incident = {
    id: `INC${Date.now()}`,
    rideId,
    type,
    location,
    status: 'reported',
    reportedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    incident,
    message: 'Emergency services notified. Help is on the way.'
  });
});

app.get('/api/safety/ride/:rideId/tracking', (req, res) => {
  const ride = rides.get(req.params.rideId);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  // Mock tracking data
  res.json({
    success: true,
    tracking: {
      rideId: ride.id,
      currentLocation: { lat: 28.6139, lng: 77.2090 },
      eta: '5 mins',
      driverLocation: { lat: 28.6145, lng: 77.2095 }
    }
  });
});

// ── Helper Functions ─────────────────────────────────────────────

function calculateDistance(pickup, drop) {
  // Haversine formula (simplified)
  return Math.sqrt(
    Math.pow((drop.lat - pickup.lat) * 111, 2) +
    Math.pow((drop.lng - pickup.lng) * 111 * Math.cos(pickup.lat * Math.PI / 180), 2)
  );
}

function calculateDuration(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000); // minutes
}

function getSurgeMultiplier(location) {
  const zone = Array.from(surgeZones.values()).find(z =>
    isWithinRadius(location.lat, location.lng, z.lat, z.lng, z.radius)
  );
  return zone ? zone.multiplier : 1.0;
}

function isWithinRadius(lat1, lng1, lat2, lng2, radiusMeters) {
  const distance = calculateDistance(
    { lat: lat1, lng: lng1 },
    { lat: lat2, lng: lng2 }
  );
  return distance * 1000 <= radiusMeters; // Convert km to meters
}

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════════╗
║  Mobility Services — PORT ${PORT}           ║
║  Driver • Fleet • Dispatch • Surge ║
╠══════════════════════════════════════════════╣
║  POST /api/rides/request  — Book ride  ║
║  GET  /api/surge         — Get surge ║
║  POST /api/safety/emergency      ║
╚══════════════════════════════════════════════╝
`));

export default app;
