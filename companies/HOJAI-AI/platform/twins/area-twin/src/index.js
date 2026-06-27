import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { PersistentStore } from '@rtmn/shared/lib/persistent-store';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { installPhase5 } from '@rtmn/twinos-shared';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4964;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// Persistent stores
// ============================================================
const areas = new PersistentStore('areas', { serviceName: 'area-twin' });
const visitors = new PersistentStore('visitors', { serviceName: 'area-twin' });
const events = new PersistentStore('events', { serviceName: 'area-twin' });
const demographics = new PersistentStore('demographics', { serviceName: 'area-twin' });

// Top-level seed data (areas + sample event)
(async () => {
  await areas.set('area-downtown-sf', {
    id: 'area-downtown-sf',
    name: 'Downtown San Francisco',
    type: 'commercial',
    center: { lat: 37.7749, lng: -122.4194 },
    radius: 2.5,
    population: 85000,
    demographics: { ageMedian: 35, incomeMedian: 95000 },
    businesses: 2400,
    metrics: { footTraffic: 12500, avgDwellTime: '45 min', conversionRate: 0.08 },
    createdAt: new Date().toISOString()
  });
  await areas.set('area-midtown-nyc', {
    id: 'area-midtown-nyc',
    name: 'Midtown Manhattan',
    type: 'mixed',
    center: { lat: 40.7549, lng: -73.9840 },
    radius: 3.0,
    population: 200000,
    demographics: { ageMedian: 38, incomeMedian: 110000 },
    businesses: 5800,
    metrics: { footTraffic: 85000, avgDwellTime: '60 min', conversionRate: 0.12 },
    createdAt: new Date().toISOString()
  });
  await events.set('evt-1', {
    id: 'evt-1',
    areaId: 'area-downtown-sf',
    type: 'festival',
    name: 'SF Tech Week',
    startDate: '2026-10-15',
    expectedAttendance: 50000,
    impactScore: 0.9
  });
})();

// ============================================================
// Health & Info
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'area-twin',
    version: '1.0.0',
    port: PORT,
    counts: { areas: areas.size, visitors: visitors.size, events: events.size },
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Area Twin',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    capabilities: [
      '/api/areas - List all areas',
      '/api/areas/:id - Get area details',
      '/api/areas - Create new area',
      '/api/areas/:id - Update area',
      '/api/areas/:id/analytics - Get area analytics',
      '/api/areas/nearby - Find areas near coordinates',
      '/api/areas/:id/visitors - Get visitors in area',
      '/api/visitors - Track visitor',
      '/api/events - List events',
      '/api/events - Create event',
      '/api/demographics/:areaId - Get demographics',
      '/api/heatmap/:areaId - Get heatmap data',
      '/api/stats - Get overall stats'
    ]
  });
});

// ============================================================
// Areas
// ============================================================
app.get('/api/areas', (req, res) => {
  const { type } = req.query;
  let results = areas.toArray();
  if (type) results = results.filter(a => a.type === type);
  res.json({ areas: results, count: results.length });
});

