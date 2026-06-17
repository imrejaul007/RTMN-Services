/**
 * StayOwn Maintenance Service
 *
 * Hotel maintenance and work order management system
 *
 * Features:
 * - Work order management
 * - Preventive maintenance scheduling
 * - Asset management
 * - Equipment lifecycle tracking
 * - Technician assignment
 * - SLA tracking
 *
 * Port: 6050
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 6050;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// DATA STORES
// ============================================

// Work orders
const workOrders = new Map();

// Assets (equipment, furniture, fixtures)
const assets = new Map();

// Preventive maintenance schedules
const maintenanceSchedules = new Map();

// Technicians / Staff
const technicians = new Map();

// Spare parts inventory
const spareParts = new Map();

// Compliance logs
const complianceLogs = new Map();

// SLAs
const slaConfigs = new Map();

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
  const { businessId, email, password, role } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: role || 'maintenance_admin',
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, role: user.role });
  res.json({ token, user: { id: user.id, email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId: user.businessId, role: user.role });
  res.json({ token, user: { id: user.id, email, role: user.role } });
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
// WORK ORDERS
// ============================================

// Create work order
app.post('/api/work-orders', requireAuth, (req, res) => {
  const { title, description, priority, category, location, roomId, assetId, guestImpact, dueDate, estimatedHours } = req.body;

  if (!title || !category || !location) {
    return res.status(400).json({ error: 'title, category, location required' });
  }

  const businessId = req.session.businessId;
  const workOrderId = 'wo_' + Date.now();

  // Get SLA based on category and priority
  const sla = getSLA(category, priority);

  const workOrder = {
    id: workOrderId,
    businessId,
    title,
    description,
    priority: priority || 'medium', // critical, high, medium, low
    category, // plumbing, electrical, hvac, furniture, general, etc.
    location,
    roomId,
    assetId,
    guestImpact: guestImpact || 'none', // none, minor, major
    status: 'open', // open, assigned, in_progress, on_hold, completed, cancelled
    assignedTo: null,
    dueDate,
    estimatedHours,
    actualHours: 0,
    sla,
    slaDeadline: calculateSLADeadline(sla),
    notes: [],
    attachments: [],
    partsUsed: [],
    createdBy: req.session.email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  workOrders.set(workOrderId, workOrder);

  // Create compliance log
  logCompliance(businessId, 'work_order_created', workOrderId);

  res.status(201).json(workOrder);
});

// Get work orders
app.get('/api/work-orders', requireAuth, (req, res) => {
  const { status, priority, category, assignedTo, roomId, fromDate, toDate } = req.query;
  const businessId = req.session.businessId;

  let orders = Array.from(workOrders.values())
    .filter(w => w.businessId === businessId);

  if (status) orders = orders.filter(w => w.status === status);
  if (priority) orders = orders.filter(w => w.priority === priority);
  if (category) orders = orders.filter(w => w.category === category);
  if (assignedTo) orders = orders.filter(w => w.assignedTo === assignedTo);
  if (roomId) orders = orders.filter(w => w.roomId === roomId);

  // Sort by priority and due date
  orders.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(a.slaDeadline) - new Date(b.slaDeadline);
  });

  res.json({ workOrders: orders, count: orders.length });
});

// Get single work order
app.get('/api/work-orders/:id', requireAuth, (req, res) => {
  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) {
    return res.status(404).json({ error: 'Work order not found' });
  }
  res.json(workOrder);
});

// Update work order
app.patch('/api/work-orders/:id', requireAuth, (req, res) => {
  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  const allowedUpdates = ['title', 'description', 'priority', 'category', 'location', 'roomId', 'assetId', 'guestImpact', 'dueDate', 'estimatedHours', 'status', 'actualHours'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      workOrder[field] = req.body[field];
    }
  });

  workOrder.updatedAt = new Date().toISOString();
  workOrders.set(workOrder.id, workOrder);

  // Log compliance
  logCompliance(workOrder.businessId, 'work_order_updated', workOrder.id);

  res.json(workOrder);
});

// Assign work order
app.post('/api/work-orders/:id/assign', requireAuth, (req, res) => {
  const { technicianId } = req.body;
  if (!technicianId) {
    return res.status(400).json({ error: 'technicianId required' });
  }

  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  const technician = technicians.get(technicianId);
  if (!technician) {
    return res.status(404).json({ error: 'Technician not found' });
  }

  workOrder.assignedTo = technicianId;
  workOrder.assignedToName = technician.name;
  workOrder.status = 'assigned';
  workOrder.assignedAt = new Date().toISOString();
  workOrder.updatedAt = new Date().toISOString();

  workOrders.set(workOrder.id, workOrder);

  logCompliance(workOrder.businessId, 'work_order_assigned', workOrder.id, { technicianId });

  res.json(workOrder);
});

// Start work
app.post('/api/work-orders/:id/start', requireAuth, (req, res) => {
  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  if (workOrder.status === 'in_progress') {
    return res.status(409).json({ error: 'Work already in progress' });
  }

  workOrder.status = 'in_progress';
  workOrder.startedAt = new Date().toISOString();
  workOrder.updatedAt = new Date().toISOString();

  workOrders.set(workOrder.id, workOrder);

  res.json(workOrder);
});

// Complete work order
app.post('/api/work-orders/:id/complete', requireAuth, (req, res) => {
  const { resolution, partsUsed, actualHours, signature } = req.body;

  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  workOrder.status = 'completed';
  workOrder.resolution = resolution;
  workOrder.actualHours = actualHours || workOrder.actualHours;
  workOrder.completedAt = new Date().toISOString();
  workOrder.completedBy = req.session.email;
  workOrder.updatedAt = new Date().toISOString();

  // Track parts used
  if (partsUsed && partsUsed.length > 0) {
    workOrder.partsUsed = partsUsed;
    partsUsed.forEach(part => {
      const inventory = spareParts.get(part.partId);
      if (inventory) {
        inventory.quantity -= part.quantityUsed;
        spareParts.set(part.partId, inventory);
      }
    });
  }

  // Check SLA compliance
  const slaMet = new Date(workOrder.completedAt) <= new Date(workOrder.slaDeadline);
  workOrder.slaMet = slaMet;

  workOrders.set(workOrder.id, workOrder);

  // Update asset if linked
  if (workOrder.assetId) {
    const asset = assets.get(workOrder.assetId);
    if (asset) {
      asset.lastMaintenance = new Date().toISOString();
      asset.maintenanceHistory = asset.maintenanceHistory || [];
      asset.maintenanceHistory.push({
        workOrderId: workOrder.id,
        date: new Date().toISOString(),
        type: 'repair',
        resolution
      });
      assets.set(asset.id, asset);
    }
  }

  logCompliance(workOrder.businessId, 'work_order_completed', workOrder.id, { slaMet, actualHours });

  res.json(workOrder);
});

// Cancel work order
app.post('/api/work-orders/:id/cancel', requireAuth, (req, res) => {
  const { reason } = req.body;

  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  workOrder.status = 'cancelled';
  workOrder.cancellationReason = reason;
  workOrder.cancelledAt = new Date().toISOString();
  workOrder.cancelledBy = req.session.email;
  workOrder.updatedAt = new Date().toISOString();

  workOrders.set(workOrder.id, workOrder);

  res.json(workOrder);
});

// Add note to work order
app.post('/api/work-orders/:id/notes', requireAuth, (req, res) => {
  const { note } = req.body;
  if (!note) {
    return res.status(400).json({ error: 'note required' });
  }

  const workOrder = workOrders.get(req.params.id);
  if (!workOrder) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  workOrder.notes.push({
    id: 'note_' + Date.now(),
    text: note,
    addedBy: req.session.email,
    addedAt: new Date().toISOString()
  });
  workOrder.updatedAt = new Date().toISOString();

  workOrders.set(workOrder.id, workOrder);
  res.json(workOrder);
});

// ============================================
// ASSETS
// ============================================

// Create asset
app.post('/api/assets', requireAuth, (req, res) => {
  const { name, type, category, location, roomId, serialNumber, manufacturer, model, purchaseDate, warrantyExpiry, usefulLife } = req.body;

  if (!name || !category || !location) {
    return res.status(400).json({ error: 'name, category, location required' });
  }

  const businessId = req.session.businessId;
  const assetId = 'asset_' + Date.now();

  const asset = {
    id: assetId,
    businessId,
    name,
    type: type || 'equipment', // equipment, furniture, fixture, system
    category, // hvac, plumbing, electrical, furniture, it, kitchen, etc.
    location,
    roomId,
    serialNumber,
    manufacturer,
    model,
    purchaseDate,
    warrantyExpiry,
    usefulLife, // in months
    status: 'operational', // operational, under_repair, out_of_service, disposed
    condition: 'good', // excellent, good, fair, poor
    depreciationRate: 0, // percentage per year
    currentValue: req.body.currentValue || 0,
    lastMaintenance: null,
    maintenanceHistory: [],
    nextPreventiveMaintenance: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Calculate next preventive maintenance if schedule exists
  const schedule = getPreventiveSchedule(asset.category);
  if (schedule) {
    asset.nextPreventiveMaintenance = calculateNextPM(new Date(), schedule.frequencyDays);
  }

  assets.set(assetId, asset);
  res.status(201).json(asset);
});

// Get assets
app.get('/api/assets', requireAuth, (req, res) => {
  const { status, category, location, roomId } = req.query;
  const businessId = req.session.businessId;

  let assetList = Array.from(assets.values())
    .filter(a => a.businessId === businessId);

  if (status) assetList = assetList.filter(a => a.status === status);
  if (category) assetList = assetList.filter(a => a.category === category);
  if (location) assetList = assetList.filter(a => a.location === location);
  if (roomId) assetList = assetList.filter(a => a.roomId === roomId);

  res.json({ assets: assetList, count: assetList.length });
});

// Get single asset
app.get('/api/assets/:id', requireAuth, (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json(asset);
});

// Update asset
app.patch('/api/assets/:id', requireAuth, (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  Object.assign(asset, req.body);
  asset.updatedAt = new Date().toISOString();
  assets.set(asset.id, asset);

  res.json(asset);
});

// Mark asset for disposal
app.post('/api/assets/:id/dispose', requireAuth, (req, res) => {
  const { reason, disposalMethod, disposalDate } = req.body;

  const asset = assets.get(req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  asset.status = 'disposed';
  asset.disposal = { reason, method: disposalMethod, date: disposalDate || new Date().toISOString() };
  asset.updatedAt = new Date().toISOString();

  assets.set(asset.id, asset);
  logCompliance(asset.businessId, 'asset_disposed', asset.id);

  res.json(asset);
});

// ============================================
// PREVENTIVE MAINTENANCE SCHEDULES
// ============================================

// Get PM schedules
app.get('/api/preventive-maintenance', requireAuth, (req, res) => {
  const { category, due } = req.query;
  const businessId = req.session.businessId;

  let schedules = Array.from(maintenanceSchedules.values())
    .filter(s => s.businessId === businessId);

  if (category) schedules = schedules.filter(s => s.category === category);

  // Filter by due date
  if (due === 'overdue') {
    schedules = schedules.filter(s => new Date(s.nextDue) < new Date());
  } else if (due === 'upcoming') {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    schedules = schedules.filter(s => new Date(s.nextDue) >= today && new Date(s.nextDue) <= nextWeek);
  }

  res.json({ schedules, count: schedules.length });
});

// Create PM schedule
app.post('/api/preventive-maintenance', requireAuth, (req, res) => {
  const { name, category, assetIds, frequencyDays, tasks, estimatedHours, assignedTo } = req.body;

  if (!name || !category || !frequencyDays) {
    return res.status(400).json({ error: 'name, category, frequencyDays required' });
  }

  const businessId = req.session.businessId;
  const scheduleId = 'pm_' + Date.now();

  const schedule = {
    id: scheduleId,
    businessId,
    name,
    category,
    assetIds: assetIds || [],
    frequencyDays,
    tasks,
    estimatedHours,
    assignedTo,
    lastCompleted: null,
    nextDue: calculateNextPM(new Date(), frequencyDays),
    status: 'active',
    createdAt: new Date().toISOString()
  };

  maintenanceSchedules.set(scheduleId, schedule);

  // Update assets with next PM date
  if (assetIds && assetIds.length > 0) {
    assetIds.forEach(assetId => {
      const asset = assets.get(assetId);
      if (asset) {
        asset.nextPreventiveMaintenance = schedule.nextDue;
        assets.set(asset.id, asset);
      }
    });
  }

  res.status(201).json(schedule);
});

// Complete PM task
app.post('/api/preventive-maintenance/:id/complete', requireAuth, (req, res) => {
  const { notes, actualHours, partsUsed } = req.body;

  const schedule = maintenanceSchedules.get(req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  schedule.lastCompleted = new Date().toISOString();
  schedule.nextDue = calculateNextPM(new Date(), schedule.frequencyDays);
  schedule.lastNotes = notes;
  schedule.lastActualHours = actualHours;

  maintenanceSchedules.set(schedule.id, schedule);

  // Create work order for next due
  const workOrderId = 'wo_pm_' + Date.now();
  const workOrder = {
    id: workOrderId,
    businessId: schedule.businessId,
    title: `PM: ${schedule.name}`,
    description: `Preventive maintenance task: ${schedule.tasks?.join(', ')}`,
    priority: 'low',
    category: schedule.category,
    location: 'Multiple',
    assetIds: schedule.assetIds,
    status: 'open',
    type: 'preventive',
    assignedTo: schedule.assignedTo,
    estimatedHours: schedule.estimatedHours,
    sla: { responseHours: 72, resolutionHours: 168 },
    slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    createdBy: 'system',
    createdAt: new Date().toISOString()
  };

  workOrders.set(workOrderId, workOrder);

  // Update asset PM dates
  schedule.assetIds?.forEach(assetId => {
    const asset = assets.get(assetId);
    if (asset) {
      asset.lastMaintenance = new Date().toISOString();
      asset.nextPreventiveMaintenance = schedule.nextDue;
      assets.set(asset.id, asset);
    }
  });

  res.json({ schedule, workOrder: workOrderId });
});

// ============================================
// TECHNICIANS
// ============================================

// Create technician
app.post('/api/technicians', requireAuth, (req, res) => {
  const { name, email, phone, specialties, certifications, hourlyRate, availability } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name, email required' });
  }

  const businessId = req.session.businessId;
  const technicianId = 'tech_' + Date.now();

  const technician = {
    id: technicianId,
    businessId,
    name,
    email,
    phone,
    specialties: specialties || [], // plumbing, electrical, hvac, general
    certifications: certifications || [],
    hourlyRate,
    availability: availability || 'full_time', // full_time, part_time, on_call
    status: 'active',
    currentWorkOrders: 0,
    completedWorkOrders: 0,
    avgCompletionTime: 0,
    createdAt: new Date().toISOString()
  };

  technicians.set(technicianId, technician);
  res.status(201).json(technician);
});

// Get technicians
app.get('/api/technicians', requireAuth, (req, res) => {
  const { specialty, status } = req.query;
  const businessId = req.session.businessId;

  let techList = Array.from(technicians.values())
    .filter(t => t.businessId === businessId);

  if (specialty) techList = techList.filter(t => t.specialties.includes(specialty));
  if (status) techList = techList.filter(t => t.status === status);

  res.json({ technicians: techList });
});

// Get single technician
app.get('/api/technicians/:id', requireAuth, (req, res) => {
  const technician = technicians.get(req.params.id);
  if (!technician) {
    return res.status(404).json({ error: 'Technician not found' });
  }

  // Get assigned work orders
  const workOrderList = Array.from(workOrders.values())
    .filter(w => w.assignedTo === req.params.id && ['assigned', 'in_progress'].includes(w.status));

  res.json({ ...technician, currentWorkOrders: workOrderList });
});

// ============================================
// SPARE PARTS
// ============================================

// Create/update spare part
app.post('/api/spare-parts', requireAuth, (req, res) => {
  const { name, partNumber, category, unitCost, quantity, minStock, location, supplier } = req.body;

  const businessId = req.session.businessId;
  const partId = 'part_' + Date.now();

  const part = {
    id: partId,
    businessId,
    name,
    partNumber,
    category,
    unitCost,
    quantity: quantity || 0,
    minStock: minStock || 0,
    location,
    supplier,
    lastRestocked: null,
    createdAt: new Date().toISOString()
  };

  spareParts.set(partId, part);
  res.status(201).json(part);
});

// Get spare parts
app.get('/api/spare-parts', requireAuth, (req, res) => {
  const { category, lowStock } = req.query;
  const businessId = req.session.businessId;

  let parts = Array.from(spareParts.values())
    .filter(p => p.businessId === businessId);

  if (category) parts = parts.filter(p => p.category === category);
  if (lowStock === 'true') {
    parts = parts.filter(p => p.quantity <= p.minStock);
  }

  res.json({ spareParts: parts, count: parts.length });
});

// Update stock
app.patch('/api/spare-parts/:id/stock', requireAuth, (req, res) => {
  const { adjustment, reason } = req.body;

  const part = spareParts.get(req.params.id);
  if (!part) {
    return res.status(404).json({ error: 'Part not found' });
  }

  part.quantity = Math.max(0, part.quantity + adjustment);
  part.lastRestocked = adjustment > 0 ? new Date().toISOString() : part.lastRestocked;

  spareParts.set(part.id, part);
  res.json(part);
});

// ============================================
// ANALYTICS & REPORTS
// ============================================

app.get('/api/analytics', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const orders = Array.from(workOrders.values()).filter(w => w.businessId === businessId);
  const assetList = Array.from(assets.values()).filter(a => a.businessId === businessId);

  const open = orders.filter(w => ['open', 'assigned', 'in_progress'].includes(w.status));
  const completed = orders.filter(w => w.status === 'completed');
  const overdue = open.filter(w => new Date(w.slaDeadline) < new Date());

  res.json({
    workOrders: {
      total: orders.length,
      open: open.length,
      inProgress: orders.filter(w => w.status === 'in_progress').length,
      completed: completed.length,
      overdue: overdue.length,
      avgCompletionTime: calculateAvgCompletion(completed)
    },
    slaCompliance: {
      met: completed.filter(w => w.slaMet).length,
      missed: completed.filter(w => !w.slaMet).length,
      rate: completed.length > 0
        ? ((completed.filter(w => w.slaMet).length / completed.length) * 100).toFixed(1) + '%'
        : 'N/A'
    },
    assets: {
      total: assetList.length,
      operational: assetList.filter(a => a.status === 'operational').length,
      underRepair: assetList.filter(a => a.status === 'under_repair').length,
      outOfService: assetList.filter(a => a.status === 'out_of_service').length
    },
    costs: {
      labor: completed.reduce((sum, w) => sum + (w.actualHours || 0) * 25, 0), // $25/hr default
      parts: completed.reduce((sum, w) => sum + (w.partsUsed || []).reduce((s, p) => s + p.cost, 0), 0)
    }
  });
});

// ============================================
// COMPLIANCE LOGS
// ============================================

app.get('/api/compliance', requireAuth, (req, res) => {
  const { fromDate, toDate, type } = req.query;
  const businessId = req.session.businessId;

  let logs = Array.from(complianceLogs.values())
    .filter(l => l.businessId === businessId);

  if (fromDate) logs = logs.filter(l => l.timestamp >= fromDate);
  if (toDate) logs = logs.filter(l => l.timestamp <= toDate);
  if (type) logs = logs.filter(l => l.type === type);

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ logs, count: logs.length });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'StayOwn Maintenance Service',
    port: PORT,
    workOrders: workOrders.size,
    assets: assets.size,
    technicians: technicians.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getSLA(category, priority) {
  const defaults = {
    plumbing: { responseHours: 1, resolutionHours: 4 },
    electrical: { responseHours: 1, resolutionHours: 4 },
    hvac: { responseHours: 2, resolutionHours: 8 },
    it: { responseHours: 4, resolutionHours: 24 },
    general: { responseHours: 8, resolutionHours: 48 }
  };

  const categorySLA = defaults[category] || defaults.general;
  const priorityMultiplier = { critical: 0.25, high: 0.5, medium: 1, low: 2 };

  return {
    responseHours: Math.round(categorySLA.responseHours * priorityMultiplier[priority]),
    resolutionHours: Math.round(categorySLA.resolutionHours * priorityMultiplier[priority])
  };
}

function calculateSLADeadline(sla) {
  return new Date(Date.now() + sla.resolutionHours * 60 * 60 * 1000).toISOString();
}

function calculateNextPM(lastDate, frequencyDays) {
  return new Date(new Date(lastDate).getTime() + frequencyDays * 24 * 60 * 60 * 1000).toISOString();
}

function getPreventiveSchedule(category) {
  const schedules = {
    hvac: { frequencyDays: 90 },
    plumbing: { frequencyDays: 180 },
    electrical: { frequencyDays: 365 },
    fire_safety: { frequencyDays: 30 }
  };
  return schedules[category];
}

function calculateAvgCompletion(completed) {
  if (completed.length === 0) return 0;
  const total = completed.reduce((sum, w) => {
    const created = new Date(w.createdAt);
    const completed = new Date(w.completedAt);
    return sum + (completed - created) / (1000 * 60 * 60); // hours
  }, 0);
  return (total / completed.length).toFixed(1) + ' hours';
}

function logCompliance(businessId, type, workOrderId, data) {
  const logId = 'log_' + Date.now();
  complianceLogs.set(logId, {
    id: logId,
    businessId,
    type,
    workOrderId,
    data,
    timestamp: new Date().toISOString()
  });
}

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log('🔧 StayOwn Maintenance Service running on port ' + PORT);
  console.log('📋 Work orders | Assets | Preventive maintenance | Technicians');
});
