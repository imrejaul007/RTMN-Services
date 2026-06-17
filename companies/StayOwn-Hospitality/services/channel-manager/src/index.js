/**
 * StayOwn Channel Manager Service
 *
 * Manages OTA (Online Travel Agency) integrations including:
 * - Booking.com
 * - Expedia
 * - Airbnb
 * - Agoda
 * - Google Hotels
 *
 * Port: 6020
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 6020;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// DATA STORES
// ============================================

// Channel configurations
const channels = new Map();

// Channel types and their credentials
const channelConfigs = {
  booking: {
    name: 'Booking.com',
    apiVersion: '3.0',
    endpoints: {
      availability: 'https://supply-xml.booking.com/hotels/xml/availability',
      reservations: 'https://supply-xml.booking.com/hotels/xml/reservations',
      rates: 'https://supply-xml.booking.com/hotels/xml/rates',
     otaId: 'OTAB2B'
    }
  },
  expedia: {
    name: 'Expedia',
    apiVersion: 'v3',
    endpoints: {
      availability: 'https://api.expediapartnercentral.com/v3',
      reservations: 'https://api.expediapartnercentral.com/reservations',
      rates: 'https://api.expediapartnercentral.com/properties/rates'
    }
  },
  agoda: {
    name: 'Agoda',
    apiVersion: '1.0',
    endpoints: {
      availability: 'https://api.agoda.com/v1',
      reservations: 'https://api.agoda.com/v1/reservations',
      rates: 'https://api.agoda.com/v1/rates'
    }
  },
  airbnb: {
    name: 'Airbnb',
    apiVersion: '2.0',
    endpoints: {
      listings: 'https://api.airbnb.com/v2/listings',
      reservations: 'https://api.airbnb.com/v2/reservations'
    }
  },
  google: {
    name: 'Google Hotels',
    apiVersion: '1.0',
    endpoints: {
      listings: 'https://hotels.googleapis.com/hotels/',
      pricing: 'https://hotels.googleapis.com/pricing/'
    }
  }
};

// Connected channels per property
const connectedChannels = new Map();

// Room mappings (internal room ID -> OTA room ID)
const roomMappings = new Map();

// Reservations from OTAs
const otaReservations = new Map();

// Sync logs
const syncLogs = new Map();

// ============================================
// AUTHENTICATION
// ============================================

const authUsers = new Map();
const authSessions = new Map();
const authBusinesses = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password, propertyId, propertyName } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: 'channel_manager',
    propertyId: propertyId || businessId,
    propertyName: propertyName || propertyId || businessId,
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  authBusinesses.set(businessId, { id: businessId, propertyId: user.propertyId, propertyName: user.propertyName, channels: [] });
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, role: 'channel_manager', createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, propertyId: user.propertyId } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, role: user.role, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, propertyId: user.propertyId } });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============================================
// CHANNEL MANAGEMENT
// ============================================

// Get available channel types
app.get('/api/channels/types', (req, res) => {
  res.json({
    channels: Object.entries(channelConfigs).map(([id, config]) => ({
      id,
      name: config.name,
      apiVersion: config.apiVersion,
      features: [
        'Real-time availability sync',
        'Rate synchronization',
        'Reservation import',
        'Inventory management'
      ]
    }))
  });
});

// Connect a channel
app.post('/api/channels/connect', requireAuth, (req, res) => {
  const { channelId, credentials, roomMappings: mappings } = req.body;
  if (!channelId || !credentials) {
    return res.status(400).json({ error: 'channelId and credentials required' });
  }

  const config = channelConfigs[channelId];
  if (!config) {
    return res.status(400).json({ error: 'Unknown channel' });
  }

  const businessId = req.session.businessId;
  const connectionId = `${channelId}_${businessId}`;

  // Store credentials securely
  const channelConnection = {
    connectionId,
    channelId,
    channelName: config.name,
    credentials: {
      ...credentials,
      // Mask sensitive data
      apiKey: credentials.apiKey ? '***' + credentials.apiKey.slice(-4) : undefined,
      password: credentials.password ? '***' : undefined
    },
    status: 'connected',
    connectedAt: new Date().toISOString(),
    lastSync: null,
    syncInterval: 15, // minutes
    autoSync: true
  };

  channels.set(connectionId, channelConnection);

  // Update business
  const business = authBusinesses.get(businessId);
  if (business && !business.channels.includes(channelId)) {
    business.channels.push(channelId);
    authBusinesses.set(businessId, business);
  }

  // Store room mappings
  if (mappings && mappings.length > 0) {
    roomMappings.set(connectionId, mappings);
  }

  // Initialize connected channels
  if (!connectedChannels.has(businessId)) {
    connectedChannels.set(businessId, new Map());
  }
  connectedChannels.get(businessId).set(channelId, {
    ...channelConnection,
    credentials: undefined // Don't expose credentials
  });

  res.status(201).json({
    connectionId,
    channelName: config.name,
    status: 'connected',
    message: `${config.name} connected successfully`
  });
});

// Disconnect a channel
app.post('/api/channels/disconnect', requireAuth, (req, res) => {
  const { channelId } = req.body;
  const businessId = req.session.businessId;
  const connectionId = `${channelId}_${businessId}`;

  const channel = channels.get(connectionId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not connected' });
  }

  channel.status = 'disconnected';
  channel.disconnectedAt = new Date().toISOString();

  if (connectedChannels.has(businessId)) {
    connectedChannels.get(businessId).delete(channelId);
  }

  res.json({ message: `${channel.channelName} disconnected` });
});

// Get connected channels
app.get('/api/channels', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const businessChannels = connectedChannels.get(businessId);

  if (!businessChannels) {
    return res.json({ channels: [] });
  }

  const channelList = Array.from(businessChannels.values());
  res.json({ channels: channelList });
});

// ============================================
// INVENTORY MANAGEMENT
// ============================================

// Push availability to channels
app.post('/api/inventory/availability', requireAuth, (req, res) => {
  const { rooms, channelIds, date } = req.body;
  if (!rooms || !Array.isArray(rooms)) {
    return res.status(400).json({ error: 'rooms array required' });
  }

  const businessId = req.session.businessId;
  const businessChannels = connectedChannels.get(businessId);
  const targetChannels = channelIds || (businessChannels ? Array.from(businessChannels.keys()) : []);

  const results = [];

  for (const channelId of targetChannels) {
    const connectionId = `${channelId}_${businessId}`;
    const channel = channels.get(connectionId);

    if (!channel || channel.status !== 'connected') {
      results.push({ channelId, status: 'failed', error: 'Channel not connected' });
      continue;
    }

    // Simulate API call to OTA
    const syncResult = {
      channelId,
      channelName: channel.channelName,
      status: 'success',
      roomsUpdated: rooms.length,
      timestamp: new Date().toISOString(),
      availability: rooms.map(r => ({
        roomId: r.roomId,
        available: r.available,
        date: date || new Date().toISOString().split('T')[0]
      }))
    };

    results.push(syncResult);
    channel.lastSync = new Date().toISOString();
  }

  // Log sync
  const logId = 'sync_' + Date.now();
  syncLogs.set(logId, {
    id: logId,
    type: 'availability',
    businessId,
    channels: targetChannels,
    roomsCount: rooms.length,
    results,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, results });
});

// Push rates to channels
app.post('/api/inventory/rates', requireAuth, (req, res) => {
  const { rates, channelIds, date } = req.body;
  if (!rates || !Array.isArray(rates)) {
    return res.status(400).json({ error: 'rates array required' });
  }

  const businessId = req.session.businessId;
  const businessChannels = connectedChannels.get(businessId);
  const targetChannels = channelIds || (businessChannels ? Array.from(businessChannels.keys()) : []);

  const results = [];

  for (const channelId of targetChannels) {
    const connectionId = `${channelId}_${businessId}`;
    const channel = channels.get(connectionId);

    if (!channel || channel.status !== 'connected') {
      results.push({ channelId, status: 'failed', error: 'Channel not connected' });
      continue;
    }

    const syncResult = {
      channelId,
      channelName: channel.channelName,
      status: 'success',
      ratesUpdated: rates.length,
      timestamp: new Date().toISOString(),
      rates: rates.map(r => ({
        roomId: r.roomId,
        rate: r.rate,
        currency: r.currency || 'USD',
        date: date || new Date().toISOString().split('T')[0]
      }))
    };

    results.push(syncResult);
    channel.lastSync = new Date().toISOString();
  }

  const logId = 'sync_' + Date.now();
  syncLogs.set(logId, {
    id: logId,
    type: 'rates',
    businessId,
    channels: targetChannels,
    ratesCount: rates.length,
    results,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, results });
});

// Bulk update (availability + rates)
app.post('/api/inventory/bulk-update', requireAuth, (req, res) => {
  const { availability, rates, channelIds, startDate, endDate } = req.body;

  const businessId = req.session.businessId;
  const businessChannels = connectedChannels.get(businessId);
  const targetChannels = channelIds || (businessChannels ? Array.from(businessChannels.keys()) : []);

  const results = [];

  for (const channelId of targetChannels) {
    const connectionId = `${channelId}_${businessId}`;
    const channel = channels.get(connectionId);

    if (!channel || channel.status !== 'connected') {
      results.push({ channelId, status: 'failed', error: 'Channel not connected' });
      continue;
    }

    results.push({
      channelId,
      channelName: channel.channelName,
      status: 'success',
      availabilityUpdated: availability?.length || 0,
      ratesUpdated: rates?.length || 0,
      period: { startDate, endDate },
      timestamp: new Date().toISOString()
    });

    channel.lastSync = new Date().toISOString();
  }

  res.json({ success: true, results });
});

// ============================================
// RESERVATION MANAGEMENT
// ============================================

// Fetch new reservations from channels
app.post('/api/reservations/fetch', requireAuth, async (req, res) => {
  const { channelIds } = req.body;
  const businessId = req.session.businessId;
  const businessChannels = connectedChannels.get(businessId);
  const targetChannels = channelIds || (businessChannels ? Array.from(businessChannels.keys()) : []);

  const newReservations = [];

  for (const channelId of targetChannels) {
    const connectionId = `${channelId}_${businessId}`;
    const channel = channels.get(connectionId);

    if (!channel || channel.status !== 'connected') {
      continue;
    }

    // Simulate fetching reservations from OTA
    // In production, this would call the OTA's API
    const simulatedReservations = generateSimulatedReservations(channelId, businessId);
    simulatedReservations.forEach(res => {
      const resId = `ota_${res.confirmationNumber}`;
      if (!otaReservations.has(resId)) {
        otaReservations.set(resId, res);
        newReservations.push(res);
      }
    });
  }

  res.json({
    fetched: newReservations.length,
    reservations: newReservations
  });
});

// Get all OTA reservations
app.get('/api/reservations', requireAuth, (req, res) => {
  const { channelId, status, fromDate, toDate } = req.query;
  const businessId = req.session.businessId;

  let reservations = Array.from(otaReservations.values())
    .filter(r => r.businessId === businessId);

  if (channelId) {
    reservations = reservations.filter(r => r.channelId === channelId);
  }
  if (status) {
    reservations = reservations.filter(r => r.status === status);
  }
  if (fromDate) {
    reservations = reservations.filter(r => r.checkIn >= fromDate);
  }
  if (toDate) {
    reservations = reservations.filter(r => r.checkOut <= toDate);
  }

  res.json({ reservations, count: reservations.length });
});

// Get single reservation
app.get('/api/reservations/:id', requireAuth, (req, res) => {
  const reservation = otaReservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  res.json(reservation);
});

// Update reservation status
app.patch('/api/reservations/:id', requireAuth, (req, res) => {
  const reservation = otaReservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }

  const { status, notes, internalBookingId } = req.body;

  if (status) reservation.status = status;
  if (notes) reservation.notes = notes;
  if (internalBookingId) reservation.internalBookingId = internalBookingId;
  reservation.updatedAt = new Date().toISOString();

  otaReservations.set(req.params.id, reservation);

  // Push update to channel
  const connectionId = `${reservation.channelId}_${reservation.businessId}`;
  const channel = channels.get(connectionId);
  if (channel && channel.status === 'connected') {
    // Simulate pushing update to OTA
    reservation.pushedToChannel = true;
    reservation.pushedAt = new Date().toISOString();
  }

  res.json(reservation);
});

// Cancel reservation
app.post('/api/reservations/:id/cancel', requireAuth, (req, res) => {
  const reservation = otaReservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }

  reservation.status = 'cancelled';
  reservation.cancellationReason = req.body.reason || 'Cancelled by hotel';
  reservation.cancelledAt = new Date().toISOString();
  reservation.updatedAt = new Date().toISOString();

  otaReservations.set(req.params.id, reservation);

  res.json({ success: true, reservation });
});

// Confirm reservation (link to internal booking)
app.post('/api/reservations/:id/confirm', requireAuth, (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) {
    return res.status(400).json({ error: 'bookingId required' });
  }

  const reservation = otaReservations.get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }

  reservation.status = 'confirmed';
  reservation.internalBookingId = bookingId;
  reservation.confirmedAt = new Date().toISOString();
  reservation.updatedAt = new Date().toISOString();

  otaReservations.set(req.params.id, reservation);

  res.json({ success: true, reservation });
});

// ============================================
// ROOM MAPPING MANAGEMENT
// ============================================

// Get room mappings
app.get('/api/mappings', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const mappings = [];

  for (const [connectionId, mapping] of roomMappings) {
    if (connectionId.endsWith(businessId)) {
      mappings.push({ connectionId, mapping });
    }
  }

  res.json({ mappings });
});

// Set room mappings
app.post('/api/mappings', requireAuth, (req, res) => {
  const { channelId, mappings } = req.body;
  if (!channelId || !mappings) {
    return res.status(400).json({ error: 'channelId and mappings required' });
  }

  const businessId = req.session.businessId;
  const connectionId = `${channelId}_${businessId}`;

  roomMappings.set(connectionId, mappings);

  res.json({ success: true, channelId, mappingsCount: mappings.length });
});

// ============================================
// SYNC MANAGEMENT
// ============================================

// Trigger manual sync
app.post('/api/sync/trigger', requireAuth, (req, res) => {
  const { channelIds, type } = req.body;
  const businessId = req.session.businessId;
  const businessChannels = connectedChannels.get(businessId);
  const targetChannels = channelIds || (businessChannels ? Array.from(businessChannels.keys()) : []);

  const results = [];

  for (const channelId of targetChannels) {
    const connectionId = `${channelId}_${businessId}`;
    const channel = channels.get(connectionId);

    if (!channel || channel.status !== 'connected') {
      results.push({ channelId, status: 'skipped', reason: 'Not connected' });
      continue;
    }

    results.push({
      channelId,
      channelName: channel.channelName,
      status: 'triggered',
      type: type || 'full',
      triggeredAt: new Date().toISOString()
    });
  }

  res.json({ success: true, results });
});

// Get sync history
app.get('/api/sync/history', requireAuth, (req, res) => {
  const { channelId, limit = 50 } = req.query;
  const businessId = req.session.businessId;

  let logs = Array.from(syncLogs.values())
    .filter(log => log.businessId === businessId);

  if (channelId) {
    logs = logs.filter(log => log.channels.includes(channelId));
  }

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  logs = logs.slice(0, parseInt(limit));

  res.json({ logs, count: logs.length });
});

// Get sync status
app.get('/api/sync/status', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const businessChannels = connectedChannels.get(businessId);

  if (!businessChannels) {
    return res.json({ channels: [] });
  }

  const status = Array.from(businessChannels.values()).map(ch => ({
    channelId: ch.channelId,
    channelName: ch.channelName,
    status: ch.status,
    lastSync: ch.lastSync,
    syncInterval: ch.syncInterval,
    autoSync: ch.autoSync,
    nextScheduledSync: ch.lastSync
      ? new Date(new Date(ch.lastSync).getTime() + ch.syncInterval * 60 * 1000).toISOString()
      : null
  }));

  res.json({ channels: status });
});

// ============================================
// REPORTING
// ============================================

// Channel performance report
app.get('/api/reports/performance', requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;
  const businessId = req.session.businessId;

  const reservations = Array.from(otaReservations.values())
    .filter(r => r.businessId === businessId);

  const filtered = reservations.filter(r => {
    if (startDate && r.checkIn < startDate) return false;
    if (endDate && r.checkOut > endDate) return false;
    return true;
  });

  // Calculate metrics by channel
  const byChannel = {};
  for (const res of filtered) {
    if (!byChannel[res.channelId]) {
      byChannel[res.channelId] = {
        channelId: res.channelId,
        channelName: res.channelName || res.channelId,
        totalReservations: 0,
        confirmed: 0,
        cancelled: 0,
        totalRevenue: 0,
        avgBookingValue: 0
      };
    }
    byChannel[res.channelId].totalReservations++;
    if (res.status === 'confirmed') byChannel[res.channelId].confirmed++;
    if (res.status === 'cancelled') byChannel[res.channelId].cancelled++;
    byChannel[res.channelId].totalRevenue += res.totalAmount || 0;
  }

  for (const ch of Object.values(byChannel)) {
    ch.avgBookingValue = ch.totalReservations > 0
      ? ch.totalRevenue / ch.totalReservations
      : 0;
  }

  res.json({
    period: { startDate, endDate },
    summary: {
      totalReservations: filtered.length,
      confirmed: filtered.filter(r => r.status === 'confirmed').length,
      cancelled: filtered.filter(r => r.status === 'cancelled').length,
      totalRevenue: filtered.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
    },
    byChannel: Object.values(byChannel)
  });
});

// ============================================
// WEBHOOKS (For OTA callbacks)
// ============================================

// Receive reservation notifications
app.post('/webhooks/reservations', (req, res) => {
  const { channelId, reservations } = req.body;

  if (!reservations || !Array.isArray(reservations)) {
    return res.status(400).json({ error: 'reservations array required' });
  }

  for (const res of reservations) {
    const resId = `ota_${res.confirmationNumber}`;
    otaReservations.set(resId, {
      ...res,
      channelId,
      channelName: channelConfigs[channelId]?.name || channelId,
      receivedAt: new Date().toISOString()
    });
  }

  res.json({ received: reservations.length });
});

// Receive availability updates from OTA
app.post('/webhooks/availability', (req, res) => {
  const { channelId, availability } = req.body;
  // Process availability updates
  res.json({ success: true, processed: availability?.length || 0 });
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const reservations = Array.from(otaReservations.values())
    .filter(r => r.businessId === businessId);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = reservations.filter(r => r.checkIn.startsWith(today.slice(0, 7)));

  res.json({
    overview: {
      totalReservations: reservations.length,
      pendingConfirmation: reservations.filter(r => r.status === 'pending').length,
      confirmed: reservations.filter(r => r.status === 'confirmed').length,
      cancelled: reservations.filter(r => r.status === 'cancelled').length,
      totalRevenue: reservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
    },
    thisMonth: {
      reservations: thisMonth.length,
      revenue: thisMonth.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
      avgValue: thisMonth.length > 0
        ? thisMonth.reduce((sum, r) => sum + (r.totalAmount || 0), 0) / thisMonth.length
        : 0
    },
    connectedChannels: connectedChannels.has(businessId)
      ? connectedChannels.get(businessId).size
      : 0
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'StayOwn Channel Manager',
    port: PORT,
    channels: channels.size,
    reservations: otaReservations.size,
    syncLogs: syncLogs.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateSimulatedReservations(channelId, businessId) {
  const channelName = channelConfigs[channelId]?.name || channelId;
  const count = Math.floor(Math.random() * 3); // 0-2 new reservations

  const reservations = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const checkIn = new Date(today);
    checkIn.setDate(checkIn.getDate() + Math.floor(Math.random() * 30) + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 5) + 1);

    const guestName = ['John Smith', 'Maria Garcia', 'Raj Patel', 'Emma Wilson', 'Wei Chen'][Math.floor(Math.random() * 5)];

    reservations.push({
      id: `ota_${Date.now()}_${i}`,
      confirmationNumber: `${channelId.toUpperCase().slice(0, 3)}${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      channelId,
      channelName,
      businessId,
      guestName,
      guestEmail: guestName.toLowerCase().replace(' ', '.') + '@email.com',
      guestPhone: '+1-555-' + Math.floor(Math.random() * 9000 + 1000),
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      nights: Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)),
      roomId: 'room_' + (Math.floor(Math.random() * 20) + 101),
      roomType: ['rt_standard', 'rt_deluxe', 'rt_suite'][Math.floor(Math.random() * 3)],
      adults: Math.floor(Math.random() * 2) + 1,
      children: Math.floor(Math.random() * 2),
      totalAmount: Math.floor(Math.random() * 500 + 100),
      currency: 'USD',
      commission: Math.floor(Math.random() * 30 + 10),
      status: 'pending',
      specialRequests: '',
      createdAt: new Date().toISOString()
    });
  }

  return reservations;
}

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log('🔗 StayOwn Channel Manager running on port ' + PORT);
  console.log('📡 Supported OTAs: ' + Object.keys(channelConfigs).join(', '));
});