app.get('/api/areas/nearby', (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusKm = parseFloat(radius) || 5;

  const nearby = areas.toArray().filter(area => {
    const dLat = (area.center.lat - latNum) * 111;
    const dLng = (area.center.lng - lngNum) * 111 * Math.cos(latNum * Math.PI / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    return dist <= radiusKm;
  });

  res.json({ areas: nearby, count: nearby.length, query: { lat: latNum, lng: lngNum, radiusKm } });
});

app.get('/api/areas/:id', (req, res) => {
  const area = areas.get(req.params.id);
  if (!area) return res.status(404).json({ error: 'Area not found' });
  res.json(area);
});

app.post('/api/areas', requireAuth, async (req, res) => {
  const { name, type, center, radius, demographics } = req.body;
  if (!name || !center) return res.status(400).json({ error: 'name and center required' });

  const id = `area-${uuidv4().slice(0, 8)}`;
  const area = {
    id,
    name,
    type: type || 'mixed',
    center,
    radius: radius || 1.0,
    population: req.body.population || 0,
    demographics: demographics || {},
    businesses: 0,
    metrics: { footTraffic: 0, avgDwellTime: '0 min', conversionRate: 0 },
    createdAt: new Date().toISOString()
  };
  await areas.set(id, area);
  res.status(201).json(area);
});

app.put('/api/areas/:id', requireAuth, async (req, res) => {
  const area = areas.get(req.params.id);
  if (!area) return res.status(404).json({ error: 'Area not found' });
  const updated = Object.assign(area, req.body, { updatedAt: new Date().toISOString() });
  await areas.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/areas/:id', requireAuth, async (req, res) => {
  if (!areas.has(req.params.id)) return res.status(404).json({ error: 'Area not found' });
  await areas.delete(req.params.id);
  res.json({ deleted: req.params.id });
});

app.get('/api/areas/:id/analytics', (req, res) => {
  const area = areas.get(req.params.id);
  if (!area) return res.status(404).json({ error: 'Area not found' });
  res.json({
    areaId: area.id,
    name: area.name,
    metrics: area.metrics,
    trends: {
      footTraffic: { current: area.metrics.footTraffic, change: 0.12 },
      conversion: { current: area.metrics.conversionRate, change: 0.05 },
      revenue: { current: 245000, change: 0.18 }
    },
    topBusinesses: [
      { name: 'Coffee Shop A', revenue: 15000, visits: 1200 },
      { name: 'Restaurant B', revenue: 28000, visits: 850 }
    ]
  });
});

app.get('/api/areas/:id/visitors', (req, res) => {
  const areaId = req.params.id;
  const visitorsInArea = visitors.find(v => v.areaId === areaId);
  res.json({ areaId, visitors: visitorsInArea, count: visitorsInArea.length });
});

// ============================================================
// Visitors
// ============================================================
app.post('/api/visitors', requireAuth, async (req, res) => {
  const { visitorId, areaId, lat, lng, duration } = req.body;
  if (!visitorId || !areaId) return res.status(400).json({ error: 'visitorId and areaId required' });

  const visit = {
    id: `vis-${Date.now()}`,
    visitorId,
    areaId,
    lat,
    lng,
    duration: duration || 0,
    timestamp: new Date().toISOString()
  };
  await visitors.set(visit.id, visit);
  res.status(201).json(visit);
});

app.get('/api/visitors', (req, res) => {
  const { areaId, since } = req.query;
  let results = visitors.toArray();
  if (areaId) results = results.filter(v => v.areaId === areaId);
  if (since) results = results.filter(v => v.timestamp >= since);
  res.json({ visitors: results, count: results.length });
});

// ============================================================
// Events
// ============================================================
app.get('/api/events', (req, res) => {
  const { areaId, upcoming } = req.query;
  let results = events.toArray();
  if (areaId) results = results.filter(e => e.areaId === areaId);
  if (upcoming === 'true') {
    const now = new Date();
    results = results.filter(e => new Date(e.startDate) >= now);
  }
  res.json({ events: results, count: results.length });
});

app.post('/api/events', requireAuth, async (req, res) => {
  const { areaId, type, name, startDate, expectedAttendance } = req.body;
  if (!areaId || !name || !startDate) return res.status(400).json({ error: 'areaId, name, and startDate required' });

  const id = `evt-${Date.now()}`;
  const event = {
    id,
    areaId,
    type: type || 'general',
    name,
    startDate,
    expectedAttendance: expectedAttendance || 0,
    impactScore: 0.5,
    createdAt: new Date().toISOString()
  };
  await events.set(id, event);
  res.status(201).json(event);
});

// ============================================================
// Demographics & Heatmap
// ============================================================
app.get('/api/demographics/:areaId', (req, res) => {
  const area = areas.get(req.params.areaId);
  if (!area) return res.status(404).json({ error: 'Area not found' });

  res.json({
    areaId: area.id,
    name: area.name,
    population: area.population,
    ageBreakdown: { '0-17': 0.18, '18-34': 0.32, '35-54': 0.30, '55+': 0.20 },
    incomeBreakdown: { low: 0.20, middle: 0.50, high: 0.30 },
    education: { highSchool: 0.25, bachelor: 0.45, graduate: 0.30 },
    householdSize: { avg: 2.4 },
    diversity: { caucasian: 0.45, asian: 0.25, hispanic: 0.15, african: 0.10, other: 0.05 }
  });
});

app.get('/api/heatmap/:areaId', (req, res) => {
  const area = areas.get(req.params.areaId);
  if (!area) return res.status(404).json({ error: 'Area not found' });

  const grid = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      grid.push({
        lat: area.center.lat + (i - 5) * 0.001,
        lng: area.center.lng + (j - 5) * 0.001,
        intensity: Math.random()
      });
    }
  }
  res.json({ areaId: area.id, grid, maxIntensity: 1.0 });
});

// ============================================================
// Stats
// ============================================================
app.get('/api/stats', (req, res) => {
  const allAreas = areas.toArray();
  const totalPopulation = allAreas.reduce((sum, a) => sum + (a.population || 0), 0);
  const totalFootTraffic = allAreas.reduce((sum, a) => sum + (a.metrics?.footTraffic || 0), 0);

  res.json({
    areas: { total: allAreas.length, totalPopulation, totalFootTraffic },
    visitors: { total: visitors.size },
    events: { total: events.size, upcoming: events.size }
  });
});

// ============================================================
// Error handlers
// ============================================================
// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'area',
  store: typeof areas !== 'undefined' ? areas : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: areas.size }),
})

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});




;
const server = app.listen(PORT, () => console.log(`🗺️  Area Twin running on port ${PORT}`));installGracefulShutdown(server, phase5Cleanup);
