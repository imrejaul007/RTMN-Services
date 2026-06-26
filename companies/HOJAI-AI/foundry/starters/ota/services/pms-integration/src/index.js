/**
 * PMS Integration Service
 * Port: 4700
 * Connects to: Oracle OHIP, Cloudbeds, Mews, RoomRaccoon, Guestline
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors(), express.json());
const PORT = process.env.PORT || 4700;

// ── PMS Providers ──────────────────────────────────────────────────

const PMS_PROVIDERS = {
  oracle: {
    name: 'Oracle Hospitality (OPERA)',
    api: 'https://api.oracle.com/ohip/v1',
    auth: 'oauth2',
    supports: ['inventory', 'reservations', 'rates', 'guests', 'housekeeping']
  },
  cloudbeds: {
    name: 'Cloudbeds',
    api: 'https://api.cloudbeds.com/v1',
    auth: 'apikey',
    supports: ['inventory', 'reservations', 'rates', 'guests']
  },
  mews: {
    name: 'Mews',
    api: 'https://api.mews.com/api/v1',
    auth: 'oauth2',
    supports: ['inventory', 'reservations', 'rates', 'guests', 'accounting']
  },
  roomraccoon: {
    name: 'RoomRaccoon',
    api: 'https://api.roomraccoon.com/v2',
    auth: 'apikey',
    supports: ['inventory', 'reservations', 'rates']
  },
  guestline: {
    name: 'Guestline',
    api: 'https://api.guestline.com/api',
    auth: 'basic',
    supports: ['inventory', 'reservations', 'rates']
  }
};

// Hotel PMS connections
const hotelConnections = new Map();

// ── Routes ──────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'pms-integration', port: PORT }));

// List PMS providers
app.get('/api/providers', (_, res) => {
  res.json({
    success: true,
    providers: Object.entries(PMS_PROVIDERS).map(([id, p]) => ({
      id,
      name: p.name,
      supports: p.supports
    }))
  });
});

// Connect hotel to PMS
app.post('/api/connect', async (req, res) => {
  const { hotelId, provider, credentials } = req.body;

  if (!hotelId || !provider) {
    return res.status(400).json({ error: 'hotelId and provider required' });
  }

  if (!PMS_PROVIDERS[provider]) {
    return res.status(400).json({ error: `Unknown provider: ${provider}. Options: ${Object.keys(PMS_PROVIDERS).join(', ')}` });
  }

  // Create connection
  const connection = {
    id: uuidv4(),
    hotelId,
    provider,
    status: 'connected',
    connectedAt: new Date().toISOString(),
    lastSync: null,
    syncStatus: 'idle'
  };

  hotelConnections.set(connection.id, connection);

  res.status(201).json({
    success: true,
    connection: {
      id: connection.id,
      hotelId: connection.hotelId,
      provider: PMS_PROVIDERS[provider].name,
      status: 'connected'
    },
    message: `Connected to ${PMS_PROVIDERS[provider].name}`
  });
});

// Sync inventory (rooms) from PMS
app.post('/api/sync/inventory', async (req, res) => {
  const { connectionId } = req.body;
  const connection = hotelConnections.get(connectionId);

  if (!connection) {
    return res.status(404).json({ error: 'Connection not found' });
  }

  // Simulate fetching from PMS
  const inventory = {
    connectionId,
    provider: connection.provider,
    syncedAt: new Date().toISOString(),
    rooms: [
      { roomId: 'rm1', type: 'standard', available: 10, rate: 4500 },
      { roomId: 'rm2', type: 'deluxe', available: 5, rate: 6500 },
      { roomId: 'rm3', type: 'suite', available: 2, rate: 12000 }
    ]
  };

  connection.lastSync = new Date().toISOString();
  connection.syncStatus = 'synced';

  res.json({ success: true, inventory });
});

// Get rates from PMS
app.get('/api/rates/:hotelId', async (req, res) => {
  const { hotelId } = req.params;
  const { checkin, checkout } = req.query;

  // Find connection for hotel
  const connection = Array.from(hotelConnections.values()).find(c => c.hotelId === hotelId);

  // Return mock rates
  const rates = {
    hotelId,
    provider: connection?.provider || 'internal',
    checkin,
    checkout,
    rates: [
      { roomType: 'standard', rackRate: 4500, otaRate: 4000, commission: 0.15 },
      { roomType: 'deluxe', rackRate: 6500, otaRate: 5800, commission: 0.15 },
      { roomType: 'suite', rackRate: 12000, otaRate: 10500, commission: 0.15 }
    ],
    generatedAt: new Date().toISOString()
  };

  res.json({ success: true, rates });
});

// Create reservation in PMS
app.post('/api/reservation', async (req, res) => {
  const { connectionId, reservation } = req.body;
  const connection = hotelConnections.get(connectionId);

  if (!connection) {
    return res.status(404).json({ error: 'Connection not found' });
  }

  // Simulate creating reservation in PMS
  const pmsReservation = {
    id: `PMS${Date.now()}`,
    otaReservationId: reservation.otaReservationId,
    hotelId: connection.hotelId,
    provider: connection.provider,
    guestName: reservation.guestName,
    checkin: reservation.checkin,
    checkout: reservation.checkout,
    roomType: reservation.roomType,
    status: 'confirmed',
    pmsConfirmationNumber: `HT${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    reservation: pmsReservation,
    message: 'Reservation created in PMS'
  });
});

// Update reservation
app.put('/api/reservation/:id', async (req, res) => {
  const { id } = req.params;
  const { action, ...updates } = req.body;

  const actions = {
    cancel: { status: 'cancelled' },
    modify: { ...updates, status: 'modified' },
    no_show: { status: 'no-show' }
  };

  res.json({
    success: true,
    reservation: {
      id,
      ...(actions[action] || updates),
      updatedAt: new Date().toISOString()
    }
  });
});

// Get guest history
app.get('/api/guests/:hotelId', async (req, res) => {
  const { hotelId } = req.params;

  res.json({
    success: true,
    guests: [
      { guestId: 'g1', name: 'Rahul Sharma', email: 'rahul@example.com', totalStays: 5, totalSpent: 45000 },
      { guestId: 'g2', name: 'Priya Patel', email: 'priya@example.com', totalStays: 3, totalSpent: 28000 }
    ]
  });
});

// Disconnect PMS
app.delete('/api/connect/:connectionId', (req, res) => {
  const { connectionId } = req.params;
  if (hotelConnections.delete(connectionId)) {
    res.json({ success: true, message: 'PMS disconnected' });
  } else {
    res.status(404).json({ error: 'Connection not found' });
  }
});

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════╗
║  PMS Integration — PORT ${PORT}           ║
║  Oracle OHIP • Cloudbeds • Mews     ║
╠══════════════════════════════════════════╣
║  POST /api/connect      — Connect PMS ║
║  POST /api/sync/inventory — Sync rooms ║
║  GET  /api/rates/:hotelId — Get rates ║
║  POST /api/reservation  — Book PMS   ║
╚══════════════════════════════════════════╝
`));

export default app;
