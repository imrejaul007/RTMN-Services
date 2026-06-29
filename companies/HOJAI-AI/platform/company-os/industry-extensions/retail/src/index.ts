/**
 * Retail Extension - Products, Inventory, POS
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5030;

interface Store { products: Map<string, any>; inventory: Map<string, any>; sales: Map<string, any>; }
const stores = new Map<string, Store>();
const getStore = (tid: string) => {
  if (!stores.has(tid)) stores.set(tid, { products: new Map(), inventory: new Map(), sales: new Map() });
  return stores.get(tid)!;
};

// Products
app.get('/api/products', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ products: Array.from(getStore(tid).products.values()) });
});
app.post('/api/products', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const product = { id: `prod_${uuidv4().slice(0,8)}`, tenantId: tid, ...req.body };
  getStore(tid).products.set(product.id, product);
  res.status(201).json(product);
});

// Sales
app.post('/api/sales', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const sale = { id: `sale_${uuidv4().slice(0,8)}`, tenantId: tid, createdAt: new Date().toISOString(), ...req.body };
  getStore(tid).sales.set(sale.id, sale);
  res.status(201).json(sale);
});
app.get('/api/sales', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ sales: Array.from(getStore(tid).sales.values()) });
});

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'retail-extension', port: PORT }));
app.listen(PORT, () => console.log(`Retail Extension running on port ${PORT}`));
export default app;
