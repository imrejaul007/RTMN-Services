/**
 * Entertainment OS
 * Port: 5200
 * Industry: entertainment
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5200;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());


// ============= AUTH + DATABASE =============
const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require('crypto');

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;
const CRM_HUB_URL = process.env.CRM_HUB_URL || 'http://localhost:4056';
const SERVICE_NAME = process.env.SERVICE_NAME || 'Entertainment OS';

async function initDatabase() {
  if (!MONGODB_URI) {
    console.log('⚠️  MONGODB_URI not set. Running in demo mode (in-memory).');
    return;
  }
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected for', SERVICE_NAME);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password, role, businessName } = req.body;
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
    role: role || 'owner',
    name: businessName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, ...session });
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

async function syncCustomerToCRM(customer, businessId) {
  if (!dbConnected) return;
  try {
    await fetch(`${CRM_HUB_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        industry: 'entertainment',
        businessId,
        loyaltyPoints: customer.loyaltyPoints || 0,
        tier: customer.tier || 'bronze',
      }),
    });
  } catch (err) {
    console.warn('CRM sync failed:', err.message);
  }
}

// ============= END AUTH + DATABASE =============

// ============= ENTERTAINMENT OS DATA =============
const events = new Map();
const venues = new Map();
const tickets = new Map();
const attendees = new Map();

// ============= END DATA =============

// ============= TWINS =============
const eventTwin = new Map();
const venueTwin = new Map();
const ticketTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/events', (req, res) => {
  res.json({ events: Array.from(events.values()) });
});

app.post('/api/events', requireAuth, (req, res) => {
  const event = { id: 'event_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  events.set(event.id, event);
  res.json(event);
});

app.get('/api/events/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  res.json(event);
});

app.put('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  if (event.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  events.set(req.params.id, { ...event, ...req.body });
  res.json(events.get(req.params.id));
});

app.delete('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  if (event.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  events.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/venues', (req, res) => {
  res.json({ venues: Array.from(venues.values()) });
});

app.post('/api/venues', requireAuth, (req, res) => {
  const venue = { id: 'venue_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  venues.set(venue.id, venue);
  res.json(venue);
});

app.get('/api/venues/:id', (req, res) => {
  const venue = venues.get(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Not found' });
  res.json(venue);
});

app.put('/api/venues/:id', requireAuth, (req, res) => {
  const venue = venues.get(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Not found' });
  if (venue.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  venues.set(req.params.id, { ...venue, ...req.body });
  res.json(venues.get(req.params.id));
});

app.delete('/api/venues/:id', requireAuth, (req, res) => {
  const venue = venues.get(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Not found' });
  if (venue.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  venues.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/tickets', (req, res) => {
  res.json({ tickets: Array.from(tickets.values()) });
});

app.post('/api/tickets', requireAuth, (req, res) => {
  const ticket = { id: 'ticket_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  tickets.set(ticket.id, ticket);
  res.json(ticket);
});

app.get('/api/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  res.json(ticket);
});

app.put('/api/tickets/:id', requireAuth, (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  if (ticket.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  tickets.set(req.params.id, { ...ticket, ...req.body });
  res.json(tickets.get(req.params.id));
});

app.delete('/api/tickets/:id', requireAuth, (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  if (ticket.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  tickets.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/attendees', (req, res) => {
  res.json({ attendees: Array.from(attendees.values()) });
});

app.post('/api/attendees', requireAuth, (req, res) => {
  const attendee = { id: 'attendee_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  attendees.set(attendee.id, attendee);
  res.json(attendee);
});

app.get('/api/attendees/:id', (req, res) => {
  const attendee = attendees.get(req.params.id);
  if (!attendee) return res.status(404).json({ error: 'Not found' });
  res.json(attendee);
});

app.put('/api/attendees/:id', requireAuth, (req, res) => {
  const attendee = attendees.get(req.params.id);
  if (!attendee) return res.status(404).json({ error: 'Not found' });
  if (attendee.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  attendees.set(req.params.id, { ...attendee, ...req.body });
  res.json(attendees.get(req.params.id));
});

app.delete('/api/attendees/:id', requireAuth, (req, res) => {
  const attendee = attendees.get(req.params.id);
  if (!attendee) return res.status(404).json({ error: 'Not found' });
  if (attendee.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  attendees.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    eventCount: events.size, venueCount: venues.size, ticketCount: tickets.size, attendeeCount: attendees.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { event: Array.from(eventTwin.values()), venue: Array.from(venueTwin.values()), ticket: Array.from(ticketTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ Entertainment OS running on port ${PORT}`));

