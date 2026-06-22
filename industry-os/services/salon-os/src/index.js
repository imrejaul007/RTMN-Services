// salon-os (5271) - Salon & Spa Management.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'salon-os';
const PORT = parseInt(process.env.PORT || '5271', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const locations = new Map();   // locId -> { id, name, address, phone, hours, capacity }
const stylists = new Map();    // stId -> { id, location_id, name, specialties[], commission_pct, rating }
const services = new Map();    // svcId -> { id, name, duration_min, price, category }
const appointments = new Map(); // aptId -> { id, location_id, stylist_id, customer_id, service_id, scheduled_at, status, total }
const customers = new Map();   // custId -> { id, name, email, phone, vip, total_visits, total_spent }
const products = new Map();    // prodId -> { id, name, sku, price, stock, category }
const sales = new Map();       // saleId -> { id, location_id, customer_id, items[], total, payment_method, created }
const memberships = new Map(); // memId -> { id, customer_id, tier, start_date, end_date, visits_used }

// Seed
(function seed() {
  const locId = uuid();
  locations.set(locId, { id: locId, name: 'Downtown Salon', address: '123 Main St', phone: '+1-555-0100',
    hours: '9am-8pm', capacity: 12 });
  ['Alice', 'Bob', 'Carol'].forEach(name => {
    const id = uuid();
    stylists.set(id, { id, location_id: locId, name, specialties: [name === 'Alice' ? 'color' : 'cut'],
      commission_pct: 40, rating: +(4.5 + Math.random() * 0.5).toFixed(2) });
  });
  ['Haircut', 'Color', 'Manicure', 'Massage'].forEach(name => {
    const id = uuid();
    services.set(id, { id, name, duration_min: name === 'Massage' ? 60 : 45, price: name === 'Massage' ? 100 : 65, category: name.toLowerCase() });
  });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/locations', '/api/stylists', '/api/services', '/api/appointments', '/api/customers', '/api/products', '/api/sales', '/api/memberships']
})));

// Locations
app.get('/api/locations', (_req, res) => res.json(ok({ locations: [...locations.values()] })));
app.post('/api/locations', (req, res) => {
  const { name, address = '', phone = '', hours = '', capacity = 1 } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  locations.set(id, { id, name, address, phone, hours, capacity });
  res.status(201).json(ok({ location: locations.get(id) }));
});

// Stylists
app.get('/api/stylists', (req, res) => {
  let list = [...stylists.values()];
  if (req.query.location_id) list = list.filter(s => s.location_id === req.query.location_id);
  res.json(ok({ stylists: list }));
});
app.post('/api/stylists', (req, res) => {
  const { location_id, name, specialties = [], commission_pct = 40 } = req.body || {};
  if (!location_id || !name) return res.status(400).json(fail('location_id + name required'));
  if (!locations.has(location_id)) return res.status(400).json(fail('location_id invalid'));
  const id = uuid();
  stylists.set(id, { id, location_id, name, specialties, commission_pct, rating: 0 });
  res.status(201).json(ok({ stylist: stylists.get(id) }));
});

// Services
app.get('/api/services', (_req, res) => res.json(ok({ services: [...services.values()] })));
app.post('/api/services', (req, res) => {
  const { name, duration_min, price, category = 'general' } = req.body || {};
  if (!name || !duration_min || price === undefined) return res.status(400).json(fail('name + duration_min + price required'));
  const id = uuid();
  services.set(id, { id, name, duration_min, price, category });
  res.status(201).json(ok({ service: services.get(id) }));
});

// Customers
app.get('/api/customers', (_req, res) => res.json(ok({ customers: [...customers.values()] })));
app.post('/api/customers', (req, res) => {
  const { name, email, phone, vip = false } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  customers.set(id, { id, name, email: email || null, phone: phone || null, vip,
    total_visits: 0, total_spent: 0 });
  res.status(201).json(ok({ customer: customers.get(id) }));
});

