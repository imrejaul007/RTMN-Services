/**
 * Predictive Maintenance OS (5310)
 * IoT Equipment Health Monitoring and Predictive Analytics
 */

const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 5310;
const SERVICE_NAME = 'predictive-maintenance-os';

// Middleware
app.use(express.json());

// In-memory store
const store = {
  devices: new Map(),
  sensors: new Map(),
  readings: new Map(),
  predictions: new Map(),
  maintenance: new Map(),
  alerts: new Map(),
  workOrders: new Map()
};

// Initialize sample data
function initializeSampleData() {
  // Equipment categories
  const categories = ['HVAC', 'Plumbing', 'Electrical', 'Elevator', 'Generator', 'Security', 'Pool', 'Kitchen'];

  // Sample devices
  const devices = [
    {
      id: 'dev_001', category: 'HVAC', name: 'AC Unit - Floor 1', location: 'Building A - Floor 1',
      model: 'Carrier 50Ton', installDate: '2023-01-15', status: 'operational',
      healthScore: 92, mtbf: 8760, age: 520, lastMaintenance: '2024-06-01'
    },
    {
      id: 'dev_002', category: 'HVAC', name: 'Chiller Unit', location: 'Rooftop',
      model: 'Trane CVHE', installDate: '2022-06-20', status: 'warning',
      healthScore: 68, mtbf: 8760, age: 730, lastMaintenance: '2024-03-15'
    },
    {
      id: 'dev_003', category: 'Elevator', name: 'Guest Elevator 1', location: 'Lobby A',
      model: 'Otis Gen2', installDate: '2021-03-10', status: 'operational',
      healthScore: 88, mtbf: 17520, age: 945, lastMaintenance: '2024-05-20'
    },
    {
      id: 'dev_004', category: 'Elevator', name: 'Service Elevator', location: 'Service Area',
      model: 'Kone MonoSpace', installDate: '2020-08-25', status: 'critical',
      healthScore: 35, mtbf: 17520, age: 1060, lastMaintenance: '2024-01-10'
    },
    {
      id: 'dev_005', category: 'Generator', name: 'Backup Generator', location: 'Basement',
      model: 'Caterpillar 500kW', installDate: '2019-12-01', status: 'operational',
      healthScore: 78, mtbf: 8760, age: 1180, lastMaintenance: '2024-04-01'
    },
    {
      id: 'dev_006', category: 'Plumbing', name: 'Water Heater Bank', location: 'Utility Room',
      model: 'A.O. Smith 200Gal', installDate: '2022-02-14', status: 'operational',
      healthScore: 95, mtbf: 43800, age: 560, lastMaintenance: '2024-06-10'
    },
    {
      id: 'dev_007', category: 'Pool', name: 'Pool Pump System', location: 'Pool Area',
      model: 'Pentair Intelliflo', installDate: '2023-05-01', status: 'warning',
      healthScore: 65, mtbf: 8760, age: 415, lastMaintenance: '2024-02-28'
    },
    {
      id: 'dev_008', category: 'Kitchen', name: 'Walk-in Cooler', location: 'Kitchen',
      model: 'Heatcraft RC', installDate: '2021-11-20', status: 'operational',
      healthScore: 85, mtbf: 8760, age: 820, lastMaintenance: '2024-05-15'
    }
  ];
  devices.forEach(d => store.devices.set(d.id, d));

  // Sample sensors
  const sensors = [
    { id: 'sens_001', deviceId: 'dev_001', type: 'temperature', unit: '°F', normalMin: 65, normalMax: 75 },
    { id: 'sens_002', deviceId: 'dev_001', type: 'vibration', unit: 'mm/s', normalMin: 0, normalMax: 4.5 },
    { id: 'sens_003', deviceId: 'dev_002', type: 'pressure', unit: 'PSI', normalMin: 150, normalMax: 200 },
    { id: 'sens_004', deviceId: 'dev_002', type: 'temperature', unit: '°F', normalMin: 40, normalMax: 55 },
    { id: 'sens_005', deviceId: 'dev_003', type: 'vibration', unit: 'mm/s', normalMin: 0, normalMax: 2.5 },
    { id: 'sens_006', deviceId: 'dev_004', type: 'vibration', unit: 'mm/s', normalMin: 0, normalMax: 2.5 },
    { id: 'sens_007', deviceId: 'dev_004', type: 'temperature', unit: '°F', normalMin: 32, normalMax: 120 },
    { id: 'sens_008', deviceId: 'dev_005', type: 'runtime', unit: 'hours', normalMin: 0, normalMax: 500 },
    { id: 'sens_009', deviceId: 'dev_007', type: 'flow', unit: 'GPM', normalMin: 80, normalMax: 120 },
    { id: 'sens_010', deviceId: 'dev_008', type: 'temperature', unit: '°F', normalMin: 33, normalMax: 40 }
  ];
  sensors.forEach(s => store.sensors.set(s.id, s));

  // Sample readings
  const readings = [
    { id: 'read_001', sensorId: 'sens_001', value: 71.5, timestamp: new Date().toISOString() },
    { id: 'read_002', sensorId: 'sens_002', value: 2.1, timestamp: new Date().toISOString() },
    { id: 'read_003', sensorId: 'sens_003', value: 178, timestamp: new Date().toISOString() },
    { id: 'read_004', sensorId: 'sens_004', value: 48, timestamp: new Date().toISOString() },
    { id: 'read_005', sensorId: 'sens_005', value: 1.2, timestamp: new Date().toISOString() },
    { id: 'read_006', sensorId: 'sens_006', value: 4.8, timestamp: new Date().toISOString() },
    { id: 'read_007', sensorId: 'sens_007', value: 135, timestamp: new Date().toISOString() },
    { id: 'read_008', sensorId: 'sens_008', value: 245, timestamp: new Date().toISOString() },
    { id: 'read_009', sensorId: 'sens_009', value: 95, timestamp: new Date().toISOString() },
    { id: 'read_010', sensorId: 'sens_010', value: 37, timestamp: new Date().toISOString() }
  ];
  readings.forEach(r => store.readings.set(r.id, r));

  // Sample predictions
  const predictions = [
    {
      id: 'pred_001', deviceId: 'dev_002', type: 'failure',
      prediction: 'Compressor degradation detected',
      probability: 0.78, timeframe: '14 days', confidence: 'high',
      recommendation: 'Schedule compressor inspection within 2 weeks',
      createdAt: new Date().toISOString()
    },
    {
      id: 'pred_002', deviceId: 'dev_004', type: 'failure',
      prediction: 'Motor winding failure imminent',
      probability: 0.92, timeframe: '3 days', confidence: 'critical',
      recommendation: 'URGENT: Replace motor before complete failure',
      createdAt: new Date().toISOString()
    },
    {
      id: 'pred_003', deviceId: 'dev_007', type: 'maintenance',
      prediction: 'Seal wear detected',
      probability: 0.65, timeframe: '30 days', confidence: 'medium',
      recommendation: 'Plan seal replacement during next service window',
      createdAt: new Date().toISOString()
    }
  ];
  predictions.forEach(p => store.predictions.set(p.id, p));

  // Sample work orders
  const workOrders = [
    {
      id: 'wo_001', deviceId: 'dev_002', type: 'preventive',
      description: 'Chiller inspection and filter replacement',
      priority: 'medium', status: 'scheduled',
      scheduledDate: '2024-07-15', estimatedHours: 4,
      assignedTo: 'HVAC Team', createdAt: new Date().toISOString()
    },
    {
      id: 'wo_002', deviceId: 'dev_004', type: 'emergency',
      description: 'Elevator motor replacement',
      priority: 'critical', status: 'in_progress',
      scheduledDate: '2024-06-20', estimatedHours: 8,
      assignedTo: 'Otis Service', createdAt: new Date().toISOString()
    },
    {
      id: 'wo_003', deviceId: 'dev_007', type: 'corrective',
      description: 'Pool pump seal replacement',
      priority: 'low', status: 'pending',
      scheduledDate: '2024-07-01', estimatedHours: 2,
      assignedTo: 'Pool Tech', createdAt: new Date().toISOString()
    }
  ];
  workOrders.forEach(w => store.workOrders.set(w.id, w));

  console.log(`✅ Predictive Maintenance initialized with ${devices.length} devices`);
}

