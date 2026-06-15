import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5050;

// Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory stores
const establishments = new Map();
const staff = new Map();
const customers = new Map();
const transactions = new Map();
const events = new Map();
const loyalty = new Map();

// Digital twins
const twins = {
  establishment: { id: 'establishment-twin', status: 'active', count: 0 },
  staff: { id: 'staff-twin', status: 'active', roster: [] },
  customer: { id: 'customer-twin', status: 'active', active: [] },
  transaction: { id: 'transaction-twin', status: 'active', volume: 0 },
  event: { id: 'event-twin', status: 'active', upcoming: [] }
};

// Initialize sample data
function initSampleData() {
  // Sample establishments
  const sampleEstablishments = [
    { id: 'e1', name: 'Grand Plaza Hotel', type: 'hotel', address: '123 Main St', rating: 4.5, status: 'active' },
    { id: 'e2', name: 'Riverside Restaurant', type: 'restaurant', address: '456 River Rd', rating: 4.2, status: 'active' },
    { id: 'e3', name: 'Spa Retreat', type: 'spa', address: '789 Wellness Ave', rating: 4.8, status: 'active' },
    { id: 'e4', name: 'Skyline Bar & Lounge', type: 'bar', address: '321 Tower Blvd', rating: 4.3, status: 'active' },
    { id: 'e5', name: 'Conference Center', type: 'venue', address: '555 Business Park', rating: 4.1, status: 'active' }
  ];
  sampleEstablishments.forEach(e => establishments.set(e.id, e));

  // Sample staff
  const roles = ['manager', 'chef', 'server', 'bartender', 'concierge', 'housekeeper', 'receptionist'];
  for (let i = 1; i <= 15; i++) {
    const staffMember = {
      id: `s${i}`,
      name: `Staff ${i}`,
      role: roles[i % roles.length],
      establishmentId: sampleEstablishments[i % 5].id,
      status: 'active',
      schedule: [],
      rating: (4 + Math.random()).toFixed(1)
    };
    staff.set(staffMember.id, staffMember);
    twins.staff.roster.push(staffMember);
  }

  twins.establishment.count = establishments.size;
  logger.info('Hospitality OS sample data initialized');
}

initSampleData();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hospitality-os', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============= ESTABLISHMENT ENDPOINTS =============

app.get('/api/establishments', (req, res) => {
  const { type, status, minRating } = req.query;
  let all = Array.from(establishments.values());

  if (type) all = all.filter(e => e.type === type);
  if (status) all = all.filter(e => e.status === status);
  if (minRating) all = all.filter(e => e.rating >= parseFloat(minRating));

  res.json({ success: true, count: all.length, establishments: all });
});

app.get('/api/establishments/:id', (req, res) => {
  const est = establishments.get(req.params.id);
  if (!est) return res.status(404).json({ success: false, error: 'Establishment not found' });
  res.json({ success: true, establishment: est });
});

