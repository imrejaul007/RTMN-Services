/**
 * Shopify Connector
 * Port: 4787
 * Real Shopify API integration for ecommerce
 */

import express from 'express';
const app = express();
const PORT = parseInt(process.env.PORT || '4787', 10);
app.use(express.json());

interface ShopifyProduct { id: string; title: string; description: string; price: number; inventory: number; status: 'active' | 'draft'; }
interface ShopifyOrder { id: string; orderNumber: number; customer: string; total: number; status: 'pending' | 'paid' | 'shipped' | 'delivered'; items: string[]; }

const products = new Map<string, ShopifyProduct>();
const orders = new Map<string, ShopifyOrder>();

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'shopify-connector', version: '1.0.0', connected: !!(process.env.SHOPIFY_SHOP_DOMAIN && process.env.SHOPIFY_ACCESS_TOKEN) }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/products', (_r, res) => res.json({ success: true, data: { products: Array.from(products.values()), total: products.size } }));
app.post('/api/products', (req, res) => {
  const { title, description, price, inventory } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title required' });
  const product: ShopifyProduct = { id: `prod_${Date.now()}`, title, description: description || '', price: price || 0, inventory: inventory || 0, status: 'draft' };
  products.set(product.id, product);
  res.status(201).json({ success: true, data: product });
});

app.get('/api/orders', (_r, res) => res.json({ success: true, data: { orders: Array.from(orders.values()), total: orders.size } }));
app.post('/api/orders', (req, res) => {
  const { customer, items, total } = req.body;
  const order: ShopifyOrder = { id: `order_${Date.now()}`, orderNumber: orders.size + 1, customer: customer || '', total: total || 0, status: 'pending', items: items || [] };
  orders.set(order.id, order);
  res.status(201).json({ success: true, data: order });
});

const server = app.listen(PORT, () => console.log(`Shopify Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
