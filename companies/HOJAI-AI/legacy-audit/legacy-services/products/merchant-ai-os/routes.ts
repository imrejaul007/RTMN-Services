/**
 * Merchant AI OS - API Routes
 */

import express from 'express';
import { MerchantAIOS } from './index';

const app = express();
const os = new MerchantAIOS();

// Middleware
app.use(express.json({ limit: "10kb" }));

// ========== CUSTOMERS ==========

app.get('/api/customers', async (req, res) => {
  const customers = await os.customers.list({
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  });
  res.json({ success: true, data: customers });
});

app.get('/api/customers/:id', async (req, res) => {
  const customer = await os.customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  res.json({ success: true, data: customer });
});

app.post('/api/customers', async (req, res) => {
  const customer = await os.customers.create(req.body);
  res.json({ success: true, data: customer });
});

app.patch('/api/customers/:id', async (req, res) => {
  const customer = await os.customers.update(req.params.id, req.body);
  res.json({ success: true, data: customer });
});

app.delete('/api/customers/:id', async (req, res) => {
  await os.customers.delete(req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

app.get('/api/customers/search', async (req, res) => {
  const q = req.query.q as string;
  const customers = await os.customers.search(q);
  res.json({ success: true, data: customers });
});

app.get('/api/customers/:id/timeline', async (req, res) => {
  const timeline = await os.customers.getTimeline(req.params.id);
  res.json({ success: true, data: timeline });
});

// ========== ORDERS ==========

app.get('/api/orders', async (req, res) => {
  const orders = await os.orders.list({
    status: req.query.status as any,
    limit: 20,
  });
  res.json({ success: true, data: orders });
});

app.get('/api/orders/:id', async (req, res) => {
  const order = await os.orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  res.json({ success: true, data: order });
});

app.post('/api/orders', async (req, res) => {
  const order = await os.orders.create(req.body);
  res.json({ success: true, data: order });
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const order = await os.orders.updateStatus(req.params.id, status);
  res.json({ success: true, data: order });
});

app.get('/api/orders/stats', async (req, res) => {
  const stats = await os.orders.getStats('merchant_1');
  res.json({ success: true, data: stats });
});

// ========== PRODUCTS ==========

app.get('/api/products', async (req, res) => {
  const products = await os.products.list({ limit: 50 });
  res.json({ success: true, data: products });
});

app.get('/api/products/:id', async (req, res) => {
  const product = await os.products.get(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  res.json({ success: true, data: product });
});

app.post('/api/products', async (req, res) => {
  const product = await os.products.create(req.body);
  res.json({ success: true, data: product });
});

app.patch('/api/products/:id', async (req, res) => {
  const product = await os.products.update(req.params.id, req.body);
  res.json({ success: true, data: product });
});

app.delete('/api/products/:id', async (req, res) => {
  await os.products.delete(req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

app.get('/api/products/search', async (req, res) => {
  const q = req.query.q as string;
  const products = await os.products.search(q);
  res.json({ success: true, data: products });
});

// ========== AI AGENTS ==========

app.get('/api/agents', async (req, res) => {
  const agents = await os.agents.list();
  res.json({ success: true, data: agents });
});

app.post('/api/agents', async (req, res) => {
  const agent = await os.agents.create(req.body);
  res.json({ success: true, data: agent });
});

app.post('/api/agents/:id/invoke', async (req, res) => {
  const { message, context } = req.body;
  const response = await os.agents.invoke(req.params.id, message, context);
  res.json({ success: true, data: response });
});

app.get('/api/agents/:id/stats', async (req, res) => {
  const stats = await os.agents.getStats(req.params.id);
  res.json({ success: true, data: stats });
});

// ========== WORKFLOWS ==========

app.get('/api/workflows', async (req, res) => {
  const workflows = await os.workflows.list();
  res.json({ success: true, data: workflows });
});

app.post('/api/workflows', async (req, res) => {
  const workflow = await os.workflows.create(req.body);
  res.json({ success: true, data: workflow });
});

app.post('/api/workflows/:id/execute', async (req, res) => {
  const run = await os.workflows.execute(req.params.id, req.body);
  res.json({ success: true, data: run });
});

// ========== ANALYTICS ==========

app.get('/api/analytics/dashboard', async (req, res) => {
  const dashboard = await os.analytics.getDashboard('merchant_1');
  res.json({ success: true, data: dashboard });
});

app.get('/api/analytics/revenue', async (req, res) => {
  const revenue = await os.analytics.getRevenue('merchant_1', {
    start: req.query.start as string,
    end: req.query.end as string,
  });
  res.json({ success: true, data: revenue });
});

app.get('/api/analytics/customers', async (req, res) => {
  const customers = await os.analytics.getCustomers('merchant_1');
  res.json({ success: true, data: customers });
});

app.get('/api/analytics/products/top', async (req, res) => {
  const products = await os.analytics.getTopProducts('merchant_1', 5);
  res.json({ success: true, data: products });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'merchant-ai-os',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 4600;
app.listen(PORT, () => {
  console.log(`Merchant AI OS running on port ${PORT}`);
});

export default app;
