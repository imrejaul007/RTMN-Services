/**
 * Beauty OS - AI Company Platform
 *
 * Complete Beauty & Salon Management System
 * Port: 5090
 * Industry: Beauty (Salons, Spas, Makeup Studios, Nail Art)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5090;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const INDUSTRY = 'beauty';

// In-memory database
const clients = new Map();
const stylists = new Map();
const services = new Map();
const appointments = new Map();
const products = new Map();
const sales = new Map();
const packages = new Map();
const memberships = new Map();
const inventory = new Map();
const invoices = new Map();
const payments = new Map();
const loyaltyPoints = new Map();
const reviews = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();

// Sample data - Clients
const sampleClients = [
  {
    id: 'CLT001',
    name: 'Sneha Kapoor',
    email: 'sneha.k@email.com',
    phone: '+91 98765 51001',
    dob: '1994-03-15',
    gender: 'female',
    preferredStylist: 'STY001',
    skinType: 'combination',
    hairType: 'straight',
    allergies: ['none'],
    preferences: 'Prefers organic products',
    visitCount: 12,
    totalSpent: 24500,
    loyaltyPoints: 2450,
    avatar: '💇‍♀️',
    status: 'active',
    memberSince: '2023-01-15'
  },
  {
    id: 'CLT002',
    name: 'Meera Patel',
    email: 'meera.patel@email.com',
    phone: '+91 98765 51002',
    dob: '1990-07-22',
    gender: 'female',
    preferredStylist: 'STY002',
    skinType: 'sensitive',
    hairType: 'wavy',
    allergies: ['fragrance'],
    preferences: 'Fragrance-free products only',
    visitCount: 8,
    totalSpent: 18200,
    loyaltyPoints: 1820,
    avatar: '💆‍♀️',
    status: 'active',
    memberSince: '2023-06-20'
  },
  {
    id: 'CLT003',
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91 98765 51003',
    dob: '1988-11-08',
    gender: 'female',
    preferredStylist: 'STY003',
    skinType: 'oily',
    hairType: 'curly',
    allergies: ['sulfates'],
    preferences: 'Sulfate-free products',
    visitCount: 15,
    totalSpent: 32000,
    loyaltyPoints: 3200,
    avatar: '✨',
    status: 'active',
    memberSince: '2022-09-10'
  }
];
sampleClients.forEach(c => clients.set(c.id, c));

// Sample data - Stylists
const sampleStylists = [
  {
    id: 'STY001',
    name: 'Aisha Khan',
    email: 'aisha@glowstudio.in',
    phone: '+91 98765 51101',
    specialization: ['Hair Coloring', 'Balayage', 'Haircuts'],
    certifications: ['L\'Oreal Certified Colorist', 'Vidal Sassoon Academy'],
    experience: 8,
    hourlyRate: 1500,
    rating: 4.9,
    clientsServed: 450,
    appointmentCount: 520,
    availability: 'full_time',
    schedule: { mon: '09:00-18:00', tue: '09:00-18:00', wed: '09:00-18:00', thu: '09:00-18:00', fri: '09:00-18:00', sat: '10:00-16:00' },
    avatar: '💇',
    status: 'active'
  },
  {
    id: 'STY002',
    name: 'Riya Verma',
    email: 'riya@glowstudio.in',
    phone: '+91 98765 51102',
    specialization: ['Facials', 'Skin Treatments', 'Microblading'],
    certifications: ['CIDESCO Certified', 'Dermalogica Specialist'],
    experience: 6,
    hourlyRate: 1200,
    rating: 4.8,
    clientsServed: 380,
    appointmentCount: 450,
    availability: 'full_time',
    schedule: { mon: '10:00-19:00', tue: '10:00-19:00', wed: '10:00-19:00', thu: '10:00-19:00', fri: '10:00-19:00', sun: '11:00-17:00' },
    avatar: '🧖‍♀️',
    status: 'active'
  },
  {
    id: 'STY003',
    name: 'Nisha Reddy',
    email: 'nisha@glowstudio.in',
    phone: '+91 98765 51103',
    specialization: ['Bridal Makeup', 'Party Makeup', 'Nail Art'],
    certifications: ['MAC Certified Artist', 'OPI Nail Art Specialist'],
    experience: 10,
    hourlyRate: 2000,
    rating: 4.9,
    clientsServed: 520,
    appointmentCount: 600,
    availability: 'part_time',
    schedule: { wed: '14:00-20:00', fri: '14:00-20:00', sat: '10:00-20:00', sun: '10:00-18:00' },
    avatar: '💄',
    status: 'active'
  }
];
sampleStylists.forEach(s => stylists.set(s.id, s));

// Sample data - Services
const sampleServices = [
  {
    id: 'SRV001',
    name: 'Haircut & Styling',
    category: 'hair',
    description: 'Professional haircut with wash and styling',
    duration: 60,
    price: 800,
    cost: 200,
    commission: 0.4,
    requiredSkills: ['Haircuts'],
    productsUsed: ['Shampoo', 'Conditioner', 'Styling Product'],
    status: 'active'
  },
  {
    id: 'SRV002',
    name: 'Balayage Coloring',
    category: 'hair',
    description: 'Hand-painted highlights for natural sun-kissed look',
    duration: 180,
    price: 5000,
    cost: 1500,
    commission: 0.45,
    requiredSkills: ['Hair Coloring', 'Balayage'],
    productsUsed: ['Hair Color', 'Developer', 'Bond Multiplier'],
    status: 'active'
  },
  {
    id: 'SRV003',
    name: 'Luxury Facial',
    category: 'skincare',
    description: 'Deep cleansing facial with massage and mask',
    duration: 90,
    price: 2500,
    cost: 600,
    commission: 0.4,
    requiredSkills: ['Facials', 'Skin Treatments'],
    productsUsed: ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Face Mask'],
    status: 'active'
  },
  {
    id: 'SRV004',
    name: 'Gel Manicure & Nail Art',
    category: 'nails',
    description: 'Gel polish with custom nail art design',
    duration: 75,
    price: 1200,
    cost: 300,
    commission: 0.5,
    requiredSkills: ['Nail Art'],
    productsUsed: ['Gel Base', 'Gel Color', 'Top Coat', 'Nail Art Supplies'],
    status: 'active'
  }
];
sampleServices.forEach(s => services.set(s.id, s));

// Sample data - Appointments
const sampleAppointments = [
  {
    id: 'APT001',
    clientId: 'CLT001',
    stylistId: 'STY001',
    serviceId: 'SRV001',
    date: '2024-06-15',
    time: '10:00',
    duration: 60,
    status: 'completed',
    notes: 'Regular trim',
    price: 800,
    paymentStatus: 'paid'
  },
  {
    id: 'APT002',
    clientId: 'CLT002',
    stylistId: 'STY002',
    serviceId: 'SRV003',
    date: '2024-06-14',
    time: '14:00',
    duration: 90,
    status: 'completed',
    notes: 'Sensitive skin, used fragrance-free products',
    price: 2500,
    paymentStatus: 'paid'
  },
  {
    id: 'APT003',
    clientId: 'CLT003',
    stylistId: 'STY003',
    serviceId: 'SRV002',
    date: '2024-06-16',
    time: '11:00',
    duration: 180,
    status: 'scheduled',
    notes: 'Bridal trial - caramel tones',
    price: 5000,
    paymentStatus: 'pending'
  }
];
sampleAppointments.forEach(a => appointments.set(a.id, a));

// Sample data - Products
const sampleProducts = [
  { id: 'PRD001', name: 'L\'Oreal Professional Shampoo', category: 'hair', sku: 'LOR-SHAM-500', price: 450, cost: 280, stock: 45, minStock: 20, unit: 'bottle', status: 'active' },
  { id: 'PRD002', name: 'Kerastase Hair Serum', category: 'hair', sku: 'KER-SER-100', price: 2200, cost: 1400, stock: 15, minStock: 5, unit: 'bottle', status: 'active' },
  { id: 'PRD003', name: 'Dermalogica Cleanser', category: 'skincare', sku: 'DER-CLN-200', price: 1200, cost: 750, stock: 25, minStock: 10, unit: 'bottle', status: 'active' },
  { id: 'PRD004', name: 'OPI Gel Polish - Ruby Red', category: 'nails', sku: 'OPI-GEL-RR', price: 350, cost: 180, stock: 30, minStock: 15, unit: 'bottle', status: 'active' },
  { id: 'PRD005', name: 'MAC Lipstick - Ruby Woo', category: 'makeup', sku: 'MAC-LIP-RW', price: 1800, cost: 1100, stock: 8, minStock: 5, unit: 'piece', status: 'low_stock' }
];
sampleProducts.forEach(p => products.set(p.id, p));

// Sample data - Packages
const samplePackages = [
  {
    id: 'PKG001',
    name: 'Bridesmaid Special',
    description: 'Complete bridal party package - makeup, hair, and nails',
    services: ['SRV002', 'SRV003', 'SRV004'],
    originalPrice: 8700,
    packagePrice: 7500,
    validity: 90,
    usages: 0,
    status: 'active'
  },
  {
    id: 'PKG002',
    name: 'Monthly Glow',
    description: 'Monthly facial and hair treatment subscription',
    services: ['SRV001', 'SRV003'],
    originalPrice: 3300,
    packagePrice: 2800,
    validity: 30,
    usages: 0,
    status: 'active'
  },
  {
    id: 'PKG003',
    name: 'Party Ready',
    description: 'Hair and makeup for special occasions',
    services: ['SRV001', 'SRV003', 'SRV004'],
    originalPrice: 4500,
    packagePrice: 3800,
    validity: 60,
    usages: 0,
    status: 'active'
  }
];
samplePackages.forEach(p => packages.set(p.id, p));

// Sample data - Memberships
const sampleMemberships = [
  {
    id: 'MEM001',
    clientId: 'CLT001',
    type: 'gold',
    name: 'Gold Member',
    monthlyFee: 5000,
    benefits: ['20% off all services', 'Priority booking', 'Free touch-ups', 'Birthday special'],
    servicesIncluded: [],
    pointsMultiplier: 3,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active',
    autoRenew: true
  },
  {
    id: 'MEM002',
    clientId: 'CLT003',
    type: 'platinum',
    name: 'Platinum Member',
    monthlyFee: 8000,
    benefits: ['30% off all services', 'VIP stylist access', 'Free products monthly', 'Exclusive events'],
    servicesIncluded: [],
    pointsMultiplier: 5,
    startDate: '2023-09-01',
    endDate: '2024-08-31',
    status: 'active',
    autoRenew: true
  }
];
sampleMemberships.forEach(m => memberships.set(m.id, m));

// Sample data - Reviews
const sampleReviews = [
  { id: 'REV001', clientId: 'CLT001', stylistId: 'STY001', appointmentId: 'APT001', rating: 5, comment: 'Amazing haircut! Aisha always understands exactly what I want.', date: '2024-06-15' },
  { id: 'REV002', clientId: 'CLT002', stylistId: 'STY002', appointmentId: 'APT002', rating: 5, comment: 'My skin feels so refreshed! Perfect for sensitive skin.', date: '2024-06-14' },
  { id: 'REV003', clientId: 'CLT001', stylistId: 'STY002', rating: 4, comment: 'Great facial, very relaxing atmosphere.', date: '2024-05-20' }
];
sampleReviews.forEach(r => reviews.set(r.id, r));

// Auth functions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { email, password, role, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  if (authUsers.has(email)) return res.status(409).json({ error: 'User exists' });
  const user = { id: 'user_' + Date.now(), email, passwordHash: hashPassword(password), role: role || 'client', name: name || email.split('@')[0], industry: INDUSTRY, createdAt: new Date().toISOString() };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
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

// CLIENTS
app.get('/api/clients', requireAuth, (req, res) => {
  const { status, search } = req.query;
  let result = Array.from(clients.values());
  if (status) result = result.filter(c => c.status === status);
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(searchLower) || c.email.toLowerCase().includes(searchLower) || c.phone.includes(search));
  }
  res.json({ success: true, count: result.length, clients: result });
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const clientAppointments = Array.from(appointments.values()).filter(a => a.clientId === client.id);
  const clientMembership = Array.from(memberships.values()).find(m => m.clientId === client.id && m.status === 'active');
  const clientReviews = Array.from(reviews.values()).filter(r => r.clientId === client.id);
  res.json({ success: true, client, appointments: clientAppointments, membership: clientMembership, reviews: clientReviews });
});

app.post('/api/clients', requireAuth, (req, res) => {
  const client = { id: 'CLT' + String(clients.size + 1).padStart(3, '0'), ...req.body, visitCount: 0, totalSpent: 0, loyaltyPoints: 0, status: 'active', memberSince: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
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

// STYLISTS
app.get('/api/stylists', requireAuth, (req, res) => {
  const { specialization, status, availability } = req.query;
  let result = Array.from(stylists.values());
  if (specialization) result = result.filter(s => s.specialization.includes(specialization));
  if (status) result = result.filter(s => s.status === status);
  if (availability) result = result.filter(s => s.availability === availability);
  res.json({ success: true, count: result.length, stylists: result });
});

app.get('/api/stylists/:id', requireAuth, (req, res) => {
  const stylist = stylists.get(req.params.id);
  if (!stylist) return res.status(404).json({ error: 'Stylist not found' });
  const stylistAppointments = Array.from(appointments.values()).filter(a => a.stylistId === stylist.id);
  const stylistReviews = Array.from(reviews.values()).filter(r => r.stylistId === stylist.id);
  const avgRating = stylistReviews.length > 0 ? stylistReviews.reduce((sum, r) => sum + r.rating, 0) / stylistReviews.length : 0;
  res.json({ success: true, stylist, appointments: stylistAppointments, reviews: stylistReviews, avgRating: avgRating.toFixed(1) });
});

app.post('/api/stylists', requireAuth, (req, res) => {
  const stylist = { id: 'STY' + String(stylists.size + 1).padStart(3, '0'), ...req.body, rating: 0, clientsServed: 0, appointmentCount: 0, status: 'active', createdAt: new Date().toISOString() };
  stylists.set(stylist.id, stylist);
  res.status(201).json({ success: true, stylist });
});

app.patch('/api/stylists/:id', requireAuth, (req, res) => {
  const stylist = stylists.get(req.params.id);
  if (!stylist) return res.status(404).json({ error: 'Stylist not found' });
  const updated = { ...stylist, ...req.body };
  stylists.set(stylist.id, updated);
  res.json({ success: true, stylist: updated });
});

// SERVICES
app.get('/api/services', requireAuth, (req, res) => {
  const { category, status, minPrice, maxPrice } = req.query;
  let result = Array.from(services.values());
  if (category) result = result.filter(s => s.category === category);
  if (status) result = result.filter(s => s.status === status);
  if (minPrice) result = result.filter(s => s.price >= parseInt(minPrice));
  if (maxPrice) result = result.filter(s => s.price <= parseInt(maxPrice));
  res.json({ success: true, count: result.length, services: result });
});

app.get('/api/services/:id', requireAuth, (req, res) => {
  const service = services.get(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json({ success: true, service });
});

app.post('/api/services', requireAuth, (req, res) => {
  const service = { id: 'SRV' + String(services.size + 1).padStart(3, '0'), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  services.set(service.id, service);
  res.status(201).json({ success: true, service });
});

app.patch('/api/services/:id', requireAuth, (req, res) => {
  const service = services.get(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const updated = { ...service, ...req.body };
  services.set(service.id, updated);
  res.json({ success: true, service: updated });
});

// APPOINTMENTS
app.get('/api/appointments', requireAuth, (req, res) => {
  const { clientId, stylistId, date, status } = req.query;
  let result = Array.from(appointments.values());
  if (clientId) result = result.filter(a => a.clientId === clientId);
  if (stylistId) result = result.filter(a => a.stylistId === stylistId);
  if (date) result = result.filter(a => a.date === date);
  if (status) result = result.filter(a => a.status === status);
  result.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  res.json({ success: true, count: result.length, appointments: result });
});

app.get('/api/appointments/:id', requireAuth, (req, res) => {
  const appointment = appointments.get(req.params.id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  const client = clients.get(appointment.clientId);
  const stylist = stylists.get(appointment.stylistId);
  const service = services.get(appointment.serviceId);
  res.json({ success: true, appointment, client, stylist, service });
});

app.post('/api/appointments', requireAuth, (req, res) => {
  const { clientId, stylistId, serviceId, date, time, notes } = req.body;
  if (!clientId || !stylistId || !serviceId || !date || !time) {
    return res.status(400).json({ error: 'clientId, stylistId, serviceId, date, time required' });
  }
  const client = clients.get(clientId);
  const stylist = stylists.get(stylistId);
  const service = services.get(serviceId);
  if (!client || !stylist || !service) {
    return res.status(404).json({ error: 'Client, stylist, or service not found' });
  }

  const appointment = {
    id: 'APT' + Date.now(),
    clientId,
    stylistId,
    serviceId,
    date,
    time,
    duration: service.duration,
    status: 'scheduled',
    notes: notes || '',
    price: service.price,
    paymentStatus: 'pending',
    createdAt: new Date().toISOString()
  };
  appointments.set(appointment.id, appointment);

  stylist.appointmentCount++;
  stylists.set(stylist.id, stylist);

  res.status(201).json({ success: true, appointment });
});

app.patch('/api/appointments/:id', requireAuth, (req, res) => {
  const appointment = appointments.get(req.params.id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

  const updated = { ...appointment, ...req.body };
  appointments.set(appointment.id, updated);

  // Update client stats if completed
  if (req.body.status === 'completed' && appointment.status !== 'completed') {
    const client = clients.get(appointment.clientId);
    if (client) {
      client.visitCount++;
      client.totalSpent += appointment.price;
      client.loyaltyPoints += Math.floor(appointment.price / 10);
      clients.set(client.id, client);
    }
  }

  res.json({ success: true, appointment: updated });
});

app.delete('/api/appointments/:id', requireAuth, (req, res) => {
  const appointment = appointments.get(req.params.id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  appointments.delete(req.params.id);
  res.json({ success: true, message: 'Appointment cancelled' });
});

// PRODUCTS & INVENTORY
app.get('/api/products', requireAuth, (req, res) => {
  const { category, status } = req.query;
  let result = Array.from(products.values());
  if (category) result = result.filter(p => p.category === category);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, products: result });
});

app.get('/api/products/:id', requireAuth, (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, product });
});

app.post('/api/products', requireAuth, (req, res) => {
  const product = { id: 'PRD' + Date.now(), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  products.set(product.id, product);
  res.status(201).json({ success: true, product });
});

app.patch('/api/products/:id', requireAuth, (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const updated = { ...product, ...req.body };

  // Update stock status
  if (updated.stock <= updated.minStock) {
    updated.status = 'low_stock';
  } else if (updated.stock <= 0) {
    updated.status = 'out_of_stock';
  } else {
    updated.status = 'active';
  }

  products.set(product.id, updated);
  res.json({ success: true, product: updated });
});

app.post('/api/products/:id/adjust-stock', requireAuth, (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { adjustment, reason } = req.body;
  if (typeof adjustment !== 'number') return res.status(400).json({ error: 'adjustment (number) required' });

  product.stock += adjustment;
  product.lastAdjusted = new Date().toISOString();
  product.adjustmentReason = reason || 'Manual adjustment';

  if (product.stock <= product.minStock) product.status = 'low_stock';
  if (product.stock <= 0) product.status = 'out_of_stock';
  else product.status = 'active';

  products.set(product.id, product);
  res.json({ success: true, product });
});

// POINT OF SALE
app.get('/api/sales', requireAuth, (req, res) => {
  const { clientId, date, paymentMethod, status } = req.query;
  let result = Array.from(sales.values());
  if (clientId) result = result.filter(s => s.clientId === clientId);
  if (date) result = result.filter(s => s.date === date);
  if (paymentMethod) result = result.filter(s => s.paymentMethod === paymentMethod);
  if (status) result = result.filter(s => s.status === status);
  res.json({ success: true, count: result.length, sales: result });
});

app.post('/api/sales', requireAuth, (req, res) => {
  const { clientId, items, paymentMethod, discount = 0, notes } = req.body;

  let subtotal = 0;
  const saleItems = items.map(item => {
    const service = services.get(item.serviceId) || products.get(item.productId);
    const amount = service ? service.price * (item.quantity || 1) : item.amount;
    subtotal += amount;
    return { ...item, amount };
  });

  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax - discount;

  const sale = {
    id: 'SAL' + Date.now(),
    clientId: clientId || null,
    items: saleItems,
    subtotal,
    tax,
    discount,
    total,
    paymentMethod: paymentMethod || 'cash',
    status: 'completed',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    notes: notes || ''
  };
  sales.set(sale.id, sale);

  // Update loyalty points for client
  if (clientId) {
    const client = clients.get(clientId);
    if (client) {
      const pointsEarned = Math.floor(total / 10);
      client.loyaltyPoints += pointsEarned;
      client.totalSpent += total;
      clients.set(client.id, client);

      // Update client loyalty in response
      sale.pointsEarned = pointsEarned;
    }
  }

  // Deduct inventory for products
  items.filter(i => i.productId).forEach(item => {
    const product = products.get(item.productId);
    if (product) {
      product.stock -= item.quantity || 1;
      if (product.stock <= product.minStock) product.status = 'low_stock';
      products.set(product.id, product);
    }
  });

  res.status(201).json({ success: true, sale });
});

// PACKAGES
app.get('/api/packages', requireAuth, (req, res) => {
  const { status } = req.query;
  let result = Array.from(packages.values());
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, packages: result });
});

app.get('/api/packages/:id', requireAuth, (req, res) => {
  const pkg = packages.get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });

  const pkgServices = pkg.services.map(sid => services.get(sid)).filter(Boolean);
  res.json({ success: true, package: pkg, services: pkgServices });
});

app.post('/api/packages', requireAuth, (req, res) => {
  const pkg = { id: 'PKG' + Date.now(), ...req.body, usages: 0, status: 'active', createdAt: new Date().toISOString() };
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

// MEMBERSHIPS
app.get('/api/memberships', requireAuth, (req, res) => {
  const { clientId, type, status } = req.query;
  let result = Array.from(memberships.values());
  if (clientId) result = result.filter(m => m.clientId === clientId);
  if (type) result = result.filter(m => m.type === type);
  if (status) result = result.filter(m => m.status === status);
  res.json({ success: true, count: result.length, memberships: result });
});

app.post('/api/memberships', requireAuth, (req, res) => {
  const { clientId, type, name, monthlyFee, benefits, pointsMultiplier } = req.body;
  const membership = {
    id: 'MEM' + Date.now(),
    clientId,
    type: type || 'standard',
    name: name || `${type} Member`,
    monthlyFee,
    benefits: benefits || [],
    servicesIncluded: [],
    pointsMultiplier: pointsMultiplier || 2,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    autoRenew: false,
    createdAt: new Date().toISOString()
  };
  memberships.set(membership.id, membership);
  res.status(201).json({ success: true, membership });
});

app.patch('/api/memberships/:id', requireAuth, (req, res) => {
  const membership = memberships.get(req.params.id);
  if (!membership) return res.status(404).json({ error: 'Membership not found' });
  const updated = { ...membership, ...req.body };
  memberships.set(membership.id, updated);
  res.json({ success: true, membership: updated });
});

// INVOICES
app.get('/api/invoices', requireAuth, (req, res) => {
  const { clientId, status } = req.query;
  let result = Array.from(invoices.values());
  if (clientId) result = result.filter(i => i.clientId === clientId);
  if (status) result = result.filter(i => i.status === status);
  res.json({ success: true, count: result.length, invoices: result });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const { clientId, items, dueDate } = req.body;
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = Math.round(subtotal * 0.18);
  const invoice = {
    id: 'INV' + Date.now(),
    invoiceNumber: `BEA/${new Date().getFullYear()}/${Date.now()}`,
    clientId,
    items,
    subtotal,
    tax,
    total: subtotal + tax,
    status: 'pending',
    dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, invoice });
});

// PAYMENTS
app.get('/api/payments', requireAuth, (req, res) => {
  const { clientId, method, status } = req.query;
  let result = Array.from(payments.values());
  if (clientId) result = result.filter(p => p.clientId === clientId);
  if (method) result = result.filter(p => p.method === method);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, payments: result });
});

app.post('/api/payments', requireAuth, (req, res) => {
  const { clientId, amount, method, reference, description } = req.body;
  const payment = {
    id: 'PAY' + Date.now(),
    clientId,
    amount,
    method: method || 'cash',
    reference: reference || null,
    description: description || 'Payment',
    status: 'completed',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  payments.set(payment.id, payment);

  // Update client loyalty points
  if (clientId) {
    const client = clients.get(clientId);
    if (client) {
      client.loyaltyPoints += Math.floor(amount / 10);
      clients.set(client.id, client);
    }
  }

  res.status(201).json({ success: true, payment });
});

// REVIEWS
app.get('/api/reviews', requireAuth, (req, res) => {
  const { stylistId, clientId, minRating } = req.query;
  let result = Array.from(reviews.values());
  if (stylistId) result = result.filter(r => r.stylistId === stylistId);
  if (clientId) result = result.filter(r => r.clientId === clientId);
  if (minRating) result = result.filter(r => r.rating >= parseInt(minRating));
  res.json({ success: true, count: result.length, reviews: result });
});

app.post('/api/reviews', requireAuth, (req, res) => {
  const { clientId, stylistId, appointmentId, rating, comment } = req.body;
  if (!clientId || !rating) return res.status(400).json({ error: 'clientId and rating required' });

  const review = {
    id: 'REV' + Date.now(),
    clientId,
    stylistId: stylistId || null,
    appointmentId: appointmentId || null,
    rating,
    comment: comment || '',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  reviews.set(review.id, review);

  // Update stylist rating
  if (stylistId) {
    const stylist = stylists.get(stylistId);
    if (stylist) {
      const stylistReviews = Array.from(reviews.values()).filter(r => r.stylistId === stylistId);
      stylist.rating = stylistReviews.reduce((sum, r) => sum + r.rating, 0) / stylistReviews.length;
      stylists.set(stylist.id, stylist);
    }
  }

  res.status(201).json({ success: true, review });
});

// ANALYTICS
app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const clientList = Array.from(clients.values());
  const activeClients = clientList.filter(c => c.status === 'active');
  const stylistList = Array.from(stylists.values());
  const appointmentList = Array.from(appointments.values());
  const saleList = Array.from(sales.values());
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  const todayAppointments = appointmentList.filter(a => a.date === today);
  const completedToday = todayAppointments.filter(a => a.status === 'completed');
  const monthSales = saleList.filter(s => s.date && s.date.startsWith(thisMonth));

  res.json({
    success: true,
    overview: {
      totalClients: clientList.length,
      activeClients: activeClients.length,
      totalStylists: stylistList.length,
      activeStylists: stylistList.filter(s => s.status === 'active').length,
      totalServices: services.size,
      totalAppointments: appointmentList.length,
      todayAppointments: todayAppointments.length,
      completedToday: completedToday.length,
      scheduledToday: todayAppointments.filter(a => a.status === 'scheduled').length,
      totalSales: saleList.length,
      monthlyRevenue: monthSales.reduce((sum, s) => sum + s.total, 0),
      averageRating: (stylistList.reduce((sum, s) => sum + s.rating, 0) / stylistList.length).toFixed(1),
      topServices: Array.from(services.values()).sort((a, b) => b.price - a.price).slice(0, 3)
    }
  });
});

app.get('/api/analytics/stylists', requireAuth, (req, res) => {
  const stylistList = Array.from(stylists.values());
  const appointmentList = Array.from(appointments.values());
  const reviewList = Array.from(reviews.values());

  const stylistStats = stylistList.map(sty => {
    const styAppointments = appointmentList.filter(a => a.stylistId === sty.id);
    const styReviews = reviewList.filter(r => r.stylistId === sty.id);
    const completedAppointments = styAppointments.filter(a => a.status === 'completed');
    const revenue = completedAppointments.reduce((sum, a) => sum + a.price, 0);

    return {
      stylistId: sty.id,
      name: sty.name,
      specialization: sty.specialization,
      rating: sty.rating.toFixed(1),
      appointmentCount: sty.appointmentCount,
      completedAppointments: completedAppointments.length,
      revenue,
      reviewCount: styReviews.length
    };
  }).sort((a, b) => b.revenue - a.revenue);

  res.json({ success: true, stylists: stylistStats });
});

app.get('/api/analytics/revenue', requireAuth, (req, res) => {
  const saleList = Array.from(sales.values());
  const appointmentList = Array.from(appointments.values()).filter(a => a.status === 'completed');

  const totalRevenue = saleList.reduce((sum, s) => sum + s.total, 0);
  const serviceRevenue = appointmentList.reduce((sum, a) => sum + a.price, 0);
  const productRevenue = totalRevenue - serviceRevenue;

  const revenueByCategory = {};
  services.forEach(s => {
    const categoryAppointments = appointmentList.filter(a => a.serviceId === s.id);
    revenueByCategory[s.category] = (revenueByCategory[s.category] || 0) + categoryAppointments.reduce((sum, a) => sum + a.price, 0);
  });

  res.json({
    success: true,
    revenue: {
      total: totalRevenue,
      services: serviceRevenue,
      products: productRevenue,
      byCategory: revenueByCategory,
      averageTransaction: saleList.length > 0 ? Math.round(totalRevenue / saleList.length) : 0
    }
  });
});

app.get('/api/analytics/clients', requireAuth, (req, res) => {
  const clientList = Array.from(clients.values());

  const topClients = clientList
    .map(c => ({
      clientId: c.id,
      name: c.name,
      visitCount: c.visitCount,
      totalSpent: c.totalSpent,
      loyaltyPoints: c.loyaltyPoints,
      lastVisit: Array.from(appointments.values()).filter(a => a.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  res.json({ success: true, topClients });
});

// SCHEDULE / CALENDAR
app.get('/api/schedule', requireAuth, (req, res) => {
  const { date, stylistId } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required' });

  let result = Array.from(appointments.values()).filter(a => a.date === date);
  if (stylistId) result = result.filter(a => a.stylistId === stylistId);

  const schedule = result.map(apt => ({
    ...apt,
    client: clients.get(apt.clientId),
    stylist: stylists.get(apt.stylistId),
    service: services.get(apt.serviceId)
  }));

  res.json({ success: true, date, count: schedule.length, schedule });
});

// RTMN LAYER INTEGRATIONS
app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence',
    capabilities: ['AI Style Recommender', 'Skin Analysis AI', 'Trend Forecasting', 'Personalized Beauty Tips'],
    status: 'available'
  });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    capabilities: ['Referral Programs', 'Loyalty System', 'Social Media Integration', 'Pre-booking Reminders'],
    status: 'available'
  });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    capabilities: ['Product Sales', 'Service Packages', 'Membership Billing', 'Gift Cards'],
    status: 'available'
  });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({
    layer: 4,
    name: 'Finance',
    capabilities: ['Staff Commission', 'Inventory Costing', 'Revenue Analytics', 'Tax Management'],
    status: 'available'
  });
});

app.get('/api/layer/workforce', requireAuth, (req, res) => {
  res.json({
    layer: 5,
    name: 'Workforce',
    capabilities: ['Staff Scheduling', 'Tip Tracking', 'Performance Metrics', 'Training Modules'],
    status: 'available'
  });
});

app.get('/api/layer/legal', requireAuth, (req, res) => {
  res.json({
    layer: 6,
    name: 'Legal & Trust',
    capabilities: ['Waiver Management', 'Allergy Tracking', 'Compliance Documentation', 'Insurance Verification'],
    status: 'available'
  });
});

app.get('/api/layers', requireAuth, (req, res) => {
  res.json({ industry: INDUSTRY, service: 'Beauty OS', layers: 15, version: '2.0.0' });
});

// HEALTH
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Beauty OS',
    version: '2.0.0',
    port: PORT,
    industry: 'Beauty',
    timestamp: new Date().toISOString(),
    stats: {
      clients: clients.size,
      stylists: stylists.size,
      services: services.size,
      appointments: appointments.size,
      products: products.size,
      packages: packages.size,
      memberships: memberships.size
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Beauty OS',
    version: '2.0.0',
    industry: 'Beauty & Salon Management',
    port: PORT,
    endpoints: {
      health: '/health',
      auth: ['/auth/register', '/auth/login', '/auth/verify'],
      clients: '/api/clients',
      stylists: '/api/stylists',
      services: '/api/services',
      appointments: '/api/appointments',
      products: '/api/products',
      sales: '/api/sales',
      packages: '/api/packages',
      memberships: '/api/memberships',
      reviews: '/api/reviews',
      analytics: '/api/analytics/overview',
      schedule: '/api/schedule',
      layers: '/api/layers'
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                   BEAUTY OS v2.0.0                    ║
║              Complete Salon & Spa Management          ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Features:                                             ║
║  • Client Management                                  ║
║  • Stylist Management                                 ║
║  • Service Catalog (Hair, Skin, Nails, Makeup)        ║
║  • Appointment Scheduling                             ║
║  • Product Inventory & POS                            ║
║  • Packages & Memberships                            ║
║  • Loyalty & Rewards                                  ║
║  • Reviews & Ratings                                 ║
║  • Analytics & Reporting                             ║
╚══════════════════════════════════════════════════════════╝`);
});
