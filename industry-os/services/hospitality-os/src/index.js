/**
 * Hospitality OS - AI Company Platform
 *
 * Complete Hospitality & Event Management System
 * Port: 5050
 * Industry: Hospitality (Event Venues, Catering, Banquets, Conferences)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const INDUSTRY = 'hospitality';

// In-memory database
const clients = new Map();
const venues = new Map();
const events = new Map();
const eventBookings = new Map();
const staff = new Map();
const equipment = new Map();
const packages = new Map();
const invoices = new Map();
const payments = new Map();
const caterings = new Map();
const menus = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();

// Sample data - Venues (3)
const sampleVenues = [
  {
    id: 'VEN001',
    name: 'Grand Ballroom',
    type: 'ballroom',
    address: '45 Marine Drive, Mumbai',
    capacity: 500,
    area: 8000,
    rooms: 3,
    amenities: ['stage', 'sound_system', 'lighting', 'projector', 'parking', 'ac'],
    hourlyRate: 25000,
    dailyRate: 150000,
    status: 'available',
    rating: 4.8,
    image: '🏛️'
  },
  {
    id: 'VEN002',
    name: 'Garden Pavilion',
    type: 'outdoor',
    address: '12 Hilltop Gardens, Pune',
    capacity: 300,
    area: 5000,
    rooms: 1,
    amenities: ['stage', 'lighting', 'parking', 'gardens', 'tent_space'],
    hourlyRate: 15000,
    dailyRate: 80000,
    status: 'available',
    rating: 4.6,
    image: '🌳'
  },
  {
    id: 'VEN003',
    name: 'Conference Center Alpha',
    type: 'conference',
    address: '88 Tech Park, Bangalore',
    capacity: 150,
    area: 3000,
    rooms: 5,
    amenities: ['projector', 'whiteboard', 'video_conferencing', 'ac', 'wifi', 'parking'],
    hourlyRate: 8000,
    dailyRate: 50000,
    status: 'available',
    rating: 4.9,
    image: '🏢'
  }
];
sampleVenues.forEach(v => venues.set(v.id, v));

// Sample data - Events (4)
const sampleEvents = [
  {
    id: 'EVT001',
    name: 'TechCorp Annual Gala',
    type: 'corporate',
    clientId: 'CLI001',
    venueId: 'VEN001',
    date: '2024-06-20',
    startTime: '18:00',
    endTime: '23:00',
    expectedGuests: 350,
    status: 'confirmed',
    budget: 500000,
    description: 'Annual corporate celebration with awards ceremony',
    services: ['catering', 'decoration', 'photography', 'entertainment'],
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'EVT002',
    name: 'Sharma Wedding Reception',
    type: 'wedding',
    clientId: 'CLI002',
    venueId: 'VEN002',
    date: '2024-07-15',
    startTime: '19:00',
    endTime: '24:00',
    expectedGuests: 250,
    status: 'confirmed',
    budget: 800000,
    description: 'Grand wedding reception with live band',
    services: ['catering', 'decoration', 'photography', 'entertainment', 'flowers'],
    createdAt: '2024-02-20T14:15:00Z'
  },
  {
    id: 'EVT003',
    name: 'Startup Summit 2024',
    type: 'conference',
    clientId: 'CLI003',
    venueId: 'VEN003',
    date: '2024-08-10',
    startTime: '09:00',
    endTime: '18:00',
    expectedGuests: 120,
    status: 'planning',
    budget: 300000,
    description: 'Multi-session technology conference',
    services: ['catering', 'av_equipment', 'registration'],
    createdAt: '2024-03-01T09:00:00Z'
  },
  {
    id: 'EVT004',
    name: 'Birthday Celebration - Priya',
    type: 'birthday',
    clientId: 'CLI004',
    venueId: 'VEN001',
    date: '2024-06-25',
    startTime: '20:00',
    endTime: '23:30',
    expectedGuests: 100,
    status: 'confirmed',
    budget: 150000,
    description: 'Elegant birthday party with DJ',
    services: ['catering', 'decoration', 'entertainment'],
    createdAt: '2024-04-10T16:45:00Z'
  }
];
sampleEvents.forEach(e => events.set(e.id, e));

// Sample data - Staff (5)
const sampleStaff = [
  {
    id: 'STF001',
    name: 'Rajesh Kumar',
    role: 'event_coordinator',
    email: 'rajesh@hospitality.in',
    phone: '+91 98765 43210',
    experience: 8,
    hourlyRate: 1500,
    specialization: ['corporate_events', 'weddings'],
    availability: 'full_time',
    eventsCompleted: 245,
    rating: 4.9,
    status: 'active',
    avatar: '👔'
  },
  {
    id: 'STF002',
    name: 'Priya Sharma',
    role: 'catering_manager',
    email: 'priya.s@hospitality.in',
    phone: '+91 98765 43220',
    experience: 6,
    hourlyRate: 1200,
    specialization: ['catering', 'menu_planning'],
    availability: 'full_time',
    eventsCompleted: 180,
    rating: 4.8,
    status: 'active',
    avatar: '👩‍🍳'
  },
  {
    id: 'STF003',
    name: 'Amit Singh',
    role: 'technical_lead',
    email: 'amit.s@hospitality.in',
    phone: '+91 98765 43230',
    experience: 5,
    hourlyRate: 1000,
    specialization: ['av_equipment', 'lighting', 'sound'],
    availability: 'full_time',
    eventsCompleted: 150,
    rating: 4.7,
    status: 'active',
    avatar: '🔧'
  },
  {
    id: 'STF004',
    name: 'Neha Patel',
    role: 'decor_coordinator',
    email: 'neha.p@hospitality.in',
    phone: '+91 98765 43240',
    experience: 4,
    hourlyRate: 900,
    specialization: ['floral', 'theme_decoration', 'lighting_setup'],
    availability: 'part_time',
    eventsCompleted: 95,
    rating: 4.6,
    status: 'active',
    avatar: '🌸'
  },
  {
    id: 'STF005',
    name: 'Vikram Das',
    role: 'operations_manager',
    email: 'vikram.d@hospitality.in',
    phone: '+91 98765 43250',
    experience: 10,
    hourlyRate: 2000,
    specialization: ['logistics', 'vendor_management', 'staff_coordination'],
    availability: 'full_time',
    eventsCompleted: 350,
    rating: 4.9,
    status: 'active',
    avatar: '📋'
  }
];
sampleStaff.forEach(s => staff.set(s.id, s));

// Sample data - Packages (3)
const samplePackages = [
  {
    id: 'PKG001',
    name: 'Silver Celebration',
    type: 'standard',
    description: 'Perfect for intimate gatherings and small celebrations',
    price: 75000,
    duration: 4,
    maxGuests: 50,
    includes: [
      'Basic venue rental',
      'Standard catering (veg/non-veg buffet)',
      'Basic decoration',
      'Sound system',
      '1 event coordinator'
    ],
    addOns: [
      { name: 'Photography', price: 15000 },
      { name: 'Extra hour', price: 5000 },
      { name: 'Premium flowers', price: 8000 }
    ],
    status: 'active'
  },
  {
    id: 'PKG002',
    name: 'Gold Gala',
    type: 'premium',
    description: 'Ideal for corporate events and medium-sized celebrations',
    price: 200000,
    duration: 6,
    maxGuests: 150,
    includes: [
      'Premium venue rental',
      'Gourmet catering with live counters',
      'Theme decoration',
      'Full AV setup',
      '2 event coordinators',
      'Photography & videography',
      'Entertainment arrangement'
    ],
    addOns: [
      { name: 'Live band', price: 35000 },
      { name: 'Extra hour', price: 10000 },
      { name: 'VIP lounge', price: 20000 }
    ],
    status: 'active'
  },
  {
    id: 'PKG003',
    name: 'Platinum Elite',
    type: 'luxury',
    description: 'The ultimate experience for grand celebrations',
    price: 500000,
    duration: 8,
    maxGuests: 500,
    includes: [
      'Luxury venue (full property)',
      'Multi-cuisine gourmet catering',
      'Designer decoration & florals',
      'Complete AV with live streaming',
      'Full event team (5 coordinators)',
      'Professional photography team',
      'Multiple entertainment options',
      'Valet parking',
      'VIP hospitality suite'
    ],
    addOns: [
      { name: 'Celebrity performance', price: 150000 },
      { name: 'Fireworks display', price: 50000 },
      { name: 'Extra guests (per 50)', price: 25000 }
    ],
    status: 'active'
  }
];
samplePackages.forEach(p => packages.set(p.id, p));

// Sample data - Clients
const sampleClients = [
  { id: 'CLI001', name: 'TechCorp India', email: 'events@techcorp.in', phone: '+91 22 1234 5678', type: 'corporate', contactPerson: 'Ravi Mehta', totalEvents: 5, totalSpent: 1500000 },
  { id: 'CLI002', name: 'Sharma Family', email: 'arvind.sharma@email.com', phone: '+91 98200 12345', type: 'individual', contactPerson: 'Arvind Sharma', totalEvents: 1, totalSpent: 0 },
  { id: 'CLI003', name: 'StartupHub', email: 'hello@startuphub.in', phone: '+91 80 4567 8901', type: 'corporate', contactPerson: 'Sneha Reddy', totalEvents: 3, totalSpent: 450000 },
  { id: 'CLI004', name: 'Patel Family', email: 'meena.patel@email.com', phone: '+91 98210 67890', type: 'individual', contactPerson: 'Meena Patel', totalEvents: 2, totalSpent: 200000 }
];
sampleClients.forEach(c => clients.set(c.id, c));

// Sample data - Equipment
const sampleEquipment = [
  { id: 'EQP001', name: 'Professional Sound System', category: 'audio', quantity: 5, available: 5, dailyRate: 5000, status: 'available' },
  { id: 'EQP002', name: 'LED Display Screens', category: 'visual', quantity: 8, available: 8, dailyRate: 8000, status: 'available' },
  { id: 'EQP003', name: 'Stage Lighting Kit', category: 'lighting', quantity: 3, available: 3, dailyRate: 6000, status: 'available' },
  { id: 'EQP004', name: 'Projector & Screen', category: 'visual', quantity: 10, available: 10, dailyRate: 3000, status: 'available' },
  { id: 'EQP005', name: 'Chairs (500 pcs)', category: 'furniture', quantity: 500, available: 500, dailyRate: 2000, status: 'available' }
];
sampleEquipment.forEach(e => equipment.set(e.id, e));

// Sample data - Menus
const sampleMenus = [
  {
    id: 'MNU001',
    name: 'North Indian Delights',
    type: 'veg',
    categories: ['starters', 'mains', 'desserts'],
    items: [
      { category: 'starters', items: ['Paneer Tikka', 'Hara Bhara Kebab', 'Dahi Ke Kebab'] },
      { category: 'mains', items: ['Dal Makhani', 'Paneer Butter Masala', 'Biryani', 'Raita', 'Naan'] },
      { category: 'desserts', items: ['Gulab Jamun', 'Rasmalai', 'Ice Cream'] }
    ],
    pricePerPerson: 800,
    status: 'active'
  },
  {
    id: 'MNU002',
    name: 'Multi-Cuisine Premium',
    type: 'non_veg',
    categories: ['starters', 'mains', 'desserts'],
    items: [
      { category: 'starters', items: ['Chicken Tikka', 'Mutton Seekh Kebab', 'Fish Tikka', 'Paneer Tikka'] },
      { category: 'mains', items: ['Butter Chicken', 'Mutton Curry', 'Fish Curry', 'Biryani', 'Naan', 'Raita'] },
      { category: 'desserts', items: ['Kheer', 'Rasmalai', 'Ice Cream', 'Pastries'] }
    ],
    pricePerPerson: 1200,
    status: 'active'
  }
];
sampleMenus.forEach(m => menus.set(m.id, m));

// Sample data - Event Bookings
const sampleBookings = [
  { id: 'BKG001', eventId: 'EVT001', venueId: 'VEN001', packageId: 'PKG002', clientId: 'CLI001', status: 'confirmed', totalAmount: 250000, paidAmount: 150000, bookingDate: '2024-01-20' },
  { id: 'BKG002', eventId: 'EVT002', venueId: 'VEN002', packageId: 'PKG003', clientId: 'CLI002', status: 'confirmed', totalAmount: 550000, paidAmount: 200000, bookingDate: '2024-02-25' },
  { id: 'BKG003', eventId: 'EVT003', venueId: 'VEN003', packageId: 'PKG001', clientId: 'CLI003', status: 'planning', totalAmount: 180000, paidAmount: 50000, bookingDate: '2024-03-05' }
];
sampleBookings.forEach(b => eventBookings.set(b.id, b));

// Auth functions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { email, password, role, name, company } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  if (authUsers.has(email)) return res.status(409).json({ error: 'User exists' });
  const user = { id: 'user_' + Date.now(), email, passwordHash: hashPassword(password), role: role || 'client', name: name || email.split('@')[0], company: company || '', industry: INDUSTRY, createdAt: new Date().toISOString() };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid token' });
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid token' });
  req.session = session;
  next();
}

// ===== CLIENT MANAGEMENT =====
app.get('/api/clients', requireAuth, (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(clients.values());
  if (type) result = result.filter(c => c.type === type);
  if (status) result = result.filter(c => c.status === status);
  res.json({ success: true, count: result.length, clients: result });
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const clientEvents = Array.from(events.values()).filter(e => e.clientId === client.id);
  res.json({ success: true, client, events: clientEvents });
});

app.post('/api/clients', requireAuth, (req, res) => {
  const client = { id: 'CLI' + String(clients.size + 1).padStart(3, '0'), ...req.body, status: 'active', totalEvents: 0, totalSpent: 0, createdAt: new Date().toISOString() };
  clients.set(client.id, client);
  res.status(201).json({ success: true, client });
});

app.patch('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const updated = { ...client, ...req.body };
  clients.set(client.id, updated);
  res.json({ success: true, client: updated });
});

// ===== VENUE MANAGEMENT =====
app.get('/api/venues', requireAuth, (req, res) => {
  const { type, status, minCapacity } = req.query;
  let result = Array.from(venues.values());
  if (type) result = result.filter(v => v.type === type);
  if (status) result = result.filter(v => v.status === status);
  if (minCapacity) result = result.filter(v => v.capacity >= parseInt(minCapacity));
  res.json({ success: true, count: result.length, venues: result });
});

app.get('/api/venues/:id', requireAuth, (req, res) => {
  const venue = venues.get(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  const venueEvents = Array.from(events.values()).filter(e => e.venueId === venue.id);
  res.json({ success: true, venue, events: venueEvents });
});

app.post('/api/venues', requireAuth, (req, res) => {
  const venue = { id: 'VEN' + String(venues.size + 1).padStart(3, '0'), ...req.body, status: venue.status || 'available', createdAt: new Date().toISOString() };
  venues.set(venue.id, venue);
  res.status(201).json({ success: true, venue });
});

app.patch('/api/venues/:id', requireAuth, (req, res) => {
  const venue = venues.get(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  const updated = { ...venue, ...req.body };
  venues.set(venue.id, updated);
  res.json({ success: true, venue: updated });
});

// ===== EVENT MANAGEMENT =====
app.get('/api/events', requireAuth, (req, res) => {
  const { type, status, venueId, clientId, date } = req.query;
  let result = Array.from(events.values());
  if (type) result = result.filter(e => e.type === type);
  if (status) result = result.filter(e => e.status === status);
  if (venueId) result = result.filter(e => e.venueId === venueId);
  if (clientId) result = result.filter(e => e.clientId === clientId);
  if (date) result = result.filter(e => e.date === date);
  res.json({ success: true, count: result.length, events: result });
});

app.get('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const venue = venues.get(event.venueId);
  const client = clients.get(event.clientId);
  const booking = Array.from(eventBookings.values()).find(b => b.eventId === event.id);
  res.json({ success: true, event, venue, client, booking });
});

app.post('/api/events', requireAuth, (req, res) => {
  const event = { id: 'EVT' + String(events.size + 1).padStart(3, '0'), ...req.body, status: 'planning', createdAt: new Date().toISOString() };
  events.set(event.id, event);
  res.status(201).json({ success: true, event });
});

app.patch('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const updated = { ...event, ...req.body };
  events.set(event.id, updated);
  res.json({ success: true, event: updated });
});

app.delete('/api/events/:id', requireAuth, (req, res) => {
  if (!events.has(req.params.id)) return res.status(404).json({ error: 'Event not found' });
  events.delete(req.params.id);
  res.json({ success: true, message: 'Event deleted' });
});

// ===== EVENT BOOKINGS =====
app.get('/api/bookings', requireAuth, (req, res) => {
  const { eventId, venueId, clientId, status } = req.query;
  let result = Array.from(eventBookings.values());
  if (eventId) result = result.filter(b => b.eventId === eventId);
  if (venueId) result = result.filter(b => b.venueId === venueId);
  if (clientId) result = result.filter(b => b.clientId === clientId);
  if (status) result = result.filter(b => b.status === status);
  res.json({ success: true, count: result.length, bookings: result });
});

app.get('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = eventBookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const event = events.get(booking.eventId);
  const venue = venues.get(booking.venueId);
  const package = packages.get(booking.packageId);
  res.json({ success: true, booking, event, venue, package });
});

app.post('/api/bookings', requireAuth, (req, res) => {
  const { eventId, venueId, packageId, clientId, totalAmount } = req.body;
  if (!eventId || !venueId || !clientId) return res.status(400).json({ error: 'eventId, venueId, clientId required' });
  const booking = { id: 'BKG' + String(eventBookings.size + 1).padStart(3, '0'), eventId, venueId, packageId, clientId, totalAmount: totalAmount || 0, paidAmount: 0, status: 'pending', bookingDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
  eventBookings.set(booking.id, booking);
  res.status(201).json({ success: true, booking });
});

app.patch('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = eventBookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const updated = { ...booking, ...req.body };
  eventBookings.set(booking.id, updated);
  res.json({ success: true, booking: updated });
});

// ===== STAFF MANAGEMENT =====
app.get('/api/staff', requireAuth, (req, res) => {
  const { role, specialization, status } = req.query;
  let result = Array.from(staff.values());
  if (role) result = result.filter(s => s.role === role);
  if (specialization) result = result.filter(s => s.specialization.includes(specialization));
  if (status) result = result.filter(s => s.status === status);
  res.json({ success: true, count: result.length, staff: result });
});

app.get('/api/staff/:id', requireAuth, (req, res) => {
  const member = staff.get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Staff member not found' });
  res.json({ success: true, staff: member });
});

app.post('/api/staff', requireAuth, (req, res) => {
  const member = { id: 'STF' + String(staff.size + 1).padStart(3, '0'), ...req.body, status: 'active', eventsCompleted: 0, rating: 0, createdAt: new Date().toISOString() };
  staff.set(member.id, member);
  res.status(201).json({ success: true, staff: member });
});

app.patch('/api/staff/:id', requireAuth, (req, res) => {
  const member = staff.get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Staff member not found' });
  const updated = { ...member, ...req.body };
  staff.set(member.id, updated);
  res.json({ success: true, staff: updated });
});

// ===== EQUIPMENT MANAGEMENT =====
app.get('/api/equipment', requireAuth, (req, res) => {
  const { category, status } = req.query;
  let result = Array.from(equipment.values());
  if (category) result = result.filter(e => e.category === category);
  if (status) result = result.filter(e => e.status === status);
  res.json({ success: true, count: result.length, equipment: result });
});

app.get('/api/equipment/:id', requireAuth, (req, res) => {
  const item = equipment.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Equipment not found' });
  res.json({ success: true, equipment: item });
});

app.post('/api/equipment', requireAuth, (req, res) => {
  const item = { id: 'EQP' + String(equipment.size + 1).padStart(3, '0'), ...req.body, status: 'available', available: item?.quantity || req.body.quantity, createdAt: new Date().toISOString() };
  equipment.set(item.id, item);
  res.status(201).json({ success: true, equipment: item });
});

app.patch('/api/equipment/:id', requireAuth, (req, res) => {
  const item = equipment.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Equipment not found' });
  const updated = { ...item, ...req.body };
  equipment.set(item.id, updated);
  res.json({ success: true, equipment: updated });
});

// ===== PACKAGES =====
app.get('/api/packages', requireAuth, (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(packages.values());
  if (type) result = result.filter(p => p.type === type);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, packages: result });
});

app.get('/api/packages/:id', requireAuth, (req, res) => {
  const pkg = packages.get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  res.json({ success: true, package: pkg });
});

app.post('/api/packages', requireAuth, (req, res) => {
  const pkg = { id: 'PKG' + String(packages.size + 1).padStart(3, '0'), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  packages.set(pkg.id, pkg);
  res.status(201).json({ success: true, package: pkg });
});

app.patch('/api/packages/:id', requireAuth, (req, res) => {
  const pkg = packages.get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  const updated = { ...pkg, ...req.body };
  packages.set(pkg.id, updated);
  res.json({ success: true, package: updated });
});

// ===== MENUS & CATERING =====
app.get('/api/menus', requireAuth, (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(menus.values());
  if (type) result = result.filter(m => m.type === type);
  if (status) result = result.filter(m => m.status === status);
  res.json({ success: true, count: result.length, menus: result });
});

app.get('/api/menus/:id', requireAuth, (req, res) => {
  const menu = menus.get(req.params.id);
  if (!menu) return res.status(404).json({ error: 'Menu not found' });
  res.json({ success: true, menu });
});

app.post('/api/menus', requireAuth, (req, res) => {
  const menu = { id: 'MNU' + String(menus.size + 1).padStart(3, '0'), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  menus.set(menu.id, menu);
  res.status(201).json({ success: true, menu });
});

// ===== INVOICING & PAYMENTS =====
app.get('/api/invoices', requireAuth, (req, res) => {
  const { clientId, status, eventId } = req.query;
  let result = Array.from(invoices.values());
  if (clientId) result = result.filter(i => i.clientId === clientId);
  if (status) result = result.filter(i => i.status === status);
  if (eventId) result = result.filter(i => i.eventId === eventId);
  res.json({ success: true, count: result.length, invoices: result });
});

app.get('/api/invoices/:id', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const client = clients.get(invoice.clientId);
  const event = events.get(invoice.eventId);
  res.json({ success: true, invoice, client, event });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const { clientId, eventId, amount, description, dueDate } = req.body;
  if (!clientId || !amount) return res.status(400).json({ error: 'clientId, amount required' });
  const invoice = { id: 'INV' + Date.now(), invoiceNumber: `HSP/${new Date().getFullYear()}/${invoices.size + 1}`, clientId, eventId, amount, tax: Math.round(amount * 0.18), total: Math.round(amount * 1.18), description: description || 'Event Services', status: 'pending', dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], createdAt: new Date().toISOString() };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, invoice });
});

app.patch('/api/invoices/:id', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const updated = { ...invoice, ...req.body };
  invoices.set(invoice.id, updated);
  res.json({ success: true, invoice: updated });
});

app.get('/api/payments', requireAuth, (req, res) => {
  const { clientId, invoiceId, status } = req.query;
  let result = Array.from(payments.values());
  if (clientId) result = result.filter(p => p.clientId === clientId);
  if (invoiceId) result = result.filter(p => p.invoiceId === invoiceId);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, payments: result });
});

app.post('/api/payments', requireAuth, (req, res) => {
  const { clientId, invoiceId, amount, method } = req.body;
  if (!clientId || !amount) return res.status(400).json({ error: 'clientId, amount required' });
  const payment = { id: 'PAY' + Date.now(), clientId, invoiceId, amount, method: method || 'online', status: 'completed', date: new Date().toISOString(), createdAt: new Date().toISOString() };
  payments.set(payment.id, payment);

  // Update invoice if linked
  if (invoiceId && invoices.has(invoiceId)) {
    const invoice = invoices.get(invoiceId);
    invoice.paidAmount = (invoice.paidAmount || 0) + amount;
    if (invoice.paidAmount >= invoice.total) invoice.status = 'paid';
    else invoice.status = 'partial';
    invoices.set(invoiceId, invoice);
  }

  res.status(201).json({ success: true, payment });
});

// ===== EVENT ANALYTICS =====
app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const eventList = Array.from(events.values());
  const confirmedEvents = eventList.filter(e => e.status === 'confirmed');
  const totalBudget = eventList.reduce((sum, e) => sum + (e.budget || 0), 0);

  res.json({
    success: true,
    overview: {
      totalEvents: eventList.length,
      confirmedEvents: confirmedEvents.length,
      planningEvents: eventList.filter(e => e.status === 'planning').length,
      totalVenues: venues.size,
      totalClients: clients.size,
      totalStaff: staff.size,
      totalPackages: packages.size,
      totalBudget: totalBudget,
      avgBudget: eventList.length > 0 ? Math.round(totalBudget / eventList.length) : 0,
      totalRevenue: Array.from(invoices.values()).reduce((sum, i) => sum + (i.total || 0), 0),
      collectedAmount: Array.from(payments.values()).filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
    }
  });
});

app.get('/api/analytics/events', requireAuth, (req, res) => {
  const eventList = Array.from(events.values());
  const eventStats = eventList.map(e => {
    const venue = venues.get(e.venueId);
    const client = clients.get(e.clientId);
    const booking = Array.from(eventBookings.values()).find(b => b.eventId === e.id);
    return {
      eventId: e.id,
      name: e.name,
      type: e.type,
      date: e.date,
      expectedGuests: e.expectedGuests,
      budget: e.budget,
      status: e.status,
      venue: venue ? venue.name : null,
      client: client ? client.name : null,
      revenue: booking ? booking.totalAmount : 0,
      collected: booking ? booking.paidAmount : 0
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ success: true, events: eventStats });
});

app.get('/api/analytics/venues', requireAuth, (req, res) => {
  const venueList = Array.from(venues.values());
  const venueStats = venueList.map(v => {
    const venueEvents = Array.from(events.values()).filter(e => e.venueId === v.id);
    return {
      venueId: v.id,
      name: v.name,
      type: v.type,
      capacity: v.capacity,
      rating: v.rating,
      totalBookings: venueEvents.length,
      confirmedBookings: venueEvents.filter(e => e.status === 'confirmed').length
    };
  });
  res.json({ success: true, venues: venueStats });
});

app.get('/api/analytics/staff', requireAuth, (req, res) => {
  const staffList = Array.from(staff.values());
  const staffStats = staffList.map(s => ({
    staffId: s.id,
    name: s.name,
    role: s.role,
    specialization: s.specialization,
    experience: s.experience,
    rating: s.rating,
    eventsCompleted: s.eventsCompleted,
    hourlyRate: s.hourlyRate
  })).sort((a, b) => b.eventsCompleted - a.eventsCompleted);
  res.json({ success: true, staff: staffStats });
});

// ===== RTMN LAYER INTEGRATIONS =====
app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence',
    capabilities: [
      'AI Event Planning',
      'Guest Preference Prediction',
      'Smart Scheduling',
      'Budget Optimization',
      'Trend Analysis'
    ],
    status: 'available'
  });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    capabilities: [
      'Lead Generation',
      'Referral Programs',
      'Corporate Packages',
      'Repeat Client Loyalty',
      'CRM Integration'
    ],
    status: 'available'
  });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    capabilities: [
      'Package Sales',
      'Add-on Services',
      'Merchandise',
      'Gift Cards',
      'Venue Booking'
    ],
    status: 'available'
  });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({
    layer: 4,
    name: 'Finance',
    capabilities: [
      'Invoice Management',
      'Payment Processing',
      'Commission Tracking',
      'Vendor Payments',
      'Financial Reports'
    ],
    status: 'available'
  });
});

app.get('/api/layer/workforce', requireAuth, (req, res) => {
  res.json({
    layer: 5,
    name: 'Workforce',
    capabilities: [
      'Staff Scheduling',
      'Payroll Management',
      'Training Records',
      'Performance Tracking',
      'Shift Management'
    ],
    status: 'available'
  });
});

app.get('/api/layer/legal', requireAuth, (req, res) => {
  res.json({
    layer: 6,
    name: 'Legal & Compliance',
    capabilities: [
      'Event Contracts',
      'Liability Waivers',
      'Vendor Agreements',
      'Compliance Checks',
      'Insurance Verification'
    ],
    status: 'available'
  });
});

app.get('/api/layers', requireAuth, (req, res) => {
  res.json({ industry: INDUSTRY, service: 'Hospitality OS', layers: 15, version: '2.0.0' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Hospitality OS',
    version: '2.0.0',
    port: PORT,
    industry: 'Hospitality',
    timestamp: new Date().toISOString(),
    stats: {
      venues: venues.size,
      events: events.size,
      clients: clients.size,
      staff: staff.size,
      packages: packages.size,
      bookings: eventBookings.size
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                 HOSPITALITY OS v2.0.0              ║
║           Complete Event & Venue Management          ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Features:                                             ║
║  • Client Management                                  ║
║  • Venue Management                                   ║
║  • Event Bookings                                     ║
║  • Catering & Menu Planning                           ║
║  • Staff/Worker Management                            ║
║  • Equipment Inventory                                ║
║  • Package/Pricing Management                         ║
║  • Invoicing & Payments                               ║
║  • Event Analytics                                    ║
╚══════════════════════════════════════════════════════════╝`);
});
