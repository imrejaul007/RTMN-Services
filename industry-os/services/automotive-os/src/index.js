/**
 * Automotive OS - AI Company Platform
 *
 * Complete Automotive Dealership & Service Management System
 * Port: 5080
 * Industry: Automotive (Cars, Bikes, Service, Repairs)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5080;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const INDUSTRY = 'automotive';

// In-memory database
const customers = new Map();
const vehicles = new Map();
const vehicleDocuments = new Map();
const services = new Map();
const appointments = new Map();
const parts = new Map();
const mechanics = new Map();
const invoices = new Map();
const payments = new Map();
const warranties = new Map();
const serviceRecords = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();

// Sample data - Customers (3)
const sampleCustomers = [
  {
    id: 'CUST001',
    name: 'Vikram Mehta',
    email: 'vikram.mehta@email.com',
    phone: '+91 98765 43210',
    address: '42, MG Road, Pune 411001',
    dateOfBirth: '1985-03-15',
    occupation: 'Business Owner',
    customerType: 'individual',
    totalVehicles: 2,
    totalSpend: 245000,
    loyaltyPoints: 4500,
    preferredMechanic: 'MEC001',
    notes: 'Premium customer, prefers morning appointments',
    status: 'active',
    createdAt: '2023-01-15'
  },
  {
    id: 'CUST002',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@email.com',
    phone: '+91 98765 43220',
    address: '78, Jubilee Hills, Hyderabad 500033',
    dateOfBirth: '1990-07-22',
    occupation: 'IT Professional',
    customerType: 'individual',
    totalVehicles: 1,
    totalSpend: 85000,
    loyaltyPoints: 1200,
    preferredMechanic: 'MEC002',
    notes: 'New customer, referred by CUST001',
    status: 'active',
    createdAt: '2023-06-20'
  },
  {
    id: 'CUST003',
    name: 'TechCorp Industries',
    email: 'fleet@techcorp.in',
    phone: '+91 22 2765 8900',
    address: 'Tech Park, BKC, Mumbai 400051',
    contactPerson: 'Rajesh Kumar',
    customerType: 'corporate',
    totalVehicles: 15,
    totalSpend: 1250000,
    loyaltyPoints: 25000,
    billingCycle: 'monthly',
    gstNumber: '27AABCT1234B1ZX',
    notes: 'Corporate fleet - priority service required',
    status: 'active',
    createdAt: '2022-08-10'
  }
];
sampleCustomers.forEach(c => customers.set(c.id, c));

// Sample data - Vehicles (5)
const sampleVehicles = [
  {
    id: 'VEH001',
    customerId: 'CUST001',
    registrationNumber: 'MH12AB1234',
    make: 'Maruti Suzuki',
    model: 'Swift Dzire',
    year: 2022,
    variant: 'ZXI AMT',
    color: 'Pearl Arctic White',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    chassisNumber: 'MA3FHEB1S00A12345',
    engineNumber: 'K12B-1234567',
    odometer: 45230,
    fuelLevel: 65,
    insuranceExpiry: '2025-03-15',
    pucExpiry: '2024-12-15',
    lastServiceDate: '2024-02-10',
    nextServiceDue: '2025-02-10',
    status: 'active',
    vehicleType: 'car'
  },
  {
    id: 'VEH002',
    customerId: 'CUST001',
    registrationNumber: 'MH12CD5678',
    make: 'Royal Enfield',
    model: 'Himalayan 450',
    year: 2024,
    variant: 'Base',
    color: 'Slate Himalayan Salt',
    fuelType: 'Petrol',
    transmission: 'Manual',
    chassisNumber: 'RE4S5H00012345678',
    engineNumber: 'SH450-8765432',
    odometer: 8500,
    fuelLevel: 80,
    insuranceExpiry: '2025-01-20',
    pucExpiry: '2024-11-30',
    lastServiceDate: '2024-05-15',
    nextServiceDue: '2025-05-15',
    status: 'active',
    vehicleType: 'bike'
  },
  {
    id: 'VEH003',
    customerId: 'CUST002',
    registrationNumber: 'TS08EF9012',
    make: 'Hyundai',
    model: 'Creta',
    year: 2023,
    variant: 'SX Executive',
    color: 'Titanium Grey',
    fuelType: 'Diesel',
    transmission: 'Manual',
    chassisNumber: 'MA3FDEB2S00B67890',
    engineNumber: 'U2-2345678',
    odometer: 22000,
    fuelLevel: 50,
    insuranceExpiry: '2024-12-01',
    pucExpiry: '2024-10-20',
    lastServiceDate: '2024-03-20',
    nextServiceDue: '2025-03-20',
    status: 'active',
    vehicleType: 'car'
  },
  {
    id: 'VEH004',
    customerId: 'CUST003',
    registrationNumber: 'MH02GH3456',
    make: 'Toyota',
    model: 'Innova Crysta',
    year: 2023,
    variant: 'GX 8-Seater',
    color: 'Phantom Brown',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    chassisNumber: 'MA3FKEB3S00C12345',
    engineNumber: '1GD-3456789',
    odometer: 35000,
    fuelLevel: 70,
    insuranceExpiry: '2025-02-28',
    pucExpiry: '2024-09-15',
    lastServiceDate: '2024-01-25',
    nextServiceDue: '2025-01-25',
    status: 'active',
    vehicleType: 'car'
  },
  {
    id: 'VEH005',
    customerId: 'CUST003',
    registrationNumber: 'MH02IJ7890',
    make: 'Tata',
    model: 'Nexon EV',
    year: 2024,
    variant: 'XZ Plus LUX',
    color: 'Emperor Tosca',
    fuelType: 'Electric',
    transmission: 'Automatic',
    chassisNumber: 'MATNCG5S00D23456',
    engineNumber: 'Z3EV-4567890',
    odometer: 12000,
    fuelLevel: 85,
    insuranceExpiry: '2025-04-10',
    pucExpiry: 'N/A',
    lastServiceDate: '2024-06-01',
    nextServiceDue: '2025-06-01',
    status: 'active',
    vehicleType: 'car'
  }
];
sampleVehicles.forEach(v => vehicles.set(v.id, v));

// Sample data - Mechanics (3)
const sampleMechanics = [
  {
    id: 'MEC001',
    name: 'Ramesh Kulkarni',
    email: 'ramesh@autopro.in',
    phone: '+91 98765 43810',
    specialization: ['Engine', 'Transmission', 'Electrical'],
    certifications: ['ASE Master Technician', 'Maruti Certified'],
    experience: 12,
    hourlyRate: 800,
    rating: 4.9,
    jobsCompleted: 1250,
    salary: 45000,
    shift: 'full_time',
    availability: 'available',
    avatar: '🔧',
    status: 'active'
  },
  {
    id: 'MEC002',
    name: 'Santosh Patil',
    email: 'santosh@autopro.in',
    phone: '+91 98765 43820',
    specialization: ['General Service', 'AC Repair', 'Suspension'],
    certifications: ['ITI Mechanic', 'Hyundai Service Certified'],
    experience: 8,
    hourlyRate: 600,
    rating: 4.7,
    jobsCompleted: 890,
    salary: 35000,
    shift: 'full_time',
    availability: 'available',
    avatar: '🔩',
    status: 'active'
  },
  {
    id: 'MEC003',
    name: 'Imran Khan',
    email: 'imran@autopro.in',
    phone: '+91 98765 43830',
    specialization: ['EV Systems', 'Battery', 'Hybrid'],
    certifications: ['EV Certification - Tata', 'Electric Vehicle Specialist'],
    experience: 5,
    hourlyRate: 900,
    rating: 4.8,
    jobsCompleted: 320,
    salary: 50000,
    shift: 'full_time',
    availability: 'busy',
    avatar: '⚡',
    status: 'active'
  }
];
sampleMechanics.forEach(m => mechanics.set(m.id, m));

// Sample data - Services (4)
const sampleServices = [
  {
    id: 'SRV001',
    name: 'Regular Service',
    category: 'maintenance',
    description: 'Complete vehicle inspection, oil change, filter replacement',
    duration: 120,
    price: 2500,
    partsIncluded: ['Engine Oil 4L', 'Oil Filter', 'Air Filter'],
    warrantyDays: 90,
    recommendedKms: 10000,
    status: 'active'
  },
  {
    id: 'SRV002',
    name: 'Full Service',
    category: 'maintenance',
    description: 'Comprehensive service including brake check, wheel alignment, fluid top-up',
    duration: 180,
    price: 5500,
    partsIncluded: ['Engine Oil 4L', 'Oil Filter', 'Air Filter', 'Brake Fluid', 'Coolant'],
    warrantyDays: 180,
    recommendedKms: 15000,
    status: 'active'
  },
  {
    id: 'SRV003',
    name: 'AC Service',
    category: 'repair',
    description: 'AC cleaning, gas top-up, compressor inspection',
    duration: 90,
    price: 1800,
    partsIncluded: ['AC Filter', 'Refrigerant Gas'],
    warrantyDays: 60,
    status: 'active'
  },
  {
    id: 'SRV004',
    name: 'EV Battery Health Check',
    category: 'diagnostic',
    description: 'Complete battery health analysis, charging system check, range estimation',
    duration: 60,
    price: 1200,
    partsIncluded: ['Diagnostic Report'],
    warrantyDays: 30,
    status: 'active'
  }
];
sampleServices.forEach(s => services.set(s.id, s));

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
  const user = { id: 'user_' + Date.now(), email, passwordHash: hashPassword(password), role: role || 'customer', name: name || email.split('@')[0], industry: INDUSTRY, createdAt: new Date().toISOString() };
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

// Customers
app.get('/api/customers', requireAuth, (req, res) => {
  const { status, customerType, search } = req.query;
  let result = Array.from(customers.values());
  if (status) result = result.filter(c => c.status === status);
  if (customerType) result = result.filter(c => c.customerType === customerType);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || (c.phone && c.phone.includes(s)));
  }
  res.json({ success: true, count: result.length, customers: result });
});

app.get('/api/customers/:id', requireAuth, (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const customerVehicles = Array.from(vehicles.values()).filter(v => v.customerId === customer.id);
  const customerInvoices = Array.from(invoices.values()).filter(i => i.customerId === customer.id);
  res.json({ success: true, customer, vehicles: customerVehicles, invoices: customerInvoices });
});

app.post('/api/customers', requireAuth, (req, res) => {
  const customer = { id: 'CUST' + String(customers.size + 1).padStart(3, '0'), ...req.body, status: 'active', loyaltyPoints: 0, totalVehicles: 0, totalSpend: 0, createdAt: new Date().toISOString().split('T')[0] };
  customers.set(customer.id, customer);
  res.status(201).json({ success: true, customer });
});

app.patch('/api/customers/:id', requireAuth, (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const updated = { ...customer, ...req.body };
  customers.set(customer.id, updated);
  res.json({ success: true, customer: updated });
});

// Vehicles
app.get('/api/vehicles', requireAuth, (req, res) => {
  const { customerId, status, vehicleType, make } = req.query;
  let result = Array.from(vehicles.values());
  if (customerId) result = result.filter(v => v.customerId === customerId);
  if (status) result = result.filter(v => v.status === status);
  if (vehicleType) result = result.filter(v => v.vehicleType === vehicleType);
  if (make) result = result.filter(v => v.make.toLowerCase().includes(make.toLowerCase()));
  res.json({ success: true, count: result.length, vehicles: result });
});

app.get('/api/vehicles/:id', requireAuth, (req, res) => {
  const vehicle = vehicles.get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const customer = customers.get(vehicle.customerId);
  const vehicleServiceRecords = Array.from(serviceRecords.values()).filter(r => r.vehicleId === vehicle.id);
  res.json({ success: true, vehicle, customer, serviceHistory: vehicleServiceRecords });
});

app.post('/api/vehicles', requireAuth, (req, res) => {
  const vehicle = { id: 'VEH' + String(vehicles.size + 1).padStart(3, '0'), ...req.body, status: 'active', odometer: 0, fuelLevel: 100, createdAt: new Date().toISOString() };
  vehicles.set(vehicle.id, vehicle);

  // Update customer vehicle count
  const customer = customers.get(vehicle.customerId);
  if (customer) {
    customer.totalVehicles++;
    customers.set(customer.id, customer);
  }

  res.status(201).json({ success: true, vehicle });
});

app.patch('/api/vehicles/:id', requireAuth, (req, res) => {
  const vehicle = vehicles.get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const updated = { ...vehicle, ...req.body };
  vehicles.set(vehicle.id, updated);
  res.json({ success: true, vehicle: updated });
});

// Vehicle Documents
app.get('/api/documents', requireAuth, (req, res) => {
  const { vehicleId, type } = req.query;
  let result = Array.from(vehicleDocuments.values());
  if (vehicleId) result = result.filter(d => d.vehicleId === vehicleId);
  if (type) result = result.filter(d => d.type === type);
  res.json({ success: true, count: result.length, documents: result });
});

app.post('/api/documents', requireAuth, (req, res) => {
  const doc = { id: 'DOC' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  vehicleDocuments.set(doc.id, doc);
  res.status(201).json({ success: true, document: doc });
});

// Mechanics
app.get('/api/mechanics', requireAuth, (req, res) => {
  const { specialization, status, availability } = req.query;
  let result = Array.from(mechanics.values());
  if (specialization) result = result.filter(m => m.specialization.includes(specialization));
  if (status) result = result.filter(m => m.status === status);
  if (availability) result = result.filter(m => m.availability === availability);
  res.json({ success: true, count: result.length, mechanics: result });
});

app.get('/api/mechanics/:id', requireAuth, (req, res) => {
  const mechanic = mechanics.get(req.params.id);
  if (!mechanic) return res.status(404).json({ error: 'Mechanic not found' });
  const mechanicJobs = Array.from(serviceRecords.values()).filter(r => r.mechanicId === mechanic.id);
  res.json({ success: true, mechanic, jobsCompleted: mechanicJobs.length, recentJobs: mechanicJobs.slice(-10) });
});

app.post('/api/mechanics', requireAuth, (req, res) => {
  const mechanic = { id: 'MEC' + String(mechanics.size + 1).padStart(3, '0'), ...req.body, status: 'active', jobsCompleted: 0, rating: 5.0, availability: 'available', createdAt: new Date().toISOString() };
  mechanics.set(mechanic.id, mechanic);
  res.status(201).json({ success: true, mechanic });
});

app.patch('/api/mechanics/:id', requireAuth, (req, res) => {
  const mechanic = mechanics.get(req.params.id);
  if (!mechanic) return res.status(404).json({ error: 'Mechanic not found' });
  const updated = { ...mechanic, ...req.body };
  mechanics.set(mechanic.id, updated);
  res.json({ success: true, mechanic: updated });
});

// Services
app.get('/api/services', requireAuth, (req, res) => {
  const { category, status } = req.query;
  let result = Array.from(services.values());
  if (category) result = result.filter(s => s.category === category);
  if (status) result = result.filter(s => s.status === status);
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

// Appointments
app.get('/api/appointments', requireAuth, (req, res) => {
  const { customerId, vehicleId, status, date } = req.query;
  let result = Array.from(appointments.values());
  if (customerId) result = result.filter(a => a.customerId === customerId);
  if (vehicleId) result = result.filter(a => a.vehicleId === vehicleId);
  if (status) result = result.filter(a => a.status === status);
  if (date) result = result.filter(a => a.date === date);
  res.json({ success: true, count: result.length, appointments: result });
});

app.get('/api/appointments/:id', requireAuth, (req, res) => {
  const appointment = appointments.get(req.params.id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  const vehicle = vehicles.get(appointment.vehicleId);
  const customer = customers.get(appointment.customerId);
  const service = services.get(appointment.serviceId);
  res.json({ success: true, appointment, vehicle, customer, service });
});

app.post('/api/appointments', requireAuth, (req, res) => {
  const { customerId, vehicleId, serviceId, date, time, notes } = req.body;
  const appointment = { id: 'APT' + Date.now(), customerId, vehicleId, serviceId, date, time, notes, status: 'scheduled', createdAt: new Date().toISOString() };
  appointments.set(appointment.id, appointment);
  res.status(201).json({ success: true, appointment });
});

app.patch('/api/appointments/:id', requireAuth, (req, res) => {
  const appointment = appointments.get(req.params.id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  const updated = { ...appointment, ...req.body };
  appointments.set(appointment.id, updated);
  res.json({ success: true, appointment: updated });
});

// Parts Inventory
app.get('/api/parts', requireAuth, (req, res) => {
  const { category, status, lowStock } = req.query;
  let result = Array.from(parts.values());
  if (category) result = result.filter(p => p.category === category);
  if (status) result = result.filter(p => p.status === status);
  if (lowStock === 'true') result = result.filter(p => p.quantity <= p.minStock);
  res.json({ success: true, count: result.length, parts: result });
});

app.post('/api/parts', requireAuth, (req, res) => {
  const part = { id: 'PART' + Date.now(), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  parts.set(part.id, part);
  res.status(201).json({ success: true, part });
});

app.patch('/api/parts/:id', requireAuth, (req, res) => {
  const part = parts.get(req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  const updated = { ...part, ...req.body };
  parts.set(part.id, updated);
  res.json({ success: true, part: updated });
});

// Service Records
app.get('/api/service-records', requireAuth, (req, res) => {
  const { vehicleId, mechanicId, status } = req.query;
  let result = Array.from(serviceRecords.values());
  if (vehicleId) result = result.filter(r => r.vehicleId === vehicleId);
  if (mechanicId) result = result.filter(r => r.mechanicId === mechanicId);
  if (status) result = result.filter(r => r.status === status);
  res.json({ success: true, count: result.length, records: result });
});

app.post('/api/service-records', requireAuth, (req, res) => {
  const { vehicleId, serviceId, mechanicId, description, partsUsed, laborHours, totalCost } = req.body;
  const record = { id: 'REC' + Date.now(), vehicleId, serviceId, mechanicId, description, partsUsed: partsUsed || [], laborHours, totalCost, status: 'completed', completedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
  serviceRecords.set(record.id, record);

  // Update vehicle
  const vehicle = vehicles.get(vehicleId);
  if (vehicle) {
    vehicle.lastServiceDate = new Date().toISOString().split('T')[0];
    vehicle.odometer = req.body.odometer || vehicle.odometer;
    vehicles.set(vehicle.id, vehicle);
  }

  // Update customer total spend
  const customer = vehicle ? customers.get(vehicle.customerId) : null;
  if (customer) {
    customer.totalSpend += totalCost;
    customers.set(customer.id, customer);
  }

  res.status(201).json({ success: true, record });
});

// Invoices
app.get('/api/invoices', requireAuth, (req, res) => {
  const { customerId, status, fromDate, toDate } = req.query;
  let result = Array.from(invoices.values());
  if (customerId) result = result.filter(i => i.customerId === customerId);
  if (status) result = result.filter(i => i.status === status);
  if (fromDate) result = result.filter(i => i.date >= fromDate);
  if (toDate) result = result.filter(i => i.date <= toDate);
  res.json({ success: true, count: result.length, invoices: result });
});

app.get('/api/invoices/:id', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const customer = customers.get(invoice.customerId);
  const invoicePayments = Array.from(payments.values()).filter(p => p.invoiceId === invoice.id);
  res.json({ success: true, invoice, customer, payments: invoicePayments });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const { customerId, vehicleId, serviceId, items, subtotal, tax, discount, total, notes } = req.body;
  const invoice = { id: 'INV' + Date.now(), invoiceNumber: `AUTO/${new Date().getFullYear()}/${String(invoices.size + 1).padStart(5, '0')}`, customerId, vehicleId, serviceId, items: items || [], subtotal: subtotal || 0, tax: tax || Math.round((subtotal || 0) * 0.18), discount: discount || 0, total: total || subtotal, notes, status: 'pending', date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], createdAt: new Date().toISOString() };
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

// Payments
app.get('/api/payments', requireAuth, (req, res) => {
  const { customerId, invoiceId, method, status } = req.query;
  let result = Array.from(payments.values());
  if (customerId) result = result.filter(p => p.customerId === customerId);
  if (invoiceId) result = result.filter(p => p.invoiceId === invoiceId);
  if (method) result = result.filter(p => p.method === method);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, payments: result });
});

app.post('/api/payments', requireAuth, (req, res) => {
  const { customerId, invoiceId, amount, method, transactionId, notes } = req.body;
  const payment = { id: 'PAY' + Date.now(), customerId, invoiceId, amount, method: method || 'cash', transactionId: transactionId || `TXN${Date.now()}`, notes, status: 'completed', date: new Date().toISOString(), createdAt: new Date().toISOString() };
  payments.set(payment.id, payment);

  // Update invoice status
  if (invoiceId) {
    const invoice = invoices.get(invoiceId);
    if (invoice) {
      const totalPaid = Array.from(payments.values()).filter(p => p.invoiceId === invoiceId && p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
      invoice.status = totalPaid >= invoice.total ? 'paid' : 'partial';
      invoices.set(invoice.id, invoice);
    }
  }

  // Update customer loyalty points
  const customer = customers.get(customerId);
  if (customer) {
    customer.loyaltyPoints += Math.floor(amount / 100);
    customers.set(customer.id, customer);
  }

  res.status(201).json({ success: true, payment });
});

// Warranties
app.get('/api/warranties', requireAuth, (req, res) => {
  const { vehicleId, status } = req.query;
  let result = Array.from(warranties.values());
  if (vehicleId) result = result.filter(w => w.vehicleId === vehicleId);
  if (status) result = result.filter(w => w.status === status);
  res.json({ success: true, count: result.length, warranties: result });
});

app.post('/api/warranties', requireAuth, (req, res) => {
  const warranty = { id: 'WARR' + Date.now(), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  warranties.set(warranty.id, warranty);
  res.status(201).json({ success: true, warranty });
});

// Analytics
app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const customerList = Array.from(customers.values());
  const vehicleList = Array.from(vehicles.values());
  const mechanicList = Array.from(mechanics.values());
  const invoiceList = Array.from(invoices.values());
  const appointmentList = Array.from(appointments.values());

  const totalRevenue = invoiceList.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const pendingRevenue = invoiceList.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0);
  const todayAppointments = appointmentList.filter(a => a.date === new Date().toISOString().split('T')[0]);

  res.json({
    success: true,
    overview: {
      totalCustomers: customerList.length,
      activeCustomers: customerList.filter(c => c.status === 'active').length,
      corporateCustomers: customerList.filter(c => c.customerType === 'corporate').length,
      totalVehicles: vehicleList.length,
      cars: vehicleList.filter(v => v.vehicleType === 'car').length,
      bikes: vehicleList.filter(v => v.vehicleType === 'bike').length,
      totalMechanics: mechanicList.length,
      availableMechanics: mechanicList.filter(m => m.availability === 'available').length,
      totalServiceRecords: serviceRecords.size,
      todayAppointments: todayAppointments.length,
      scheduledAppointments: appointmentList.filter(a => a.status === 'scheduled').length,
      totalRevenue,
      pendingRevenue,
      totalInvoices: invoiceList.length,
      paidInvoices: invoiceList.filter(i => i.status === 'paid').length,
      pendingInvoices: invoiceList.filter(i => i.status === 'pending').length
    }
  });
});

app.get('/api/analytics/revenue', requireAuth, (req, res) => {
  const invoiceList = Array.from(invoices.values());
  const paymentsList = Array.from(payments.values());

  const monthlyRevenue = {};
  paymentsList.filter(p => p.status === 'completed').forEach(p => {
    const month = p.date.substring(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + p.amount;
  });

  const serviceRevenue = {};
  invoiceList.forEach(inv => {
    const service = services.get(inv.serviceId);
    if (service) {
      serviceRevenue[service.name] = (serviceRevenue[service.name] || 0) + inv.total;
    }
  });

  res.json({
    success: true,
    revenue: {
      total: paymentsList.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
      monthly: monthlyRevenue,
      byService: serviceRevenue,
      byPaymentMethod: paymentsList.reduce((acc, p) => { acc[p.method] = (acc[p.method] || 0) + p.amount; return acc; }, {})
    }
  });
});

app.get('/api/analytics/vehicles', requireAuth, (req, res) => {
  const vehicleList = Array.from(vehicles.values());

  const byMake = {};
  vehicleList.forEach(v => { byMake[v.make] = (byMake[v.make] || 0) + 1; });

  const byFuelType = {};
  vehicleList.forEach(v => { byFuelType[v.fuelType] = (byFuelType[v.fuelType] || 0) + 1; });

  const upcomingService = vehicleList.filter(v => {
    const nextService = new Date(v.nextServiceDue);
    const today = new Date();
    const diffDays = (nextService - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 30 && diffDays >= 0;
  });

  const expiredInsurance = vehicleList.filter(v => new Date(v.insuranceExpiry) < new Date());
  const expiredPUC = vehicleList.filter(v => v.pucExpiry !== 'N/A' && new Date(v.pucExpiry) < new Date());

  res.json({
    success: true,
    vehicles: {
      byMake,
      byFuelType,
      electricVehicles: vehicleList.filter(v => v.fuelType === 'Electric').length,
      upcomingServiceCount: upcomingService.length,
      expiredInsuranceCount: expiredInsurance.length,
      expiredPUCCount: expiredPUC.length,
      avgOdometer: Math.round(vehicleList.reduce((sum, v) => sum + v.odometer, 0) / vehicleList.length)
    }
  });
});

app.get('/api/analytics/mechanics', requireAuth, (req, res) => {
  const mechanicList = Array.from(mechanics.values());
  const recordList = Array.from(serviceRecords.values());

  const mechanicStats = mechanicList.map(mec => ({
    id: mec.id,
    name: mec.name,
    specialization: mec.specialization,
    jobsCompleted: recordList.filter(r => r.mechanicId === mec.id).length,
    rating: mec.rating,
    experience: mec.experience,
    availability: mec.availability,
    totalRevenue: recordList.filter(r => r.mechanicId === mec.id).reduce((sum, r) => sum + r.totalCost, 0)
  })).sort((a, b) => b.jobsCompleted - a.jobsCompleted);

  res.json({ success: true, mechanics: mechanicStats });
});

// RTMN Layer Integrations
app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({ layer: 1, name: 'Intelligence', capabilities: ['AI Vehicle Diagnostics', 'Predictive Maintenance', 'Service Recommendation', 'Cost Estimation'], status: 'available' });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({ layer: 2, name: 'Customer Growth', capabilities: ['Lead Generation', 'Loyalty Programs', 'Referral Tracking', 'CRM'], status: 'available' });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({ layer: 3, name: 'Commerce', capabilities: ['Vehicle Sales', 'Service Packages', 'Parts Sales', 'Extended Warranty'], status: 'available' });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({ layer: 4, name: 'Finance', capabilities: ['Invoice Management', 'Payment Collection', 'Insurance Claims', 'EMI Tracking'], status: 'available' });
});

app.get('/api/layer/workforce', requireAuth, (req, res) => {
  res.json({ layer: 5, name: 'Workforce', capabilities: ['Mechanic Scheduling', 'Performance Tracking', 'Skill Management', 'Payroll'], status: 'available' });
});

app.get('/api/layer/mobility', requireAuth, (req, res) => {
  res.json({ layer: 9, name: 'Mobility', capabilities: ['Vehicle Tracking', 'Pickup/Drop Service', 'Mobile Workshop', 'Roadside Assistance'], status: 'available' });
});

app.get('/api/layers', requireAuth, (req, res) => {
  res.json({ industry: INDUSTRY, service: 'Automotive OS', layers: 15, version: '2.0.0' });
});

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Automotive OS',
    version: '2.0.0',
    port: PORT,
    industry: 'Automotive',
    timestamp: new Date().toISOString(),
    stats: {
      customers: customers.size,
      vehicles: vehicles.size,
      mechanics: mechanics.size,
      services: services.size,
      appointments: appointments.size,
      invoices: invoices.size
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                 AUTOMOTIVE OS v2.0.0                ║
║          Complete Vehicle Service Management          ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Features:                                             ║
║  • Customer Management                               ║
║  • Vehicle Inventory (Cars, Bikes, EV)              ║
║  • Vehicle Registration & Documents                  ║
║  • Service/Repair Management                         ║
║  • Service Appointments                              ║
║  • Parts Inventory                                   ║
║  • Mechanics/Staff Management                        ║
║  • Invoicing & Payments                              ║
║  • Analytics & Reporting                             ║
╚══════════════════════════════════════════════════════════╝`);
});
