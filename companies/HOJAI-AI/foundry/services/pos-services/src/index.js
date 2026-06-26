/**
 * POS Services
 * Port: 4773
 * Point of Sale, Billing, Inventory, Customer Management
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4773;

const transactions = new Map();
const customers = new Map();
const inventory = new Map();
const invoices = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'pos-services' }));

// Transactions / Billing
app.post('/api/transactions', (req, res) => {
  const { items, customerId, paymentMethod } = req.body;
  const subtotal = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const tax = subtotal * 0.18;
  const discount = req.body.discount || 0;
  const total = subtotal + tax - discount;

  const tx = { id: uuidv4(), items, customerId, subtotal, tax, discount, total, paymentMethod, status: 'completed', createdAt: new Date().toISOString() };
  transactions.set(tx.id, tx);

  // Generate invoice
  const invoice = { id: `INV${Date.now()}`, transactionId: tx.id, total, status: 'issued' };
  invoices.set(invoice.id, invoice);

  res.status(201).json({ success: true, transaction: tx, invoice });
});

app.get('/api/transactions', (req, res) => {
  const { date, customerId } = req.query;
  let results = Array.from(transactions.values());
  if (customerId) results = results.filter(t => t.customerId === customerId);
  res.json({ success: true, count: results.length, transactions: results });
});

// Customers
app.post('/api/customers', (req, res) => {
  const customer = { id: uuidv4(), ...req.body, points: 0, createdAt: new Date().toISOString() };
  customers.set(customer.id, customer);
  res.status(201).json({ success: true, customer });
});
app.get('/api/customers', (_, res) => res.json({ success: true, customers: Array.from(customers.values()) }));
app.get('/api/customers/:id', (req, res) => {
  const c = customers.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Customer not found' });
  res.json({ success: true, customer: c });
});

// Inventory
app.get('/api/inventory', (_, res) => res.json({ success: true, items: Array.from(inventory.values()) }));
app.post('/api/inventory', (req, res) => {
  const item = { id: uuidv4(), ...req.body, stock: req.body.stock || 0 };
  inventory.set(item.id, item);
  res.status(201).json({ success: true, item });
});
app.put('/api/inventory/:id', (req, res) => {
  const item = inventory.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const updated = { ...item, ...req.body };
  inventory.set(item.id, updated);
  res.json({ success: true, item: updated });
});

// Invoices
app.get('/api/invoices', (_, res) => res.json({ success: true, invoices: Array.from(invoices.values()) }));
app.get('/api/invoices/:id', (req, res) => {
  const inv = invoices.get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ success: true, invoice: inv });
});

app.listen(PORT, () => console.log(`\n💳 POS Services — PORT ${PORT}\n`));
export default app;
