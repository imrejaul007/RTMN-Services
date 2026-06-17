/**
 * Manufacturing OS - AI Company Platform
 *
 * Complete Manufacturing Management System
 * Port: 5150
 * Industry: Manufacturing (Production, BOM, Quality Control)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5150;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const INDUSTRY = 'manufacturing';

// In-memory database
const products = new Map();
const boms = new Map();
const productionOrders = new Map();
const workOrders = new Map();
const machines = new Map();
const rawMaterials = new Map();
const finishedGoods = new Map();
const qualityChecks = new Map();
const suppliers = new Map();
const purchaseOrders = new Map();
const inspections = new Map();
const productionPlans = new Map();
const routings = new Map();
const shipments = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();

// Sample data - Products (3 products)
const sampleProducts = [
  {
    id: 'PRD001',
    name: 'Industrial Motor Assembly',
    sku: 'MT-IND-001',
    description: 'High-efficiency industrial motor for manufacturing equipment',
    category: 'motors',
    unit: 'units',
    standardCost: 25000,
    sellingPrice: 35000,
    minStock: 50,
    currentStock: 120,
    status: 'active',
    image: '⚙️'
  },
  {
    id: 'PRD002',
    name: 'Control Panel Module',
    sku: 'CP-CTL-002',
    description: 'Automated control panel with PLC integration',
    category: 'electronics',
    unit: 'units',
    standardCost: 15000,
    sellingPrice: 22000,
    minStock: 30,
    currentStock: 85,
    status: 'active',
    image: '🔌'
  },
  {
    id: 'PRD003',
    name: 'Precision Gear Set',
    sku: 'GR-PRC-003',
    description: 'High-precision gears for robotic applications',
    category: 'gears',
    unit: 'sets',
    standardCost: 8000,
    sellingPrice: 12500,
    minStock: 100,
    currentStock: 200,
    status: 'active',
    image: '⚡'
  }
];
sampleProducts.forEach(p => products.set(p.id, p));

// Sample data - Bill of Materials (3 BOMs)
const sampleBoms = [
  {
    id: 'BOM001',
    productId: 'PRD001',
    version: '1.0',
    status: 'active',
    components: [
      { materialId: 'MAT001', quantity: 2, unit: 'kg' },
      { materialId: 'MAT002', quantity: 5, unit: 'pcs' },
      { materialId: 'MAT003', quantity: 1, unit: 'pcs' }
    ],
    laborTime: 4,
    createdAt: '2024-01-15'
  },
  {
    id: 'BOM002',
    productId: 'PRD002',
    version: '1.0',
    status: 'active',
    components: [
      { materialId: 'MAT004', quantity: 1, unit: 'pcs' },
      { materialId: 'MAT005', quantity: 3, unit: 'pcs' },
      { materialId: 'MAT002', quantity: 10, unit: 'pcs' }
    ],
    laborTime: 3,
    createdAt: '2024-02-10'
  },
  {
    id: 'BOM003',
    productId: 'PRD003',
    version: '1.0',
    status: 'active',
    components: [
      { materialId: 'MAT001', quantity: 0.5, unit: 'kg' },
      { materialId: 'MAT006', quantity: 4, unit: 'pcs' }
    ],
    laborTime: 2,
    createdAt: '2024-03-05'
  }
];
sampleBoms.forEach(b => boms.set(b.id, b));

// Sample data - Work Orders (5 work orders)
const sampleWorkOrders = [
  {
    id: 'WO001',
    productionOrderId: 'PO001',
    productId: 'PRD001',
    quantity: 20,
    completedQuantity: 20,
    status: 'completed',
    priority: 'high',
    workCenter: 'WC001',
    startDate: '2024-06-01',
    endDate: '2024-06-05',
    laborHours: 80,
    machineId: 'MCH001',
    operatorId: 'OP001',
    notes: 'Priority order for client delivery'
  },
  {
    id: 'WO002',
    productionOrderId: 'PO002',
    productId: 'PRD002',
    quantity: 15,
    completedQuantity: 10,
    status: 'in_progress',
    priority: 'medium',
    workCenter: 'WC002',
    startDate: '2024-06-10',
    endDate: '2024-06-15',
    laborHours: 45,
    machineId: 'MCH002',
    operatorId: 'OP002',
    notes: 'Quality issue resolved, resuming'
  },
  {
    id: 'WO003',
    productionOrderId: 'PO003',
    productId: 'PRD003',
    quantity: 50,
    completedQuantity: 0,
    status: 'pending',
    priority: 'low',
    workCenter: 'WC001',
    startDate: '2024-06-20',
    endDate: '2024-06-25',
    laborHours: 100,
    machineId: 'MCH001',
    operatorId: 'OP001',
    notes: 'Standard production run'
  },
  {
    id: 'WO004',
    productionOrderId: 'PO004',
    productId: 'PRD001',
    quantity: 30,
    completedQuantity: 0,
    status: 'pending',
    priority: 'high',
    workCenter: 'WC003',
    startDate: '2024-06-18',
    endDate: '2024-06-22',
    laborHours: 120,
    machineId: 'MCH003',
    operatorId: 'OP003',
    notes: 'Urgent client requirement'
  },
  {
    id: 'WO005',
    productionOrderId: 'PO005',
    productId: 'PRD002',
    quantity: 25,
    completedQuantity: 25,
    status: 'completed',
    priority: 'medium',
    workCenter: 'WC002',
    startDate: '2024-05-28',
    endDate: '2024-06-02',
    laborHours: 75,
    machineId: 'MCH004',
    operatorId: 'OP002',
    notes: 'Batch completed successfully'
  }
];
sampleWorkOrders.forEach(w => workOrders.set(w.id, w));

// Sample data - Machines (4 machines)
const sampleMachines = [
  {
    id: 'MCH001',
    name: 'CNC Milling Machine A1',
    type: 'cnc_milling',
    model: 'Haas VF-2SS',
    serialNumber: 'HML-2023-001',
    status: 'operational',
    location: 'Workshop A',
    installDate: '2023-03-15',
    lastMaintenance: '2024-05-20',
    nextMaintenance: '2024-08-20',
    totalHours: 4500,
    utilizationRate: 85,
    hourlyCost: 500,
    specs: {
      spindleSpeed: '12000 RPM',
      toolPositions: 30,
      precision: '0.001mm'
    }
  },
  {
    id: 'MCH002',
    name: 'Assembly Robot Arm R2',
    type: 'robot',
    model: 'Fanuc M-20iA/35M',
    serialNumber: 'RBT-2022-015',
    status: 'operational',
    location: 'Assembly Line B',
    installDate: '2022-09-01',
    lastMaintenance: '2024-04-15',
    nextMaintenance: '2024-07-15',
    totalHours: 3200,
    utilizationRate: 78,
    hourlyCost: 800,
    specs: {
      reach: '1850mm',
      payload: '35kg',
      axes: 6
    }
  },
  {
    id: 'MCH003',
    name: 'Hydraulic Press HP500',
    type: 'press',
    model: 'SMC HP-500T',
    serialNumber: 'HPR-2021-008',
    status: 'operational',
    location: 'Workshop B',
    installDate: '2021-06-20',
    lastMaintenance: '2024-03-10',
    nextMaintenance: '2024-09-10',
    totalHours: 5800,
    utilizationRate: 65,
    hourlyCost: 350,
    specs: {
      tonnage: '500 tons',
      stroke: '400mm',
      bedSize: '1200x800mm'
    }
  },
  {
    id: 'MCH004',
    name: 'Laser Cutter LC200',
    type: 'laser',
    model: 'Trumpf TruLaser 3030',
    serialNumber: 'LCR-2023-022',
    status: 'maintenance',
    location: 'Workshop A',
    installDate: '2023-11-05',
    lastMaintenance: '2024-06-01',
    nextMaintenance: '2024-12-01',
    totalHours: 1200,
    utilizationRate: 45,
    hourlyCost: 600,
    specs: {
      power: '6kW',
      cuttingArea: '3000x1500mm',
      thickness: '25mm steel'
    }
  }
];
sampleMachines.forEach(m => machines.set(m.id, m));

// Sample data - Raw Materials
const sampleRawMaterials = [
  { id: 'MAT001', name: 'Aluminum Sheet 6061', sku: 'AL-6061-SHT', unit: 'kg', currentStock: 5000, minStock: 1000, standardCost: 280, supplierId: 'SUP001' },
  { id: 'MAT002', name: 'Steel Bolts M8x40', sku: 'ST-BLT-M8', unit: 'pcs', currentStock: 15000, minStock: 5000, standardCost: 5, supplierId: 'SUP002' },
  { id: 'MAT003', name: 'Copper Wire 2.5mm', sku: 'CU-WR-2.5', unit: 'meters', currentStock: 2000, minStock: 500, standardCost: 45, supplierId: 'SUP003' },
  { id: 'MAT004', name: 'PLC Module Siemens S7', sku: 'PLC-SI-S7', unit: 'pcs', currentStock: 50, minStock: 20, standardCost: 35000, supplierId: 'SUP001' },
  { id: 'MAT005', name: 'Relay Module 24V', sku: 'RLY-24V-4CH', unit: 'pcs', currentStock: 200, minStock: 50, standardCost: 850, supplierId: 'SUP002' },
  { id: 'MAT006', name: 'Precision Bearings', sku: 'BRG-SKF-6205', unit: 'pcs', currentStock: 800, minStock: 200, standardCost: 320, supplierId: 'SUP003' }
];
sampleRawMaterials.forEach(m => rawMaterials.set(m.id, m));

// Sample data - Finished Goods Inventory
const sampleFinishedGoods = [
  { id: 'FG001', productId: 'PRD001', quantity: 120, location: 'Warehouse A', batchNumber: 'BATCH-2024-06', createdAt: '2024-06-05' },
  { id: 'FG002', productId: 'PRD002', quantity: 85, location: 'Warehouse B', batchNumber: 'BATCH-2024-05', createdAt: '2024-05-28' },
  { id: 'FG003', productId: 'PRD003', quantity: 200, location: 'Warehouse A', batchNumber: 'BATCH-2024-04', createdAt: '2024-04-15' }
];
sampleFinishedGoods.forEach(f => finishedGoods.set(f.id, f));

// Sample data - Suppliers (3 suppliers)
const sampleSuppliers = [
  {
    id: 'SUP001',
    name: 'MetalWorks Industries',
    contactPerson: 'Rajesh Kumar',
    email: 'rajesh@metalworks.in',
    phone: '+91 98765 43210',
    address: 'Plot 45, Industrial Area, Pune 411001',
    category: 'raw_materials',
    rating: 4.5,
    paymentTerms: 'Net 30',
    status: 'active',
    materialsSupplied: ['MAT001', 'MAT004']
  },
  {
    id: 'SUP002',
    name: 'FastenTech Components',
    contactPerson: 'Anita Sharma',
    email: 'anita@fastentech.in',
    phone: '+91 98765 43220',
    address: 'Unit 12, MIDC, Nashik 422001',
    category: 'components',
    rating: 4.2,
    paymentTerms: 'Net 45',
    status: 'active',
    materialsSupplied: ['MAT002', 'MAT005']
  },
  {
    id: 'SUP003',
    name: 'PrecisionParts Global',
    contactPerson: 'Vikram Singh',
    email: 'vikram@precisionparts.com',
    phone: '+91 98765 43230',
    address: 'Block C, Industrial Zone, Mumbai 400001',
    category: 'precision_parts',
    rating: 4.8,
    paymentTerms: 'Net 30',
    status: 'active',
    materialsSupplied: ['MAT003', 'MAT006']
  }
];
sampleSuppliers.forEach(s => suppliers.set(s.id, s));

// Sample data - Production Orders
const sampleProductionOrders = [
  { id: 'PO001', productId: 'PRD001', quantity: 20, status: 'completed', priority: 'high', createdAt: '2024-06-01', dueDate: '2024-06-10' },
  { id: 'PO002', productId: 'PRD002', quantity: 15, status: 'in_progress', priority: 'medium', createdAt: '2024-06-08', dueDate: '2024-06-20' },
  { id: 'PO003', productId: 'PRD003', quantity: 50, status: 'pending', priority: 'low', createdAt: '2024-06-12', dueDate: '2024-07-01' },
  { id: 'PO004', productId: 'PRD001', quantity: 30, status: 'pending', priority: 'high', createdAt: '2024-06-15', dueDate: '2024-06-25' },
  { id: 'PO005', productId: 'PRD002', quantity: 25, status: 'completed', priority: 'medium', createdAt: '2024-05-25', dueDate: '2024-06-05' }
];
sampleProductionOrders.forEach(p => productionOrders.set(p.id, p));

// Sample data - Quality Checks
const sampleQualityChecks = [
  { id: 'QC001', workOrderId: 'WO001', inspectorId: 'INS001', result: 'passed', defects: 0, checkedAt: '2024-06-05', notes: 'All parameters within tolerance' },
  { id: 'QC002', workOrderId: 'WO002', inspectorId: 'INS002', result: 'failed', defects: 2, checkedAt: '2024-06-12', notes: 'Minor surface defects found, rework required' },
  { id: 'QC003', workOrderId: 'WO005', inspectorId: 'INS001', result: 'passed', defects: 0, checkedAt: '2024-06-02', notes: 'Batch passed all quality tests' }
];
sampleQualityChecks.forEach(q => qualityChecks.set(q.id, q));

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
  const user = { id: 'user_' + Date.now(), email, passwordHash: hashPassword(password), role: role || 'operator', name: name || email.split('@')[0], industry: INDUSTRY, createdAt: new Date().toISOString() };
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
  authSessions.set(token, { userId: user.id, email, industry: INDUSTRY, createdAt: Date.now() });
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

// Products API
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
  const bom = Array.from(boms.values()).find(b => b.productId === product.id);
  const inventory = Array.from(finishedGoods.values()).find(f => f.productId === product.id);
  res.json({ success: true, product, bom, inventory });
});

app.post('/api/products', requireAuth, (req, res) => {
  const product = { id: 'PRD' + String(products.size + 1).padStart(3, '0'), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  products.set(product.id, product);
  res.status(201).json({ success: true, product });
});

app.patch('/api/products/:id', requireAuth, (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const updated = { ...product, ...req.body };
  products.set(product.id, updated);
  res.json({ success: true, product: updated });
});

// BOM API
app.get('/api/boms', requireAuth, (req, res) => {
  const { productId, status } = req.query;
  let result = Array.from(boms.values());
  if (productId) result = result.filter(b => b.productId === productId);
  if (status) result = result.filter(b => b.status === status);
  res.json({ success: true, count: result.length, boms: result });
});

app.get('/api/boms/:id', requireAuth, (req, res) => {
  const bom = boms.get(req.params.id);
  if (!bom) return res.status(404).json({ error: 'BOM not found' });
  const product = products.get(bom.productId);
  const components = bom.components.map(c => {
    const material = rawMaterials.get(c.materialId);
    return { ...c, material };
  });
  res.json({ success: true, bom: { ...bom, components, product } });
});

app.post('/api/boms', requireAuth, (req, res) => {
  const bom = { id: 'BOM' + Date.now(), ...req.body, version: '1.0', status: 'active', createdAt: new Date().toISOString() };
  boms.set(bom.id, bom);
  res.status(201).json({ success: true, bom });
});

// Production Orders API
app.get('/api/production-orders', requireAuth, (req, res) => {
  const { status, priority, productId } = req.query;
  let result = Array.from(productionOrders.values());
  if (status) result = result.filter(p => p.status === status);
  if (priority) result = result.filter(p => p.priority === priority);
  if (productId) result = result.filter(p => p.productId === productId);
  res.json({ success: true, count: result.length, productionOrders: result });
});

app.get('/api/production-orders/:id', requireAuth, (req, res) => {
  const order = productionOrders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Production order not found' });
  const product = products.get(order.productId);
  const workOrderList = Array.from(workOrders.values()).filter(w => w.productionOrderId === order.id);
  res.json({ success: true, order, product, workOrders: workOrderList });
});

app.post('/api/production-orders', requireAuth, (req, res) => {
  const order = { id: 'PO' + String(productionOrders.size + 1).padStart(3, '0'), ...req.body, status: 'pending', createdAt: new Date().toISOString() };
  productionOrders.set(order.id, order);
  res.status(201).json({ success: true, order });
});

app.patch('/api/production-orders/:id', requireAuth, (req, res) => {
  const order = productionOrders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Production order not found' });
  const updated = { ...order, ...req.body };
  productionOrders.set(order.id, updated);
  res.json({ success: true, order: updated });
});

// Work Orders API
app.get('/api/work-orders', requireAuth, (req, res) => {
  const { status, priority, productId, machineId } = req.query;
  let result = Array.from(workOrders.values());
  if (status) result = result.filter(w => w.status === status);
  if (priority) result = result.filter(w => w.priority === priority);
  if (productId) result = result.filter(w => w.productId === productId);
  if (machineId) result = result.filter(w => w.machineId === machineId);
  res.json({ success: true, count: result.length, workOrders: result });
});

app.get('/api/work-orders/:id', requireAuth, (req, res) => {
  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) return res.status(404).json({ error: 'Work order not found' });
  const product = products.get(workOrder.productId);
  const machine = machines.get(workOrder.machineId);
  const qualityCheck = Array.from(qualityChecks.values()).find(q => q.workOrderId === workOrder.id);
  res.json({ success: true, workOrder, product, machine, qualityCheck });
});

app.post('/api/work-orders', requireAuth, (req, res) => {
  const workOrder = { id: 'WO' + String(workOrders.size + 1).padStart(3, '0'), ...req.body, status: 'pending', completedQuantity: 0, createdAt: new Date().toISOString() };
  workOrders.set(workOrder.id, workOrder);
  res.status(201).json({ success: true, workOrder });
});

app.patch('/api/work-orders/:id', requireAuth, (req, res) => {
  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) return res.status(404).json({ error: 'Work order not found' });
  const updated = { ...workOrder, ...req.body };
  workOrders.set(workOrder.id, updated);
  res.json({ success: true, workOrder: updated });
});

// Machines API
app.get('/api/machines', requireAuth, (req, res) => {
  const { status, type, location } = req.query;
  let result = Array.from(machines.values());
  if (status) result = result.filter(m => m.status === status);
  if (type) result = result.filter(m => m.type === type);
  if (location) result = result.filter(m => m.location === location);
  res.json({ success: true, count: result.length, machines: result });
});

app.get('/api/machines/:id', requireAuth, (req, res) => {
  const machine = machines.get(req.params.id);
  if (!machine) return res.status(404).json({ error: 'Machine not found' });
  const assignedWorkOrders = Array.from(workOrders.values()).filter(w => w.machineId === machine.id);
  res.json({ success: true, machine, assignedWorkOrders });
});

app.post('/api/machines', requireAuth, (req, res) => {
  const machine = { id: 'MCH' + Date.now(), ...req.body, status: 'operational', totalHours: 0, createdAt: new Date().toISOString() };
  machines.set(machine.id, machine);
  res.status(201).json({ success: true, machine });
});

app.patch('/api/machines/:id', requireAuth, (req, res) => {
  const machine = machines.get(req.params.id);
  if (!machine) return res.status(404).json({ error: 'Machine not found' });
  const updated = { ...machine, ...req.body };
  machines.set(machine.id, updated);
  res.json({ success: true, machine: updated });
});

// Raw Materials API
app.get('/api/raw-materials', requireAuth, (req, res) => {
  const { supplierId } = req.query;
  let result = Array.from(rawMaterials.values());
  if (supplierId) result = result.filter(m => m.supplierId === supplierId);
  const withStatus = result.map(m => ({
    ...m,
    stockStatus: m.currentStock <= m.minStock ? 'low' : 'normal'
  }));
  res.json({ success: true, count: result.length, rawMaterials: withStatus });
});

app.get('/api/raw-materials/:id', requireAuth, (req, res) => {
  const material = rawMaterials.get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Material not found' });
  const supplier = suppliers.get(material.supplierId);
  res.json({ success: true, material, supplier });
});

app.post('/api/raw-materials', requireAuth, (req, res) => {
  const material = { id: 'MAT' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  rawMaterials.set(material.id, material);
  res.status(201).json({ success: true, material });
});

app.patch('/api/raw-materials/:id', requireAuth, (req, res) => {
  const material = rawMaterials.get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Material not found' });
  const updated = { ...material, ...req.body };
  rawMaterials.set(material.id, updated);
  res.json({ success: true, material: updated });
});

// Finished Goods API
app.get('/api/finished-goods', requireAuth, (req, res) => {
  const { productId, location } = req.query;
  let result = Array.from(finishedGoods.values());
  if (productId) result = result.filter(f => f.productId === productId);
  if (location) result = result.filter(f => f.location === location);
  const withProduct = result.map(f => ({
    ...f,
    product: products.get(f.productId)
  }));
  res.json({ success: true, count: result.length, finishedGoods: withProduct });
});

// Quality Control API
app.get('/api/quality-checks', requireAuth, (req, res) => {
  const { result, workOrderId } = req.query;
  let resultData = Array.from(qualityChecks.values());
  if (result) resultData = resultData.filter(q => q.result === result);
  if (workOrderId) resultData = resultData.filter(q => q.workOrderId === workOrderId);
  res.json({ success: true, count: resultData.length, qualityChecks: resultData });
});

app.post('/api/quality-checks', requireAuth, (req, res) => {
  const check = { id: 'QC' + Date.now(), ...req.body, checkedAt: new Date().toISOString() };
  qualityChecks.set(check.id, check);
  res.status(201).json({ success: true, qualityCheck: check });
});

// Suppliers API
app.get('/api/suppliers', requireAuth, (req, res) => {
  const { category, status } = req.query;
  let result = Array.from(suppliers.values());
  if (category) result = result.filter(s => s.category === category);
  if (status) result = result.filter(s => s.status === status);
  res.json({ success: true, count: result.length, suppliers: result });
});

app.get('/api/suppliers/:id', requireAuth, (req, res) => {
  const supplier = suppliers.get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  const materials = Array.from(rawMaterials.values()).filter(m => m.supplierId === supplier.id);
  res.json({ success: true, supplier, materialsSupplied: materials });
});

app.post('/api/suppliers', requireAuth, (req, res) => {
  const supplier = { id: 'SUP' + Date.now(), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  suppliers.set(supplier.id, supplier);
  res.status(201).json({ success: true, supplier });
});

app.patch('/api/suppliers/:id', requireAuth, (req, res) => {
  const supplier = suppliers.get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  const updated = { ...supplier, ...req.body };
  suppliers.set(supplier.id, updated);
  res.json({ success: true, supplier: updated });
});

// Purchase Orders API
app.get('/api/purchase-orders', requireAuth, (req, res) => {
  const { supplierId, status } = req.query;
  let result = Array.from(purchaseOrders.values());
  if (supplierId) result = result.filter(p => p.supplierId === supplierId);
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, purchaseOrders: result });
});

app.post('/api/purchase-orders', requireAuth, (req, res) => {
  const po = { id: 'PUO' + Date.now(), ...req.body, status: 'pending', createdAt: new Date().toISOString() };
  purchaseOrders.set(po.id, po);
  res.status(201).json({ success: true, purchaseOrder: po });
});

app.patch('/api/purchase-orders/:id', requireAuth, (req, res) => {
  const po = purchaseOrders.get(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  const updated = { ...po, ...req.body };
  purchaseOrders.set(po.id, updated);
  res.json({ success: true, purchaseOrder: updated });
});

// Production Planning API
app.get('/api/planning/schedule', requireAuth, (req, res) => {
  const pendingOrders = Array.from(productionOrders.values()).filter(p => p.status === 'pending');
  const workOrdersList = Array.from(workOrders.values());
  const schedule = pendingOrders.map(order => {
    const product = products.get(order.productId);
    const workOrderList = workOrdersList.filter(w => w.productionOrderId === order.id);
    return { ...order, product, workOrders: workOrderList };
  });
  res.json({ success: true, schedule });
});

app.post('/api/planning/schedule', requireAuth, (req, res) => {
  const plan = { id: 'PLAN' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  productionPlans.set(plan.id, plan);
  res.status(201).json({ success: true, plan });
});

// Analytics API
app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const workOrdersList = Array.from(workOrders.values());
  const completedOrders = workOrdersList.filter(w => w.status === 'completed');
  const inProgressOrders = workOrdersList.filter(w => w.status === 'in_progress');
  const pendingOrders = workOrdersList.filter(w => w.status === 'pending');
  const machinesList = Array.from(machines.values());
  const operationalMachines = machinesList.filter(m => m.status === 'operational');
  const materialsList = Array.from(rawMaterials.values());
  const lowStockMaterials = materialsList.filter(m => m.currentStock <= m.minStock);

  res.json({
    success: true,
    overview: {
      totalProducts: products.size,
      totalWorkOrders: workOrdersList.length,
      completedOrders: completedOrders.length,
      inProgressOrders: inProgressOrders.length,
      pendingOrders: pendingOrders.length,
      totalMachines: machinesList.length,
      operationalMachines: operationalMachines.length,
      utilizationRate: operationalMachines.length > 0 ? Math.round((operationalMachines.length / machinesList.length) * 100) : 0,
      totalMaterials: materialsList.length,
      lowStockMaterials: lowStockMaterials.length,
      totalSuppliers: suppliers.size,
      qualityPassRate: qualityChecks.size > 0 ? Math.round((qualityChecks.values().filter(q => q.result === 'passed').length / qualityChecks.size) * 100) : 100
    }
  });
});

app.get('/api/analytics/production', requireAuth, (req, res) => {
  const workOrdersList = Array.from(workOrders.values());
  const byStatus = {
    completed: workOrdersList.filter(w => w.status === 'completed'),
    in_progress: workOrdersList.filter(w => w.status === 'in_progress'),
    pending: workOrdersList.filter(w => w.status === 'pending'),
    on_hold: workOrdersList.filter(w => w.status === 'on_hold')
  };

  const byProduct = {};
  workOrdersList.forEach(wo => {
    if (!byProduct[wo.productId]) byProduct[wo.productId] = [];
    byProduct[wo.productId].push(wo);
  });

  const productStats = Object.keys(byProduct).map(pid => {
    const product = products.get(pid);
    const orders = byProduct[pid];
    return {
      productId: pid,
      name: product?.name,
      totalOrders: orders.length,
      completed: orders.filter(o => o.status === 'completed').length,
      totalQuantity: orders.reduce((sum, o) => sum + o.quantity, 0)
    };
  });

  res.json({ success: true, byStatus, byProduct: productStats });
});

app.get('/api/analytics/machines', requireAuth, (req, res) => {
  const machinesList = Array.from(machines.values());
  const machineStats = machinesList.map(m => {
    const assignedWorkOrders = Array.from(workOrders.values()).filter(w => w.machineId === m.id);
    return {
      ...m,
      totalAssignments: assignedWorkOrders.length,
      completedAssignments: assignedWorkOrders.filter(w => w.status === 'completed').length
    };
  }).sort((a, b) => b.utilizationRate - a.utilizationRate);

  res.json({ success: true, machines: machineStats });
});

// RTMN Layer Integrations
app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence',
    capabilities: ['AI Production Planner', 'Demand Forecasting', 'Predictive Maintenance', 'Quality Prediction'],
    status: 'available'
  });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    capabilities: ['Lead Generation', 'Order Tracking', 'Customer Portal', 'CRM'],
    status: 'available'
  });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    capabilities: ['Procurement', 'Supplier Management', 'Purchase Orders', 'Inventory'],
    status: 'available'
  });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({
    layer: 4,
    name: 'Finance',
    capabilities: ['Cost Tracking', 'Production Costs', 'Supplier Payments', 'Budgeting'],
    status: 'available'
  });
});

app.get('/api/layer/supply-chain', requireAuth, (req, res) => {
  res.json({
    layer: 7,
    name: 'Supply Chain',
    capabilities: ['Inventory Management', 'Logistics', 'Warehouse', 'Shipping'],
    status: 'available'
  });
});

app.get('/api/layers', requireAuth, (req, res) => {
  res.json({ industry: INDUSTRY, service: 'Manufacturing OS', layers: 15, version: '2.0.0' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Manufacturing OS',
    version: '2.0.0',
    port: PORT,
    industry: 'Manufacturing',
    timestamp: new Date().toISOString(),
    stats: {
      products: products.size,
      workOrders: workOrders.size,
      machines: machines.size,
      suppliers: suppliers.size,
      rawMaterials: rawMaterials.size
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║               MANUFACTURING OS v2.0.0               ║
║           Complete Manufacturing Management         ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Features:                                             ║
║  • Product & BOM Management                          ║
║  • Production Orders                                 ║
║  • Work Orders & Routing                             ║
║  • Machine/Equipment Management                      ║
║  • Raw Material Inventory                            ║
║  • Finished Goods Inventory                          ║
║  • Quality Control                                   ║
║  • Supplier Management                               ║
║  • Production Planning                               ║
║  • Analytics & Reporting                             ║
╚══════════════════════════════════════════════════════════╝`);
});
