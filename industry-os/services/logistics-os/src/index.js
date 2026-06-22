// logistics-os (5272) - Logistics & Supply Chain.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'logistics-os';
const PORT = parseInt(process.env.PORT || '5272', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const warehouses = new Map();  // whId -> { id, name, location, capacity, manager }
const inventory = new Map();   // invId -> { id, warehouse_id, sku, quantity, reorder_level, location }
const carriers = new Map();    // carId -> { id, name, type, rate_per_kg, tracking_url_template }
const shipments = new Map();  // shId -> { id, origin_warehouse_id, destination, carrier_id, weight_kg, status, tracking_number, eta, created }
const routes = new Map();     // rId -> { id, name, stops[], distance_km, estimated_hours }
const tracking = new Map();   // evtId -> { id, shipment_id, status, location, timestamp, note }
const deliveries = new Map(); // delId -> { id, shipment_id, recipient_name, address, signed_by, delivered_at, proof_url }

// Seed
(function seed() {
  ['West Coast Hub', 'East Coast Hub'].forEach(name => {
    const id = uuid();
    warehouses.set(id, { id, name, location: name.includes('West') ? 'Los Angeles, CA' : 'Newark, NJ',
      capacity: 50000, manager: 'ops-team' });
  });
  ['FedEx', 'UPS', 'DHL'].forEach(name => {
    const id = uuid();
    carriers.set(id, { id, name, type: 'parcel', rate_per_kg: 2.5, tracking_url_template: `https://${name.toLowerCase()}.example/track/{{tracking}}` });
  });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/warehouses', '/api/inventory', '/api/carriers', '/api/shipments', '/api/routes', '/api/tracking', '/api/deliveries']
})));

// Warehouses
app.get('/api/warehouses', (_req, res) => res.json(ok({ warehouses: [...warehouses.values()] })));
app.post('/api/warehouses', (req, res) => {
  const { name, location, capacity = 0, manager = '' } = req.body || {};
  if (!name || !location) return res.status(400).json(fail('name + location required'));
  const id = uuid();
  warehouses.set(id, { id, name, location, capacity, manager });
  res.status(201).json(ok({ warehouse: warehouses.get(id) }));
});

// Inventory
app.get('/api/inventory', (req, res) => {
  let list = [...inventory.values()];
  if (req.query.warehouse_id) list = list.filter(i => i.warehouse_id === req.query.warehouse_id);
  if (req.query.sku) list = list.filter(i => i.sku === req.query.sku);
  res.json(ok({ inventory: list }));
});
app.post('/api/inventory', (req, res) => {
  const { warehouse_id, sku, quantity = 0, reorder_level = 10, location = '' } = req.body || {};
  if (!warehouse_id || !sku) return res.status(400).json(fail('warehouse_id + sku required'));
  if (!warehouses.has(warehouse_id)) return res.status(400).json(fail('warehouse_id invalid'));
  const id = uuid();
  inventory.set(id, { id, warehouse_id, sku, quantity, reorder_level, location });
  res.status(201).json(ok({ inventory_item: inventory.get(id) }));
});
app.patch('/api/inventory/:id', (req, res) => {
  const inv = inventory.get(req.params.id);
  if (!inv) return res.status(404).json(fail('inventory not found'));
  if (req.body.quantity !== undefined) inv.quantity = req.body.quantity;
  if (req.body.location !== undefined) inv.location = req.body.location;
  inventory.set(inv.id, inv);
  res.json(ok({ inventory_item: inv }));
});

// Carriers
app.get('/api/carriers', (_req, res) => res.json(ok({ carriers: [...carriers.values()] })));
app.post('/api/carriers', (req, res) => {
  const { name, type = 'parcel', rate_per_kg = 0 } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  carriers.set(id, { id, name, type, rate_per_kg, tracking_url_template: `https://${name.toLowerCase()}.example/track/{{tracking}}` });
  res.status(201).json(ok({ carrier: carriers.get(id) }));
});

