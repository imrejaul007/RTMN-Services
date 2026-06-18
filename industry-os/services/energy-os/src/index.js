/**
 * RTMN Energy Management OS
 * IoT-based smart energy optimization
 *
 * Port: 5260
 *
 * Features:
 * - Real-time energy monitoring
 * - Room occupancy detection
 * - Smart AC/Lights control
 * - Power analytics
 * - Solar optimization
 * - Carbon dashboard
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5260;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ============================================
// IN-MEMORY DATA STORES
// ============================================

const buildings = new Map();
const floors = new Map();
const rooms = new Map();
const devices = new Map();
const sensors = new Map();
const readings = new Map();
const alerts = new Map();
const savings = new Map();

// Initialize with sample data
function initData() {
  // Buildings
  const buildingsList = [
    { id: 'B001', name: 'Main Building', floors: 5, totalRooms: 100, type: 'hotel' },
    { id: 'B002', name: 'Annex', floors: 3, totalRooms: 50, type: 'hotel' },
    { id: 'B003', name: 'Restaurant Block', floors: 2, totalRooms: 30, type: 'restaurant' },
  ];
  buildingsList.forEach(b => buildings.set(b.id, b));

  // Rooms
  for (let i = 1; i <= 20; i++) {
    const room = {
      id: `R${String(i).padStart(3, '0')}`,
      building: 'B001',
      floor: Math.ceil(i / 10),
      type: i <= 15 ? 'guest' : 'common',
      ac: { on: i % 2 === 0, temp: 24, mode: 'cool' },
      lights: { on: i % 3 === 0, brightness: 100 },
      occupancy: { occupied: i % 2 === 0, lastChange: new Date().toISOString() },
      energy: { current: 2.5 + Math.random() * 2, today: 50 + Math.random() * 30 }
    };
    rooms.set(room.id, room);
  }

  // Devices
  const deviceTypes = ['AC', 'Light', 'TV', 'Fan', 'Heater', 'Solar Panel', 'Generator'];
  for (let i = 1; i <= 30; i++) {
    const device = {
      id: `D${String(i).padStart(3, '0')}`,
      type: deviceTypes[i % deviceTypes.length],
      room: `R${String((i % 20) + 1).padStart(3, '0')}`,
      status: i % 4 !== 0 ? 'online' : 'offline',
      power: 0.5 + Math.random() * 3,
      efficiency: 70 + Math.random() * 30,
      lastMaintenance: '2026-05-15',
      nextMaintenance: '2026-08-15'
    };
    devices.set(device.id, device);
  }

  // Solar panels
  for (let i = 1; i <= 10; i++) {
    const panel = {
      id: `SP${String(i).padStart(2, '0')}`,
      building: 'B001',
      output: 5 + Math.random() * 2,
      efficiency: 85 + Math.random() * 15,
      angle: 30 + Math.random() * 10,
      orientation: 'south',
      status: 'active'
    };
    devices.set(panel.id, panel);
  }

  console.log(`   Buildings: ${buildings.size}`);
  console.log(`   Rooms: ${rooms.size}`);
  console.log(`   Devices: ${devices.size}`);
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'energy-os',
    version: '1.0.0',
    port: PORT,
    capabilities: [
      'Energy Monitoring', 'Occupancy Detection', 'Smart Control',
      'Solar Optimization', 'Carbon Tracking', 'Predictive Maintenance'
    ],
    timestamp: new Date().toISOString()
  });
});

// ============================================
// BUILDINGS API
// ============================================

app.get('/api/buildings', (req, res) => {
  const list = Array.from(buildings.values());
  res.json({ success: true, count: list.length, buildings: list });
});

app.get('/api/buildings/:id', (req, res) => {
  const building = buildings.get(req.params.id);
  if (!building) return res.status(404).json({ error: 'Building not found' });

  // Get rooms for this building
  const buildingRooms = Array.from(rooms.values()).filter(r => r.building === req.params.id);

  res.json({ success: true, building, rooms: buildingRooms });
});

app.post('/api/buildings', (req, res) => {
  const { name, floors, totalRooms, type } = req.body;
  const id = `B${String(buildings.size + 1).padStart(3, '0')}`;
  const building = { id, name, floors, totalRooms, type };
  buildings.set(id, building);
  res.json({ success: true, building });
});

// ============================================
// ROOMS API
// ============================================

app.get('/api/rooms', (req, res) => {
  const { building, floor, type } = req.query;
  let list = Array.from(rooms.values());
  if (building) list = list.filter(r => r.building === building);
  if (floor) list = list.filter(r => r.floor === parseInt(floor));
  if (type) list = list.filter(r => r.type === type);
  res.json({ success: true, count: list.length, rooms: list });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ success: true, room });
});

app.put('/api/rooms/:id/control', (req, res) => {
  const { ac, lights, temperature } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (ac !== undefined) room.ac.on = ac;
  if (lights !== undefined) room.lights.on = lights;
  if (temperature !== undefined) room.ac.temp = temperature;

  rooms.set(req.params.id, room);
  res.json({ success: true, room, action: 'control_updated' });
});

app.post('/api/rooms/:id/occupancy', (req, res) => {
  const { occupied } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  room.occupancy.occupied = occupied;
  room.occupancy.lastChange = new Date().toISOString();

  // Auto-control based on occupancy
  if (!occupied) {
    room.ac.on = false;
    room.lights.on = false;
  }

  rooms.set(req.params.id, room);
  res.json({ success: true, room, autoAction: !occupied });
});

// ============================================
// DEVICES API
// ============================================

app.get('/api/devices', (req, res) => {
  const { type, status, room } = req.query;
  let list = Array.from(devices.values());
  if (type) list = list.filter(d => d.type === type);
  if (status) list = list.filter(d => d.status === status);
  if (room) list = list.filter(d => d.room === room);
  res.json({ success: true, count: list.length, devices: list });
});

app.get('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({ success: true, device });
});

app.put('/api/devices/:id/control', (req, res) => {
  const { on, settings } = req.body;
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  if (on !== undefined) device.status = on ? 'online' : 'offline';
  if (settings) Object.assign(device, settings);

  devices.set(req.params.id, device);
  res.json({ success: true, device });
});

// ============================================
// ENERGY MONITORING
// ============================================

app.get('/api/energy/consumption', (req, res) => {
  const { building, period = 'daily' } = req.query;

  // Calculate total consumption
  let total = 0;
  rooms.forEach(room => {
    if (!building || room.building === building) {
      total += room.energy.current;
    }
  });

  // Generate trend data
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trend.push({
      date: date.toISOString().split('T')[0],
      consumption: 800 + Math.random() * 400 - (i * 20),
      cost: 8000 + Math.random() * 4000
    });
  }

  res.json({
    success: true,
    current: { total: total.toFixed(2), unit: 'kW' },
    trend,
    period,
    recommendations: [
      'Turn off AC in unoccupied rooms',
      'Reduce lighting during daylight hours',
      'Schedule heavy loads during off-peak hours'
    ]
  });
});

app.get('/api/energy/real-time', (req, res) => {
  const readings = [];
  rooms.forEach((room, id) => {
    readings.push({
      room: id,
      building: room.building,
      power: room.energy.current,
      timestamp: new Date().toISOString()
    });
  });
  res.json({ success: true, readings });
});

// ============================================
// SOLAR OPTIMIZATION
// ============================================

app.get('/api/solar', (req, res) => {
  const solarDevices = Array.from(devices.values()).filter(d => d.type === 'Solar Panel');

  const totalOutput = solarDevices.reduce((sum, p) => sum + p.output, 0);
  const avgEfficiency = solarDevices.reduce((sum, p) => sum + p.efficiency, 0) / solarDevices.length;

  // Simulate solar generation for day
  const hour = new Date().getHours();
  const peakHours = hour >= 10 && hour <= 14;

  res.json({
    success: true,
    panels: solarDevices.length,
    currentOutput: totalOutput.toFixed(2),
    unit: 'kW',
    efficiency: avgEfficiency.toFixed(1),
    status: peakHours ? 'peak' : 'normal',
    savings: {
      today: (totalOutput * 12 * 8).toFixed(2), // Rs
      month: (totalOutput * 30 * 12 * 8).toFixed(2),
      co2Saved: (totalOutput * 0.7 * 8).toFixed(2) // kg
    }
  });
});

app.post('/api/solar/optimize', (req, res) => {
  const { weather, season } = req.body;

  // Optimization recommendations
  const recommendations = [
    { type: 'panel_angle', current: 35, recommended: weather === 'sunny' ? 25 : 40, saving: '5%' },
    { type: 'cleaning', frequency: 'weekly', saving: '8%' },
    { type: 'battery_storage', recommended: true, saving: '15%' }
  ];

  res.json({
    success: true,
    optimization: 'solar',
    recommendations,
    projectedSaving: '23%'
  });
});

// ============================================
// CARBON DASHBOARD
// ============================================

app.get('/api/carbon', (req, res) => {
  const totalEnergy = Array.from(rooms.values()).reduce((sum, r) => sum + r.energy.today, 0);
  const solarOutput = Array.from(devices.values()).filter(d => d.type === 'Solar Panel').reduce((sum, p) => sum + p.output, 0);

  const carbonEmitted = totalEnergy * 0.82; // kg CO2 per kWh
  const carbonSaved = solarOutput * 8 * 0.82;

  res.json({
    success: true,
    carbonFootprint: {
      emitted: carbonEmitted.toFixed(2),
      saved: carbonSaved.toFixed(2),
      net: (carbonEmitted - carbonSaved).toFixed(2),
      unit: 'kg CO2'
    },
    today: {
      treesEquivalent: Math.floor((carbonEmitted - carbonSaved) / 20),
      offset: carbonSaved > 0 ? 'solar' : 'none'
    },
    target: {
      daily: 500,
      monthly: 15000,
      yearly: 180000
    }
  });
});

// ============================================
// ALERTS & MAINTENANCE
// ============================================

app.get('/api/alerts', (req, res) => {
  const { severity, type } = req.query;
  const allAlerts = Array.from(alerts.values());
  const filtered = allAlerts.filter(a => {
    if (severity && a.severity !== severity) return false;
    if (type && a.type !== type) return false;
    return true;
  });
  res.json({ success: true, count: filtered.length, alerts: filtered });
});

app.post('/api/alerts', (req, res) => {
  const { device, type, severity, message } = req.body;
  const id = `A${String(alerts.size + 1).padStart(4, '0')}`;
  const alert = { id, device, type, severity, message, timestamp: new Date().toISOString(), resolved: false };
  alerts.set(id, alert);
  res.json({ success: true, alert });
});

app.put('/api/alerts/:id/resolve', (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.resolved = true;
  alert.resolvedAt = new Date().toISOString();
  alerts.set(req.params.id, alert);
  res.json({ success: true, alert });
});

// ============================================
// PREDICTIVE MAINTENANCE
// ============================================

app.get('/api/maintenance/predict', (req, res) => {
  const predictions = [];

  devices.forEach((device, id) => {
    if (device.type !== 'Solar Panel') {
      const daysSinceMaintenance = Math.floor((new Date() - new Date(device.lastMaintenance)) / (1000 * 60 * 60 * 24));
      const healthScore = Math.max(0, 100 - daysSinceMaintenance * 0.5 - Math.random() * 10);

      if (healthScore < 80) {
        predictions.push({
          device: id,
          type: device.type,
          health: healthScore.toFixed(1),
          risk: healthScore < 60 ? 'high' : 'medium',
          recommendation: healthScore < 60 ? 'Replace immediately' : 'Schedule maintenance',
          estimatedCost: 5000 + Math.random() * 10000
        });
      }
    }
  });

  res.json({
    success: true,
    predictions: predictions.slice(0, 10),
    summary: {
      highRisk: predictions.filter(p => p.risk === 'high').length,
      mediumRisk: predictions.filter(p => p.risk === 'medium').length,
      estimatedSavings: predictions.length * 5000
    }
  });
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics/savings', (req, res) => {
  const { period = 'monthly' } = req.query;

  res.json({
    success: true,
    period,
    savings: {
      energy: { amount: 12500, unit: 'kWh', percentage: 18 },
      cost: { amount: 125000, unit: 'Rs', percentage: 18 },
      carbon: { amount: 9500, unit: 'kg CO2', percentage: 15 }
    },
    comparison: {
      previousPeriod: { savings: 8, reason: 'New occupancy sensors' },
      target: { savings: 25, remaining: 7 }
    },
    topStrategies: [
      { name: 'Occupancy-based AC control', saving: 35 },
      { name: 'Solar optimization', saving: 28 },
      { name: 'LED lighting', saving: 22 },
      { name: 'Smart scheduling', saving: 15 }
    ]
  });
});

// ============================================
// IOT SIMULATION
// ============================================

app.post('/api/iot/simulate', (req, res) => {
  const { action, targets } = req.body;

  const results = [];
  targets.forEach(target => {
    const room = rooms.get(target);
    if (room) {
      if (action === 'all_off') {
        room.ac.on = false;
        room.lights.on = false;
      } else if (action === 'all_on') {
        room.ac.on = true;
        room.lights.on = true;
      }
      rooms.set(target, room);
      results.push({ target, status: 'updated' });
    }
  });

  res.json({
    success: true,
    action,
    results,
    energySaved: results.length * 2.5
  });
});

// ============================================
// DASHBOARD
// ============================================

app.get('/api/dashboard', (req, res) => {
  const totalRooms = rooms.size;
  const occupiedRooms = Array.from(rooms.values()).filter(r => r.occupancy.occupied).length;
  const totalDevices = devices.size;
  const onlineDevices = Array.from(devices.values()).filter(d => d.status === 'online').length;
  const totalEnergy = Array.from(rooms.values()).reduce((sum, r) => sum + r.energy.current, 0);

  res.json({
    success: true,
    overview: {
      buildings: buildings.size,
      rooms: { total: totalRooms, occupied: occupiedRooms, occupancyRate: (occupiedRooms / totalRooms * 100).toFixed(1) },
      devices: { total: totalDevices, online: onlineDevices },
      energy: { current: totalEnergy.toFixed(2), unit: 'kW' }
    },
    quickActions: [
      { action: 'all_off', label: 'Turn Off All (Night Mode)', energySaving: '30%' },
      { action: 'all_on', label: 'Turn On All (Day Mode)', energySaving: '-5%' },
      { action: 'eco', label: 'Eco Mode', energySaving: '20%' }
    ],
    alerts: { count: alerts.size, high: 2, medium: 5 },
    solar: { output: 45.2, efficiency: 92 },
    carbon: { today: 125, target: 150, unit: 'kg CO2' }
  });
});

// ============================================
// START
// ============================================

initData();

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║           ENERGY MANAGEMENT OS - AI-POWERED              ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  FEATURES:                                             ║`);
  console.log(`║  ✅ Real-time Energy Monitoring                         ║`);
  console.log(`║  ✅ Occupancy-based Smart Control                       ║`);
  console.log(`║  ✅ Solar Optimization                                  ║`);
  console.log(`║  ✅ Carbon Dashboard                                    ║`);
  console.log(`║  ✅ Predictive Maintenance                              ║`);
  console.log(`║  ✅ IoT Device Management                               ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\n  Try: curl http://localhost:${PORT}/api/dashboard`);
  console.log(`       curl http://localhost:${PORT}/api/energy/consumption`);
  console.log(`       curl http://localhost:${PORT}/api/carbon`);
});

module.exports = app;