// Health check
app.get('/health', (req, res) => {
  const devices = Array.from(store.devices.values());
  const critical = devices.filter(d => d.status === 'critical').length;
  const warning = devices.filter(d => d.status === 'warning').length;

  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    capabilities: ['Equipment Monitoring', 'Predictive Analytics', 'Sensor Integration', 'Work Order Management', 'Failure Prevention'],
    stats: {
      totalDevices: devices.length,
      criticalDevices: critical,
      warningDevices: warning,
      activePredictions: store.predictions.size,
      openWorkOrders: store.workOrders.size
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== DEVICES ====================

// Get all devices
app.get('/api/devices', (req, res) => {
  const { category, status, minHealth } = req.query;

  let devices = Array.from(store.devices.values());

  if (category) devices = devices.filter(d => d.category === category);
  if (status) devices = devices.filter(d => d.status === status);
  if (minHealth) devices = devices.filter(d => d.healthScore >= parseFloat(minHealth));

  res.json({ success: true, devices, total: devices.length });
});

// Get device by ID
app.get('/api/devices/:id', (req, res) => {
  const device = store.devices.get(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  const sensors = Array.from(store.sensors.values()).filter(s => s.deviceId === req.params.id);
  const predictions = Array.from(store.predictions.values()).filter(p => p.deviceId === req.params.id);
  const workOrders = Array.from(store.workOrders.values()).filter(w => w.deviceId === req.params.id);

  res.json({ success: true, device, sensors, predictions, workOrders });
});

// Update device
app.put('/api/devices/:id', (req, res) => {
  const device = store.devices.get(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }

  Object.assign(device, req.body);
  store.devices.set(req.params.id, device);

  res.json({ success: true, device });
});

// ==================== SENSORS ====================

// Get sensors
app.get('/api/sensors', (req, res) => {
  const { deviceId, type } = req.query;

  let sensors = Array.from(store.sensors.values());

  if (deviceId) sensors = sensors.filter(s => s.deviceId === deviceId);
  if (type) sensors = sensors.filter(s => s.type === type);

  res.json({ success: true, sensors });
});

// Get sensor readings
app.get('/api/sensors/:id/readings', (req, res) => {
  const sensor = store.sensors.get(req.params.id);
  if (!sensor) {
    return res.status(404).json({ success: false, error: 'Sensor not found' });
  }

  const { limit = 100 } = req.query;
  const readings = Array.from(store.readings.values())
    .filter(r => r.sensorId === req.params.id)
    .slice(-parseInt(limit));

  res.json({ success: true, sensor, readings, total: readings.length });
});

// Submit reading
app.post('/api/sensors/:id/readings', (req, res) => {
  const sensor = store.sensors.get(req.params.id);
  if (!sensor) {
    return res.status(404).json({ success: false, error: 'Sensor not found' });
  }

  const { value } = req.body;
  if (value === undefined) {
    return res.status(400).json({ success: false, error: 'Value required' });
  }

  const reading = {
    id: `read_${Date.now()}`,
    sensorId: req.params.id,
    value: parseFloat(value),
    status: value >= sensor.normalMin && value <= sensor.normalMax ? 'normal' : 'anomaly',
    timestamp: new Date().toISOString()
  };

  store.readings.set(reading.id, reading);

  // Check for anomalies
  if (reading.status === 'anomaly') {
    createAnomalyAlert(sensor, reading);
  }

  res.status(201).json({ success: true, reading });
});

// ==================== PREDICTIONS ====================

// Get predictions
app.get('/api/predictions', (req, res) => {
  const { deviceId, type, minProbability } = req.query;

  let predictions = Array.from(store.predictions.values());

  if (deviceId) predictions = predictions.filter(p => p.deviceId === deviceId);
  if (type) predictions = predictions.filter(p => p.type === type);
  if (minProbability) predictions = predictions.filter(p => p.probability >= parseFloat(minProbability));

  predictions.sort((a, b) => b.probability - a.probability);

  res.json({ success: true, predictions });
});

// Get prediction by ID
app.get('/api/predictions/:id', (req, res) => {
  const prediction = store.predictions.get(req.params.id);
  if (!prediction) {
    return res.status(404).json({ success: false, error: 'Prediction not found' });
  }

  const device = store.devices.get(prediction.deviceId);
  res.json({ success: true, prediction, device });
});

// Create prediction
app.post('/api/predictions', (req, res) => {
  const { deviceId, type, prediction, probability, timeframe, recommendation } = req.body;

  if (!deviceId || !prediction) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const confidence = probability >= 0.8 ? 'high' : probability >= 0.6 ? 'medium' : 'low';

  const newPrediction = {
    id: `pred_${Date.now()}`,
    deviceId,
    type: type || 'failure',
    prediction,
    probability: probability || 0.5,
    timeframe: timeframe || 'unknown',
    confidence,
    recommendation: recommendation || 'Monitor device',
    createdAt: new Date().toISOString()
  };

  store.predictions.set(newPrediction.id, newPrediction);

  // Update device health based on prediction
  const device = store.devices.get(deviceId);
  if (device && probability > 0.7) {
    device.healthScore = Math.max(10, device.healthScore - (probability * 20));
    device.status = probability > 0.85 ? 'critical' : 'warning';
    store.devices.set(deviceId, device);
  }

  res.status(201).json({ success: true, prediction: newPrediction });
});

// ==================== WORK ORDERS ====================

// Get work orders
app.get('/api/work-orders', (req, res) => {
  const { deviceId, status, priority, type } = req.query;

  let workOrders = Array.from(store.workOrders.values());

  if (deviceId) workOrders = workOrders.filter(w => w.deviceId === deviceId);
  if (status) workOrders = workOrders.filter(w => w.status === status);
  if (priority) workOrders = workOrders.filter(w => w.priority === priority);
  if (type) workOrders = workOrders.filter(w => w.type === type);

  workOrders.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  res.json({ success: true, workOrders });
});

// Create work order
app.post('/api/work-orders', (req, res) => {
  const { deviceId, type, description, priority, scheduledDate, estimatedHours, assignedTo } = req.body;

  if (!deviceId || !description) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const workOrder = {
    id: `wo_${Date.now()}`,
    deviceId,
    type: type || 'corrective',
    description,
    priority: priority || 'medium',
    status: 'pending',
    scheduledDate,
    estimatedHours: estimatedHours || 1,
    assignedTo: assignedTo || 'Unassigned',
    createdAt: new Date().toISOString()
  };

  store.workOrders.set(workOrder.id, workOrder);
  res.status(201).json({ success: true, workOrder });
});

// Update work order
app.put('/api/work-orders/:id', (req, res) => {
  const workOrder = store.workOrders.get(req.params.id);
  if (!workOrder) {
    return res.status(404).json({ success: false, error: 'Work order not found' });
  }

  Object.assign(workOrder, req.body, { updatedAt: new Date().toISOString() });
  store.workOrders.set(req.params.id, workOrder);

  // If completed, update device health
  if (workOrder.status === 'completed') {
    const device = store.devices.get(workOrder.deviceId);
    if (device) {
      device.healthScore = Math.min(100, device.healthScore + 10);
      device.lastMaintenance = new Date().toISOString().split('T')[0];
      if (device.healthScore > 70) device.status = 'operational';
      store.devices.set(workOrder.deviceId, device);
    }
  }

  res.json({ success: true, workOrder });
});

// ==================== ALERTS ====================

// Get alerts
app.get('/api/alerts', (req, res) => {
  const { severity, status } = req.query;

  let alerts = Array.from(store.alerts.values());

  if (severity) alerts = alerts.filter(a => a.severity === severity);
  if (status) alerts = alerts.filter(a => a.status === status);

  res.json({ success: true, alerts });
});

// Helper to create anomaly alert
function createAnomalyAlert(sensor, reading) {
  const device = store.devices.get(sensor.deviceId);
  const alert = {
    id: `alert_${Date.now()}`,
    deviceId: sensor.deviceId,
    sensorId: sensor.id,
    type: 'sensor_anomaly',
    severity: 'warning',
    message: `${sensor.type} reading ${reading.value}${sensor.unit} is outside normal range (${sensor.normalMin}-${sensor.normalMax}${sensor.unit})`,
    deviceName: device ? device.name : 'Unknown',
    status: 'open',
    createdAt: new Date().toISOString()
  };

  store.alerts.set(alert.id, alert);
  return alert;
}

// ==================== ANALYTICS ====================

// Dashboard
app.get('/api/dashboard', (req, res) => {
  const devices = Array.from(store.devices.values());
  const predictions = Array.from(store.predictions.values());
  const workOrders = Array.from(store.workOrders.values());
  const alerts = Array.from(store.alerts.values());

  const byCategory = devices.reduce((acc, d) => {
    acc[d.category] = acc[d.category] || { total: 0, critical: 0, warning: 0, avgHealth: 0 };
    acc[d.category].total++;
    if (d.status === 'critical') acc[d.category].critical++;
    if (d.status === 'warning') acc[d.category].warning++;
    acc[d.category].avgHealth += d.healthScore;
    return acc;
  }, {});

  Object.keys(byCategory).forEach(cat => {
    byCategory[cat].avgHealth = Math.round(byCategory[cat].avgHealth / byCategory[cat].total);
  });

  const criticalPredictions = predictions.filter(p => p.probability > 0.7);
  const openAlerts = alerts.filter(a => a.status === 'open');
  const pendingWorkOrders = workOrders.filter(w => w.status === 'pending' || w.status === 'scheduled');

  res.json({
    success: true,
    dashboard: {
      overview: {
        totalDevices: devices.length,
        operational: devices.filter(d => d.status === 'operational').length,
        warning: devices.filter(d => d.status === 'warning').length,
        critical: devices.filter(d => d.status === 'critical').length,
        avgHealthScore: Math.round(devices.reduce((sum, d) => sum + d.healthScore, 0) / devices.length)
      },
      predictions: {
        total: predictions.length,
        highRisk: criticalPredictions.length,
        items: criticalPredictions.slice(0, 5)
      },
      workOrders: {
        total: workOrders.length,
        open: pendingWorkOrders.length,
        critical: workOrders.filter(w => w.priority === 'critical' && w.status !== 'completed').length
      },
      alerts: {
        total: alerts.length,
        open: openAlerts.length,
        critical: openAlerts.filter(a => a.severity === 'critical').length
      },
      byCategory
    }
  });
});

// Health trends
app.get('/api/analytics/health-trends', (req, res) => {
  const devices = Array.from(store.devices.values());

  // Generate sample trend data
  const days = 30;
  const trends = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));

    trends.push({
      date: date.toISOString().split('T')[0],
      avgHealth: 75 + Math.random() * 10,
      criticalCount: Math.floor(Math.random() * 3),
      warningCount: Math.floor(Math.random() * 5),
      predictions: Math.floor(Math.random() * 4)
    });
  }

  res.json({ success: true, trends });
});

// Maintenance analytics
app.get('/api/analytics/maintenance', (req, res) => {
  const workOrders = Array.from(store.workOrders.values());
  const devices = Array.from(store.devices.values());

  const byType = workOrders.reduce((acc, wo) => {
    acc[wo.type] = (acc[wo.type] || 0) + 1;
    return acc;
  }, {});

  const byStatus = workOrders.reduce((acc, wo) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1;
    return acc;
  }, {});

  const totalHours = workOrders.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);

  res.json({
    success: true,
    maintenance: {
      totalWorkOrders: workOrders.length,
      byType,
      byStatus,
      totalEstimatedHours: totalHours,
      avgHealthByAge: {
        under1Year: Math.round(devices.filter(d => d.age < 365).reduce((sum, d) => sum + d.healthScore, 0) / Math.max(1, devices.filter(d => d.age < 365).length)),
        '1to2Years': Math.round(devices.filter(d => d.age >= 365 && d.age < 730).reduce((sum, d) => sum + d.healthScore, 0) / Math.max(1, devices.filter(d => d.age >= 365 && d.age < 730).length)),
        over2Years: Math.round(devices.filter(d => d.age >= 730).reduce((sum, d) => sum + d.healthScore, 0) / Math.max(1, devices.filter(d => d.age >= 730).length))
      }
    }
  });
});

// ==================== RTMN INTEGRATIONS ====================

async function connectToEnergyOS() {
  try {
    await axios.get('http://localhost:5260/health', { timeout: 2000 });
    console.log('✅ Connected to Energy OS (5260)');
    return true;
  } catch {
    console.log('⚠️ Energy OS not available');
    return false;
  }
}

async function connectToOperationsOS() {
  try {
    await axios.get('http://localhost:5250/health', { timeout: 2000 });
    console.log('✅ Connected to Operations OS (5250)');
    return true;
  } catch {
    console.log('⚠️ Operations OS not available');
    return false;
  }
}

// Start server
initializeSampleData();

app.listen(PORT, async () => {
  console.log(`\n🔧 Predictive Maintenance OS started on port ${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await connectToEnergyOS();
  await connectToOperationsOS();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔩 ${store.devices.size} devices monitored`);
  console.log('🎯 Available endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/devices');
  console.log('   GET  /api/sensors');
  console.log('   GET  /api/predictions');
  console.log('   GET  /api/work-orders');
  console.log('   GET  /api/dashboard');
  console.log('   GET  /api/analytics/*');
});
