/**
 * Home Services OS - AI Company Platform
 *
 * Complete Home Services / On-Demand Services Management Platform
 * Port: 5140
 * Industry: Home Services (Plumbing, Electrician, Cleaning, AC Repair, etc.)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5140;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ============================================
// LAYER CONFIGURATION
// ============================================

const INDUSTRY = 'home-services';

// Service URLs for Layer Integration
const RTMN_SERVICES = {
  genie: process.env.GENIE_URL || 'http://localhost:4701',
  copilot: process.env.COPILOT_URL || 'http://localhost:4600',
  agentMarketplace: process.env.AGENT_URL || 'http://localhost:4580',
  wallet: process.env.WALLET_URL || 'http://localhost:4004',
  paymentGateway: process.env.PAYMENT_GATEWAY_URL || 'http://localhost:4006',
  eventBus: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  corpid: process.env.CORPID_URL || 'http://localhost:4702',
  memory: process.env.MEMORY_URL || 'http://localhost:4703',
  twinos: process.env.TWINOS_URL || 'http://localhost:4705',
  sutar: process.env.SUTAR_URL || 'http://localhost:4140',
  goalOS: process.env.GOAL_URL || 'http://localhost:4242',
  crmHub: process.env.CRM_HUB_URL || 'http://localhost:4056',
  loyaltyService: process.env.LOYALTY_URL || 'http://localhost:4070',
  ecosystemConnector: process.env.ECOSYSTEM_URL || 'http://localhost:4399',
};

// ============================================
// AUTHENTICATION & DATABASE
// ============================================

const authUsers = new Map();
const authSessions = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Auth Endpoints
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
    industry: INDUSTRY,
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, industry: INDUSTRY, createdAt: Date.now() });
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

// ============================================
// HOME SERVICES DATA MODELS
// ============================================

// Services (Categories like Plumbing, Electrical, Cleaning, AC Repair, etc.)
const services = new Map();
const servicePackages = new Map();

// Service Providers/Workers
const providers = new Map();
const providerAvailability = new Map();
const providerSkills = new Map();

// Customers
const customers = new Map();

// Bookings/Jobs
const bookings = new Map();
const jobAssignments = new Map();

// Invoices & Payments
const invoices = new Map();
const payments = new Map();

// Reviews & Ratings
const reviews = new Map();

// Digital Twins
const serviceTwin = new Map();
const providerTwin = new Map();
const customerTwin = new Map();
const bookingTwin = new Map();
const invoiceTwin = new Map();

// ============================================
// SAMPLE DATA
// ============================================

// Initialize Sample Services (5 services)
const sampleServices = [
  {
    id: 'svc_1',
    name: 'Plumbing Repair',
    category: 'plumbing',
    description: 'Leak repairs, pipe fixes, faucet installation, drain cleaning',
    basePrice: 299,
    unit: 'visit',
    duration: 60,
    icon: '🔧',
    active: true,
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'svc_2',
    name: 'Electrical Services',
    category: 'electrical',
    description: 'Wiring, switchboard, fan installation, MCB repair',
    basePrice: 399,
    unit: 'visit',
    duration: 90,
    icon: '⚡',
    active: true,
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'svc_3',
    name: 'Deep Cleaning',
    category: 'cleaning',
    description: 'Full home deep cleaning, kitchen & bathroom sanitization',
    basePrice: 999,
    unit: 'home',
    duration: 180,
    icon: '🧹',
    active: true,
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'svc_4',
    name: 'AC Repair & Service',
    category: 'ac_repair',
    description: 'AC repair, gas refill, filter cleaning, installation',
    basePrice: 499,
    unit: 'unit',
    duration: 60,
    icon: '❄️',
    active: true,
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'svc_5',
    name: 'Appliance Repair',
    category: 'appliance',
    description: 'Refrigerator, washing machine, microwave repair services',
    basePrice: 449,
    unit: 'appliance',
    duration: 90,
    icon: '🔌',
    active: true,
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  }
];
sampleServices.forEach(s => {
  services.set(s.id, s);
  serviceTwin.set(s.id, { ...s, twinType: 'service', syncedAt: new Date().toISOString() });
});

// Initialize Sample Packages
const samplePackages = [
  {
    id: 'pkg_1',
    name: 'Monthly Home Care',
    description: 'Complete monthly maintenance package',
    price: 2499,
    duration: 'monthly',
    services: ['svc_1', 'svc_2'],
    visits: 2,
    tenantId: 'demo'
  },
  {
    id: 'pkg_2',
    name: 'Deep Clean Combo',
    description: 'Deep cleaning + AC service combo',
    price: 1399,
    duration: 'onetime',
    services: ['svc_3', 'svc_4'],
    visits: 1,
    tenantId: 'demo'
  }
];
samplePackages.forEach(p => servicePackages.set(p.id, p));

// Initialize Sample Providers (4 providers)
const sampleProviders = [
  {
    id: 'prov_1',
    name: 'Rajesh Kumar',
    phone: '+91-9876543210',
    email: 'rajesh@homeservices.com',
    category: 'plumbing',
    skills: ['Leak Repair', 'Pipe Fitting', 'Drain Cleaning', 'Water Heater'],
    experience: 8,
    rating: 4.8,
    totalJobs: 342,
    status: 'available',
    currentLocation: { lat: 28.6139, lng: 77.2090 },
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prov_2',
    name: 'Amit Singh',
    phone: '+91-9876543211',
    email: 'amit@homeservices.com',
    category: 'electrical',
    skills: ['Wiring', 'Switchboard', 'Fan Installation', 'MCB Repair'],
    experience: 6,
    rating: 4.6,
    totalJobs: 256,
    status: 'available',
    currentLocation: { lat: 28.5355, lng: 77.3910 },
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prov_3',
    name: 'Priya Sharma',
    phone: '+91-9876543212',
    email: 'priya@homeservices.com',
    category: 'cleaning',
    skills: ['Deep Cleaning', 'Sanitization', 'Kitchen Cleaning', 'Bathroom Cleaning'],
    experience: 4,
    rating: 4.9,
    totalJobs: 189,
    status: 'busy',
    currentLocation: { lat: 28.6304, lng: 77.2177 },
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prov_4',
    name: 'Vikram Mehta',
    phone: '+91-9876543213',
    email: 'vikram@homeservices.com',
    category: 'ac_repair',
    skills: ['AC Repair', 'Gas Refill', 'Installation', 'Filter Cleaning'],
    experience: 7,
    rating: 4.7,
    totalJobs: 298,
    status: 'available',
    currentLocation: { lat: 28.5672, lng: 77.2100 },
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  }
];
sampleProviders.forEach(p => {
  providers.set(p.id, p);
  providerTwin.set(p.id, { ...p, twinType: 'provider', syncedAt: new Date().toISOString() });
  providerAvailability.set(p.id, {
    providerId: p.id,
    day: 'monday',
    slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    isAvailable: true
  });
});

// Initialize Sample Customers (3 customers)
const sampleCustomers = [
  {
    id: 'cust_1',
    name: 'Rahul Sharma',
    phone: '+91-9988776655',
    email: 'rahul@example.com',
    address: '42, MG Road, Sector 14, Gurugram',
    location: { lat: 28.4595, lng: 77.0266 },
    loyaltyPoints: 1500,
    tier: 'silver',
    totalBookings: 8,
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust_2',
    name: 'Neha Patel',
    phone: '+91-9988776656',
    email: 'neha@example.com',
    address: '15, Connaught Place, Block C, Delhi',
    location: { lat: 28.6315, lng: 77.2167 },
    loyaltyPoints: 3200,
    tier: 'gold',
    totalBookings: 15,
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust_3',
    name: 'Amit Verma',
    phone: '+91-9988776657',
    email: 'amit@example.com',
    address: '7, Cyber Hub, DLF Phase 2, Gurugram',
    location: { lat: 28.4736, lng: 77.0725 },
    loyaltyPoints: 500,
    tier: 'bronze',
    totalBookings: 3,
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  }
];
sampleCustomers.forEach(c => {
  customers.set(c.id, c);
  customerTwin.set(c.id, { ...c, twinType: 'customer', syncedAt: new Date().toISOString() });
});

// Initialize Sample Bookings (5 bookings)
const now = new Date();
const sampleBookings = [
  {
    id: 'book_1',
    bookingNumber: 'HS' + Date.now().toString().slice(-6) + '1',
    customerId: 'cust_1',
    serviceId: 'svc_1',
    providerId: 'prov_1',
    scheduledDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
    scheduledTime: '10:00',
    status: 'confirmed',
    price: 299,
    notes: 'Kitchen sink leaking',
    address: '42, MG Road, Sector 14, Gurugram',
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'book_2',
    bookingNumber: 'HS' + Date.now().toString().slice(-6) + '2',
    customerId: 'cust_2',
    serviceId: 'svc_3',
    providerId: 'prov_3',
    scheduledDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
    scheduledTime: '14:00',
    status: 'in_progress',
    price: 999,
    notes: 'Full home deep cleaning required',
    address: '15, Connaught Place, Block C, Delhi',
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'book_3',
    bookingNumber: 'HS' + Date.now().toString().slice(-6) + '3',
    customerId: 'cust_3',
    serviceId: 'svc_4',
    providerId: 'prov_4',
    scheduledDate: new Date(now.getTime() + 172800000).toISOString().split('T')[0],
    scheduledTime: '11:00',
    status: 'pending',
    price: 499,
    notes: 'AC not cooling properly',
    address: '7, Cyber Hub, DLF Phase 2, Gurugram',
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'book_4',
    bookingNumber: 'HS' + Date.now().toString().slice(-6) + '4',
    customerId: 'cust_1',
    serviceId: 'svc_2',
    providerId: 'prov_2',
    scheduledDate: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
    scheduledTime: '15:00',
    status: 'completed',
    price: 399,
    notes: 'New switchboard installation',
    address: '42, MG Road, Sector 14, Gurugram',
    completedAt: new Date().toISOString(),
    tenantId: 'demo',
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'book_5',
    bookingNumber: 'HS' + Date.now().toString().slice(-6) + '5',
    customerId: 'cust_2',
    serviceId: 'svc_5',
    providerId: null,
    scheduledDate: new Date(now.getTime() + 259200000).toISOString().split('T')[0],
    scheduledTime: '09:00',
    status: 'pending_assignment',
    price: 449,
    notes: 'Washing machine not draining',
    address: '15, Connaught Place, Block C, Delhi',
    tenantId: 'demo',
    createdAt: new Date().toISOString()
  }
];
sampleBookings.forEach(b => {
  bookings.set(b.id, b);
  bookingTwin.set(b.id, { ...b, twinType: 'booking', syncedAt: new Date().toISOString() });
});

// Initialize Sample Reviews (3 reviews)
const sampleReviews = [
  {
    id: 'rev_1',
    bookingId: 'book_4',
    customerId: 'cust_1',
    providerId: 'prov_2',
    serviceId: 'svc_2',
    rating: 5,
    comment: 'Excellent work! Very professional and completed on time.',
    createdAt: new Date().toISOString(),
    tenantId: 'demo'
  },
  {
    id: 'rev_2',
    bookingId: null,
    customerId: 'cust_1',
    providerId: 'prov_1',
    serviceId: 'svc_1',
    rating: 4,
    comment: 'Good service, arrived on time. Fixed the issue quickly.',
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    tenantId: 'demo'
  },
  {
    id: 'rev_3',
    bookingId: null,
    customerId: 'cust_2',
    providerId: 'prov_3',
    serviceId: 'svc_3',
    rating: 5,
    comment: 'Best deep cleaning service ever! My home looks brand new.',
    createdAt: new Date(Date.now() - 1209600000).toISOString(),
    tenantId: 'demo'
  }
];
sampleReviews.forEach(r => reviews.set(r.id, r));

// ============================================
// SERVICE MANAGEMENT API
// ============================================

// Get all services
app.get('/api/services', (req, res) => {
  const { category } = req.query;
  let serviceList = Array.from(services.values()).filter(s => s.active);
  if (category) {
    serviceList = serviceList.filter(s => s.category === category);
  }
  res.json({ services: serviceList });
});

// Get single service
app.get('/api/services/:id', (req, res) => {
  const service = services.get(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  res.json(service);
});

// Create service
app.post('/api/services', requireAuth, (req, res) => {
  const service = {
    id: 'svc_' + Date.now(),
    ...req.body,
    tenantId: req.session.businessId,
    active: true,
    createdAt: new Date().toISOString()
  };
  services.set(service.id, service);
  serviceTwin.set(service.id, { ...service, twinType: 'service', syncedAt: new Date().toISOString() });
  res.status(201).json(service);
});

// Update service
app.patch('/api/services/:id', requireAuth, (req, res) => {
  const service = services.get(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  const updated = { ...service, ...req.body };
  services.set(service.id, updated);
  serviceTwin.set(service.id, { ...updated, twinType: 'service', syncedAt: new Date().toISOString() });
  res.json(updated);
});

// Get service packages
app.get('/api/packages', (req, res) => {
  res.json({ packages: Array.from(servicePackages.values()) });
});

// Create package
app.post('/api/packages', requireAuth, (req, res) => {
  const pkg = {
    id: 'pkg_' + Date.now(),
    ...req.body,
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };
  servicePackages.set(pkg.id, pkg);
  res.status(201).json(pkg);
});

// ============================================
// PROVIDER MANAGEMENT API
// ============================================

// Get all providers
app.get('/api/providers', (req, res) => {
  const { category, status } = req.query;
  let providerList = Array.from(providers.values());
  if (category) {
    providerList = providerList.filter(p => p.category === category);
  }
  if (status) {
    providerList = providerList.filter(p => p.status === status);
  }
  res.json({ providers: providerList });
});

// Get single provider
app.get('/api/providers/:id', (req, res) => {
  const provider = providers.get(req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  const availability = providerAvailability.get(provider.id) || {};
  const providerReviews = Array.from(reviews.values()).filter(r => r.providerId === provider.id);
  const avgRating = providerReviews.length > 0
    ? providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length
    : provider.rating;

  res.json({
    ...provider,
    availability,
    reviews: providerReviews,
    averageRating: parseFloat(avgRating.toFixed(1))
  });
});

// Create provider
app.post('/api/providers', requireAuth, (req, res) => {
  const provider = {
    id: 'prov_' + Date.now(),
    ...req.body,
    rating: 0,
    totalJobs: 0,
    status: 'available',
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };
  providers.set(provider.id, provider);
  providerTwin.set(provider.id, { ...provider, twinType: 'provider', syncedAt: new Date().toISOString() });
  res.status(201).json(provider);
});

// Update provider
app.patch('/api/providers/:id', requireAuth, (req, res) => {
  const provider = providers.get(req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  const updated = { ...provider, ...req.body };
  providers.set(provider.id, updated);
  providerTwin.set(provider.id, { ...updated, twinType: 'provider', syncedAt: new Date().toISOString() });
  res.json(updated);
});

// Update provider availability
app.post('/api/providers/:id/availability', requireAuth, (req, res) => {
  const { day, slots, isAvailable } = req.body;
  providerAvailability.set(req.params.id, {
    providerId: req.params.id,
    day: day || 'monday',
    slots: slots || [],
    isAvailable: isAvailable !== false
  });
  res.json({ success: true, availability: providerAvailability.get(req.params.id) });
});

// Get provider availability
app.get('/api/providers/:id/availability', (req, res) => {
  const availability = providerAvailability.get(req.params.id);
  if (!availability) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  res.json(availability);
});

// ============================================
// CUSTOMER MANAGEMENT API
// ============================================

// Get all customers
app.get('/api/customers', (req, res) => {
  res.json({ customers: Array.from(customers.values()) });
});

// Get single customer
app.get('/api/customers/:id', (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const customerBookings = Array.from(bookings.values()).filter(b => b.customerId === customer.id);
  const customerReviews = Array.from(reviews.values()).filter(r => r.customerId === customer.id);
  res.json({
    ...customer,
    bookings: customerBookings,
    reviews: customerReviews
  });
});

// Create customer
app.post('/api/customers', requireAuth, (req, res) => {
  const customer = {
    id: 'cust_' + Date.now(),
    ...req.body,
    loyaltyPoints: 0,
    tier: 'bronze',
    totalBookings: 0,
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };
  customers.set(customer.id, customer);
  customerTwin.set(customer.id, { ...customer, twinType: 'customer', syncedAt: new Date().toISOString() });
  res.status(201).json(customer);
});

// Update customer
app.patch('/api/customers/:id', requireAuth, (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const updated = { ...customer, ...req.body };
  customers.set(customer.id, updated);
  customerTwin.set(customer.id, { ...updated, twinType: 'customer', syncedAt: new Date().toISOString() });
  res.json(updated);
});

// Add loyalty points
app.post('/api/customers/:id/points', requireAuth, (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const points = req.body.points || 0;
  customer.loyaltyPoints += points;
  if (customer.loyaltyPoints >= 5000) customer.tier = 'platinum';
  else if (customer.loyaltyPoints >= 2000) customer.tier = 'gold';
  else if (customer.loyaltyPoints >= 500) customer.tier = 'silver';
  customers.set(customer.id, customer);
  res.json(customer);
});

// ============================================
// BOOKING/JOB MANAGEMENT API
// ============================================

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const { status, customerId, providerId, date } = req.query;
  let bookingList = Array.from(bookings.values());
  if (status) bookingList = bookingList.filter(b => b.status === status);
  if (customerId) bookingList = bookingList.filter(b => b.customerId === customerId);
  if (providerId) bookingList = bookingList.filter(b => b.providerId === providerId);
  if (date) bookingList = bookingList.filter(b => b.scheduledDate === date);
  res.json({ bookings: bookingList });
});

// Get single booking
app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  const customer = customers.get(booking.customerId);
  const provider = booking.providerId ? providers.get(booking.providerId) : null;
  const service = services.get(booking.serviceId);
  const bookingReviews = Array.from(reviews.values()).filter(r => r.bookingId === booking.id);
  res.json({
    ...booking,
    customer,
    provider,
    service,
    reviews: bookingReviews
  });
});

// Create booking
app.post('/api/bookings', requireAuth, (req, res) => {
  const { customerId, serviceId, scheduledDate, scheduledTime, notes, address } = req.body;

  if (!customerId || !serviceId || !scheduledDate || !scheduledTime) {
    return res.status(400).json({ error: 'customerId, serviceId, scheduledDate, scheduledTime required' });
  }

  const service = services.get(serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const customer = customers.get(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const booking = {
    id: 'book_' + Date.now(),
    bookingNumber: 'HS' + Date.now().toString().slice(-6),
    customerId,
    serviceId,
    providerId: null,
    scheduledDate,
    scheduledTime,
    status: 'pending_assignment',
    price: service.basePrice,
    notes: notes || '',
    address: address || customer.address,
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };

  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });
  res.status(201).json(booking);
});

// Update booking status
app.patch('/api/bookings/:id/status', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { status } = req.body;
  const validStatuses = ['pending_assignment', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}` });
  }

  booking.status = status;
  if (status === 'completed') {
    booking.completedAt = new Date().toISOString();
  }

  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });

  // Update customer booking count and loyalty points on completion
  if (status === 'completed') {
    const customer = customers.get(booking.customerId);
    if (customer) {
      customer.totalBookings = (customer.totalBookings || 0) + 1;
      customer.loyaltyPoints += Math.floor(booking.price * 0.1);
      customers.set(customer.id, customer);
    }
  }

  res.json(booking);
});

// Assign provider to booking
app.post('/api/bookings/:id/assign', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { providerId } = req.body;
  const provider = providers.get(providerId);
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  booking.providerId = providerId;
  booking.status = 'confirmed';

  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });

  res.json(booking);
});

// Cancel booking
app.post('/api/bookings/:id/cancel', requireAuth, (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  booking.cancellationReason = req.body.reason || '';

  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });

  res.json(booking);
});

// ============================================
// SCHEDULING & DISPATCH API
// ============================================

// Get available slots for a date
app.get('/api/schedule/slots', (req, res) => {
  const { date, serviceId } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date required' });
  }

  const service = services.get(serviceId);
  const category = service?.category;

  // Get providers for the service category
  const availableProviders = Array.from(providers.values())
    .filter(p => p.status === 'available' && (!category || p.category === category));

  // Generate time slots
  const allSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  // Check which slots are already booked
  const bookedSlots = Array.from(bookings.values())
    .filter(b => b.scheduledDate === date && b.status !== 'cancelled')
    .map(b => b.scheduledTime);

  const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

  res.json({
    date,
    availableSlots,
    availableProviders: availableProviders.map(p => ({ id: p.id, name: p.name })),
    duration: service?.duration || 60
  });
});

// Dispatch - auto-assign provider
app.post('/api/schedule/dispatch', requireAuth, (req, res) => {
  const { bookingId } = req.body;

  const booking = bookings.get(bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const service = services.get(booking.serviceId);

  // Find available provider in the same category
  const availableProvider = Array.from(providers.values())
    .find(p => p.status === 'available' && p.category === service?.category);

  if (!availableProvider) {
    return res.status(400).json({ error: 'No available provider for this service' });
  }

  booking.providerId = availableProvider.id;
  booking.status = 'confirmed';

  bookings.set(booking.id, booking);
  bookingTwin.set(booking.id, { ...booking, twinType: 'booking', syncedAt: new Date().toISOString() });

  res.json({
    booking,
    assignedProvider: availableProvider
  });
});

// ============================================
// INVOICING & PAYMENTS API
// ============================================

// Get all invoices
app.get('/api/invoices', (req, res) => {
  const { customerId, status } = req.query;
  let invoiceList = Array.from(invoices.values());
  if (customerId) invoiceList = invoiceList.filter(i => i.customerId === customerId);
  if (status) invoiceList = invoiceList.filter(i => i.status === status);
  res.json({ invoices: invoiceList });
});

// Get single invoice
app.get('/api/invoices/:id', (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  const booking = bookings.get(invoice.bookingId);
  const customer = customers.get(invoice.customerId);
  res.json({ ...invoice, booking, customer });
});

// Create invoice from booking
app.post('/api/invoices', requireAuth, (req, res) => {
  const { bookingId, items, discount = 0, taxRate = 18 } = req.body;

  const booking = bookings.get(bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const invoiceItems = items || [{
    description: services.get(booking.serviceId)?.name || 'Service',
    quantity: 1,
    price: booking.price
  }];

  const subtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = taxableAmount + taxAmount;

  const invoice = {
    id: 'inv_' + Date.now(),
    invoiceNumber: 'INV-HS-' + Date.now().toString().slice(-8),
    bookingId,
    customerId: booking.customerId,
    items: invoiceItems,
    subtotal,
    discount,
    discountAmount,
    taxRate,
    taxAmount,
    total,
    status: 'pending',
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };

  invoices.set(invoice.id, invoice);
  invoiceTwin.set(invoice.id, { ...invoice, twinType: 'invoice', syncedAt: new Date().toISOString() });
  res.status(201).json(invoice);
});

// Record payment
app.post('/api/invoices/:id/pay', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const { method = 'cash', transactionId } = req.body;

  invoice.status = 'paid';
  invoice.paidAt = new Date().toISOString();
  invoice.paymentMethod = method;
  invoice.transactionId = transactionId || 'TXN-' + Date.now();

  invoices.set(invoice.id, invoice);
  invoiceTwin.set(invoice.id, { ...invoice, twinType: 'invoice', syncedAt: new Date().toISOString() });

  // Record payment
  const payment = {
    id: 'pay_' + Date.now(),
    invoiceId: invoice.id,
    customerId: invoice.customerId,
    amount: invoice.total,
    method,
    transactionId: invoice.transactionId,
    status: 'completed',
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };
  payments.set(payment.id, payment);

  res.json({ invoice, payment });
});

// ============================================
// REVIEWS & RATINGS API
// ============================================

// Get all reviews
app.get('/api/reviews', (req, res) => {
  const { providerId, serviceId, customerId } = req.query;
  let reviewList = Array.from(reviews.values());
  if (providerId) reviewList = reviewList.filter(r => r.providerId === providerId);
  if (serviceId) reviewList = reviewList.filter(r => r.serviceId === serviceId);
  if (customerId) reviewList = reviewList.filter(r => r.customerId === customerId);
  res.json({ reviews: reviewList });
});

// Create review
app.post('/api/reviews', requireAuth, (req, res) => {
  const { bookingId, providerId, serviceId, rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating (1-5) required' });
  }

  // If booking provided, get provider and service from it
  let finalProviderId = providerId;
  let finalServiceId = serviceId;
  let finalCustomerId = req.session.userId;

  if (bookingId) {
    const booking = bookings.get(bookingId);
    if (booking) {
      finalProviderId = finalProviderId || booking.providerId;
      finalServiceId = finalServiceId || booking.serviceId;
      finalCustomerId = booking.customerId;
    }
  }

  const review = {
    id: 'rev_' + Date.now(),
    bookingId: bookingId || null,
    customerId: finalCustomerId,
    providerId: finalProviderId,
    serviceId: finalServiceId,
    rating,
    comment: comment || '',
    tenantId: req.session.businessId,
    createdAt: new Date().toISOString()
  };

  reviews.set(review.id, review);

  // Update provider rating
  if (finalProviderId) {
    const provider = providers.get(finalProviderId);
    if (provider) {
      const allReviews = Array.from(reviews.values()).filter(r => r.providerId === finalProviderId);
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      provider.rating = parseFloat(avgRating.toFixed(1));
      providers.set(provider.id, provider);
    }
  }

  res.status(201).json(review);
});

// ============================================
// ANALYTICS API
// ============================================

// Dashboard analytics
app.get('/api/analytics', requireAuth, (req, res) => {
  const bookingList = Array.from(bookings.values());
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
  const thisMonth = now.toISOString().slice(0, 7);

  const todayBookings = bookingList.filter(b => b.scheduledDate === today);
  const weekBookings = bookingList.filter(b => b.scheduledDate >= thisWeekStart);
  const monthBookings = bookingList.filter(b => b.scheduledDate.startsWith(thisMonth));
  const completedBookings = bookingList.filter(b => b.status === 'completed');

  const revenue = completedBookings.reduce((sum, b) => sum + b.price, 0);
  const monthRevenue = monthBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.price, 0);

  // Service breakdown
  const serviceBreakdown = {};
  bookingList.forEach(b => {
    const service = services.get(b.serviceId);
    const cat = service?.category || 'other';
    if (!serviceBreakdown[cat]) serviceBreakdown[cat] = { count: 0, revenue: 0 };
    serviceBreakdown[cat].count++;
    if (b.status === 'completed') serviceBreakdown[cat].revenue += b.price;
  });

  // Provider performance
  const providerPerformance = Array.from(providers.values()).map(p => {
    const provBookings = bookingList.filter(b => b.providerId === p.id);
    const completed = provBookings.filter(b => b.status === 'completed');
    return {
      id: p.id,
      name: p.name,
      totalJobs: provBookings.length,
      completedJobs: completed.length,
      rating: p.rating,
      revenue: completed.reduce((sum, b) => sum + b.price, 0)
    };
  });

  // Rating distribution
  const reviewList = Array.from(reviews.values());
  const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviewList.forEach(r => ratingDist[r.rating]++);

  res.json({
    summary: {
      totalBookings: bookingList.length,
      todayBookings: todayBookings.length,
      weekBookings: weekBookings.length,
      monthBookings: monthBookings.length,
      completedBookings: completedBookings.length,
      pendingBookings: bookingList.filter(b => b.status === 'pending_assignment' || b.status === 'confirmed').length,
      inProgressBookings: bookingList.filter(b => b.status === 'in_progress').length,
      totalRevenue: revenue,
      monthRevenue,
      avgBookingValue: completedBookings.length > 0 ? revenue / completedBookings.length : 0
    },
    services: services.size,
    providers: providers.size,
    customers: customers.size,
    serviceBreakdown,
    providerPerformance,
    ratingDistribution: ratingDist,
    averageRating: reviewList.length > 0
      ? parseFloat((reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length).toFixed(1))
      : 0
  });
});

// Revenue analytics
app.get('/api/analytics/revenue', requireAuth, (req, res) => {
  const { period = 'week' } = req.query;
  const bookingList = Array.from(bookings.values()).filter(b => b.status === 'completed');

  const now = new Date();
  let days = 7;
  if (period === 'month') days = 30;
  if (period === 'quarter') days = 90;

  const revenueByDate = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
    revenueByDate[date] = 0;
  }

  bookingList.forEach(b => {
    if (revenueByDate.hasOwnProperty(b.scheduledDate)) {
      revenueByDate[b.scheduledDate] += b.price;
    }
  });

  const totalRevenue = Object.values(revenueByDate).reduce((sum, v) => sum + v, 0);

  res.json({
    period,
    days,
    revenueByDate,
    totalRevenue,
    avgDaily: totalRevenue / days
  });
});

// ============================================
// DIGITAL TWINS API
// ============================================

// Get all twins
app.get('/api/twins', requireAuth, (req, res) => {
  res.json({
    serviceTwin: Array.from(serviceTwin.values()),
    providerTwin: Array.from(providerTwin.values()),
    customerTwin: Array.from(customerTwin.values()),
    bookingTwin: Array.from(bookingTwin.values()),
    invoiceTwin: Array.from(invoiceTwin.values())
  });
});

// Sync twins to TwinOS Hub
app.post('/api/twins/sync', requireAuth, async (req, res) => {
  try {
    const twins = [
      ...serviceTwin.values(),
      ...providerTwin.values(),
      ...customerTwin.values(),
      ...bookingTwin.values()
    ];

    // Would sync to TwinOS Hub here
    res.json({ success: true, syncedCount: twins.length, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Twin sync failed' });
  }
});

// ============================================
// RTMN LAYER INTEGRATION
// ============================================

// Layer 1: Intelligence
app.get('/api/layer/intelligence', requireAuth, async (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence (HOJAI AI)',
    services: {
      genie: RTMN_SERVICES.genie,
      copilot: RTMN_SERVICES.copilot,
      agentMarketplace: RTMN_SERVICES.agentMarketplace
    },
    capabilities: ['AI Genie', 'Business Copilot', 'Agent Marketplace']
  });
});

// Layer 2: Customer Growth
app.get('/api/layer/customer-growth', requireAuth, async (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    services: {
      crmHub: RTMN_SERVICES.crmHub,
      loyaltyService: RTMN_SERVICES.loyaltyService
    },
    capabilities: ['CRM', 'Loyalty Programs', 'Referrals']
  });
});

// Layer 3: Commerce
app.get('/api/layer/commerce', requireAuth, async (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    capabilities: ['Service Marketplace', 'Package Deals', 'Bookings']
  });
});

// Layer 4: Financial
app.get('/api/layer/finance', requireAuth, async (req, res) => {
  res.json({
    layer: 4,
    name: 'Financial (RABTUL)',
    services: {
      wallet: RTMN_SERVICES.wallet,
      paymentGateway: RTMN_SERVICES.paymentGateway
    },
    capabilities: ['Payments', 'Invoicing', 'Wallet']
  });
});

// Layer 10: Identity
app.get('/api/layer/identity', requireAuth, async (req, res) => {
  res.json({
    layer: 10,
    name: 'Identity (CorpID)',
    services: { corpid: RTMN_SERVICES.corpid },
    capabilities: ['Provider Identity', 'Customer Identity']
  });
});

// Layer 11: Memory
app.get('/api/layer/memory', requireAuth, async (req, res) => {
  res.json({
    layer: 11,
    name: 'Memory (MemoryOS)',
    services: { memory: RTMN_SERVICES.memory },
    capabilities: ['Service History', 'Customer Preferences']
  });
});

// Layer 12: Twins
app.get('/api/layer/twins', requireAuth, async (req, res) => {
  res.json({
    layer: 12,
    name: 'Twins (TwinOS Hub)',
    services: { twinos: RTMN_SERVICES.twinos },
    twins: {
      serviceTwin: serviceTwin.size,
      providerTwin: providerTwin.size,
      customerTwin: customerTwin.size,
      bookingTwin: bookingTwin.size,
      invoiceTwin: invoiceTwin.size
    }
  });
});

// All Layers Status
app.get('/api/layers', requireAuth, async (req, res) => {
  res.json({
    industry: INDUSTRY,
    service: 'Home Services OS',
    layers: [
      { layer: 1, name: 'Intelligence', endpoint: '/api/layer/intelligence' },
      { layer: 2, name: 'Customer Growth', endpoint: '/api/layer/customer-growth' },
      { layer: 3, name: 'Commerce', endpoint: '/api/layer/commerce' },
      { layer: 4, name: 'Finance', endpoint: '/api/layer/finance' },
      { layer: 10, name: 'Identity', endpoint: '/api/layer/identity' },
      { layer: 11, name: 'Memory', endpoint: '/api/layer/memory' },
      { layer: 12, name: 'Twins', endpoint: '/api/layer/twins' }
    ]
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Home Services OS',
    industry: INDUSTRY,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      services: services.size,
      providers: providers.size,
      customers: customers.size,
      bookings: bookings.size,
      invoices: invoices.size,
      reviews: reviews.size
    }
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`✅ Home Services OS running on port ${PORT}`);
  console.log(`📦 Industry: Home Services`);
  console.log(`📊 Sample Data: ${services.size} services, ${providers.size} providers, ${customers.size} customers, ${bookings.size} bookings`);
});
