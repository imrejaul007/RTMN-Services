/**
 * ERP Services
 * Port: 4775
 * Inventory, HR, Finance, Projects, Manufacturing
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4775;

const employees = new Map();
const projects = new Map();
const inventory = new Map();
const invoices = new Map();
const purchaseOrders = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'erp-services' }));

// HR
app.post('/api/employees', (req, res) => {
  const emp = { id: uuidv4(), ...req.body, status: 'active', joinedAt: new Date().toISOString() };
  employees.set(emp.id, emp);
  res.status(201).json({ success: true, employee: emp });
});
app.get('/api/employees', (_, res) => res.json({ success: true, employees: Array.from(employees.values()) }));
app.get('/api/employees/:id', (req, res) => {
  const e = employees.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Employee not found' });
  res.json({ success: true, employee: e });
});

// Projects
app.post('/api/projects', (req, res) => {
  const proj = { id: uuidv4(), ...req.body, status: 'planning', progress: 0, createdAt: new Date().toISOString() };
  projects.set(proj.id, proj);
  res.status(201).json({ success: true, project: proj });
});
app.get('/api/projects', (req, res) => {
  const { status } = req.query;
  let results = Array.from(projects.values());
  if (status) results = results.filter(p => p.status === status);
  res.json({ success: true, projects: results });
});
app.put('/api/projects/:id/status', (req, res) => {
  const p = projects.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  p.status = req.body.status;
  projects.set(p.id, p);
  res.json({ success: true, project: p });
});

// Inventory
app.get('/api/inventory', (_, res) => res.json({ success: true, items: Array.from(inventory.values()) }));
app.post('/api/inventory', (req, res) => {
  const item = { id: uuidv4(), ...req.body, quantity: req.body.quantity || 0 };
  inventory.set(item.id, item);
  res.status(201).json({ success: true, item });
});

// Finance / Invoices
app.post('/api/invoices', (req, res) => {
  const inv = { id: `INV${Date.now()}`, ...req.body, status: 'draft', createdAt: new Date().toISOString() };
  invoices.set(inv.id, inv);
  res.status(201).json({ success: true, invoice: inv });
});
app.get('/api/invoices', (req, res) => {
  const { status } = req.query;
  let results = Array.from(invoices.values());
  if (status) results = results.filter(i => i.status === status);
  res.json({ success: true, invoices: results });
});

// Purchase Orders
app.post('/api/purchase-orders', (req, res) => {
  const po = { id: `PO${Date.now()}`, ...req.body, status: 'pending' };
  purchaseOrders.set(po.id, po);
  res.status(201).json({ success: true, purchaseOrder: po });
});
app.get('/api/purchase-orders', (_, res) => res.json({ success: true, orders: Array.from(purchaseOrders.values()) }));

// Dashboard Stats
app.get('/api/dashboard', (_, res) => {
  res.json({
    success: true,
    stats: {
      employees: employees.size,
      projects: projects.size,
      activeProjects: Array.from(projects.values()).filter(p => p.status === 'active').length,
      inventoryItems: inventory.size,
      invoices: invoices.size,
      pendingOrders: purchaseOrders.size
    }
  });
});

app.listen(PORT, () => console.log(`\n🏢 ERP Services — PORT ${PORT}\n`));
export default app;
