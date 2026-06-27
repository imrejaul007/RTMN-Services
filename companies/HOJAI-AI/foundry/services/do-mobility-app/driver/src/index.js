/**
 * DO Mobility - Driver App
 * Port: 4611
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(cors(), express.json());

const PORT = 4611;

const drivers = new Map();
const rides = new Map();

// Demo driver
const demoDriver = {
  id: 'driver_1',
  name: 'Ramesh K',
  phone: '+919988776655',
  vehicle: 'Maruti Swift',
  license: 'KA-01-AB-1234',
  rating: 4.9,
  earnings: 0,
  trips: 0,
  status: 'offline'
};
drivers.set(demoDriver.id, demoDriver);

app.get('/health', (_, res) => res.json({ status: 'ok', app: 'do-mobility-driver', port: PORT }));

// Go online/offline
app.post('/api/status', requireInternal, (req, res) => {
  const { online } = req.body;
  demoDriver.status = online ? 'online' : 'offline';
  res.json({ success: true, status: demoDriver.status });
});

// Get ride request
app.get('/api/rides/requests', (req, res) => {
  if (demoDriver.status !== 'online') {
    return res.json({ success: true, requests: [] });
  }
  // Simulate incoming requests
  const requests = [
    { id: uuidv4(), pickup: 'Koramangala', drop: 'Airport', fare: 320, distance: '8 km', eta: '4 mins' },
    { id: uuidv4(), pickup: 'Indiranagar', drop: 'MG Road', fare: 180, distance: '4 km', eta: '3 mins' }
  ];
  res.json({ success: true, requests });
});

// Accept ride
app.post('/api/rides/:id/accept', requireInternal, (req, res) => {
  const ride = {
    id: req.params.id,
    driverId: demoDriver.id,
    status: 'accepted',
    acceptedAt: new Date().toISOString()
  };
  rides.set(ride.id, ride);
  res.json({ success: true, ride });
});

// Driver stats
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    today: { earnings: demoDriver.earnings, trips: demoDriver.trips },
    rating: demoDriver.rating,
    status: demoDriver.status
  });
});

app.listen(PORT, () => console.log(`
╔═══════════════════════╗
║  DO Mobility — Driver ║
║  PORT ${PORT}          ║
╚═══════════════════════╝
`));

export default app;
