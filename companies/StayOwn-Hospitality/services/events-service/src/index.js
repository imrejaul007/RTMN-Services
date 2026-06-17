/**
 * StayOwn Events & Banquets Service
 *
 * Hotel event management system
 *
 * Features:
 * - Event booking
 * - Venue management
 * - Seating layouts
 * - Catering
 * - AV equipment
 * - Contracts
 * - Deposits
 *
 * Port: 6060
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 6060;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// DATA STORES
// ============================================

// Venues / Function spaces
const venues = new Map();

// Events
const events = new Map();

// Bookings (event reservations)
const bookings = new Map();

// Contracts
const contracts = new Map();

// Function sheets
const functionSheets = new Map();

// Equipment inventory
const equipment = new Map();

// Catering menus
const cateringMenus = new Map();

// Invoices
const invoices = new Map();

// ============================================
// AUTHENTICATION
// ============================================

const authUsers = new Map();
const authSessions = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  const user = { id: 'user_' + Date.now(), businessId, email, passwordHash: hashPassword(password), role: 'events_admin', createdAt: new Date().toISOString() };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, role: user.role });
  res.json({ token, user: { id: user.id, email } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId: user.businessId, role: user.role });
  res.json({ token, user: { id: user.id, email } });
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
// VENUES
// ============================================

// Initialize sample venues
venues.set('venue_1', { id: 'venue_1', name: 'Grand Ballroom', type: 'ballroom', capacity: 500, standing: 600, classroom: 300, theater: 500, uShape: 100, boardroom: 80, area: 500, floor: '1', features: ['Stage', 'AV', 'Lighting', 'AC', 'Parking'], hourlyRate: 500, halfDay: 3000, fullDay: 5000, status: 'available', images: [] });
venues.set('venue_2', { id: 'venue_2', name: 'Boardroom', type: 'boardroom', capacity: 20, standing: 30, classroom: 0, theater: 0, uShape: 20, boardroom: 20, area: 50, floor: '2', features: ['TV', 'Video Conf', 'WiFi', 'AC'], hourlyRate: 150, halfDay: 800, fullDay: 1200, status: 'available', images: [] });
venues.set('venue_3', { id: 'venue_3', name: 'Garden Terrace', type: 'outdoor', capacity: 200, standing: 250, classroom: 0, theater: 150, uShape: 0, boardroom: 0, area: 400, floor: 'Ground', features: ['Open Air', 'Garden View', 'Heating', 'Lighting'], hourlyRate: 400, halfDay: 2500, fullDay: 4000, status: 'available', images: [] });
venues.set('venue_4', { id: 'venue_4', name: 'Conference Room A', type: 'conference', capacity: 50, standing: 60, classroom: 30, theater: 50, uShape: 25, boardroom: 30, area: 100, floor: '2', features: ['Projector', 'Whiteboard', 'WiFi', 'AC'], hourlyRate: 100, halfDay: 500, fullDay: 800, status: 'available', images: [] });

// Get venues
app.get('/api/venues', (req, res) => {
  const { type, capacity, date, startTime, endTime } = req.query;
  let venueList = Array.from(venues.values());

  if (type) venueList = venueList.filter(v => v.type === type);
  if (capacity) venueList = venueList.filter(v => v.capacity >= parseInt(capacity));

  // Check availability for date
  if (date) {
    venueList = venueList.map(v => {
      const bookings = getVenueBookings(v.id, date);
      return { ...v, available: bookings.length === 0, bookingsOnDate: bookings };
    });
  }

  res.json({ venues: venueList });
});

// Get single venue
app.get('/api/venues/:id', (req, res) => {
  const venue = venues.get(req.params.id);
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' });
  }
  res.json(venue);
});

// Create venue
app.post('/api/venues', requireAuth, (req, res) => {
  const { name, type, capacity, area, floor, features, pricing } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'name, type required' });
  }
  const venueId = 'venue_' + Date.now();
  const venue = { id: venueId, name, type, capacity: capacity || 100, area: area || 100, floor: floor || '1', features: features || [], pricing: pricing || {}, status: 'available', images: [], createdAt: new Date().toISOString() };
  venues.set(venueId, venue);
  res.status(201).json(venue);
});

// Update venue
app.patch('/api/venues/:id', requireAuth, (req, res) => {
  const venue = venues.get(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  Object.assign(venue, req.body);
  venues.set(venue.id, venue);
  res.json(venue);
});

// ============================================
// EVENTS
// ============================================

// Get event types
app.get('/api/event-types', (req, res) => {
  res.json({
    eventTypes: [
      { id: 'wedding', name: 'Wedding', icon: '💒', description: 'Wedding ceremonies and receptions' },
      { id: 'corporate', name: 'Corporate Event', icon: '🏢', description: 'Meetings, conferences, seminars' },
      { id: 'social', name: 'Social Event', icon: '🎉', description: 'Birthdays, anniversaries, reunions' },
      { id: 'banquet', name: 'Banquet', icon: '🍽️', description: 'Gala dinners, award ceremonies' },
      { id: 'exhibition', name: 'Exhibition', icon: '🏛️', description: 'Trade shows, product launches' },
      { id: 'concert', name: 'Concert', icon: '🎵', description: 'Live performances, music events' },
      { id: 'seminar', name: 'Seminar/Workshop', icon: '📚', description: 'Training, educational events' }
    ]
  });
});

// Get events
app.get('/api/events', requireAuth, (req, res) => {
  const { status, venueId, fromDate, toDate } = req.query;
  const businessId = req.session.businessId;
  let eventList = Array.from(events.values()).filter(e => e.businessId === businessId);

  if (status) eventList = eventList.filter(e => e.status === status);
  if (venueId) eventList = eventList.filter(e => e.venueId === venueId);
  if (fromDate) eventList = eventList.filter(e => e.date >= fromDate);
  if (toDate) eventList = eventList.filter(e => e.date <= toDate);

  eventList.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json({ events: eventList, count: eventList.length });
});

// Create event booking
app.post('/api/events', requireAuth, (req, res) => {
  const { venueId, eventType, eventName, date, startTime, endTime, expectedGuests, contact, notes } = req.body;

  if (!venueId || !eventName || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'venueId, eventName, date, startTime, endTime required' });
  }

  const venue = venues.get(venueId);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });

  // Check venue availability
  const existingBookings = getVenueBookings(venueId, date);
  if (existingBookings.length > 0) {
    return res.status(409).json({ error: 'Venue not available on this date', existingBookings });
  }

  const businessId = req.session.businessId;
  const eventId = 'event_' + Date.now();
  const bookingRef = 'EVT' + Date.now().toString().slice(-6);

  const event = {
    id: eventId,
    businessId,
    bookingRef,
    venueId,
    venueName: venue.name,
    eventType: eventType || 'corporate',
    eventName,
    date,
    startTime,
    endTime,
    duration: calculateDuration(startTime, endTime),
    expectedGuests: expectedGuests || venue.capacity,
    contact,
    notes,
    status: 'enquiry', // enquiry, tentative, confirmed, contracted, completed, cancelled
    estimatedRevenue: 0,
    actualRevenue: 0,
    setupRequired: true,
    breakdownRequired: true,
    cateringRequired: false,
    avRequired: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  events.set(eventId, event);

  // Create booking record
  const bookingId = 'book_' + eventId;
  bookings.set(bookingId, {
    id: bookingId,
    eventId,
    venueId,
    date,
    startTime,
    endTime,
    status: 'reserved'
  });

  res.status(201).json(event);
});

// Get single event
app.get('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Update event
app.patch('/api/events/:id', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Handle date/venue change
  if (req.body.date && req.body.date !== event.date) {
    const existingBookings = getVenueBookings(event.venueId, req.body.date);
    if (existingBookings.length > 0) {
      return res.status(409).json({ error: 'Venue not available on new date' });
    }
  }

  Object.assign(event, req.body);
  event.updatedAt = new Date().toISOString();
  events.set(event.id, event);
  res.json(event);
});

// Confirm event
app.post('/api/events/:id/confirm', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  event.status = 'confirmed';
  event.confirmedAt = new Date().toISOString();
  event.confirmedBy = req.session.email;
  event.updatedAt = new Date().toISOString();

  events.set(event.id, event);
  res.json(event);
});

// Cancel event
app.post('/api/events/:id/cancel', requireAuth, (req, res) => {
  const { reason } = req.body;
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  event.status = 'cancelled';
  event.cancellationReason = reason;
  event.cancelledAt = new Date().toISOString();
  event.updatedAt = new Date().toISOString();

  events.set(event.id, event);
  res.json(event);
});

// ============================================
// SEATING LAYOUTS
// ============================================

// Get seating layouts
app.get('/api/events/:id/layouts', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const layouts = [
    { id: 'theater', name: 'Theater', description: 'Rows facing stage', icon: '🪑', suitableFor: ['seminar', 'concert', 'corporate'] },
    { id: 'classroom', name: 'Classroom', description: 'Tables with chairs', icon: '📖', suitableFor: ['seminar', 'corporate'] },
    { id: 'banquet', name: 'Banquet Round', description: 'Round tables for 10', icon: '🍽️', suitableFor: ['wedding', 'banquet', 'social'] },
    { id: 'ushape', name: 'U-Shape', description: 'U-shaped seating', icon: '🔴', suitableFor: ['corporate', 'boardroom'] },
    { id: 'boardroom', name: 'Boardroom', description: 'Conference table', icon: '🏢', suitableFor: ['corporate', 'boardroom'] },
    { id: 'cocktail', name: 'Cocktail', description: 'Standing reception', icon: '🥂', suitableFor: ['social', 'wedding'] },
    { id: 'exhibition', name: 'Exhibition', description: 'Booth arrangement', icon: '🏛️', suitableFor: ['exhibition'] }
  ];

  res.json({ layouts });
});

// Set event layout
app.post('/api/events/:id/layout', requireAuth, (req, res) => {
  const { layoutType, tableCount, guestCount, customLayout } = req.body;

  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  event.layout = {
    type: layoutType,
    tableCount: tableCount || 0,
    guestCount: guestCount || event.expectedGuests,
    customLayout,
    createdAt: new Date().toISOString()
  };

  events.set(event.id, event);
  res.json(event);
});

// ============================================
// CATERING
// ============================================

// Initialize sample catering menus
cateringMenus.set('menu_1', { id: 'menu_1', name: 'Silver Package', type: 'buffet', pricePerPerson: 35, minGuests: 20, items: { starters: 3, mainCourses: 3, desserts: 2, beverages: 2 }, description: 'Elegant buffet service' });
cateringMenus.set('menu_2', { id: 'menu_2', name: 'Gold Package', type: 'buffet', pricePerPerson: 55, minGuests: 30, items: { starters: 5, mainCourses: 4, desserts: 3, beverages: 3, special: 'Live cooking station' }, description: 'Premium buffet with live stations' });
cateringMenus.set('menu_3', { id: 'menu_3', name: 'Platinum Package', type: 'plated', pricePerPerson: 85, minGuests: 10, items: { starters: 2, mainCourses: 3, desserts: 2, beverages: 4, special: 'Butler service' }, description: 'Fine dining experience' });

// Get catering menus
app.get('/api/catering/menus', (req, res) => {
  res.json({ menus: Array.from(cateringMenus.values()) });
});

// Get single menu
app.get('/api/catering/menus/:id', (req, res) => {
  const menu = cateringMenus.get(req.params.id);
  if (!menu) return res.status(404).json({ error: 'Menu not found' });
  res.json(menu);
});

// Create catering order for event
app.post('/api/events/:id/catering', requireAuth, (req, res) => {
  const { menuId, guestCount, customItems, serviceType, barPackage } = req.body;

  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const menu = menuId ? cateringMenus.get(menuId) : null;
  const guestCountNum = guestCount || event.expectedGuests;

  let subtotal = 0;
  let items = [];

  if (menu) {
    subtotal = menu.pricePerPerson * guestCountNum;
    items.push({ name: menu.name, type: menu.type, pricePerPerson: menu.pricePerPerson, quantity: guestCountNum, total: subtotal });
  }

  if (customItems && customItems.length > 0) {
    customItems.forEach(item => {
      const itemTotal = item.pricePerPerson * (item.quantity || guestCountNum);
      subtotal += itemTotal;
      items.push({ ...item, quantity: item.quantity || guestCountNum, total: itemTotal });
    });
  }

  const serviceCharge = subtotal * 0.1;
  const tax = (subtotal + serviceCharge) * 0.1;
  const total = subtotal + serviceCharge + tax;

  event.catering = {
    menuId,
    menuName: menu?.name,
    guestCount: guestCountNum,
    items,
    subtotal,
    serviceCharge,
    tax,
    total,
    serviceType: serviceType || 'buffet',
    barPackage,
    status: 'quoted',
    createdAt: new Date().toISOString()
  };

  event.cateringRequired = true;
  events.set(event.id, event);

  res.json({ catering: event.catering, estimatedTotal: total });
});

// ============================================
// EQUIPMENT / AV
// ============================================

// Initialize sample equipment
equipment.set('eq_1', { id: 'eq_1', name: 'Projector HD', category: 'av', dailyRate: 100, available: 5, description: 'Full HD projector' });
equipment.set('eq_2', { id: 'eq_2', name: 'Microphone Wireless', category: 'av', dailyRate: 30, available: 10, description: 'Wireless lapel microphone' });
equipment.set('eq_3', { id: 'eq_3', name: 'Sound System', category: 'av', dailyRate: 200, available: 3, description: 'Professional sound system' });
equipment.set('eq_4', { id: 'eq_4', name: 'Stage Lighting', category: 'lighting', dailyRate: 150, available: 2, description: 'LED stage lighting package' });
equipment.set('eq_5', { id: 'eq_5', name: 'Dance Floor', category: 'furniture', dailyRate: 300, available: 1, description: '12x12 LED dance floor' });
equipment.set('eq_6', { id: 'eq_6', name: 'Round Tables (10 pax)', category: 'furniture', dailyRate: 15, available: 50, description: 'Round banquet tables' });
equipment.set('eq_7', { id: 'eq_7', name: 'Chiavari Chairs', category: 'furniture', dailyRate: 5, available: 200, description: 'Elegant chiavari chairs' });
equipment.set('eq_8', { id: 'eq_8', name: 'Photo Booth', category: 'entertainment', dailyRate: 250, available: 2, description: '360 photo booth' });

// Get equipment
app.get('/api/equipment', (req, res) => {
  const { category, available } = req.query;
  let equipList = Array.from(equipment.values());
  if (category) equipList = equipList.filter(e => e.category === category);
  res.json({ equipment: equipList });
});

// Add equipment to event
app.post('/api/events/:id/equipment', requireAuth, (req, res) => {
  const { items } = req.body;

  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  let subtotal = 0;
  const equipmentList = items.map(item => {
    const eq = equipment.get(item.equipmentId);
    const total = (eq?.dailyRate || 0) * (item.quantity || 1) * (event.duration || 1);
    subtotal += total;
    return { equipmentId: item.equipmentId, name: eq?.name, quantity: item.quantity || 1, days: event.duration || 1, dailyRate: eq?.dailyRate, total };
  });

  event.equipment = { items: equipmentList, subtotal, status: 'quoted' };
  event.avRequired = true;
  events.set(event.id, event);

  res.json({ equipment: event.equipment, subtotal });
});

// ============================================
// CONTRACTS
// ============================================

// Generate contract
app.post('/api/events/:id/contract', requireAuth, (req, res) => {
  const { terms, paymentSchedule, cancellationPolicy } = req.body;

  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const contractId = 'contract_' + Date.now();

  // Calculate totals
  const venueCost = calculateVenueCost(event);
  const cateringCost = event.catering?.total || 0;
  const equipmentCost = event.equipment?.subtotal || 0;
  const subtotal = venueCost + cateringCost + equipmentCost;
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const contract = {
    id: contractId,
    eventId: event.id,
    bookingRef: event.bookingRef,
    client: event.contact,
    venue: { id: event.venueId, name: event.venueName },
    eventDetails: { name: event.eventName, type: event.eventType, date: event.date, startTime: event.startTime, endTime: event.endTime, guestCount: event.expectedGuests },
    pricing: { venue: venueCost, catering: cateringCost, equipment: equipmentCost, subtotal, tax, total },
    paymentSchedule: paymentSchedule || [
      { stage: 'Deposit', percentage: 30, amount: total * 0.3, due: 'Upon signing' },
      { stage: '50% Payment', percentage: 50, amount: total * 0.5, due: '30 days before event' },
      { stage: 'Final Payment', percentage: 20, amount: total * 0.2, due: '7 days before event' }
    ],
    terms: terms || 'Standard event terms apply',
    cancellationPolicy: cancellationPolicy || 'Full refund if cancelled 30+ days before. 50% refund 15-30 days. No refund within 14 days.',
    status: 'draft',
    generatedAt: new Date().toISOString(),
    generatedBy: req.session.email
  };

  contracts.set(contractId, contract);

  event.contractId = contractId;
  event.estimatedRevenue = total;
  events.set(event.id, event);

  res.status(201).json(contract);
});

// Get contract
app.get('/api/contracts/:id', requireAuth, (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(contract);
});

// Sign contract
app.post('/api/contracts/:id/sign', requireAuth, (req, res) => {
  const { signature, signedBy } = req.body;

  const contract = contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  contract.status = 'signed';
  contract.signature = signature;
  contract.signedBy = signedBy;
  contract.signedAt = new Date().toISOString();

  contracts.set(contract.id, contract);

  // Update event status
  const event = events.get(contract.eventId);
  if (event) {
    event.status = 'contracted';
    event.contractSignedAt = contract.signedAt;
    events.set(event.id, event);
  }

  res.json(contract);
});

// ============================================
// DEPOSITS & PAYMENTS
// ============================================

// Get event invoices
app.get('/api/events/:id/invoices', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const eventInvoices = Array.from(invoices.values()).filter(i => i.eventId === event.id);
  res.json({ invoices: eventInvoices });
});

// Create invoice
app.post('/api/events/:id/invoices', requireAuth, (req, res) => {
  const { amount, type, dueDate, description } = req.body;

  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const invoiceId = 'inv_' + Date.now();
  const invoice = {
    id: invoiceId,
    eventId: event.id,
    bookingRef: event.bookingRef,
    amount,
    type, // deposit, progress, final
    dueDate: dueDate || new Date().toISOString(),
    description,
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: req.session.email
  };

  invoices.set(invoiceId, invoice);
  res.status(201).json(invoice);
});

// Record payment
app.post('/api/invoices/:id/payment', requireAuth, (req, res) => {
  const { amount, method, reference } = req.body;

  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  invoice.payments = invoice.payments || [];
  invoice.payments.push({ amount, method, reference, paidAt: new Date().toISOString(), receivedBy: req.session.email });

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  invoice.status = totalPaid >= invoice.amount ? 'paid' : 'partial';
  invoice.totalPaid = totalPaid;
  invoice.balance = invoice.amount - totalPaid;

  invoices.set(invoice.id, invoice);

  // Update event revenue
  const event = events.get(invoice.eventId);
  if (event) {
    event.actualRevenue = (event.actualRevenue || 0) + amount;
    events.set(event.id, event);
  }

  res.json(invoice);
});

// ============================================
// FUNCTION SHEETS
// ============================================

// Generate function sheet
app.get('/api/events/:id/function-sheet', requireAuth, (req, res) => {
  const event = events.get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const venue = venues.get(event.venueId);
  const contract = event.contractId ? contracts.get(event.contractId) : null;

  const functionSheet = {
    event: {
      ref: event.bookingRef,
      name: event.eventName,
      type: event.eventType,
      date: event.date,
      setupTime: calculateSetupTime(event.startTime),
      startTime: event.startTime,
      endTime: event.endTime,
      breakdownTime: calculateBreakdownTime(event.endTime),
      expectedGuests: event.expectedGuests
    },
    venue: venue ? { name: venue.name, capacity: venue.capacity, floor: venue.floor, features: venue.features } : null,
    layout: event.layout,
    catering: event.catering,
    equipment: event.equipment,
    contact: event.contact,
    notes: event.notes,
    generatedAt: new Date().toISOString()
  };

  res.json(functionSheet);
});

// ============================================
// AVAILABILITY CHECK
// ============================================

app.get('/api/availability', (req, res) => {
  const { venueId, date, startTime, endTime } = req.query;

  if (!venueId || !date) {
    return res.status(400).json({ error: 'venueId, date required' });
  }

  const venue = venues.get(venueId);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });

  const existingBookings = getVenueBookings(venueId, date);
  const hasConflict = existingBookings.some(b => {
    return timeOverlaps(startTime, endTime, b.startTime, b.endTime);
  });

  res.json({
    venue,
    date,
    available: !hasConflict,
    existingBookings
  });
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const eventList = Array.from(events.values()).filter(e => e.businessId === businessId);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = eventList.filter(e => e.date.startsWith(today.slice(0, 7)));

  res.json({
    overview: {
      totalEvents: eventList.length,
      pending: eventList.filter(e => e.status === 'enquiry').length,
      confirmed: eventList.filter(e => ['confirmed', 'contracted'].includes(e.status)).length,
      completed: eventList.filter(e => e.status === 'completed').length,
      cancelled: eventList.filter(e => e.status === 'cancelled').length,
      totalRevenue: eventList.reduce((sum, e) => sum + (e.estimatedRevenue || 0), 0),
      actualRevenue: eventList.reduce((sum, e) => sum + (e.actualRevenue || 0), 0)
    },
    thisMonth: {
      events: thisMonth.length,
      revenue: thisMonth.reduce((sum, e) => sum + (e.estimatedRevenue || 0), 0)
    },
    byType: eventList.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {})
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'StayOwn Events Service',
    port: PORT,
    venues: venues.size,
    events: events.size,
    contracts: contracts.size,
    invoices: invoices.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getVenueBookings(venueId, date) {
  return Array.from(bookings.values()).filter(b =>
    b.venueId === venueId && b.date === date && b.status !== 'cancelled'
  );
}

function calculateDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function calculateSetupTime(eventTime) {
  const [h, m] = eventTime.split(':').map(Number);
  const setupMinutes = h * 60 + m - 120; // 2 hours before
  const setupH = Math.floor(setupMinutes / 60);
  const setupM = setupMinutes % 60;
  return `${String(setupH).padStart(2, '0')}:${String(setupM).padStart(2, '0')}`;
}

function calculateBreakdownTime(endTime) {
  const [h, m] = endTime.split(':').map(Number);
  const breakdownMinutes = h * 60 + m + 60; // 1 hour after
  const breakdownH = Math.floor(breakdownMinutes / 60);
  const breakdownM = breakdownMinutes % 60;
  return `${String(breakdownH).padStart(2, '0')}:${String(breakdownM).padStart(2, '0')}`;
}

function calculateVenueCost(event) {
  const venue = venues.get(event.venueId);
  if (!venue) return 0;

  const duration = event.duration || 4;
  if (duration >= 8) return venue.fullDay || 0;
  if (duration >= 4) return venue.halfDay || venue.hourlyRate * duration;
  return venue.hourlyRate * duration;
}

function timeOverlaps(start1, end1, start2, end2) {
  const toMinutes = t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMinutes(start1) < toMinutes(end2) && toMinutes(end1) > toMinutes(start2);
}

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log('🎪 StayOwn Events Service running on port ' + PORT);
  console.log('📋 Venues: ' + venues.size + ' | Events: ' + events.size);
});
