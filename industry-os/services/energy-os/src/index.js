/**
 * Energy OS - AI Company Platform
 *
 * Complete Energy Management System
 * Port: 5100
 * Industry: Energy (Solar, Wind, Grid, Utilities)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================

const INDUSTRY = 'energy';

// ============================================
// IN-MEMORY DATABASE
// ============================================

const plants = new Map();
const installations = new Map();
const customers = new Map();
const readings = new Map();
const invoices = new Map();
const payments = new Map();
const alerts = new Map();
const assets = new Map();
const maintenance = new Map();
const tariffs = new Map();
const netMetering = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();
const authBusinesses = new Map();

// ============================================
// SAMPLE DATA - ENERGY PLANTS & INSTALLATIONS
// ============================================

// Initialize sample solar plants
const samplePlants = [
  {
    id: 'PLT001',
    name: 'Surat Solar Farm Phase 1',
    type: 'solar',
    capacity: 5000, // kW
    location: { lat: 21.1702, lng: 72.8311, address: 'Surat, Gujarat' },
    status: 'operational',
    installedCapacity: 5000,
    currentOutput: 3850,
    efficiency: 77,
    commissionedDate: '2023-06-15',
    panelCount: 15000,
    panelType: 'Mono PERC 400W',
    inverterCapacity: 5000,
    gridConnection: '33kV Gujarat Grid',
    lastMaintenance: '2024-02-10',
    totalGeneration: 7250000, // kWh
    revenue: 58000000,
    avatar: '☀️',
    createdAt: '2023-06-15T10:00:00Z'
  },
  {
    id: 'PLT002',
    name: 'Wind Farm Tamil Nadu',
    type: 'wind',
    capacity: 2400, // kW
    location: { lat: 11.1271, lng: 78.6569, address: 'Tirunelveli, TN' },
    status: 'operational',
    installedCapacity: 2400,
    currentOutput: 1680,
    efficiency: 70,
    commissionedDate: '2022-11-20',
    turbineCount: 12,
    turbineModel: 'Vestas V110 2MW',
    hubHeight: 80,
    rotorDiameter: 110,
    gridConnection: '110kV TNEB Grid',
    lastMaintenance: '2024-01-25',
    totalGeneration: 5040000, // kWh
    revenue: 40320000,
    avatar: '💨',
    createdAt: '2022-11-20T10:00:00Z'
  },
  {
    id: 'PLT003',
    name: 'Rooftop Solar - TechPark Chennai',
    type: 'rooftop',
    capacity: 500, // kW
    location: { lat: 12.9724, lng: 80.2500, address: 'Sholinganallur, Chennai' },
    status: 'operational',
    installedCapacity: 500,
    currentOutput: 380,
    efficiency: 76,
    commissionedDate: '2024-01-10',
    panelCount: 1250,
    panelType: 'Bifacial 400W',
    inverterCapacity: 500,
    roofArea: 5000, // sq meters
    buildingType: 'Commercial IT Park',
    gridConnection: '11kV Building Transformer',
    lastMaintenance: '2024-03-05',
    totalGeneration: 182500, // kWh
    revenue: 1460000,
    avatar: '🏢',
    createdAt: '2024-01-10T10:00:00Z'
  }
];
samplePlants.forEach(plant => plants.set(plant.id, plant));

// Initialize sample customers
const sampleCustomers = [
  {
    id: 'CUST001',
    name: 'GreenTech Manufacturing Pvt Ltd',
    email: 'energy@greentech.in',
    phone: '+91 44 4567 8900',
    type: 'industrial',
    gstin: '33AAACG1234A1ZB',
    address: 'Sriperumbudur, Chennai 602105',
    connectionType: 'HT (High Tension)',
    sanctionedLoad: 500, // kW
    contractDemand: 600,
    meterNumber: 'TN-4567-8901',
    tariffCategory: 'Industrial',
    solarInstalled: true,
    plantId: null,
    avgMonthlyConsumption: 120000, // kWh
    netMeteringActive: true,
    creditsAvailable: 2500,
    outstanding: 0,
    avatar: '🏭',
    createdAt: '2023-03-15T10:00:00Z'
  },
  {
    id: 'CUST002',
    name: 'Sunrise Apartments',
    email: 'society@sunrise.in',
    phone: '+91 80 4567 8901',
    type: 'residential_society',
    address: '45, Whitefield Main Road, Bangalore 560066',
    connectionType: 'LT (Low Tension)',
    sanctionedLoad: 100, // kW
    meterNumber: 'KA-8901-2345',
    tariffCategory: 'Residential',
    solarInstalled: true,
    plantId: 'PLT003',
    avgMonthlyConsumption: 15000,
    netMeteringActive: true,
    creditsAvailable: 800,
    outstanding: 4500,
    flatCount: 80,
    avatar: '🏠',
    createdAt: '2024-01-10T10:00:00Z'
  },
  {
    id: 'CUST003',
    name: 'Metro Water Treatment Plant',
    email: 'utilities@metrowater.gov',
    phone: '+91 22 2345 6789',
    type: 'government',
    address: 'Bhandup Complex, Mumbai 400078',
    connectionType: 'HT (High Tension)',
    sanctionedLoad: 800,
    contractDemand: 1000,
    meterNumber: 'MH-3456-7890',
    tariffCategory: 'Water & Sewage',
    solarInstalled: false,
    avgMonthlyConsumption: 200000,
    netMeteringActive: false,
    creditsAvailable: 0,
    outstanding: 125000,
    avatar: '🏛️',
    createdAt: '2022-08-01T10:00:00Z'
  }
];
sampleCustomers.forEach(customer => customers.set(customer.id, customer));

// Initialize sample installations
const sampleInstallations = [
  {
    id: 'INST001',
    customerId: 'CUST001',
    plantId: 'PLT001',
    type: 'solar',
    capacity: 5000,
    installationDate: '2023-06-15',
    commissioningDate: '2023-06-15',
    status: 'active',
    systemType: 'Grid-Tied',
    orientation: 180,
    tiltAngle: 15,
    warrantyYears: 25,
    performanceRatio: 82,
    capacityUtilization: 18.5,
    lastReading: {
      date: '2024-04-10',
      generation: 7250000,
      export: 5800000,
      selfConsumption: 1450000
    }
  },
  {
    id: 'INST002',
    customerId: 'CUST002',
    plantId: 'PLT003',
    type: 'rooftop',
    capacity: 500,
    installationDate: '2024-01-05',
    commissioningDate: '2024-01-10',
    status: 'active',
    systemType: 'Grid-Tied with Net Metering',
    roofType: 'RCC',
    roofArea: 5000,
    orientation: 200,
    tiltAngle: 12,
    warrantyYears: 25,
    performanceRatio: 78,
    capacityUtilization: 17.2,
    lastReading: {
      date: '2024-04-10',
      generation: 182500,
      export: 146000,
      selfConsumption: 36500
    }
  }
];
sampleInstallations.forEach(inst => installations.set(inst.id, inst));

// Initialize sample tariffs
const sampleTariffs = [
  {
    id: 'TARIFF001',
    name: 'HT Industrial',
    category: 'industrial',
    type: 'HT',
    demandCharge: 350, // ₹/kVA/month
    energyCharge: 7.5, // ₹/kWh
    minCharge: 50000,
    effectiveDate: '2024-04-01',
    valid: true
  },
  {
    id: 'TARIFF002',
    name: 'LT Residential',
    category: 'residential',
    type: 'LT',
    slabs: [
      { range: '0-100', rate: 3 },
      { range: '101-200', rate: 4.5 },
      { range: '201-400', rate: 6 },
      { range: '400+', rate: 7.5 }
    ],
    minCharge: 50,
    effectiveDate: '2024-04-01',
    valid: true
  },
  {
    id: 'TARIFF003',
    name: 'Commercial',
    category: 'commercial',
    type: 'LT',
    demandCharge: 400,
    energyCharge: 8,
    minCharge: 5000,
    effectiveDate: '2024-04-01',
    valid: true
  },
  {
    id: 'TARIFF004',
    name: 'Solar Net Metering Buyback',
    category: 'solar',
    type: 'net_metering',
    buybackRate: 4.5, // ₹/kWh
    creditExpiry: 12, // months
    effectiveDate: '2024-04-01',
    valid: true
  }
];
sampleTariffs.forEach(tariff => tariffs.set(tariff.id, tariff));

// Initialize sample assets
const sampleAssets = [
  {
    id: 'ASSET001',
    plantId: 'PLT001',
    name: 'Inverter Array A1',
    type: 'inverter',
    model: 'Huawei SUN2000-185KTL',
    capacity: 185,
    serialNumber: 'HW-SN2000-45678',
    status: 'operational',
    installDate: '2023-06-10',
    warrantyExpiry: '2028-06-10',
    lastMaintenance: '2024-02-10',
    nextMaintenance: '2024-08-10',
    efficiency: 99,
    outputPower: 182,
    hoursOperated: 8760
  },
  {
    id: 'ASSET002',
    plantId: 'PLT001',
    name: 'Solar Panel Array Block A',
    type: 'panel',
    model: 'LONGi LR4-72HPH 400W',
    capacity: 400,
    serialNumber: 'LR-72HPH-890123',
    status: 'operational',
    installDate: '2023-06-10',
    warrantyExpiry: '2048-06-10',
    lastMaintenance: '2024-02-10',
    nextMaintenance: '2025-02-10',
    efficiency: 21.2,
    degradation: 0.3,
    panelCount: 3750
  },
  {
    id: 'ASSET003',
    plantId: 'PLT002',
    name: 'Wind Turbine WT-07',
    type: 'turbine',
    model: 'Vestas V110 2MW',
    capacity: 2000,
    serialNumber: 'VV110-2007',
    status: 'operational',
    installDate: '2022-11-15',
    warrantyExpiry: '2027-11-15',
    lastMaintenance: '2024-01-25',
    nextMaintenance: '2024-07-25',
    uptime: 97.5,
    avgWindSpeed: 6.2,
    capacityFactor: 35
  }
];
sampleAssets.forEach(asset => assets.set(asset.id, asset));

// Initialize sample readings
const sampleReadings = [
  {
    id: 'READ001',
    plantId: 'PLT001',
    timestamp: '2024-04-10T00:00:00Z',
    generation: 7250000,
    export: 5800000,
    selfConsumption: 1450000,
    peakOutput: 4850,
    avgOutput: 828,
    irradiation: 5.8,
    efficiency: 77,
    gridAvailability: 99.5
  },
  {
    id: 'READ002',
    plantId: 'PLT002',
    timestamp: '2024-04-10T00:00:00Z',
    generation: 5040000,
    export: 4032000,
    selfConsumption: 1008000,
    peakOutput: 2350,
    avgOutput: 575,
    windSpeed: 6.5,
    capacityFactor: 35,
    gridAvailability: 99.2
  }
];
sampleReadings.forEach(reading => readings.set(reading.id, reading.id));

// Initialize sample maintenance records
const sampleMaintenance = [
  {
    id: 'MAINT001',
    plantId: 'PLT001',
    assetId: 'ASSET001',
    type: 'preventive',
    status: 'completed',
    scheduledDate: '2024-02-10',
    completedDate: '2024-02-10',
    technician: 'SolarCare Services',
    description: 'Quarterly inverter inspection and cleaning',
    parts: ['Air filter x2', 'DC connectors'],
    cost: 25000,
    duration: 4,
    notes: 'All parameters normal'
  },
  {
    id: 'MAINT002',
    plantId: 'PLT002',
    assetId: 'ASSET003',
    type: 'preventive',
    status: 'completed',
    scheduledDate: '2024-01-25',
    completedDate: '2024-01-25',
    technician: 'Vestas Service Team',
    description: 'Annual turbine inspection and lubrication',
    parts: ['Gearbox oil', 'Brake pads'],
    cost: 150000,
    duration: 8,
    notes: 'Gearbox health good, minor oil top-up done'
  }
];
sampleMaintenance.forEach(record => maintenance.set(record.id, record));

// Initialize sample alerts
const sampleAlerts = [
  {
    id: 'ALERT001',
    plantId: 'PLT001',
    type: 'performance',
    severity: 'warning',
    message: 'Panel efficiency dropped 2% in last week',
    triggeredAt: '2024-04-08T10:00:00Z',
    acknowledged: false,
    resolved: false
  },
  {
    id: 'ALERT002',
    plantId: 'PLT002',
    type: 'maintenance',
    severity: 'info',
    message: 'Turbine WT-07 annual service due in 60 days',
    triggeredAt: '2024-04-05T09:00:00Z',
    acknowledged: true,
    resolved: false
  }
];
sampleAlerts.forEach(alert => alerts.set(alert.id, alert));

// ============================================
// AUTHENTICATION
// ============================================

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
    role: role || 'operator',
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
// PLANT MANAGEMENT
// ============================================

app.get('/api/plants', requireAuth, (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(plants.values());
  if (type) result = result.filter(p => p.type === type);
  if (status) result = result.filter(p => p.status === status);

  res.json({ success: true, count: result.length, plants: result });
});

app.get('/api/plants/:id', requireAuth, (req, res) => {
  const plant = plants.get(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });

  // Get related data
  const plantAssets = Array.from(assets.values()).filter(a => a.plantId === plant.id);
  const plantMaintenance = Array.from(maintenance.values()).filter(m => m.plantId === plant.id);
  const plantAlerts = Array.from(alerts.values()).filter(a => a.plantId === plant.id);

  res.json({ success: true, plant, assets: plantAssets, maintenance: plantMaintenance, alerts: plantAlerts });
});

app.post('/api/plants', requireAuth, (req, res) => {
  const plant = {
    id: 'PLT' + String(plants.size + 1).padStart(3, '0'),
    ...req.body,
    status: 'planning',
    currentOutput: 0,
    efficiency: 0,
    totalGeneration: 0,
    revenue: 0,
    createdAt: new Date().toISOString()
  };
  plants.set(plant.id, plant);
  res.status(201).json({ success: true, plant });
});

app.patch('/api/plants/:id', requireAuth, (req, res) => {
  const plant = plants.get(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  const updated = { ...plant, ...req.body };
  plants.set(plant.id, updated);
  res.json({ success: true, plant: updated });
});

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

app.get('/api/customers', requireAuth, (req, res) => {
  const { type, tariffCategory } = req.query;
  let result = Array.from(customers.values());
  if (type) result = result.filter(c => c.type === type);
  if (tariffCategory) result = result.filter(c => c.tariffCategory === tariffCategory);

  res.json({ success: true, count: result.length, customers: result });
});

app.get('/api/customers/:id', requireAuth, (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  // Get customer installations and invoices
  const customerInstallations = Array.from(installations.values()).filter(i => i.customerId === customer.id);
  const customerInvoices = Array.from(invoices.values()).filter(i => i.customerId === customer.id);

  res.json({ success: true, customer, installations: customerInstallations, invoices: customerInvoices });
});

app.post('/api/customers', requireAuth, (req, res) => {
  const customer = {
    id: 'CUST' + String(customers.size + 1).padStart(3, '0'),
    ...req.body,
    creditsAvailable: 0,
    outstanding: 0,
    avatar: req.body.type === 'industrial' ? '🏭' : req.body.type === 'commercial' ? '🏢' : '🏠',
    createdAt: new Date().toISOString()
  };
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

// ============================================
// INSTALLATION MANAGEMENT
// ============================================

app.get('/api/installations', requireAuth, (req, res) => {
  const { customerId, status, type } = req.query;
  let result = Array.from(installations.values());
  if (customerId) result = result.filter(i => i.customerId === customerId);
  if (status) result = result.filter(i => i.status === status);
  if (type) result = result.filter(i => i.type === type);

  res.json({ success: true, count: result.length, installations: result });
});

app.get('/api/installations/:id', requireAuth, (req, res) => {
  const installation = installations.get(req.params.id);
  if (!installation) return res.status(404).json({ error: 'Installation not found' });
  res.json({ success: true, installation });
});

app.post('/api/installations', requireAuth, (req, res) => {
  const installation = {
    id: 'INST' + String(installations.size + 1).padStart(3, '0'),
    ...req.body,
    status: 'installed',
    performanceRatio: 0,
    capacityUtilization: 0,
    createdAt: new Date().toISOString()
  };
  installations.set(installation.id, installation);
  res.status(201).json({ success: true, installation });
});

app.patch('/api/installations/:id', requireAuth, (req, res) => {
  const installation = installations.get(req.params.id);
  if (!installation) return res.status(404).json({ error: 'Installation not found' });
  const updated = { ...installation, ...req.body };
  installations.set(installation.id, updated);
  res.json({ success: true, installation: updated });
});

// ============================================
// READINGS & MONITORING
// ============================================

app.get('/api/readings', requireAuth, (req, res) => {
  const { plantId, from, to } = req.query;
  let result = Array.from(readings.values());
  if (plantId) result = result.filter(r => r.plantId === plantId);
  // Date filtering would be done on timestamp in real implementation

  res.json({ success: true, count: result.length, readings: result });
});

app.post('/api/readings', requireAuth, (req, res) => {
  const { plantId } = req.body;

  const reading = {
    id: 'READ' + Date.now(),
    plantId,
    timestamp: new Date().toISOString(),
    generation: req.body.generation || 0,
    export: req.body.export || 0,
    selfConsumption: req.body.selfConsumption || 0,
    peakOutput: req.body.peakOutput || 0,
    avgOutput: req.body.avgOutput || 0,
    irradiation: req.body.irradiation || 0,
    efficiency: req.body.efficiency || 0,
    gridAvailability: req.body.gridAvailability || 100
  };
  readings.set(reading.id, reading);

  // Update plant stats
  const plant = plants.get(plantId);
  if (plant) {
    plant.totalGeneration = (plant.totalGeneration || 0) + (reading.generation || 0);
    plant.currentOutput = reading.avgOutput || 0;
    plant.efficiency = reading.efficiency || 0;
    plants.set(plant.id, plant);
  }

  res.status(201).json({ success: true, reading });
});

app.get('/api/readings/realtime', requireAuth, (req, res) => {
  // Simulate real-time data
  const realtimeData = Array.from(plants.values()).map(plant => ({
    plantId: plant.id,
    plantName: plant.name,
    currentOutput: Math.random() * plant.capacity * 0.9,
    efficiency: plant.efficiency + (Math.random() - 0.5) * 2,
    temperature: 35 + Math.random() * 15,
    gridStatus: 'connected',
    lastUpdate: new Date().toISOString()
  }));

  res.json({ success: true, realtime: realtimeData });
});

// ============================================
// ASSET MANAGEMENT
// ============================================

app.get('/api/assets', requireAuth, (req, res) => {
  const { plantId, type, status } = req.query;
  let result = Array.from(assets.values());
  if (plantId) result = result.filter(a => a.plantId === plantId);
  if (type) result = result.filter(a => a.type === type);
  if (status) result = result.filter(a => a.status === status);

  res.json({ success: true, count: result.length, assets: result });
});

app.get('/api/assets/:id', requireAuth, (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  // Get maintenance history
  const assetMaintenance = Array.from(maintenance.values()).filter(m => m.assetId === asset.id);

  res.json({ success: true, asset, maintenance: assetMaintenance });
});

app.post('/api/assets', requireAuth, (req, res) => {
  const asset = {
    id: 'ASSET' + Date.now(),
    ...req.body,
    status: 'operational',
    createdAt: new Date().toISOString()
  };
  assets.set(asset.id, asset);
  res.status(201).json({ success: true, asset });
});

app.patch('/api/assets/:id', requireAuth, (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const updated = { ...asset, ...req.body };
  assets.set(asset.id, updated);
  res.json({ success: true, asset: updated });
});

// ============================================
// MAINTENANCE MANAGEMENT
// ============================================

app.get('/api/maintenance', requireAuth, (req, res) => {
  const { plantId, type, status } = req.query;
  let result = Array.from(maintenance.values());
  if (plantId) result = result.filter(m => m.plantId === plantId);
  if (type) result = result.filter(m => m.type === type);
  if (status) result = result.filter(m => m.status === status);

  res.json({ success: true, count: result.length, maintenance: result });
});

app.post('/api/maintenance', requireAuth, (req, res) => {
  const record = {
    id: 'MAINT' + Date.now(),
    ...req.body,
    status: 'scheduled',
    createdBy: req.session.userId,
    createdAt: new Date().toISOString()
  };
  maintenance.set(record.id, record);
  res.status(201).json({ success: true, record });
});

app.patch('/api/maintenance/:id', requireAuth, (req, res) => {
  const record = maintenance.get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Maintenance record not found' });
  const updated = { ...record, ...req.body };
  maintenance.set(record.id, updated);
  res.json({ success: true, record: updated });
});

// ============================================
// ALERTS & NOTIFICATIONS
// ============================================

app.get('/api/alerts', requireAuth, (req, res) => {
  const { plantId, severity, acknowledged } = req.query;
  let result = Array.from(alerts.values());
  if (plantId) result = result.filter(a => a.plantId === plantId);
  if (severity) result = result.filter(a => a.severity === severity);
  if (acknowledged !== undefined) {
    const ack = acknowledged === 'true';
    result = result.filter(a => a.acknowledged === ack);
  }

  res.json({ success: true, count: result.length, alerts: result });
});

app.post('/api/alerts', requireAuth, (req, res) => {
  const alert = {
    id: 'ALERT' + Date.now(),
    ...req.body,
    acknowledged: false,
    resolved: false,
    triggeredAt: new Date().toISOString()
  };
  alerts.set(alert.id, alert);
  res.status(201).json({ success: true, alert });
});

app.patch('/api/alerts/:id', requireAuth, (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  const updated = { ...alert, ...req.body };
  alerts.set(alert.id, updated);
  res.json({ success: true, alert: updated });
});

// ============================================
// TARIFF MANAGEMENT
// ============================================

app.get('/api/tariffs', requireAuth, (req, res) => {
  const { category, valid } = req.query;
  let result = Array.from(tariffs.values());
  if (category) result = result.filter(t => t.category === category);
  if (valid !== undefined) {
    const isValid = valid === 'true';
    result = result.filter(t => t.valid === isValid);
  }

  res.json({ success: true, count: result.length, tariffs: result });
});

app.post('/api/tariffs', requireAuth, (req, res) => {
  const tariff = {
    id: 'TARIFF' + Date.now(),
    ...req.body,
    valid: true,
    createdAt: new Date().toISOString()
  };
  tariffs.set(tariff.id, tariff);
  res.status(201).json({ success: true, tariff });
});

// ============================================
// NET METERING
// ============================================

app.get('/api/net-metering', requireAuth, (req, res) => {
  const { customerId } = req.query;
  let result = Array.from(netMetering.values());
  if (customerId) result = result.filter(n => n.customerId === customerId);

  res.json({ success: true, count: result.length, records: result });
});

app.post('/api/net-metering', requireAuth, (req, res) => {
  const record = {
    id: 'NETM' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  netMetering.set(record.id, record);
  res.status(201).json({ success: true, record });
});

// ============================================
// BILLING & INVOICING
// ============================================

app.get('/api/invoices', requireAuth, (req, res) => {
  const { customerId, status } = req.query;
  let result = Array.from(invoices.values());
  if (customerId) result = result.filter(i => i.customerId === customerId);
  if (status) result = result.filter(i => i.status === status);

  res.json({ success: true, count: result.length, invoices: result });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const { customerId, consumption, peakDemand, creditsUsed, dueDate } = req.body;

  const customer = customers.get(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const tariff = Array.from(tariffs.values()).find(t => t.category === customer.tariffCategory);
  if (!tariff) return res.status(400).json({ error: 'Tariff not found' });

  // Calculate charges
  let energyCharge = 0;
  if (tariff.slabs) {
    // Residential slab calculation
    let remaining = consumption;
    let slabRanges = [0, 100, 200, 400, Infinity];
    let slabRates = [3, 4.5, 6, 7.5];
    for (let i = 0; i < slabRanges.length - 1; i++) {
      const slabConsumption = Math.min(remaining, slabRanges[i + 1] - slabRanges[i]);
      if (slabConsumption > 0) {
        energyCharge += slabConsumption * slabRates[i];
        remaining -= slabConsumption;
      }
    }
  } else {
    energyCharge = consumption * (tariff.energyCharge || 7.5);
  }

  const demandCharge = peakDemand ? peakDemand * (tariff.demandCharge || 350) : 0;
  const grossAmount = energyCharge + demandCharge;
  const creditAmount = creditsUsed ? creditsUsed * 4.5 : 0; // ₹4.5 per unit credit
  const totalAmount = Math.max(grossAmount - creditAmount, tariff.minCharge || 0);
  const tax = Math.round(totalAmount * 0.18);

  const invoice = {
    id: 'INV' + String(invoices.size + 1).padStart(4, '0'),
    invoiceNumber: `EN/2024/${String(invoices.size + 1).padStart(4, '0')}`,
    customerId,
    billingPeriod: req.body.billingPeriod || new Date().toISOString().substring(0, 7),
    consumption,
    peakDemand,
    energyCharge: Math.round(energyCharge),
    demandCharge: Math.round(demandCharge),
    creditsUsed,
    creditAmount: Math.round(creditAmount),
    grossAmount: Math.round(grossAmount),
    total: Math.round(totalAmount),
    tax,
    netAmount: Math.round(totalAmount + tax),
    status: 'pending',
    dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, invoice });
});

app.patch('/api/invoices/:id/status', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  invoice.status = req.body.status;
  invoices.set(invoice.id, invoice);
  res.json({ success: true, invoice });
});

// ============================================
// PAYMENTS
// ============================================

app.get('/api/payments', requireAuth, (req, res) => {
  const { customerId, invoiceId } = req.query;
  let result = Array.from(payments.values());
  if (customerId) result = result.filter(p => p.customerId === customerId);
  if (invoiceId) result = result.filter(p => p.invoiceId === invoiceId);

  res.json({ success: true, count: result.length, payments: result });
});

app.post('/api/payments', requireAuth, (req, res) => {
  const { invoiceId, amount, method, reference } = req.body;

  const invoice = invoices.get(invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const payment = {
    id: 'PAY' + Date.now(),
    invoiceId,
    customerId: invoice.customerId,
    amount,
    method: method || 'online',
    reference,
    status: 'completed',
    createdBy: req.session.userId,
    createdAt: new Date().toISOString()
  };
  payments.set(payment.id, payment);

  // Update invoice
  const totalPaid = Array.from(payments.values())
    .filter(p => p.invoiceId === invoiceId)
    .reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid >= invoice.netAmount) {
    invoice.status = 'paid';
  } else {
    invoice.status = 'partial';
  }
  invoices.set(invoice.id, invoice);

  res.status(201).json({ success: true, payment, invoice });
});

// ============================================
// ANALYTICS & REPORTS
// ============================================

app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const plantList = Array.from(plants.values());
  const invoiceList = Array.from(invoices.values());
  const customerList = Array.from(customers.values());

  const totalCapacity = plantList.reduce((sum, p) => sum + p.capacity, 0);
  const totalGeneration = plantList.reduce((sum, p) => sum + (p.totalGeneration || 0), 0);
  const totalRevenue = plantList.reduce((sum, p) => sum + (p.revenue || 0), 0);

  const totalReceivable = invoiceList
    .filter(i => i.status === 'pending' || i.status === 'partial')
    .reduce((sum, i) => sum + i.netAmount, 0);

  const generationByType = {};
  plantList.forEach(p => {
    generationByType[p.type] = (generationByType[p.type] || 0) + (p.totalGeneration || 0);
  });

  res.json({
    success: true,
    overview: {
      totalPlants: plantList.length,
      operationalPlants: plantList.filter(p => p.status === 'operational').length,
      totalCapacity,
      currentOutput: plantList.reduce((sum, p) => sum + (p.currentOutput || 0), 0),
      avgEfficiency: plantList.length > 0 ? plantList.reduce((sum, p) => sum + (p.efficiency || 0), 0) / plantList.length : 0,
      totalGeneration,
      totalRevenue,
      totalCustomers: customerList.length,
      activeCustomers: customerList.filter(c => c.outstanding === 0).length,
      totalReceivable,
      generationByType
    }
  });
});

app.get('/api/analytics/performance', requireAuth, (req, res) => {
  const plantList = Array.from(plants.values());

  const performance = plantList.map(plant => {
    const plantAssets = Array.from(assets.values()).filter(a => a.plantId === plant.id);
    const plantMaintenance = Array.from(maintenance.values()).filter(m => m.plantId === plant.id);

    return {
      plantId: plant.id,
      plantName: plant.name,
      type: plant.type,
      capacity: plant.capacity,
      currentOutput: plant.currentOutput,
      efficiency: plant.efficiency,
      capacityUtilization: plant.capacity > 0 ? (plant.currentOutput / plant.capacity) * 100 : 0,
      totalGeneration: plant.totalGeneration,
      avgMonthlyGeneration: plant.totalGeneration / 12,
      totalRevenue: plant.revenue,
      assetHealth: plantAssets.length > 0 ? plantAssets.reduce((sum, a) => sum + (a.efficiency || 95), 0) / plantAssets.length : 100,
      maintenanceCompliance: plantMaintenance.length > 0 ? (plantMaintenance.filter(m => m.status === 'completed').length / plantMaintenance.length) * 100 : 100
    };
  });

  res.json({ success: true, performance });
});

app.get('/api/analytics/financial', requireAuth, (req, res) => {
  const invoiceList = Array.from(invoices.values());
  const paymentList = Array.from(payments.values());

  const totalBilled = invoiceList.reduce((sum, i) => sum + i.netAmount, 0);
  const totalCollected = paymentList.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = totalBilled - totalCollected;

  const revenueByMonth = {};
  invoiceList.filter(i => i.status === 'paid').forEach(inv => {
    const month = inv.createdAt.substring(0, 7);
    revenueByMonth[month] = (revenueByMonth[month] || 0) + inv.netAmount;
  });

  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  res.json({
    success: true,
    financial: {
      totalBilled: Math.round(totalBilled),
      totalCollected: Math.round(totalCollected),
      totalOutstanding: Math.round(totalOutstanding),
      collectionRate: Math.round(collectionRate * 100) / 100,
      revenueByMonth,
      pendingInvoices: invoiceList.filter(i => i.status === 'pending').length,
      overdueInvoices: invoiceList.filter(i => i.status === 'pending' && new Date(i.dueDate) < new Date()).length
    }
  });
});

// ============================================
// RTMN LAYER INTEGRATIONS
// ============================================

app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence',
    capabilities: ['Predictive Maintenance AI', 'Energy Forecasting', 'Grid Optimization AI', 'Anomaly Detection'],
    status: 'available'
  });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    capabilities: ['Lead Generation', 'Solar Adoption Campaigns', 'Referral Programs', 'CRM'],
    status: 'available'
  });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    capabilities: ['Equipment Sales', 'Installation Services', 'AMC', 'Solar Financing'],
    status: 'available'
  });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({
    layer: 4,
    name: 'Finance',
    capabilities: ['Billing', 'Payment Collection', 'Carbon Credits', 'RECs Trading'],
    status: 'available'
  });
});

app.get('/api/layers', requireAuth, async (req, res) => {
  res.json({
    industry: INDUSTRY,
    service: 'Energy OS',
    layers: 15,
    version: '2.0.0'
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Energy OS',
    version: '2.0.0',
    port: PORT,
    industry: 'Energy Management',
    timestamp: new Date().toISOString(),
    stats: {
      plants: plants.size,
      customers: customers.size,
      installations: installations.size,
      assets: assets.size,
      invoices: invoices.size,
      alerts: alerts.size
    }
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  ENERGY OS v2.0.0                    ║
║            Complete Energy Management System           ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║                                                          ║
║  Features:                                             ║
║  • Plant Management (Solar, Wind, Rooftop)             ║
║  • Real-time Monitoring & Readings                     ║
║  • Asset Management & Maintenance                       ║
║  • Customer & Tariff Management                        ║
║  • Net Metering & Billing                             ║
║  • Alert System & Notifications                        ║
║  • Analytics & Financial Reports                       ║
║  • Performance Tracking                                ║
║                                                          ║
║  RTMN Integrations:                                   ║
║  • Memory OS (4703) - Plant Memory                    ║
║  • TwinOS (4705) - Asset Twins                        ║
║  • SUTAR OS (4140) - Grid Optimization               ║
║  • Event Bus (4510) - Real-time Alerts               ║
╚══════════════════════════════════════════════════════════╝
  `);
});