// Shipments
app.get('/api/shipments', (req, res) => {
  let list = [...shipments.values()];
  if (req.query.status) list = list.filter(s => s.status === req.query.status);
  if (req.query.carrier_id) list = list.filter(s => s.carrier_id === req.query.carrier_id);
  res.json(ok({ shipments: list }));
});
app.get('/api/shipments/:id', (req, res) => {
  const s = shipments.get(req.params.id);
  if (!s) return res.status(404).json(fail('shipment not found'));
  res.json(ok({ shipment: s }));
});
app.post('/api/shipments', (req, res) => {
  const { origin_warehouse_id, destination, carrier_id, weight_kg = 1 } = req.body || {};
  if (!origin_warehouse_id || !destination || !carrier_id) return res.status(400).json(fail('origin_warehouse_id + destination + carrier_id required'));
  if (!warehouses.has(origin_warehouse_id)) return res.status(400).json(fail('origin_warehouse_id invalid'));
  if (!carriers.has(carrier_id)) return res.status(400).json(fail('carrier_id invalid'));
  const id = uuid();
  const tn = `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const carrier = carriers.get(carrier_id);
  const cost = +(weight_kg * carrier.rate_per_kg).toFixed(2);
  shipments.set(id, { id, origin_warehouse_id, destination, carrier_id, weight_kg, status: 'pending',
    tracking_number: tn, eta: null, cost, created: new Date().toISOString() });
  res.status(201).json(ok({ shipment: shipments.get(id) }));
});
app.patch('/api/shipments/:id', (req, res) => {
  const s = shipments.get(req.params.id);
  if (!s) return res.status(404).json(fail('shipment not found'));
  if (req.body.status) s.status = req.body.status;
  if (req.body.eta) s.eta = req.body.eta;
  shipments.set(s.id, s);
  res.json(ok({ shipment: s }));
});

// Routes
app.get('/api/routes', (_req, res) => res.json(ok({ routes: [...routes.values()] })));
app.post('/api/routes', (req, res) => {
  const { name, stops = [], distance_km = 0, estimated_hours = 0 } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  routes.set(id, { id, name, stops, distance_km, estimated_hours });
  res.status(201).json(ok({ route: routes.get(id) }));
});

// Tracking events
app.get('/api/tracking', (req, res) => {
  let list = [...tracking.values()];
  if (req.query.shipment_id) list = list.filter(t => t.shipment_id === req.query.shipment_id);
  res.json(ok({ tracking: list }));
});
app.post('/api/shipments/:id/track', (req, res) => {
  const s = shipments.get(req.params.id);
  if (!s) return res.status(404).json(fail('shipment not found'));
  const { status, location, note = '' } = req.body || {};
  if (!status || !location) return res.status(400).json(fail('status + location required'));
  const id = uuid();
  const evt = { id, shipment_id: s.id, status, location, note, timestamp: new Date().toISOString() };
  tracking.set(id, evt);
  // Update shipment status
  s.status = status;
  shipments.set(s.id, s);
  res.status(201).json(ok({ tracking_event: evt, shipment: s }));
});

// Deliveries
app.get('/api/deliveries', (_req, res) => res.json(ok({ deliveries: [...deliveries.values()] })));
app.post('/api/deliveries', (req, res) => {
  const { shipment_id, recipient_name, address } = req.body || {};
  if (!shipment_id || !recipient_name || !address) return res.status(400).json(fail('shipment_id + recipient_name + address required'));
  if (!shipments.has(shipment_id)) return res.status(400).json(fail('shipment_id invalid'));
  const id = uuid();
  deliveries.set(id, { id, shipment_id, recipient_name, address, signed_by: null, delivered_at: null, proof_url: null });
  res.status(201).json(ok({ delivery: deliveries.get(id) }));
});
app.patch('/api/deliveries/:id', (req, res) => {
  const d = deliveries.get(req.params.id);
  if (!d) return res.status(404).json(fail('delivery not found'));
  if (req.body.signed_by) d.signed_by = req.body.signed_by;
  if (req.body.delivered_at) d.delivered_at = req.body.delivered_at;
  if (req.body.proof_url) d.proof_url = req.body.proof_url;
  deliveries.set(d.id, d);
  // Also mark shipment as delivered
  const s = shipments.get(d.shipment_id);
  if (s) { s.status = 'delivered'; shipments.set(s.id, s); }
  res.json(ok({ delivery: d, shipment: s }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
