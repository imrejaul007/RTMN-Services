/**
 * Entertainment OS - AI Company Platform
 *
 * Complete Event/Entertainment Management System
 *
 * Port: 5200
 * Industry: Entertainment
 *
 * Features:
 * - Event Management (concerts, festivals, shows)
 * - Venue/Stage Management
 * - Artist/Performer Management
 * - Ticket Sales & Booking
 * - Vendor Management
 * - Event Staff/Volunteers
 * - Equipment/Rigging Inventory
 * - Ticket Pricing & Packages
 * - Analytics
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 5200;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory data stores
const authUsers = new Map();
const authSessions = new Map();
const events = new Map();
const venues = new Map();
const artists = new Map();
const tickets = new Map();
const vendors = new Map();
const staffMembers = new Map();
const equipment = new Map();
const bookings = new Map();
const packages = new Map();

// Initialize sample data
function initializeSampleData() {
  // Sample Venues
  venues.set('venue-1', {
    id: 'venue-1',
    name: 'Grand Arena Stadium',
    type: 'stadium',
    capacity: 50000,
    address: '123 Stadium Blvd, Metro City',
    amenities: ['VIP Boxes', 'Parking', 'Food Court', 'Restrooms', 'Medical'],
    stageArea: 5000,
    backstageAreas: 3,
    soundSystem: 'L-Acoustics K2',
    lightingSystem: 'MA Lighting GrandMA3',
    hourlyRate: 50000,
    dailyRate: 400000,
    createdAt: new Date().toISOString()
  });

  venues.set('venue-2', {
    id: 'venue-2',
    name: 'Theater Royale',
    type: 'theater',
    capacity: 2000,
    address: '456 Broadway Ave, Arts District',
    amenities: ['Premium Seating', 'Wheelchair Access', 'Concession Stands'],
    stageArea: 800,
    backstageAreas: 2,
    soundSystem: 'JBL VTX',
    lightingSystem: 'ETC EOS',
    hourlyRate: 8000,
    dailyRate: 65000,
    createdAt: new Date().toISOString()
  });

  venues.set('venue-3', {
    id: 'venue-3',
    name: 'Riverside Amphitheater',
    type: 'amphitheater',
    capacity: 10000,
    address: '789 River Road, Waterfront',
    amenities: ['Lawn Seating', 'Picnic Areas', 'Shuttle Service'],
    stageArea: 2000,
    backstageAreas: 2,
    soundSystem: 'd&b Audiotechnik',
    lightingSystem: 'Chamsys MagicQ',
    hourlyRate: 15000,
    dailyRate: 120000,
    createdAt: new Date().toISOString()
  });

  // Sample Artists
  artists.set('artist-1', {
    id: 'artist-1',
    name: 'Neon Pulse',
    type: 'band',
    genre: 'Electronic Rock',
    members: 5,
    fee: 150000,
    popularity: 9,
    socialFollowers: 2500000,
    requirements: ['Full PA System', 'LED Screen 20x12ft', 'Fog Machines'],
    contact: { name: 'Mike Chen', email: 'mike@neonpulse.com', phone: '+1-555-0101' },
    createdAt: new Date().toISOString()
  });

  artists.set('artist-2', {
    id: 'artist-2',
    name: 'Sofia Martinez',
    type: 'solo',
    genre: 'Latin Pop',
    members: 1,
    fee: 80000,
    popularity: 8,
    socialFollowers: 5000000,
    requirements: ['Professional Monitor System', 'Backup Band'],
    contact: { name: 'Sofia Martinez', email: 'sofia@management.com', phone: '+1-555-0102' },
    createdAt: new Date().toISOString()
  });

  artists.set('artist-3', {
    id: 'artist-3',
    name: 'The Jazz Collective',
    type: 'band',
    genre: 'Jazz Fusion',
    members: 7,
    fee: 45000,
    popularity: 7,
    socialFollowers: 500000,
    requirements: ['Upright Piano', 'Acoustic Treatment'],
    contact: { name: 'James Wilson', email: 'james@jazzcollective.com', phone: '+1-555-0103' },
    createdAt: new Date().toISOString()
  });

  artists.set('artist-4', {
    id: 'artist-4',
    name: 'Rhythm Nation Dance Crew',
    type: 'dance',
    genre: 'Hip Hop',
    members: 8,
    fee: 60000,
    popularity: 8,
    socialFollowers: 3000000,
    requirements: ['Dance Floor', 'Mirrored Ceiling', 'Spotlights'],
    contact: { name: 'Aisha Thompson', email: 'aisha@rhythmnation.com', phone: '+1-555-0104' },
    createdAt: new Date().toISOString()
  });

  // Sample Events
  events.set('event-1', {
    id: 'event-1',
    name: 'Summer Beats Festival 2026',
    type: 'festival',
    description: 'Three-day outdoor music festival featuring top electronic artists',
    date: '2026-07-15',
    time: '14:00',
    duration: 10,
    venueId: 'venue-3',
    artistIds: ['artist-1', 'artist-2'],
    status: 'confirmed',
    expectedAttendance: 8500,
    ticketSales: 6200,
    revenue: 620000,
    budget: 500000,
    sponsorshipDeals: 3,
    marketingSpend: 50000,
    createdAt: new Date().toISOString()
  });

  events.set('event-2', {
    id: 'event-2',
    name: 'Sofia Martinez World Tour',
    type: 'concert',
    description: 'Latin pop sensation Sofia Martinez live in concert',
    date: '2026-08-20',
    time: '20:00',
    duration: 3,
    venueId: 'venue-1',
    artistIds: ['artist-2'],
    status: 'confirmed',
    expectedAttendance: 45000,
    ticketSales: 38000,
    revenue: 3800000,
    budget: 1200000,
    sponsorshipDeals: 5,
    marketingSpend: 200000,
    createdAt: new Date().toISOString()
  });

  events.set('event-3', {
    id: 'event-3',
    name: 'Jazz Under the Stars',
    type: 'concert',
    description: 'Intimate evening of jazz fusion with The Jazz Collective',
    date: '2026-06-25',
    time: '19:30',
    duration: 2,
    venueId: 'venue-2',
    artistIds: ['artist-3'],
    status: 'confirmed',
    expectedAttendance: 1500,
    ticketSales: 1200,
    revenue: 60000,
    budget: 40000,
    sponsorshipDeals: 1,
    marketingSpend: 5000,
    createdAt: new Date().toISOString()
  });

  events.set('event-4', {
    id: 'event-4',
    name: 'Urban Dance Championship',
    type: 'competition',
    description: 'National hip-hop dance competition with top crews',
    date: '2026-09-10',
    time: '18:00',
    duration: 6,
    venueId: 'venue-2',
    artistIds: ['artist-4'],
    status: 'planning',
    expectedAttendance: 1800,
    ticketSales: 0,
    revenue: 0,
    budget: 80000,
    sponsorshipDeals: 2,
    marketingSpend: 0,
    createdAt: new Date().toISOString()
  });

  events.set('event-5', {
    id: 'event-5',
    name: 'Neon Nights Finale',
    type: 'concert',
    description: 'Grand finale of Neon Pulse world tour with special guests',
    date: '2026-10-31',
    time: '21:00',
    duration: 4,
    venueId: 'venue-1',
    artistIds: ['artist-1', 'artist-4'],
    status: 'planning',
    expectedAttendance: 48000,
    ticketSales: 0,
    revenue: 0,
    budget: 2000000,
    sponsorshipDeals: 0,
    marketingSpend: 0,
    createdAt: new Date().toISOString()
  });

  // Sample Tickets
  tickets.set('ticket-1', {
    id: 'ticket-1',
    eventId: 'event-1',
    type: 'general',
    name: 'General Admission',
    price: 75,
    quantity: 5000,
    sold: 3500,
    available: 1500,
    benefits: ['Festival Access', 'Food Court Access'],
    createdAt: new Date().toISOString()
  });

  tickets.set('ticket-2', {
    id: 'ticket-2',
    eventId: 'event-1',
    type: 'vip',
    name: 'VIP Experience',
    price: 200,
    quantity: 300,
    sold: 280,
    available: 20,
    benefits: ['VIP Viewing Area', 'Open Bar', 'Meet & Greet', 'Premium Parking'],
    createdAt: new Date().toISOString()
  });

  tickets.set('ticket-3', {
    id: 'ticket-3',
    eventId: 'event-2',
    type: 'general',
    name: 'Standard Seating',
    price: 85,
    quantity: 40000,
    sold: 33000,
    available: 7000,
    benefits: ['Event Access', 'Digital Program'],
    createdAt: new Date().toISOString()
  });

  // Sample Vendors
  vendors.set('vendor-1', {
    id: 'vendor-1',
    name: 'ProSound Rentals',
    type: 'audio',
    services: ['PA System', 'Monitors', 'Mixing Console'],
    hourlyRate: 500,
    dailyRate: 3500,
    rating: 4.8,
    contact: { name: 'David Kim', email: 'david@prosound.com', phone: '+1-555-0201' },
    createdAt: new Date().toISOString()
  });

  vendors.set('vendor-2', {
    id: 'vendor-2',
    name: 'StageCraft Productions',
    type: 'lighting',
    services: ['Stage Lighting', 'LED Screens', 'Rigging'],
    hourlyRate: 750,
    dailyRate: 5000,
    rating: 4.9,
    contact: { name: 'Lisa Wong', email: 'lisa@stagecraft.com', phone: '+1-555-0202' },
    createdAt: new Date().toISOString()
  });

  vendors.set('vendor-3', {
    id: 'vendor-3',
    name: 'CaterPro Events',
    type: 'catering',
    services: ['Corporate Catering', 'VIP Dining', 'Concession Stands'],
    hourlyRate: 300,
    dailyRate: 2500,
    rating: 4.6,
    contact: { name: 'Maria Garcia', email: 'maria@caterpro.com', phone: '+1-555-0203' },
    createdAt: new Date().toISOString()
  });

  // Sample Equipment
  equipment.set('equip-1', {
    id: 'equip-1',
    name: 'L-Acoustics K2 Line Array',
    type: 'audio',
    quantity: 48,
    available: 48,
    condition: 'excellent',
    lastMaintenance: '2026-05-01',
    rentalPrice: 5000,
    createdAt: new Date().toISOString()
  });

  equipment.set('equip-2', {
    id: 'equip-2',
    name: 'MA Lighting GrandMA3',
    type: 'lighting',
    quantity: 4,
    available: 4,
    condition: 'excellent',
    lastMaintenance: '2026-05-15',
    rentalPrice: 1500,
    createdAt: new Date().toISOString()
  });

  equipment.set('equip-3', {
    id: 'equip-3',
    name: 'LED Video Wall 20x12ft',
    type: 'av',
    quantity: 6,
    available: 6,
    condition: 'good',
    lastMaintenance: '2026-04-20',
    rentalPrice: 3000,
    createdAt: new Date().toISOString()
  });

  // Sample Users
  authUsers.set('admin@entertainment.com', {
    id: 'user-1',
    email: 'admin@entertainment.com',
    password: 'admin123',
    role: 'admin',
    name: 'Event Admin'
  });

  authUsers.set('user@entertainment.com', {
    id: 'user-2',
    email: 'user@entertainment.com',
    password: 'user123',
    role: 'user',
    name: 'Demo User'
  });

  logger.info('Sample data initialized successfully');
}

// Initialize data
initializeSampleData();

// Auth Middleware
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !authSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid session required' });
  }
  req.user = authSessions.get(sessionId);
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'entertainment-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      events: events.size,
      venues: venues.size,
      artists: artists.size,
      tickets: tickets.size,
      vendors: vendors.size,
      equipment: equipment.size
    }
  });
});

// RTMN Layer Integration
app.get('/api/layers', (req, res) => {
  res.json({
    layers: [
      { layer: 1, name: 'Intelligence', provider: 'HOJAI AI', available: true },
      { layer: 2, name: 'Customer Growth', provider: 'AdBazaar', available: true },
      { layer: 3, name: 'Commerce', provider: 'Nexha + REZ-Merchant', available: true },
      { layer: 4, name: 'Financial', provider: 'RABTUL', available: true },
      { layer: 5, name: 'Workforce', provider: 'CorpPerks', available: true },
      { layer: 6, name: 'Legal & Trust', provider: 'LawGens', available: true },
      { layer: 7, name: 'Property', provider: 'RisnaEstate + StayOwn', available: true },
      { layer: 8, name: 'Health', provider: 'RisaCare', available: true },
      { layer: 9, name: 'Mobility', provider: 'KHAIRMOVE', available: true },
      { layer: 10, name: 'Identity', provider: 'CorpID', available: true },
      { layer: 11, name: 'Memory', provider: 'MemoryOS', available: true },
      { layer: 12, name: 'Twins', provider: 'TwinOS Hub', available: true },
      { layer: 13, name: 'Automation', provider: 'FlowOS', available: true },
      { layer: 14, name: 'Autonomous', provider: 'SUTAR OS', available: true },
      { layer: 15, name: 'Network', provider: 'REZ Consumer + Axom', available: true }
    ]
  });
});

app.get('/api/layer/:layer', (req, res) => {
  const layerNum = parseInt(req.params.layer);
  const layerInfo = {
    1: { name: 'Intelligence', provider: 'HOJAI AI', endpoints: ['/api/intelligence/predict', '/api/intelligence/analyze'] },
    2: { name: 'Customer Growth', provider: 'AdBazaar', endpoints: ['/api/crm/target', '/api/ads/campaigns'] },
    3: { name: 'Commerce', provider: 'Nexha + REZ-Merchant', endpoints: ['/api/tickets/sell', '/api/payments'] },
    4: { name: 'Financial', provider: 'RABTUL', endpoints: ['/api/wallet', '/api/payments/escrow'] },
    5: { name: 'Workforce', provider: 'CorpPerks', endpoints: ['/api/staff/schedule', '/api/payroll'] },
    6: { name: 'Legal & Trust', provider: 'LawGens', endpoints: ['/api/contracts', '/api/compliance'] },
    7: { name: 'Property', provider: 'RisnaEstate + StayOwn', endpoints: ['/api/venues'] },
    8: { name: 'Health', provider: 'RisaCare', endpoints: ['/api/health/safety'] },
    9: { name: 'Mobility', provider: 'KHAIRMOVE', endpoints: ['/api/transport'] },
    10: { name: 'Identity', provider: 'CorpID', endpoints: ['/api/auth/verify', '/api/tickets/validate'] },
    11: { name: 'Memory', provider: 'MemoryOS', endpoints: ['/api/memory/events'] },
    12: { name: 'Twins', provider: 'TwinOS Hub', endpoints: ['/api/twins/event', '/api/twins/artist'] },
    13: { name: 'Automation', provider: 'FlowOS', endpoints: ['/api/workflows'] },
    14: { name: 'Autonomous', provider: 'SUTAR OS', endpoints: ['/api/goals', '/api/decisions'] },
    15: { name: 'Network', provider: 'REZ Consumer + Axom', endpoints: ['/api/discovery', '/api/referrals'] }
  };

  const info = layerInfo[layerNum];
  if (!info) {
    return res.status(404).json({ error: 'Layer not found' });
  }
  res.json({ layer: layerNum, ...info, available: true });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (authUsers.has(email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  const userId = `user-${Date.now()}`;
  authUsers.set(email, { id: userId, email, password, role: 'user', name });
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  authSessions.set(sessionId, { id: userId, email, role: 'user', name });
  res.json({ sessionId, user: { id: userId, email, role: 'user', name } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  authSessions.set(sessionId, { id: user.id, email: user.email, role: user.role, name: user.name });
  res.json({ sessionId, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const sessionId = req.headers['x-session-id'];
  authSessions.delete(sessionId);
  res.json({ message: 'Logged out successfully' });
});

// Events CRUD
app.get('/api/events', (req, res) => {
  const eventList = Array.from(events.values());
  res.json({ events: eventList, total: eventList.length });
});

app.get('/api/events/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // Enrich with venue and artist data
  const enrichedEvent = {
    ...event,
    venue: venues.get(event.venueId),
    artists: event.artistIds.map(id => artists.get(id)).filter(Boolean),
    tickets: Array.from(tickets.values()).filter(t => t.eventId === event.id)
  };

  res.json({ event: enrichedEvent });
});

app.post('/api/events', requireAuth, (req, res) => {
  const { name, type, description, date, time, duration, venueId, artistIds, status, budget } = req.body;

  if (!name || !type || !date || !venueId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = `event-${Date.now()}`;
  const event = {
    id,
    name,
    type,
    description: description || '',
    date,
    time: time || '20:00',
    duration: duration || 3,
    venueId,
    artistIds: artistIds || [],
    status: status || 'planning',
    expectedAttendance: 0,
    ticketSales: 0,
    revenue: 0,
    budget: budget || 0,
    sponsorshipDeals: 0,
    marketingSpend: 0,
    createdAt: new Date().toISOString()
  };

  events.set(id, event);
  logger.info(`Event created: ${name} (${id})`);
  res.status(201).json({ event });
});

app.put('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const updated = { ...event, ...req.body, id: event.id };
  events.set(req.params.id, updated);
  logger.info(`Event updated: ${updated.name} (${updated.id})`);
  res.json({ event: updated });
});

app.delete('/api/events/:id', requireAuth, (req, res) => {
  if (!events.has(req.params.id)) {
    return res.status(404).json({ error: 'Event not found' });
  }
  events.delete(req.params.id);
  logger.info(`Event deleted: ${req.params.id}`);
  res.json({ message: 'Event deleted successfully' });
});

// Venues CRUD
app.get('/api/venues', (req, res) => {
  const venueList = Array.from(venues.values());
  res.json({ venues: venueList, total: venueList.length });
});

app.get('/api/venues/:id', (req, res) => {
  const venue = venues.get(req.params.id);
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' });
  }
  res.json({ venue });
});

app.post('/api/venues', requireAuth, (req, res) => {
  const { name, type, capacity, address, amenities, hourlyRate, dailyRate } = req.body;

  if (!name || !type || !capacity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = `venue-${Date.now()}`;
  const venue = {
    id,
    name,
    type,
    capacity,
    address: address || '',
    amenities: amenities || [],
    stageArea: 0,
    backstageAreas: 1,
    soundSystem: '',
    lightingSystem: '',
    hourlyRate: hourlyRate || 0,
    dailyRate: dailyRate || 0,
    createdAt: new Date().toISOString()
  };

  venues.set(id, venue);
  logger.info(`Venue created: ${name} (${id})`);
  res.status(201).json({ venue });
});

// Artists CRUD
app.get('/api/artists', (req, res) => {
  const artistList = Array.from(artists.values());
  res.json({ artists: artistList, total: artistList.length });
});

app.get('/api/artists/:id', (req, res) => {
  const artist = artists.get(req.params.id);
  if (!artist) {
    return res.status(404).json({ error: 'Artist not found' });
  }
  res.json({ artist });
});

app.post('/api/artists', requireAuth, (req, res) => {
  const { name, type, genre, members, fee, requirements } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = `artist-${Date.now()}`;
  const artist = {
    id,
    name,
    type,
    genre: genre || '',
    members: members || 1,
    fee: fee || 0,
    popularity: 5,
    socialFollowers: 0,
    requirements: requirements || [],
    contact: { name: '', email: '', phone: '' },
    createdAt: new Date().toISOString()
  };

  artists.set(id, artist);
  logger.info(`Artist created: ${name} (${id})`);
  res.status(201).json({ artist });
});

// Tickets CRUD
app.get('/api/tickets', (req, res) => {
  const { eventId } = req.query;
  let ticketList = Array.from(tickets.values());
  if (eventId) {
    ticketList = ticketList.filter(t => t.eventId === eventId);
  }
  res.json({ tickets: ticketList, total: ticketList.length });
});

app.post('/api/tickets', requireAuth, (req, res) => {
  const { eventId, type, name, price, quantity, benefits } = req.body;

  if (!eventId || !type || !name || price === undefined || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = `ticket-${Date.now()}`;
  const ticket = {
    id,
    eventId,
    type,
    name,
    price,
    quantity,
    sold: 0,
    available: quantity,
    benefits: benefits || [],
    createdAt: new Date().toISOString()
  };

  tickets.set(id, ticket);
  logger.info(`Ticket created: ${name} for event ${eventId}`);
  res.status(201).json({ ticket });
});

// Book tickets
app.post('/api/tickets/:id/purchase', (req, res) => {
  const { quantity = 1 } = req.body;
  const ticket = tickets.get(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  if (ticket.available < quantity) {
    return res.status(400).json({ error: 'Not enough tickets available' });
  }

  ticket.sold += quantity;
  ticket.available -= quantity;
  tickets.set(ticket.id, ticket);

  // Update event revenue
  const event = events.get(ticket.eventId);
  if (event) {
    event.ticketSales += quantity;
    event.revenue += ticket.price * quantity;
    events.set(event.id, event);
  }

  const bookingId = `booking-${Date.now()}`;
  const booking = {
    id: bookingId,
    ticketId: ticket.id,
    eventId: ticket.eventId,
    quantity,
    totalPrice: ticket.price * quantity,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  bookings.set(bookingId, booking);

  logger.info(`Tickets purchased: ${quantity}x ${ticket.name} for ${booking.totalPrice}`);
  res.json({ booking, ticket });
});

// Vendors CRUD
app.get('/api/vendors', (req, res) => {
  const { type } = req.query;
  let vendorList = Array.from(vendors.values());
  if (type) {
    vendorList = vendorList.filter(v => v.type === type);
  }
  res.json({ vendors: vendorList, total: vendorList.length });
});

app.post('/api/vendors', requireAuth, (req, res) => {
  const { name, type, services, hourlyRate, dailyRate, contact } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = `vendor-${Date.now()}`;
  const vendor = {
    id,
    name,
    type,
    services: services || [],
    hourlyRate: hourlyRate || 0,
    dailyRate: dailyRate || 0,
    rating: 0,
    contact: contact || { name: '', email: '', phone: '' },
    createdAt: new Date().toISOString()
  };

  vendors.set(id, vendor);
  logger.info(`Vendor created: ${name} (${id})`);
  res.status(201).json({ vendor });
});

// Equipment CRUD
app.get('/api/equipment', (req, res) => {
  const { type } = req.query;
  let equipList = Array.from(equipment.values());
  if (type) {
    equipList = equipList.filter(e => e.type === type);
  }
  res.json({ equipment: equipList, total: equipList.length });
});

app.post('/api/equipment', requireAuth, (req, res) => {
  const { name, type, quantity, rentalPrice, condition } = req.body;

  if (!name || !type || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = `equip-${Date.now()}`;
  const equip = {
    id,
    name,
    type,
    quantity,
    available: quantity,
    condition: condition || 'good',
    lastMaintenance: new Date().toISOString().split('T')[0],
    rentalPrice: rentalPrice || 0,
    createdAt: new Date().toISOString()
  };

  equipment.set(id, equip);
  logger.info(`Equipment created: ${name} (${id})`);
  res.status(201).json({ equipment: equip });
});

// Staff/Volunteers
app.get('/api/staff', (req, res) => {
  const staffList = Array.from(staffMembers.values());
  res.json({ staff: staffList, total: staffList.length });
});

app.post('/api/staff', requireAuth, (req, res) => {
  const { name, role, email, phone, eventId, skills } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = `staff-${Date.now()}`;
  const member = {
    id,
    name,
    role,
    email: email || '',
    phone: phone || '',
    eventId: eventId || null,
    skills: skills || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };

  staffMembers.set(id, member);
  logger.info(`Staff member added: ${name} (${id})`);
  res.status(201).json({ staff: member });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const eventList = Array.from(events.values());
  const totalRevenue = eventList.reduce((sum, e) => sum + (e.revenue || 0), 0);
  const totalTicketsSold = eventList.reduce((sum, e) => sum + (e.ticketSales || 0), 0);
  const confirmedEvents = eventList.filter(e => e.status === 'confirmed').length;
  const planningEvents = eventList.filter(e => e.status === 'planning').length;

  res.json({
    analytics: {
      totalEvents: eventList.length,
      confirmedEvents,
      planningEvents,
      totalRevenue,
      totalTicketsSold,
      averageTicketPrice: totalTicketsSold > 0 ? Math.round(totalRevenue / totalTicketsSold) : 0,
      topPerformingEvent: eventList.sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0] || null,
      venuesCount: venues.size,
      artistsCount: artists.size,
      vendorsCount: vendors.size,
      equipmentCount: equipment.size
    },
    timestamp: new Date().toISOString()
  });
});

// Event-specific analytics
app.get('/api/events/:id/analytics', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const eventTickets = Array.from(tickets.values()).filter(t => t.eventId === event.id);
  const totalTickets = eventTickets.reduce((sum, t) => sum + t.quantity, 0);
  const soldTickets = eventTickets.reduce((sum, t) => sum + t.sold, 0);
  const capacityUtilization = event.expectedAttendance > 0
    ? Math.round((event.ticketSales / event.expectedAttendance) * 100)
    : 0;

  res.json({
    eventId: event.id,
    eventName: event.name,
    analytics: {
      ticketSales: {
        total: soldTickets,
        capacity: totalTickets,
        utilization: `${capacityUtilization}%`,
        revenue: event.revenue
      },
      budget: {
        allocated: event.budget,
        spent: event.revenue - (event.budget - event.revenue > 0 ? 0 : event.budget - event.revenue),
        remaining: event.budget - event.revenue
      },
      marketing: {
        spend: event.marketingSpend,
        deals: event.sponsorshipDeals
      },
      attendance: {
        expected: event.expectedAttendance,
        projected: event.ticketSales
      }
    },
    tickets: eventTickets,
    timestamp: new Date().toISOString()
  });
});

// Digital Twins endpoints
app.get('/api/twins', (req, res) => {
  res.json({
    twins: [
      { id: 'event-twin', name: 'Event Twin', entities: events.size },
      { id: 'venue-twin', name: 'Venue Twin', entities: venues.size },
      { id: 'artist-twin', name: 'Artist Twin', entities: artists.size },
      { id: 'ticket-twin', name: 'Ticket Twin', entities: tickets.size },
      { id: 'vendor-twin', name: 'Vendor Twin', entities: vendors.size },
      { id: 'equipment-twin', name: 'Equipment Twin', entities: equipment.size }
    ]
  });
});

app.get('/api/twins/:twin', (req, res) => {
  const twinName = req.params.twin;
  const twinMap = {
    'event-twin': events,
    'venue-twin': venues,
    'artist-twin': artists,
    'ticket-twin': tickets,
    'vendor-twin': vendors,
    'equipment-twin': equipment
  };

  const data = twinMap[twinName];
  if (!data) {
    return res.status(404).json({ error: 'Twin not found' });
  }

  res.json({ twin: twinName, entities: Array.from(data.values()), count: data.size });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Entertainment OS running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
