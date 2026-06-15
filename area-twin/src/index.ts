import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';

const app: FastifyInstance = Fastify({ logger: true });
await app.register(cors);

// Stores
const areas = new Map();
const zones = new Map();
const coverage = new Map();

// Initialize
function initSampleData() {
  const sampleAreas = [
    { id: 'north', name: 'North Zone', type: 'residential', population: 50000 },
    { id: 'south', name: 'South Zone', type: 'commercial', population: 75000 },
    { id: 'east', name: 'East Zone', type: 'mixed', population: 60000 },
  ];
  sampleAreas.forEach(a => areas.set(a.id, { ...a, createdAt: new Date().toISOString() }));
}

// Health
app.get('/health', async () => ({ status: 'healthy', service: 'area-twin', version: '1.0.0' }));

// Areas
app.get('/api/areas', async (req, res) => {
  const { type } = req.query as { type?: string };
  let result = Array.from(areas.values());
  if (type) result = result.filter((a: any) => a.type === type);
  return { success: true, count: result.length, areas: result };
});

app.get('/api/areas/:id', async (req, res) => {
  const area = areas.get(req.params.id);
  if (!area) return res.code(404).send({ success: false, error: 'Area not found' });
  return { success: true, area };
});

app.post('/api/areas', async (req, res) => {
  const { name, type, population, coordinates } = req.body;
  if (!name) return res.code(400).send({ success: false, error: 'Name required' });
  const area = { id: uuidv4(), name, type: type || 'mixed', population: population || 0, coordinates: coordinates || {}, createdAt: new Date().toISOString() };
  areas.set(area.id, area);
  return res.code(201).send({ success: true, area });
});

app.put('/api/areas/:id', async (req, res) => {
  const area = areas.get(req.params.id);
  if (!area) return res.code(404).send({ success: false, error: 'Area not found' });
  const updated = { ...area, ...req.body, id: area.id };
  areas.set(area.id, updated);
  return { success: true, area: updated };
});

app.delete('/api/areas/:id', async (req, res) => {
  if (!areas.has(req.params.id)) return res.code(404).send({ success: false, error: 'Area not found' });
  areas.delete(req.params.id);
  return { success: true, message: 'Area deleted' };
});

// Zones
app.get('/api/zones', async () => ({ success: true, count: zones.size, zones: Array.from(zones.values()) }));
app.post('/api/zones', async (req, res) => {
  const { name, areaId, type } = req.body;
  if (!name) return res.code(400).send({ success: false, error: 'Name required' });
  const zone = { id: uuidv4(), name, areaId: areaId || null, type: type || 'standard', createdAt: new Date().toISOString() };
  zones.set(zone.id, zone);
  return res.code(201).send({ success: true, zone });
});

// Coverage
app.get('/api/coverage', async () => ({ success: true, coverage: Array.from(coverage.values()) }));
app.post('/api/coverage', async (req, res) => {
  const { areaId, type, level } = req.body;
  const entry = { id: uuidv4(), areaId: areaId || null, type: type || 'service', level: level || 'full', timestamp: new Date().toISOString() };
  coverage.set(entry.id, entry);
  return res.code(201).send({ success: true, coverage: entry });
});

const start = async () => {
  try {
    await app.listen({ port: 3012 });
    console.log('🗺️ Area Twin running on port 3012');
  } catch (err) { app.log.error(err); process.exit(1); }
};
initSampleData();
start();

export default app;