// Appointments
app.get('/api/appointments', (req, res) => {
  let list = [...appointments.values()];
  if (req.query.stylist_id) list = list.filter(a => a.stylist_id === req.query.stylist_id);
  if (req.query.customer_id) list = list.filter(a => a.customer_id === req.query.customer_id);
  if (req.query.status) list = list.filter(a => a.status === req.query.status);
  res.json(ok({ appointments: list }));
});
app.post('/api/appointments', (req, res) => {
  const { location_id, stylist_id, customer_id, service_id, scheduled_at } = req.body || {};
  if (!location_id || !stylist_id || !customer_id || !service_id || !scheduled_at) {
    return res.status(400).json(fail('location_id + stylist_id + customer_id + service_id + scheduled_at required'));
  }
  if (!locations.has(location_id)) return res.status(400).json(fail('location_id invalid'));
  if (!stylists.has(stylist_id)) return res.status(400).json(fail('stylist_id invalid'));
  if (!customers.has(customer_id)) return res.status(400).json(fail('customer_id invalid'));
  if (!services.has(service_id)) return res.status(400).json(fail('service_id invalid'));
  // Conflict detection
  const conflict = [...appointments.values()].find(a => a.stylist_id === stylist_id
    && a.scheduled_at === scheduled_at && a.status !== 'cancelled');
  if (conflict) return res.status(400).json(fail('stylist already booked at this time'));
  const svc = services.get(service_id);
  const id = uuid();
  appointments.set(id, { id, location_id, stylist_id, customer_id, service_id,
    scheduled_at, status: 'scheduled', total: svc.price });
  res.status(201).json(ok({ appointment: appointments.get(id) }));
});
app.patch('/api/appointments/:id', (req, res) => {
  const a = appointments.get(req.params.id);
  if (!a) return res.status(404).json(fail('appointment not found'));
  if (req.body.status) {
    a.status = req.body.status;
    if (req.body.status === 'completed') {
      const cust = customers.get(a.customer_id);
      if (cust) { cust.total_visits++; cust.total_spent += a.total; customers.set(cust.id, cust); }
    }
  }
  appointments.set(a.id, a);
  res.json(ok({ appointment: a }));
});

// Products + Inventory
app.get('/api/products', (_req, res) => res.json(ok({ products: [...products.values()] })));
app.post('/api/products', (req, res) => {
  const { name, sku, price, stock = 0, category = 'retail' } = req.body || {};
  if (!name || price === undefined) return res.status(400).json(fail('name + price required'));
  const id = uuid();
  products.set(id, { id, name, sku: sku || null, price, stock, category });
  res.status(201).json(ok({ product: products.get(id) }));
});
app.patch('/api/products/:id', (req, res) => {
  const p = products.get(req.params.id);
  if (!p) return res.status(404).json(fail('product not found'));
  if (req.body.stock !== undefined) p.stock = req.body.stock;
  if (req.body.price !== undefined) p.price = req.body.price;
  products.set(p.id, p);
  res.json(ok({ product: p }));
});

// Retail Sales
app.get('/api/sales', (_req, res) => res.json(ok({ sales: [...sales.values()] })));
app.post('/api/sales', (req, res) => {
  const { location_id, customer_id, items, payment_method = 'card' } = req.body || {};
  if (!location_id || !Array.isArray(items) || items.length === 0) return res.status(400).json(fail('location_id + items[] required'));
  let total = 0;
  items.forEach(item => {
    const prod = products.get(item.product_id);
    if (prod) {
      prod.stock -= item.quantity || 1;
      products.set(prod.id, prod);
      total += prod.price * (item.quantity || 1);
    }
  });
  const id = uuid();
  sales.set(id, { id, location_id, customer_id: customer_id || null, items, total,
    payment_method, created: new Date().toISOString() });
  if (customer_id) {
    const cust = customers.get(customer_id);
    if (cust) { cust.total_spent += total; customers.set(cust.id, cust); }
  }
  res.status(201).json(ok({ sale: sales.get(id) }));
});

// Memberships
app.get('/api/memberships', (_req, res) => res.json(ok({ memberships: [...memberships.values()] })));
app.post('/api/memberships', (req, res) => {
  const { customer_id, tier = 'silver', start_date, end_date, visits_total = 12 } = req.body || {};
  if (!customer_id || !start_date) return res.status(400).json(fail('customer_id + start_date required'));
  if (!customers.has(customer_id)) return res.status(400).json(fail('customer_id invalid'));
  const id = uuid();
  memberships.set(id, { id, customer_id, tier, start_date,
    end_date: end_date || null, visits_total, visits_used: 0 });
  res.status(201).json(ok({ membership: memberships.get(id) }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