app.post('/api/establishments', (req, res) => {
  const { name, type, address, description, amenities, operatingHours } = req.body;

  if (!name || !type) {
    return res.status(400).json({ success: false, error: 'Name and type required' });
  }

  const est = {
    id: uuidv4(),
    name,
    type,
    address: address || '',
    description: description || '',
    amenities: amenities || [],
    operatingHours: operatingHours || {},
    rating: 0,
    reviewCount: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  establishments.set(est.id, est);
  twins.establishment.count++;

  logger.info(`Establishment created: ${est.name}`);
  res.status(201).json({ success: true, establishment: est });
});

app.put('/api/establishments/:id', (req, res) => {
  const est = establishments.get(req.params.id);
  if (!est) return res.status(404).json({ success: false, error: 'Establishment not found' });

  const updated = { ...est, ...req.body, id: est.id, updatedAt: new Date().toISOString() };
  establishments.set(est.id, updated);

  res.json({ success: true, establishment: updated });
});

app.delete('/api/establishments/:id', (req, res) => {
  if (!establishments.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Establishment not found' });
  }
  establishments.delete(req.params.id);
  twins.establishment.count--;
  res.json({ success: true, message: 'Establishment deleted' });
});

// ============= STAFF ENDPOINTS =============

app.get('/api/staff', (req, res) => {
  const { role, establishmentId, status } = req.query;
  let all = Array.from(staff.values());

  if (role) all = all.filter(s => s.role === role);
  if (establishmentId) all = all.filter(s => s.establishmentId === establishmentId);
  if (status) all = all.filter(s => s.status === status);

  res.json({ success: true, count: all.length, staff: all });
});

app.get('/api/staff/:id', (req, res) => {
  const member = staff.get(req.params.id);
  if (!member) return res.status(404).json({ success: false, error: 'Staff not found' });
  res.json({ success: true, staff: member });
});

app.post('/api/staff', (req, res) => {
  const { name, role, establishmentId, email, phone, schedule } = req.body;

  if (!name || !role) {
    return res.status(400).json({ success: false, error: 'Name and role required' });
  }

  const member = {
    id: uuidv4(),
    name,
    role,
    establishmentId: establishmentId || null,
    email: email || null,
    phone: phone || null,
    schedule: schedule || [],
    status: 'active',
    rating: 5.0,
    shiftCount: 0,
    createdAt: new Date().toISOString()
  };

  staff.set(member.id, member);
  twins.staff.roster.push(member);

  logger.info(`Staff added: ${member.name} as ${member.role}`);
  res.status(201).json({ success: true, staff: member });
});

app.put('/api/staff/:id', (req, res) => {
  const member = staff.get(req.params.id);
  if (!member) return res.status(404).json({ success: false, error: 'Staff not found' });

  const updated = { ...member, ...req.body, id: member.id, updatedAt: new Date().toISOString() };
  staff.set(member.id, updated);

  const twinIndex = twins.staff.roster.findIndex(s => s.id === member.id);
  if (twinIndex >= 0) twins.staff.roster[twinIndex] = updated;

  res.json({ success: true, staff: updated });
});

app.patch('/api/staff/:id/status', (req, res) => {
  const member = staff.get(req.params.id);
  if (!member) return res.status(404).json({ success: false, error: 'Staff not found' });

  member.status = req.body.status || member.status;
  res.json({ success: true, staff: member });
});

// ============= CUSTOMER ENDPOINTS =============

app.post('/api/customers', (req, res) => {
  const { name, email, phone, preferences, tier } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  // Check existing
  if (email) {
    const existing = Array.from(customers.values()).find(c => c.email === email);
    if (existing) {
      Object.assign(existing, req.body);
      customers.set(existing.id, existing);
      return res.json({ success: true, customer: existing, isNew: false });
    }
  }

  const customer = {
    id: uuidv4(),
    name,
    email: email || null,
    phone: phone || null,
    preferences: preferences || {},
    tier: tier || 'bronze',
    loyaltyPoints: 0,
    visitCount: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString()
  };

  customers.set(customer.id, customer);
  twins.customer.active.push(customer);

  logger.info(`Customer registered: ${customer.name}`);
  res.status(201).json({ success: true, customer, isNew: true });
});

app.get('/api/customers', (req, res) => {
  const { tier, minVisits } = req.query;
  let all = Array.from(customers.values());

  if (tier) all = all.filter(c => c.tier === tier);
  if (minVisits) all = all.filter(c => c.visitCount >= parseInt(minVisits));

  res.json({ success: true, count: all.length, customers: all });
});

app.get('/api/customers/:id', (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
  res.json({ success: true, customer });
});

app.post('/api/customers/:id/points', (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

  const { points, amount } = req.body;
  const earned = amount ? Math.floor(amount * 10) : (points || 0);

  customer.loyaltyPoints += earned;
  customer.totalSpent += amount || 0;
  customer.visitCount++;

  if (customer.loyaltyPoints >= 10000) customer.tier = 'platinum';
  else if (customer.loyaltyPoints >= 5000) customer.tier = 'gold';
  else if (customer.loyaltyPoints >= 1000) customer.tier = 'silver';

  customers.set(customer.id, customer);
  res.json({ success: true, customer });
});

// ============= TRANSACTION ENDPOINTS =============

app.post('/api/transactions', (req, res) => {
  const { customerId, establishmentId, type, amount, items, paymentMethod } = req.body;

  if (!amount || !type) {
    return res.status(400).json({ success: false, error: 'Amount and type required' });
  }

  const transaction = {
    id: uuidv4(),
    customerId: customerId || null,
    establishmentId: establishmentId || null,
    type,
    amount: parseFloat(amount),
    items: items || [],
    paymentMethod: paymentMethod || 'card',
    status: 'completed',
    timestamp: new Date().toISOString()
  };

  transactions.set(transaction.id, transaction);
  twins.transaction.volume += transaction.amount;

  // Update customer
  if (customerId && customers.has(customerId)) {
    const customer = customers.get(customerId);
    customer.visitCount++;
    customer.totalSpent += transaction.amount;
    customer.loyaltyPoints += Math.floor(transaction.amount * 10);
  }

  logger.info(`Transaction: ${type} - $${transaction.amount.toFixed(2)}`);
  res.status(201).json({ success: true, transaction });
});

app.get('/api/transactions', (req, res) => {
  const { customerId, establishmentId, type, fromDate, toDate } = req.query;
  let all = Array.from(transactions.values());

  if (customerId) all = all.filter(t => t.customerId === customerId);
  if (establishmentId) all = all.filter(t => t.establishmentId === establishmentId);
  if (type) all = all.filter(t => t.type === type);
  if (fromDate) all = all.filter(t => t.timestamp >= fromDate);
  if (toDate) all = all.filter(t => t.timestamp <= toDate);

  res.json({ success: true, count: all.length, transactions: all });
});

// ============= EVENT ENDPOINTS =============

app.post('/api/events', (req, res) => {
  const { name, type, establishmentId, date, capacity, price, description } = req.body;

  if (!name || !type || !date) {
    return res.status(400).json({ success: false, error: 'Name, type, and date required' });
  }

  const event = {
    id: uuidv4(),
    name,
    type,
    establishmentId: establishmentId || null,
    date: new Date(date).toISOString(),
    capacity: capacity || 100,
    price: price || 0,
    description: description || '',
    ticketsSold: 0,
    status: 'upcoming',
    createdAt: new Date().toISOString()
  };

  events.set(event.id, event);
  twins.event.upcoming.push(event);

  logger.info(`Event created: ${event.name}`);
  res.status(201).json({ success: true, event });
});

app.get('/api/events', (req, res) => {
  const { type, status, establishmentId } = req.query;
  let all = Array.from(events.values());

  if (type) all = all.filter(e => e.type === type);
  if (status) all = all.filter(e => e.status === status);
  if (establishmentId) all = all.filter(e => e.establishmentId === establishmentId);

  res.json({ success: true, count: all.length, events: all });
});

app.get('/api/events/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
  res.json({ success: true, event });
});

