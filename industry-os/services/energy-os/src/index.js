/**
 * ENERGY OS - Industry Operating System
 * Smart Energy Management Platform
 *
 * Features:
 * - Smart Meter Management
 * - Energy Consumption Tracking
 * - Grid Distribution
 * - Billing & Tariffs
 * - Demand Response
 * - Renewable Integration
 *
 * @module energy-os
 * @version 1.0.0
 * @port 5100
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5100;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// In-memory data stores
const meters = new Map();
const consumers = new Map();
const readings = new Map();
const bills = new Map();
const tariffs = new Map();
const gridStatus = new Map();
const demandResponses = new Map();
const renewableSources = new Map();

// Digital Twins
const twins = {
  meter: { id: 'meter-twin', status: 'active', meters: [] },
  consumer: { id: 'consumer-twin', status: 'active', consumers: [] },
  grid: { id: 'grid-twin', status: 'active', load: 0, capacity: 0 },
  billing: { id: 'billing-twin', status: 'active', pendingBills: 0 },
  renewable: { id: 'renewable-twin', status: 'active', sources: [] }
};

// Initialize sample data
function initializeSampleData() {
  // Sample tariffs
  const tariffList = [
    { id: 't1', name: 'Domestic - Slab 1', slab: '0-100', rate: 3.0, unit: 'kWh', type: 'domestic' },
    { id: 't2', name: 'Domestic - Slab 2', slab: '101-200', rate: 4.5, unit: 'kWh', type: 'domestic' },
    { id: 't3', name: 'Domestic - Slab 3', slab: '201-400', rate: 6.5, unit: 'kWh', type: 'domestic' },
    { id: 't4', name: 'Commercial', slab: 'flat', rate: 8.0, unit: 'kWh', type: 'commercial' },
    { id: 't5', name: 'Industrial', slab: 'flat', rate: 6.5, unit: 'kWh', type: 'industrial' }
  ];
  tariffList.forEach(t => tariffs.set(t.id, t));

  // Sample consumers
  const consumerList = [
    { id: 'c1', name: 'ABC Industries', type: 'industrial', meterId: 'm1', address: 'KIADB Industrial Area' },
    { id: 'c2', name: 'Sunshine Apartments', type: 'domestic', meterId: 'm2', address: 'Koramangala' },
    { id: 'c3', name: 'Metro Mall', type: 'commercial', meterId: 'm3', address: 'MG Road' }
  ];
  consumerList.forEach(c => {
    consumers.set(c.id, { ...c, tariffId: c.type === 'industrial' ? 't5' : c.type === 'commercial' ? 't4' : 't1' });
  });

  // Sample meters
  const meterList = [
    { id: 'm1', consumerId: 'c1', type: 'industrial', status: 'active', location: 'KIADB' },
    { id: 'm2', consumerId: 'c2', type: 'smart', status: 'active', location: 'Koramangala' },
    { id: 'm3', consumerId: 'c3', type: 'commercial', status: 'active', location: 'MG Road' }
  ];
  meterList.forEach(m => {
    meters.set(m.id, m);
    twins.meter.meters.push(m);
  });

  // Sample renewable sources
  const renewableList = [
    { id: 'r1', name: 'Solar Farm A', type: 'solar', capacity: 500, currentOutput: 350, location: 'Outskirts' },
    { id: 'r2', name: 'Wind Turbine B', type: 'wind', capacity: 200, currentOutput: 120, location: 'Hill Station' }
  ];
  renewableList.forEach(r => {
    renewableSources.set(r.id, r);
    twins.renewable.sources.push(r);
  });

  // Grid status
  gridStatus.set('main', { id: 'main', load: 850, capacity: 1000, status: 'normal', frequency: 50.0 });

  logger.info('Energy OS sample data initialized');
}

initializeSampleData();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'energy-os',
    version: '1.0.0',
    tagline: 'Smart Energy Management Platform',
    timestamp: new Date().toISOString(),
    twins: Object.keys(twins)
  });
});

// ============= METER ENDPOINTS =============

app.get('/api/meters', (req, res) => {
  const { type, status } = req.query;
  let list = Array.from(meters.values());
  if (type) list = list.filter(m => m.type === type);
  if (status) list = list.filter(m => m.status === status);
  res.json({ success: true, count: list.length, meters: list });
});

app.get('/api/meters/:id', (req, res) => {
  const meter = meters.get(req.params.id);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });
  res.json({ success: true, meter });
});

app.post('/api/meters', (req, res) => {
  const { consumerId, type, location } = req.body;
  if (!consumerId || !type) return res.status(400).json({ error: 'consumerId and type required' });

  const meter = { id: uuidv4(), consumerId, type, location, status: 'active', installedAt: new Date().toISOString() };
  meters.set(meter.id, meter);
  twins.meter.meters.push(meter);
  logger.info(`Meter registered: ${meter.id}`);
  res.status(201).json({ success: true, meter });
});

// ============= READING ENDPOINTS =============

app.post('/api/readings', (req, res) => {
  const { meterId, reading, timestamp } = req.body;
  if (!meterId || reading === undefined) return res.status(400).json({ error: 'meterId and reading required' });

  const record = {
    id: uuidv4(),
    meterId,
    reading: parseFloat(reading),
    timestamp: timestamp || new Date().toISOString(),
    unit: 'kWh'
  };
  readings.set(record.id, record);
  res.status(201).json({ success: true, reading: record });
});

app.get('/api/readings', (req, res) => {
  const { meterId, from, to } = req.query;
  let list = Array.from(readings.values());
  if (meterId) list = list.filter(r => r.meterId === meterId);
  res.json({ success: true, count: list.length, readings: list.slice(-100) });
});

app.get('/api/readings/analytics/:meterId', (req, res) => {
  const meterReadings = Array.from(readings.values()).filter(r => r.meterId === req.params.meterId);
  if (meterReadings.length === 0) return res.json({ success: true, analytics: { total: 0, avg: 0 } });

  const total = meterReadings.reduce((sum, r) => sum + r.reading, 0);
  const avg = total / meterReadings.length;
  const lastReading = meterReadings[meterReadings.length - 1];

  res.json({
    success: true,
    analytics: {
      meterId: req.params.meterId,
      totalConsumption: Math.round(total * 100) / 100,
      averageConsumption: Math.round(avg * 100) / 100,
      readingCount: meterReadings.length,
      lastReading: lastReading.reading,
      lastReadingTime: lastReading.timestamp
    }
  });
});

// ============= CONSUMER ENDPOINTS =============

app.get('/api/consumers', (req, res) => {
  const { type } = req.query;
  let list = Array.from(consumers.values());
  if (type) list = list.filter(c => c.type === type);
  res.json({ success: true, count: list.length, consumers: list });
});

app.get('/api/consumers/:id', (req, res) => {
  const consumer = consumers.get(req.params.id);
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });

  const meterReadings = Array.from(readings.values()).filter(r => r.meterId === consumer.meterId);
  const totalConsumption = meterReadings.reduce((sum, r) => sum + r.reading, 0);

  res.json({ success: true, consumer, totalConsumption });
});

app.post('/api/consumers', (req, res) => {
  const { name, type, address, tariffId } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });

  const consumer = { id: uuidv4(), name, type, address, tariffId, createdAt: new Date().toISOString() };
  consumers.set(consumer.id, consumer);
  twins.consumer.consumers.push(consumer);
  res.status(201).json({ success: true, consumer });
});

// ============= TARIFF ENDPOINTS =============

app.get('/api/tariffs', (req, res) => {
  const { type } = req.query;
  let list = Array.from(tariffs.values());
  if (type) list = list.filter(t => t.type === type);
  res.json({ success: true, tariffs: list });
});

app.get('/api/tariffs/:id', (req, res) => {
  const tariff = tariffs.get(req.params.id);
  if (!tariff) return res.status(404).json({ error: 'Tariff not found' });
  res.json({ success: true, tariff });
});

// ============= BILLING ENDPOINTS =============

app.post('/api/bills/calculate', (req, res) => {
  const { consumerId, consumption } = req.body;
  if (!consumerId || !consumption) return res.status(400).json({ error: 'consumerId and consumption required' });

  const consumer = consumers.get(consumerId);
  if (!consumer) return res.status(404).json({ error: 'Consumer not found' });

  const tariff = tariffs.get(consumer.tariffId);
  let energyCharges = 0;

  // Calculate based on tariff type
  if (tariff.slab === 'flat') {
    energyCharges = consumption * tariff.rate;
  } else {
    // Slab calculation
    let remaining = consumption;
    const slabs = tariff.slab.split('-').map(Number);
    let prevSlab = 0;
    for (const t of Array.from(tariffs.values()).filter(t => t.type === tariff.type).sort((a, b) => a.rate - b.rate)) {
      const [min, max] = t.slab.split('-').map(Number);
      const slabUnits = Math.min(remaining, max - prevSlab);
      energyCharges += slabUnits * t.rate;
      remaining -= slabUnits;
      prevSlab = max;
      if (remaining <= 0) break;
    }
  }

  const fixedCharges = tariff.type === 'industrial' ? 500 : tariff.type === 'commercial' ? 200 : 50;
  const taxes = energyCharges * 0.18;
  const total = energyCharges + fixedCharges + taxes;

  const bill = {
    id: uuidv4(),
    consumerId,
    consumerName: consumer.name,
    tariff: tariff.name,
    consumption: parseFloat(consumption),
    energyCharges: Math.round(energyCharges * 100) / 100,
    fixedCharges,
    taxes: Math.round(taxes * 100) / 100,
    total: Math.round(total * 100) / 100,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending'
  };
  bills.set(bill.id, bill);

  res.json({ success: true, bill });
});

app.get('/api/bills', (req, res) => {
  const { consumerId, status } = req.query;
  let list = Array.from(bills.values());
  if (consumerId) list = list.filter(b => b.consumerId === consumerId);
  if (status) list = list.filter(b => b.status === status);
  twins.billing.pendingBills = list.filter(b => b.status === 'pending').length;
  res.json({ success: true, bills: list });
});

// ============= GRID ENDPOINTS =============

app.get('/api/grid/status', (req, res) => {
  const status = Array.from(gridStatus.values())[0];
  res.json({ success: true, grid: status });
});

app.post('/api/grid/load', (req, res) => {
  const { load } = req.body;
  const grid = Array.from(gridStatus.values())[0];
  if (grid) {
    grid.load = load;
    grid.status = load > grid.capacity * 0.9 ? 'critical' : load > grid.capacity * 0.7 ? 'warning' : 'normal';
    twins.grid.load = load;
  }
  res.json({ success: true, grid });
});

// ============= RENEWABLE ENDPOINTS =============

app.get('/api/renewable', (req, res) => {
  const sources = Array.from(renewableSources.values());
  const totalCapacity = sources.reduce((sum, s) => sum + s.capacity, 0);
  const totalOutput = sources.reduce((sum, s) => sum + s.currentOutput, 0);
  res.json({ success: true, sources, totalCapacity, totalOutput, percentage: Math.round(totalOutput / totalCapacity * 100) });
});

app.get('/api/renewable/:id', (req, res) => {
  const source = renewableSources.get(req.params.id);
  if (!source) return res.status(404).json({ error: 'Source not found' });
  res.json({ success: true, source });
});

// ============= ANALYTICS ENDPOINTS =============

app.get('/api/analytics', (req, res) => {
  const totalMeters = meters.size;
  const activeConsumers = consumers.size;
  const totalReadings = readings.size;
  const grid = Array.from(gridStatus.values())[0];
  const renewableSourcesArr = Array.from(renewableSources.values());
  const renewablePercentage = renewableSourcesArr.length > 0
    ? Math.round(renewableSourcesArr.reduce((sum, s) => sum + s.currentOutput, 0) /
          renewableSourcesArr.reduce((sum, s) => sum + s.capacity, 0) * 100)
    : 0;

  res.json({
    success: true,
    analytics: {
      meters: totalMeters,
      consumers: activeConsumers,
      readings: totalReadings,
      pendingBills: twins.billing.pendingBills,
      gridLoad: grid?.load || 0,
      gridCapacity: grid?.capacity || 0,
      renewablePercentage,
      timestamp: new Date().toISOString()
    }
  });
});

// ============= TWINS ENDPOINTS =============

app.get('/api/twins', (req, res) => {
  res.json({ success: true, twins });
});

app.get('/api/twins/:name', (req, res) => {
  const twin = twins[req.params.name];
  if (!twin) return res.status(404).json({ error: 'Twin not found' });
  res.json({ success: true, twin });
});

// Start server
app.listen(PORT, () => {
  logger.info(`
╔══════════════════════════════════════════════════════════════════════════╗
║  ENERGY OS - Smart Energy Management Platform                          ║
║  Port: ${PORT}                                                          ║
║  Features: Smart Meters, Consumption Tracking, Billing, Grid Mgmt       ║
║  Twins: Meter, Consumer, Grid, Billing, Renewable                     ║
╚══════════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
