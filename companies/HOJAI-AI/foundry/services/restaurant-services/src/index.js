/**
 * Restaurant Services
 * Port: 4770
 * POS, Menu, Kitchen Display, Table Management, Delivery
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
const PORT = process.env.PORT || 4770;

const orders = new Map();
const tables = new Map();
const menu = new Map();
const kds = []; // Kitchen Display System

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'restaurant-services' }));

// Menu
app.get('/api/menu', (_, res) => res.json({ success: true, items: Array.from(menu.values()) }));
app.post('/api/menu', requireInternal, (req, res) => {
  const item = { id: uuidv4(), ...req.body, available: true };
  menu.set(item.id, item);
  res.status(201).json({ success: true, item });
});

// Tables
app.get('/api/tables', (_, res) => res.json({ success: true, tables: Array.from(tables.values()) }));
app.post('/api/tables', requireInternal, (req, res) => {
  const table = { id: uuidv4(), ...req.body, status: 'available' };
  tables.set(table.id, table);
  res.status(201).json({ success: true, table });
});
app.put('/api/tables/:id/status', requireInternal, (req, res) => {
  const t = tables.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Table not found' });
  t.status = req.body.status;
  tables.set(t.id, t);
  res.json({ success: true, table: t });
});

// Orders
app.post('/api/orders', requireInternal, (req, res) => {
  const { items, tableId, type } = req.body;
  const order = { id: uuidv4(), items, tableId, type, status: 'received', kds: [], createdAt: new Date().toISOString() };
  kds.push(order);
  orders.set(order.id, order);
  res.status(201).json({ success: true, order });
});

app.get('/api/orders', (req, res) => {
  const { status } = req.query;
  let results = Array.from(orders.values());
  if (status) results = results.filter(o => o.status === status);
  res.json({ success: true, count: results.length, orders: results });
});

app.put('/api/orders/:id/status', requireInternal, (req, res) => {
  const o = orders.get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  o.status = req.body.status;
  orders.set(o.id, o);
  res.json({ success: true, order: o });
});

// KDS
app.get('/api/kds', (_, res) => res.json({ success: true, orders: kds.filter(o => o.status !== 'served') }));

// Billing
app.post('/api/orders/:id/bill', requireInternal, (req, res) => {
  const o = orders.get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  const subtotal = o.items.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const tax = subtotal * 0.18;
  res.json({ success: true, bill: { orderId: o.id, subtotal, tax, total: subtotal + tax } });
});

app.listen(PORT, () => console.log(`\n🍽️  Restaurant Services — PORT ${PORT}\n`));
export default app;
