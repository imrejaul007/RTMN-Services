/**
 * Agriculture OS - Complete Farm/Agriculture Management Platform
 *
 * Port: 5100
 * Industry: Agriculture
 *
 * Features:
 * - Farm/Plot Management
 * - Crop Management
 * - Farmer/Customer Management
 * - Supplier/Dealer Management
 * - Inventory Management
 * - Sales/Purchase Orders
 * - Weather Integration
 * - Analytics & RTMN Layer Integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = 5070;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory data stores
const authUsers = new Map();
const authSessions = new Map();

// ============ SAMPLE DATA ============

// 5 Farms
const farms = [
  {
    id: 'FARM001',
    name: 'Green Valley Farm',
    owner: 'FARMER001',
    location: { village: 'Krishna Nagar', district: 'Guntur', state: 'Andhra Pradesh', pincode: '522001' },
    totalArea: 25.5,
    areaUnit: 'acres',
    soilType: 'Black Cotton',
    irrigationType: 'Drip + Borewell',
    plots: [
      { id: 'PLOT001', name: 'North Field', area: 10, crop: 'CROP001', status: 'active' },
      { id: 'PLOT002', name: 'South Field', area: 8, crop: 'CROP002', status: 'active' },
      { id: 'PLOT003', name: 'East Field', area: 7.5, crop: null, status: 'fallow' }
    ],
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-06-01T10:30:00Z'
  },
  {
    id: 'FARM002',
    name: 'Sunrise Orchards',
    owner: 'FARMER002',
    location: { village: 'Madhavaram', district: 'Visakhapatnam', state: 'Andhra Pradesh', pincode: '530001' },
    totalArea: 15,
    areaUnit: 'acres',
    soilType: 'Red Loamy',
    irrigationType: 'Sprinkler',
    plots: [
      { id: 'PLOT004', name: 'Mango Grove', area: 8, crop: 'CROP003', status: 'active' },
      { id: 'PLOT005', name: 'Citrus Patch', area: 7, crop: 'CROP004', status: 'active' }
    ],
    createdAt: '2024-02-20T09:00:00Z',
    updatedAt: '2024-06-05T14:20:00Z'
  },
  {
    id: 'FARM003',
    name: 'Paddy Paradise',
    owner: 'FARMER003',
    location: { village: 'Kaveri Delta', district: 'East Godavari', state: 'Andhra Pradesh', pincode: '533001' },
    totalArea: 40,
    areaUnit: 'acres',
    soilType: 'Clay',
    irrigationType: 'Canal',
    plots: [
      { id: 'PLOT006', name: 'Field A', area: 20, crop: 'CROP005', status: 'active' },
      { id: 'PLOT007', name: 'Field B', area: 20, crop: 'CROP005', status: 'active' }
    ],
    createdAt: '2024-03-10T07:30:00Z',
    updatedAt: '2024-06-10T08:45:00Z'
  },
  {
    id: 'FARM004',
    name: 'Organic Greens Farm',
    owner: 'FARMER004',
    location: { village: 'Bio Village', district: 'Chittoor', state: 'Andhra Pradesh', pincode: '517001' },
    totalArea: 8,
    areaUnit: 'acres',
    soilType: 'Sandy Loam',
    irrigationType: 'Drip',
    plots: [
      { id: 'PLOT008', name: 'Vegetable Plot 1', area: 4, crop: 'CROP001', status: 'active' },
      { id: 'PLOT009', name: 'Vegetable Plot 2', area: 4, crop: 'CROP002', status: 'active' }
    ],
    createdAt: '2024-04-05T10:00:00Z',
    updatedAt: '2024-06-12T16:00:00Z'
  },
  {
    id: 'FARM005',
    name: 'Cotton King Farm',
    owner: 'FARMER001',
    location: { village: 'Adoni', district: 'Kurnool', state: 'Andhra Pradesh', pincode: '518301' },
    totalArea: 55,
    areaUnit: 'acres',
    soilType: 'Black',
    irrigationType: 'Borewell',
    plots: [
      { id: 'PLOT010', name: 'Cotton Field 1', area: 25, crop: 'CROP004', status: 'active' },
      { id: 'PLOT011', name: 'Cotton Field 2', area: 30, crop: 'CROP004', status: 'active' }
    ],
    createdAt: '2024-05-01T06:00:00Z',
    updatedAt: '2024-06-15T07:30:00Z'
  }
];

// 4 Farmers
const farmers = [
  {
    id: 'FARMER001',
    name: 'Ravi Kumar',
    phone: '+919876543210',
    email: 'ravi.kumar@farmmail.in',
    aadhaar: '****-****-4521',
    location: { village: 'Krishna Nagar', district: 'Guntur', state: 'AP' },
    farms: ['FARM001', 'FARM005'],
    bankDetails: { bank: 'State Bank', account: '****1234' },
    kisanCreditCard: true,
    subsidies: ['Fertilizer Subsidy', 'Drip Irrigation Subsidy'],
    createdAt: '2024-01-10T08:00:00Z'
  },
  {
    id: 'FARMER002',
    name: 'Lakshmi Devi',
    phone: '+919876543211',
    email: 'lakshmi.devi@farmmail.in',
    aadhaar: '****-****-7832',
    location: { village: 'Madhavaram', district: 'Visakhapatnam', state: 'AP' },
    farms: ['FARM002'],
    bankDetails: { bank: 'ICICI Bank', account: '****5678' },
    kisanCreditCard: true,
    subsidies: ['Orchard Development'],
    createdAt: '2024-02-15T09:30:00Z'
  },
  {
    id: 'FARMER003',
    name: 'Sambasiva Rao',
    phone: '+919876543212',
    email: 'samba.rao@farmmail.in',
    aadhaar: '****-****-3456',
    location: { village: 'Kaveri Delta', district: 'East Godavari', state: 'AP' },
    farms: ['FARM003'],
    bankDetails: { bank: 'Andhra Bank', account: '****9012' },
    kisanCreditCard: false,
    subsidies: ['Paddy Procurement'],
    createdAt: '2024-03-05T07:00:00Z'
  },
  {
    id: 'FARMER004',
    name: 'Anita Sharma',
    phone: '+919876543213',
    email: 'anita.sharma@farmmail.in',
    aadhaar: '****-****-8901',
    location: { village: 'Bio Village', district: 'Chittoor', state: 'AP' },
    farms: ['FARM004'],
    bankDetails: { bank: 'HDFC Bank', account: '****3456' },
    kisanCreditCard: true,
    subsidies: ['Organic Farming Grant'],
    createdAt: '2024-04-01T10:30:00Z'
  }
];

// 5 Crops
const crops = [
  {
    id: 'CROP001',
    name: 'Paddy (Rice)',
    variety: 'BPT 5204',
    category: 'Cereal',
    season: 'Kharif',
    duration: 120,
    waterRequirement: 'High',
    expectedYield: 4500,
    yieldUnit: 'kg/acre',
    msp: 22.50,
    mspUnit: '₹/kg',
    stages: ['Nursery', 'Transplanting', 'Vegetative', 'Flowering', 'Grain Filling', 'Harvest'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'CROP002',
    name: 'Maize',
    variety: 'Hybrid Yellow',
    category: 'Cereal',
    season: 'Kharif/Rabi',
    duration: 100,
    waterRequirement: 'Medium',
    expectedYield: 3000,
    yieldUnit: 'kg/acre',
    msp: 19.60,
    mspUnit: '₹/kg',
    stages: ['Sowing', 'Germination', 'Vegetative', 'Tasseling', 'Maturity', 'Harvest'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'CROP003',
    name: 'Mango',
    variety: 'Alphonso',
    category: 'Fruit',
    season: 'Summer',
    duration: 365,
    waterRequirement: 'Medium',
    expectedYield: 8000,
    yieldUnit: 'kg/acre',
    msp: null,
    mspUnit: null,
    stages: ['Flowering', 'Fruit Set', 'Fruit Development', 'Maturity', 'Harvest'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'CROP004',
    name: 'Cotton',
    variety: 'Bt Cotton',
    category: 'Fiber',
    season: 'Kharif',
    duration: 180,
    waterRequirement: 'Medium',
    expectedYield: 1500,
    yieldUnit: 'kg/acre',
    msp: 66.20,
    mspUnit: '₹/kg',
    stages: ['Sowing', 'Germination', 'Vegetative', 'Flowering', 'Boll Development', 'Picking'],
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'CROP005',
    name: 'Groundnut',
    variety: 'JL 24',
    category: 'Oilseed',
    season: 'Kharif',
    duration: 110,
    waterRequirement: 'Medium',
    expectedYield: 2000,
    yieldUnit: 'kg/acre',
    msp: 58.40,
    mspUnit: '₹/kg',
    stages: ['Sowing', 'Germination', 'Vegetative', 'Flowering', 'Pod Development', 'Harvest'],
    createdAt: '2024-01-01T00:00:00Z'
  }
];

// 3 Suppliers
const suppliers = [
  {
    id: 'SUPPLIER001',
    name: 'Agro Seeds Corp',
    type: 'Seeds',
    contact: { phone: '+919876543300', email: 'orders@agroseeds.in', person: 'Vijay Kumar' },
    location: { address: 'Market Yard, Guntur', state: 'AP' },
    products: ['CROP001', 'CROP002', 'CROP004', 'CROP005'],
    rating: 4.5,
    certifications: ['NSIC', 'State Agriculture Department'],
    paymentTerms: 'Credit 30 days',
    createdAt: '2024-01-20T08:00:00Z'
  },
  {
    id: 'SUPPLIER002',
    name: 'FertiChem Industries',
    type: 'Fertilizers & Pesticides',
    contact: { phone: '+919876543301', email: 'sales@fertichem.in', person: 'Ramesh Patil' },
    location: { address: 'Industrial Area, Vijayawada', state: 'AP' },
    products: ['Urea', 'DAP', 'Potash', 'Pesticides', 'Herbicides'],
    rating: 4.2,
    certifications: ['FCO Licensed', 'ISO 9001'],
    paymentTerms: 'Credit 45 days',
    createdAt: '2024-02-01T09:30:00Z'
  },
  {
    id: 'SUPPLIER003',
    name: 'FarmTech Machinery',
    type: 'Machinery & Equipment',
    contact: { phone: '+919876543302', email: 'info@farmtech.in', person: 'Suresh Reddy' },
    location: { address: 'Auto Nagar, Tirupati', state: 'AP' },
    products: ['Tractor', 'Rotavator', 'Sprayer', 'Harvester', 'Drip System'],
    rating: 4.7,
    certifications: ['CSTL Approved'],
    paymentTerms: 'EMI Available',
    createdAt: '2024-02-15T10:00:00Z'
  }
];

// Inventory
const inventory = [
  { id: 'INV001', category: 'Seeds', item: 'Paddy Seeds (BPT 5204)', quantity: 500, unit: 'kg', price: 45, supplier: 'SUPPLIER001', farm: 'FARM001' },
  { id: 'INV002', category: 'Fertilizer', item: 'Urea', quantity: 1000, unit: 'kg', price: 6, supplier: 'SUPPLIER002', farm: 'FARM001' },
  { id: 'INV003', category: 'Fertilizer', item: 'DAP', quantity: 500, unit: 'kg', price: 28, supplier: 'SUPPLIER002', farm: 'FARM001' },
  { id: 'INV004', category: 'Pesticide', item: 'Chlorpyrifos', quantity: 50, unit: 'L', price: 350, supplier: 'SUPPLIER002', farm: 'FARM002' },
  { id: 'INV005', category: 'Machinery', item: 'Knapsack Sprayer', quantity: 5, unit: 'units', price: 2500, supplier: 'SUPPLIER003', farm: 'FARM001' }
];

// Purchase Orders
const purchaseOrders = [
  {
    id: 'PO001',
    farmer: 'FARMER001',
    supplier: 'SUPPLIER001',
    items: [{ item: 'Paddy Seeds (BPT 5204)', quantity: 50, price: 45, total: 2250 }],
    total: 2250,
    status: 'delivered',
    orderDate: '2024-05-15T10:00:00Z',
    deliveryDate: '2024-05-20T14:00:00Z'
  },
  {
    id: 'PO002',
    farmer: 'FARMER001',
    supplier: 'SUPPLIER002',
    items: [{ item: 'Urea', quantity: 200, price: 6, total: 1200 }, { item: 'DAP', quantity: 100, price: 28, total: 2800 }],
    total: 4000,
    status: 'delivered',
    orderDate: '2024-05-18T09:00:00Z',
    deliveryDate: '2024-05-25T11:00:00Z'
  },
  {
    id: 'PO003',
    farmer: 'FARMER002',
    supplier: 'SUPPLIER002',
    items: [{ item: 'Pesticides Combo', quantity: 20, price: 500, total: 10000 }],
    total: 10000,
    status: 'pending',
    orderDate: '2024-06-01T08:00:00Z',
    deliveryDate: null
  }
];

// Sales/Produce Sales
const salesOrders = [
  {
    id: 'SO001',
    farmer: 'FARMER003',
    crop: 'CROP001',
    quantity: 20000,
    unit: 'kg',
    price: 23,
    total: 460000,
    buyer: 'FSSAI Warehouse',
    status: 'completed',
    saleDate: '2024-04-15T10:00:00Z',
    paymentStatus: 'received'
  },
  {
    id: 'SO002',
    farmer: 'FARMER001',
    crop: 'CROP004',
    quantity: 15000,
    unit: 'kg',
    price: 68,
    total: 1020000,
    buyer: 'Textile Mill Corp',
    status: 'completed',
    saleDate: '2024-03-20T09:00:00Z',
    paymentStatus: 'received'
  },
  {
    id: 'SO003',
    farmer: 'FARMER002',
    crop: 'CROP003',
    quantity: 5000,
    unit: 'kg',
    price: 150,
    total: 750000,
    buyer: 'Fresh Fruits Export',
    status: 'pending',
    saleDate: '2024-06-10T08:00:00Z',
    paymentStatus: 'pending'
  }
];

// Harvest Records
const harvests = [
  { id: 'HARV001', farm: 'FARM001', plot: 'PLOT001', crop: 'CROP001', quantity: 45000, unit: 'kg', harvestDate: '2024-04-15', yieldPerAcre: 4500, quality: 'A' },
  { id: 'HARV002', farm: 'FARM003', plot: 'PLOT006', crop: 'CROP005', quantity: 40000, unit: 'kg', harvestDate: '2024-04-20', yieldPerAcre: 2000, quality: 'A' },
  { id: 'HARV003', farm: 'FARM005', plot: 'PLOT010', crop: 'CROP004', quantity: 37500, unit: 'kg', harvestDate: '2024-03-15', yieldPerAcre: 1500, quality: 'B' }
];

// ============ HELPER FUNCTIONS ============

function generateId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

// ============ AUTH MIDDLEWARE ============

function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !authSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized - Valid session required' });
  }
  req.user = authSessions.get(sessionId);
  next();
}

// ============ HEALTH & INFO ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Agriculture OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      farms: farms.length,
      farmers: farmers.length,
      crops: crops.length,
      suppliers: suppliers.length,
      inventory: inventory.length,
      purchaseOrders: purchaseOrders.length,
      salesOrders: salesOrders.length,
      harvests: harvests.length
    }
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    service: 'Agriculture OS',
    version: '1.0.0',
    port: PORT,
    industry: 'Agriculture',
    features: [
      'Farm/Plot Management',
      'Crop Management',
      'Farmer/Customer Management',
      'Supplier/Dealer Management',
      'Inventory Management',
      'Sales/Purchase Orders',
      'Weather Integration',
      'Analytics & Reporting',
      'RTMN Layer Integration'
    ],
    layers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  });
});

// ============ AUTH ROUTES ============

app.post('/api/auth/register', (req, res) => {
  const { name, phone, email, role = 'farmer' } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone required' });
  }

  const userId = generateId('USER');
  const sessionId = generateId('SES');

  const user = { id: userId, name, phone, email, role, createdAt: new Date().toISOString() };
  authUsers.set(userId, user);
  authSessions.set(sessionId, user);

  res.json({ user, sessionId, message: 'Registration successful' });
});

app.post('/api/auth/login', (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  // Check if user exists
  let user = null;
  for (const [id, u] of authUsers) {
    if (u.phone === phone) {
      user = u;
      break;
    }
  }

  if (!user) {
    // Create demo user
    const userId = generateId('USER');
    user = { id: userId, name: 'Demo Farmer', phone, role: 'farmer', createdAt: new Date().toISOString() };
    authUsers.set(userId, user);
  }

  const sessionId = generateId('SES');
  authSessions.set(sessionId, user);

  res.json({ user, sessionId, message: 'Login successful' });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const sessionId = req.headers['x-session-id'];
  authSessions.delete(sessionId);
  res.json({ message: 'Logged out successfully' });
});

// ============ FARM MANAGEMENT ============

app.get('/api/farms', requireAuth, (req, res) => {
  const { owner, district } = req.query;
  let result = [...farms];

  if (owner) result = result.filter(f => f.owner === owner);
  if (district) result = result.filter(f => f.location.district.toLowerCase().includes(district.toLowerCase()));

  res.json({ farms: result, total: result.length });
});

app.get('/api/farms/:id', requireAuth, (req, res) => {
  const farm = farms.find(f => f.id === req.params.id);
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  res.json(farm);
});

app.post('/api/farms', requireAuth, (req, res) => {
  const { name, location, totalArea, areaUnit, soilType, irrigationType } = req.body;

  if (!name || !totalArea) {
    return res.status(400).json({ error: 'Name and area required' });
  }

  const farm = {
    id: generateId('FARM'),
    name,
    owner: req.user.id,
    location: location || {},
    totalArea,
    areaUnit: areaUnit || 'acres',
    soilType: soilType || 'Unknown',
    irrigationType: irrigationType || 'Rain-fed',
    plots: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  farms.push(farm);
  res.status(201).json(farm);
});

app.put('/api/farms/:id', requireAuth, (req, res) => {
  const index = farms.findIndex(f => f.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Farm not found' });

  farms[index] = { ...farms[index], ...req.body, updatedAt: new Date().toISOString() };
  res.json(farms[index]);
});

app.delete('/api/farms/:id', requireAuth, (req, res) => {
  const index = farms.findIndex(f => f.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Farm not found' });

  farms.splice(index, 1);
  res.json({ message: 'Farm deleted' });
});

// ============ PLOT MANAGEMENT ============

app.post('/api/farms/:farmId/plots', requireAuth, (req, res) => {
  const farm = farms.find(f => f.id === req.params.farmId);
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const { name, area, crop } = req.body;
  if (!name || !area) {
    return res.status(400).json({ error: 'Name and area required' });
  }

  const plot = {
    id: generateId('PLOT'),
    name,
    area,
    crop: crop || null,
    status: 'fallow'
  };

  farm.plots.push(plot);
  farm.totalArea += area;
  farm.updatedAt = new Date().toISOString();

  res.status(201).json(plot);
});

app.put('/api/farms/:farmId/plots/:plotId', requireAuth, (req, res) => {
  const farm = farms.find(f => f.id === req.params.farmId);
  if (!farm) return res.status(404).json({ error: 'Farm not found' });

  const plotIndex = farm.plots.findIndex(p => p.id === req.params.plotId);
  if (plotIndex === -1) return res.status(404).json({ error: 'Plot not found' });

  farm.plots[plotIndex] = { ...farm.plots[plotIndex], ...req.body };
  farm.updatedAt = new Date().toISOString();

  res.json(farm.plots[plotIndex]);
});

// ============ CROP MANAGEMENT ============

app.get('/api/crops', requireAuth, (req, res) => {
  const { category, season } = req.query;
  let result = [...crops];

  if (category) result = result.filter(c => c.category === category);
  if (season) result = result.filter(c => c.season.includes(season));

  res.json({ crops: result, total: result.length });
});

app.get('/api/crops/:id', requireAuth, (req, res) => {
  const crop = crops.find(c => c.id === req.params.id);
  if (!crop) return res.status(404).json({ error: 'Crop not found' });
  res.json(crop);
});

app.post('/api/crops', requireAuth, (req, res) => {
  const { name, variety, category, season, duration, waterRequirement, expectedYield, msp } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category required' });
  }

  const crop = {
    id: generateId('CROP'),
    name,
    variety: variety || 'Local',
    category,
    season: season || 'Kharif',
    duration: duration || 120,
    waterRequirement: waterRequirement || 'Medium',
    expectedYield: expectedYield || 0,
    yieldUnit: 'kg/acre',
    msp,
    mspUnit: msp ? '₹/kg' : null,
    stages: ['Sowing', 'Vegetative', 'Flowering', 'Maturity', 'Harvest'],
    createdAt: new Date().toISOString()
  };

  crops.push(crop);
  res.status(201).json(crop);
});

// ============ FARMER MANAGEMENT ============

app.get('/api/farmers', requireAuth, (req, res) => {
  const { district, subsidy } = req.query;
  let result = [...farmers];

  if (district) result = result.filter(f => f.location.district.toLowerCase().includes(district.toLowerCase()));
  if (subsidy) result = result.filter(f => f.subsidies.some(s => s.toLowerCase().includes(subsidy.toLowerCase())));

  res.json({ farmers: result, total: result.length });
});

app.get('/api/farmers/:id', requireAuth, (req, res) => {
  const farmer = farmers.find(f => f.id === req.params.id);
  if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

  const farmerFarms = farms.filter(f => farmer.farms.includes(f.id));
  const farmerPurchases = purchaseOrders.filter(po => po.farmer === farmer.id);
  const farmerSales = salesOrders.filter(so => so.farmer === farmer.id);

  res.json({ ...farmer, farms: farmerFarms, purchases: farmerPurchases, sales: farmerSales });
});

app.post('/api/farmers', requireAuth, (req, res) => {
  const { name, phone, email, aadhaar, location, bankDetails } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone required' });
  }

  const farmer = {
    id: generateId('FARMER'),
    name,
    phone,
    email: email || null,
    aadhaar: aadhaar ? '****-****-' + aadhaar.slice(-4) : null,
    location: location || {},
    farms: [],
    bankDetails: bankDetails ? { bank: bankDetails.bank, account: '****' + bankDetails.account.slice(-4) } : null,
    kisanCreditCard: false,
    subsidies: [],
    createdAt: new Date().toISOString()
  };

  farmers.push(farmer);
  res.status(201).json(farmer);
});

// ============ SUPPLIER MANAGEMENT ============

app.get('/api/suppliers', requireAuth, (req, res) => {
  const { type } = req.query;
  let result = [...suppliers];

  if (type) result = result.filter(s => s.type.toLowerCase().includes(type.toLowerCase()));

  res.json({ suppliers: result, total: result.length });
});

app.get('/api/suppliers/:id', requireAuth, (req, res) => {
  const supplier = suppliers.find(s => s.id === req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const supplierOrders = purchaseOrders.filter(po => po.supplier === supplier.id);

  res.json({ ...supplier, orders: supplierOrders });
});

app.post('/api/suppliers', requireAuth, (req, res) => {
  const { name, type, contact, location, products } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type required' });
  }

  const supplier = {
    id: generateId('SUPPLIER'),
    name,
    type,
    contact: contact || {},
    location: location || {},
    products: products || [],
    rating: 0,
    certifications: [],
    paymentTerms: 'COD',
    createdAt: new Date().toISOString()
  };

  suppliers.push(supplier);
  res.status(201).json(supplier);
});

// ============ INVENTORY MANAGEMENT ============

app.get('/api/inventory', requireAuth, (req, res) => {
  const { category, farm } = req.query;
  let result = [...inventory];

  if (category) result = result.filter(i => i.category === category);
  if (farm) result = result.filter(i => i.farm === farm);

  res.json({ inventory: result, total: result.length });
});

app.post('/api/inventory', requireAuth, (req, res) => {
  const { category, item, quantity, unit, price, supplier, farm } = req.body;

  if (!category || !item || quantity === undefined) {
    return res.status(400).json({ error: 'Category, item, and quantity required' });
  }

  const inv = {
    id: generateId('INV'),
    category,
    item,
    quantity,
    unit: unit || 'units',
    price: price || 0,
    supplier: supplier || null,
    farm: farm || req.user.id
  };

  inventory.push(inv);
  res.status(201).json(inv);
});

app.put('/api/inventory/:id', requireAuth, (req, res) => {
  const index = inventory.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  inventory[index] = { ...inventory[index], ...req.body };
  res.json(inventory[index]);
});

// ============ PURCHASE ORDERS ============

app.get('/api/purchases', requireAuth, (req, res) => {
  const { farmer, supplier, status } = req.query;
  let result = [...purchaseOrders];

  if (farmer) result = result.filter(po => po.farmer === farmer);
  if (supplier) result = result.filter(po => po.supplier === supplier);
  if (status) result = result.filter(po => po.status === status);

  res.json({ orders: result, total: result.length });
});

app.post('/api/purchases', requireAuth, (req, res) => {
  const { supplier, items } = req.body;

  if (!supplier || !items || items.length === 0) {
    return res.status(400).json({ error: 'Supplier and items required' });
  }

  const order = {
    id: generateId('PO'),
    farmer: req.user.id,
    supplier,
    items: items.map(i => ({
      item: i.item,
      quantity: i.quantity,
      price: i.price,
      total: i.quantity * i.price
    })),
    total: items.reduce((sum, i) => sum + (i.quantity * i.price), 0),
    status: 'pending',
    orderDate: new Date().toISOString(),
    deliveryDate: null
  };

  purchaseOrders.push(order);
  res.status(201).json(order);
});

// ============ SALES ORDERS ============

app.get('/api/sales', requireAuth, (req, res) => {
  const { farmer, crop, status } = req.query;
  let result = [...salesOrders];

  if (farmer) result = result.filter(so => so.farmer === farmer);
  if (crop) result = result.filter(so => so.crop === crop);
  if (status) result = result.filter(so => so.status === status);

  res.json({ orders: result, total: result.length });
});

app.post('/api/sales', requireAuth, (req, res) => {
  const { crop, quantity, unit, price, buyer } = req.body;

  if (!crop || !quantity || !price) {
    return res.status(400).json({ error: 'Crop, quantity, and price required' });
  }

  const order = {
    id: generateId('SO'),
    farmer: req.user.id,
    crop,
    quantity,
    unit: unit || 'kg',
    price,
    total: quantity * price,
    buyer: buyer || 'Local Mandi',
    status: 'pending',
    saleDate: new Date().toISOString(),
    paymentStatus: 'pending'
  };

  salesOrders.push(order);
  res.status(201).json(order);
});

// ============ HARVEST RECORDS ============

app.get('/api/harvests', requireAuth, (req, res) => {
  const { farm, crop } = req.query;
  let result = [...harvests];

  if (farm) result = result.filter(h => h.farm === farm);
  if (crop) result = result.filter(h => h.crop === crop);

  res.json({ harvests: result, total: result.length });
});

app.post('/api/harvests', requireAuth, (req, res) => {
  const { farm, plot, crop, quantity, unit, harvestDate, quality } = req.body;

  if (!farm || !crop || !quantity) {
    return res.status(400).json({ error: 'Farm, crop, and quantity required' });
  }

  const farmData = farms.find(f => f.id === farm);
  const plotData = farmData?.plots.find(p => p.id === plot);

  const harvest = {
    id: generateId('HARV'),
    farm,
    plot: plot || null,
    crop,
    quantity,
    unit: unit || 'kg',
    harvestDate: harvestDate || new Date().toISOString().split('T')[0],
    yieldPerAcre: plotData ? quantity / plotData.area : 0,
    quality: quality || 'B'
  };

  harvests.push(harvest);
  res.status(201).json(harvest);
});

// ============ WEATHER INTEGRATION ============

app.get('/api/weather', requireAuth, (req, res) => {
  const { district } = req.query;

  // Mock weather data
  const weatherData = {
    current: {
      temperature: 32,
      humidity: 65,
      windSpeed: 12,
      condition: 'Partly Cloudy',
      rainfall: 0,
      uvIndex: 8
    },
    forecast: [
      { day: 'Today', high: 35, low: 26, condition: 'Partly Cloudy', rainfall: 10 },
      { day: 'Tomorrow', high: 36, low: 27, condition: 'Sunny', rainfall: 0 },
      { day: 'Day 3', high: 34, low: 25, condition: 'Light Rain', rainfall: 60 },
      { day: 'Day 4', high: 33, low: 24, condition: 'Heavy Rain', rainfall: 120 },
      { day: 'Day 5', high: 31, low: 23, condition: 'Cloudy', rainfall: 30 }
    ],
    alerts: [
      { type: 'warning', message: 'Heavy rainfall expected in next 48 hours', validUntil: '2024-06-20' },
      { type: 'info', message: 'Favorable conditions for pesticide application on June 18', validUntil: '2024-06-18' }
    ],
    district: district || 'Guntur',
    updatedAt: new Date().toISOString()
  };

  res.json(weatherData);
});

app.get('/api/weather/forecast/:days', requireAuth, (req, res) => {
  const days = parseInt(req.params.days) || 7;

  const forecast = [];
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Heavy Rain'];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    forecast.push({
      date: date.toISOString().split('T')[0],
      high: 30 + Math.floor(Math.random() * 6),
      low: 23 + Math.floor(Math.random() * 4),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      rainfall: Math.floor(Math.random() * 100),
      humidity: 60 + Math.floor(Math.random() * 20),
      windSpeed: 8 + Math.floor(Math.random() * 10)
    });
  }

  res.json({ forecast, days });
});

// ============ ANALYTICS ============

app.get('/api/analytics/summary', requireAuth, (req, res) => {
  const totalArea = farms.reduce((sum, f) => sum + f.totalArea, 0);
  const totalRevenue = salesOrders.reduce((sum, so) => sum + so.total, 0);
  const totalExpenses = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
  const totalHarvested = harvests.reduce((sum, h) => sum + h.quantity, 0);

  const cropBreakdown = {};
  harvests.forEach(h => {
    if (!cropBreakdown[h.crop]) cropBreakdown[h.crop] = { quantity: 0, count: 0 };
    cropBreakdown[h.crop].quantity += h.quantity;
    cropBreakdown[h.crop].count += 1;
  });

  const districtBreakdown = {};
  farms.forEach(f => {
    if (!districtBreakdown[f.location.district]) {
      districtBreakdown[f.location.district] = { farms: 0, area: 0 };
    }
    districtBreakdown[f.location.district].farms += 1;
    districtBreakdown[f.location.district].area += f.totalArea;
  });

  res.json({
    overview: {
      totalFarms: farms.length,
      totalArea: Math.round(totalArea * 100) / 100,
      totalFarmers: farmers.length,
      totalCrops: crops.length,
      totalSuppliers: suppliers.length
    },
    financials: {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      pendingPayments: salesOrders.filter(so => so.paymentStatus === 'pending').reduce((sum, so) => sum + so.total, 0)
    },
    production: {
      totalHarvested,
      averageYield: harvests.length > 0 ? Math.round(totalHarvested / harvests.length) : 0,
      activePlots: farms.reduce((sum, f) => sum + f.plots.filter(p => p.status === 'active').length, 0)
    },
    cropBreakdown,
    districtBreakdown
  });
});

app.get('/api/analytics/revenue', requireAuth, (req, res) => {
  const { period = 'month' } = req.query;

  const revenueByCrop = {};
  salesOrders.forEach(so => {
    if (!revenueByCrop[so.crop]) revenueByCrop[so.crop] = 0;
    revenueByCrop[so.crop] += so.total;
  });

  const monthlyRevenue = [
    { month: 'Jan', revenue: 450000 },
    { month: 'Feb', revenue: 380000 },
    { month: 'Mar', revenue: 1200000 },
    { month: 'Apr', revenue: 890000 },
    { month: 'May', revenue: 560000 },
    { month: 'Jun', revenue: 750000 }
  ];

  res.json({
    period,
    totalRevenue: salesOrders.reduce((sum, so) => sum + so.total, 0),
    revenueByCrop,
    monthlyRevenue,
    topPerformers: salesOrders.sort((a, b) => b.total - a.total).slice(0, 5)
  });
});

app.get('/api/analytics/crop-performance', requireAuth, (req, res) => {
  const performance = crops.map(crop => {
    const cropHarvests = harvests.filter(h => h.crop === crop.id);
    const totalYield = cropHarvests.reduce((sum, h) => sum + h.quantity, 0);
    const avgYield = cropHarvests.length > 0 ? totalYield / cropHarvests.length : 0;
    const revenue = salesOrders.filter(so => so.crop === crop.id).reduce((sum, so) => sum + so.total, 0);

    return {
      crop: crop.name,
      variety: crop.variety,
      totalHarvested: totalYield,
      averageYieldPerHarvest: Math.round(avgYield),
      expectedYield: crop.expectedYield,
      performanceScore: crop.expectedYield > 0 ? Math.round((avgYield / crop.expectedYield) * 100) : 0,
      totalRevenue: revenue,
      harvests: cropHarvests.length
    };
  });

  res.json({ performance });
});

// ============ RTMN LAYER INTEGRATION ============

app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence',
    available: true,
    endpoints: [
      '/api/crops (crop database)',
      '/api/analytics/crop-performance (AI insights)'
    ],
    capabilities: [
      'Crop recommendations',
      'Yield prediction',
      'Pest detection',
      'Market intelligence'
    ]
  });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    available: true,
    endpoints: [
      '/api/farmers (farmer database)',
      '/api/sales (market access)'
    ],
    capabilities: [
      'Farmer profiles',
      'Market access',
      'Direct sales',
      'Buyer connections'
    ]
  });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    available: true,
    endpoints: [
      '/api/purchases (input procurement)',
      '/api/sales (output sales)',
      '/api/suppliers (dealer network)'
    ],
    capabilities: [
      'Input procurement',
      'Output sales',
      'Supplier management',
      'Price negotiation'
    ]
  });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({
    layer: 4,
    name: 'Finance',
    available: true,
    endpoints: [
      '/api/analytics/summary (financial overview)',
      '/api/analytics/revenue (revenue tracking)'
    ],
    capabilities: [
      'Revenue tracking',
      'Expense management',
      'Subsidy tracking',
      'Credit assessment'
    ]
  });
});

app.get('/api/layer/workforce', requireAuth, (req, res) => {
  res.json({
    layer: 5,
    name: 'Workforce',
    available: true,
    endpoints: ['/api/farmers (labor management)'],
    capabilities: [
      'Farmer profiles',
      'Labor tracking',
      'Skill matching',
      'Training records'
    ]
  });
});

app.get('/api/layer/legal', requireAuth, (req, res) => {
  res.json({
    layer: 6,
    name: 'Legal & Trust',
    available: true,
    endpoints: ['/api/farmers (land records)'],
    capabilities: [
      'Land verification',
      'Contract management',
      'Compliance tracking',
      'Subsidy eligibility'
    ]
  });
});

app.get('/api/layer/property', requireAuth, (req, res) => {
  res.json({
    layer: 7,
    name: 'Property',
    available: true,
    endpoints: [
      '/api/farms (land management)',
      '/api/farms/:id/plots (plot management)'
    ],
    capabilities: [
      'Land registration',
      'Plot management',
      'Soil testing',
      'Irrigation planning'
    ]
  });
});

app.get('/api/layer/health', requireAuth, (req, res) => {
  res.json({
    layer: 8,
    name: 'Health',
    available: true,
    endpoints: ['/api/weather (environmental health)'],
    capabilities: [
      'Weather alerts',
      'Disease prediction',
      'Water quality',
      'Air quality'
    ]
  });
});

app.get('/api/layer/mobility', requireAuth, (req, res) => {
  res.json({
    layer: 9,
    name: 'Mobility',
    available: false,
    message: 'Mobility services not yet integrated. Contact KHAIRMOVE for integration.'
  });
});

app.get('/api/layer/identity', requireAuth, (req, res) => {
  res.json({
    layer: 10,
    name: 'Identity',
    available: true,
    endpoints: [
      '/api/auth/register',
      '/api/auth/login'
    ],
    capabilities: [
      'Farmer identity',
      'Aadhaar verification',
      'Bank account linking',
      'KYC management'
    ]
  });
});

app.get('/api/layer/memory', requireAuth, (req, res) => {
  res.json({
    layer: 11,
    name: 'Memory',
    available: true,
    endpoints: ['Internal data stores'],
    capabilities: [
      'Farmer history',
      'Crop history',
      'Transaction memory',
      'Preference storage'
    ]
  });
});

app.get('/api/layer/twins', requireAuth, (req, res) => {
  res.json({
    layer: 12,
    name: 'Twins',
    available: true,
    twins: [
      { name: 'Farmer Twin', endpoint: '/api/farmers/:id' },
      { name: 'Farm Twin', endpoint: '/api/farms/:id' },
      { name: 'Crop Twin', endpoint: '/api/crops/:id' },
      { name: 'Supplier Twin', endpoint: '/api/suppliers/:id' },
      { name: 'Harvest Twin', endpoint: '/api/harvests' }
    ]
  });
});

app.get('/api/layer/automation', requireAuth, (req, res) => {
  res.json({
    layer: 13,
    name: 'Automation',
    available: true,
    capabilities: [
      'Irrigation scheduling',
      'Fertilizer reminders',
      'Harvest alerts',
      'Weather-based actions'
    ]
  });
});

app.get('/api/layer/autonomous', requireAuth, (req, res) => {
  res.json({
    layer: 14,
    name: 'Autonomous',
    available: true,
    capabilities: [
      'Crop recommendations',
      'Optimal harvest timing',
      'Price optimization',
      'Resource allocation'
    ]
  });
});

app.get('/api/layer/network', requireAuth, (req, res) => {
  res.json({
    layer: 15,
    name: 'Network',
    available: true,
    endpoints: [
      '/api/suppliers',
      '/api/sales'
    ],
    capabilities: [
      'Supplier network',
      'Buyer network',
      'Farmer cooperatives',
      'Market connections'
    ]
  });
});

app.get('/api/layers', requireAuth, (req, res) => {
  const layerNames = {
    1: 'Intelligence',
    2: 'Customer Growth',
    3: 'Commerce',
    4: 'Finance',
    5: 'Workforce',
    6: 'Legal & Trust',
    7: 'Property',
    8: 'Health',
    9: 'Mobility',
    10: 'Identity',
    11: 'Memory',
    12: 'Twins',
    13: 'Automation',
    14: 'Autonomous',
    15: 'Network'
  };

  res.json({
    totalLayers: 15,
    layers: Object.entries(layerNames).map(([id, name]) => ({
      id: parseInt(id),
      name,
      available: parseInt(id) !== 9 // All except Mobility
    }))
  });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`Agriculture OS running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Info: http://localhost:${PORT}/api/info`);
  console.log('');
  console.log('Sample Data:');
  console.log(`  - ${farms.length} Farms`);
  console.log(`  - ${farmers.length} Farmers`);
  console.log(`  - ${crops.length} Crops`);
  console.log(`  - ${suppliers.length} Suppliers`);
  console.log('');
  console.log('RTMN Layer Integration:');
  console.log(`  All 15 layers available (Layer 9 - Mobility pending)`);
});

module.exports = app;