app.post('/api/events/:id/book', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

  if (event.ticketsSold >= event.capacity) {
    return res.status(400).json({ success: false, error: 'Event sold out' });
  }

  const { customerId, quantity } = req.body;
  const qty = quantity || 1;

  if (event.ticketsSold + qty > event.capacity) {
    return res.status(400).json({ success: false, error: 'Not enough tickets available' });
  }

  event.ticketsSold += qty;

  if (event.ticketsSold >= event.capacity) {
    event.status = 'sold_out';
  }

  res.json({ success: true, event, ticketsBooked: qty });
});

// ============= LOYALTY ENDPOINTS =============

app.get('/api/loyalty', (req, res) => {
  const tiers = ['bronze', 'silver', 'gold', 'platinum'];
  const stats = {};

  for (const tier of tiers) {
    stats[tier] = Array.from(customers.values()).filter(c => c.tier === tier).length;
  }

  res.json({
    success: true,
    loyalty: {
      totalMembers: customers.size,
      byTier: stats,
      totalPoints: Array.from(customers.values()).reduce((sum, c) => sum + c.loyaltyPoints, 0),
      totalValue: Array.from(customers.values()).reduce((sum, c) => sum + c.totalSpent, 0)
    }
  });
});

// ============= ANALYTICS =============

app.get('/api/analytics', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayTx = Array.from(transactions.values()).filter(t => t.timestamp.startsWith(today));

  res.json({
    success: true,
    analytics: {
      date: today,
      establishments: { total: establishments.size, active: Array.from(establishments.values()).filter(e => e.status === 'active').length },
      staff: { total: staff.size, active: Array.from(staff.values()).filter(s => s.status === 'active').length },
      customers: { total: customers.size, new: Array.from(customers.values()).filter(c => c.createdAt.startsWith(today)).length },
      transactions: { today: todayTx.length, volume: todayTx.reduce((s, t) => s + t.amount, 0) },
      events: { upcoming: twins.event.upcoming.length, soldOut: Array.from(events.values()).filter(e => e.status === 'sold_out').length }
    }
  });
});

// ============= DIGITAL TWINS =============

app.get('/api/twins', (req, res) => res.json({ success: true, twins }));
app.get('/api/twins/:name', (req, res) => {
  const twin = twins[req.params.name];
  if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });
  res.json({ success: true, twin });
});

app.post('/api/twins/sync', (req, res) => {
  twins.establishment.count = establishments.size;
  twins.staff.roster = Array.from(staff.values()).filter(s => s.status === 'active');
  twins.customer.active = Array.from(customers.values());
  twins.event.upcoming = Array.from(events.values()).filter(e => e.status === 'upcoming');
  twins.transaction.volume = Array.from(transactions.values()).reduce((s, t) => s + t.amount, 0);
  logger.info('Hospitality twins synchronized');
  res.json({ success: true, twins });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});

// Start
app.listen(PORT, () => {
  logger.info(`🏨 Hospitality OS running on port ${PORT}`);
});

export default app;
