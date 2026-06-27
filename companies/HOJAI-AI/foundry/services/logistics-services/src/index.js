/**
 * Logistics Services
 * Port: 4760
 * Routing, Tracking, Warehouse, Fleet Management
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

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
app.use(express.json());
const PORT = process.env.PORT || 4760;

const shipments = new Map();
const warehouses = new Map();
const routes = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'logistics-services' }));

// Shipments
app.post('/api/shipments', requireInternal, (req, res) => {
  const { pickup, delivery, weight, dimensions } = req.body;
  const shipment = {
    id: uuidv4(),
    status: 'picked_up',
    trackingId: `TRK${Date.now()}`,
    pickup, delivery, weight, dimensions,
    eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };
  shipments.set(shipment.id, shipment);
  res.status(201).json({ success: true, shipment });
});

app.get('/api/shipments', (req, res) => {
  const { status, trackingId } = req.query;
  let results = Array.from(shipments.values());
  if (status) results = results.filter(s => s.status === status);
  res.json({ success: true, count: results.length, shipments: results });
});

app.get('/api/shipments/:id', (req, res) => {
  const shipment = shipments.get(req.params.id);
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  res.json({ success: true, shipment });
});

app.put('/api/shipments/:id/status', requireInternal, (req, res) => {
  const shipment = shipments.get(req.params.id);
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  shipment.status = req.body.status;
  shipments.set(shipment.id, shipment);
  res.json({ success: true, shipment });
});

// Tracking
app.get('/api/track/:trackingId', (req, res) => {
  const shipment = Array.from(shipments.values()).find(s => s.trackingId === req.params.trackingId);
  if (!shipment) return res.status(404).json({ error: 'Tracking ID not found' });
  res.json({ success: true, tracking: { id: shipment.trackingId, status: shipment.status, eta: shipment.eta } });
});

// Warehouses
app.get('/api/warehouses', (req, res) => {
  const results = Array.from(warehouses.values());
  res.json({ success: true, count: results.length, warehouses: results });
});

app.post('/api/warehouses', requireInternal, (req, res) => {
  const warehouse = { id: uuidv4(), ...req.body };
  warehouses.set(warehouse.id, warehouse);
  res.status(201).json({ success: true, warehouse });
});

// Routes
app.get('/api/routes/optimize', (req, res) => {
  const { stops } = req.query;
  res.json({ success: true, optimizedRoute: { waypoints: stops, distance: '120km', duration: '3h' } });
});

app.listen(PORT, () => console.log(`\n🚚 Logistics Services — PORT ${PORT}\n`));
export default app;
