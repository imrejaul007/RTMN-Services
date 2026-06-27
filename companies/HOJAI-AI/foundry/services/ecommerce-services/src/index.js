/**
 * E-Commerce Services
 * Port: 4710
 * Inventory, Fulfillment, Returns, Catalog, Seller Management
 */
import express from 'express';
import cors from 'cors';
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
app.use(cors(), express.json());
const PORT = process.env.PORT || 4710;

// Stores
const products = new Map();
const orders = new Map();
const returns = new Map();
const sellers = new Map();

// Seed sample products
const sampleProducts = [
  { id: 'p1', name: 'iPhone 15 Pro', category: 'electronics', price: 99900, stock: 50, seller: 'apple_store' },
  { id: 'p2', name: 'Samsung Galaxy S24', category: 'electronics', price: 79999, stock: 30, seller: 'samsung_india' },
  { id: 'p3', name: 'Nike Air Max', category: 'fashion', price: 8995, stock: 100, seller: 'nike_india' },
  { id: 'p4', name: 'Levi\'s Jeans', category: 'fashion', price: 2999, stock: 200, seller: 'levis_in' },
  { id: 'p5', name: 'Prestige Cookware Set', category: 'home', price: 5999, stock: 25, seller: 'home_essentials' },
];

sampleProducts.forEach(p => products.set(p.id, p));

// ── Catalog / Products ────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'ecommerce-services' }));

app.get('/api/products', (req, res) => {
  const { category, seller, minPrice, maxPrice, search } = req.query;
  let results = Array.from(products.values());

  if (category) results = results.filter(p => p.category === category);
  if (seller) results = results.filter(p => p.seller === seller);
  if (minPrice) results = results.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) results = results.filter(p => p.price <= parseInt(maxPrice));
  if (search) results = results.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  res.json({ success: true, count: results.length, products: results });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true, product });
});

app.post('/api/products', requireInternal, (req, res) => {
  const product = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  products.set(product.id, product);
  res.status(201).json({ success: true, product });
});

app.put('/api/products/:id', requireInternal, (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const updated = { ...product, ...req.body };
  products.set(product.id, updated);
  res.json({ success: true, product: updated });
});

app.delete('/api/products/:id', requireInternal, (req, res) => {
  if (!products.has(req.params.id)) return res.status(404).json({ error: 'Product not found' });
  products.delete(req.params.id);
  res.json({ success: true, message: 'Product deleted' });
});

// ── Inventory ────────────────────────────────────────────────────

app.get('/api/inventory', (req, res) => {
  const { lowStock } = req.query;
  let items = Array.from(products.values()).map(p => ({
    productId: p.id,
    name: p.name,
    stock: p.stock,
    status: p.stock === 0 ? 'out_of_stock' : p.stock < 10 ? 'low_stock' : 'in_stock'
  }));

  if (lowStock === 'true') items = items.filter(i => i.stock < 10);
  res.json({ success: true, count: items.length, inventory: items });
});

app.post('/api/inventory/adjust', requireInternal, (req, res) => {
  const { productId, adjustment, reason } = req.body;
  const product = products.get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  product.stock = Math.max(0, product.stock + adjustment);
  products.set(productId, product);

  res.json({
    success: true,
    inventory: { productId, newStock: product.stock, adjustment, reason }
  });
});

// ── Orders ───────────────────────────────────────────────────────

app.post('/api/orders', requireInternal, (req, res) => {
  const { items, buyer, address, paymentMethod } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Items required' });
  }

  const orderItems = items.map(item => {
    const product = products.get(item.productId);
    if (!product) return null;
    if (product.stock < item.quantity) {
      return { ...item, error: 'insufficient_stock' };
    }
    product.stock -= item.quantity;
    products.set(product.id, product);
    return { ...item, price: product.price, total: product.price * item.quantity };
  }).filter(Boolean);

  const hasErrors = orderItems.some(i => i.error);
  if (hasErrors) {
    return res.status(400).json({ error: 'Some items have issues', items: orderItems });
  }

  const total = orderItems.reduce((sum, i) => sum + i.total, 0);
  const order = {
    id: `ORD${Date.now()}`,
    items: orderItems,
    buyer,
    address,
    paymentMethod,
    total,
    status: 'confirmed',
    trackingId: `TRK${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  orders.set(order.id, order);
  res.status(201).json({ success: true, order });
});

app.get('/api/orders', (req, res) => {
  const { buyer, seller, status } = req.query;
  let results = Array.from(orders.values());

  if (buyer) results = results.filter(o => o.buyer?.id === buyer);
  if (seller) results = results.filter(o => o.items.some(i => i.seller === seller));
  if (status) results = results.filter(o => o.status === status);

  res.json({ success: true, count: results.length, orders: results });
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ success: true, order });
});

app.put('/api/orders/:id/status', requireInternal, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  order.status = req.body.status;
  order.updatedAt = new Date().toISOString();
  orders.set(order.id, order);

  res.json({ success: true, order });
});

// ── Returns ──────────────────────────────────────────────────────

app.post('/api/returns', requireInternal, (req, res) => {
  const { orderId, items, reason } = req.body;
  const order = orders.get(orderId);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const returnReq = {
    id: `RET${Date.now()}`,
    orderId,
    items,
    reason,
    status: 'requested',
    refundAmount: items.reduce((sum, i) => {
      const item = order.items.find(oi => oi.productId === i.productId);
      return sum + (item ? item.total : 0);
    }, 0),
    createdAt: new Date().toISOString()
  };

  returns.set(returnReq.id, returnReq);
  res.status(201).json({ success: true, return: returnReq });
});

app.get('/api/returns', (req, res) => {
  const { status, seller } = req.query;
  let results = Array.from(returns.values());

  if (status) results = results.filter(r => r.status === status);

  res.json({ success: true, count: results.length, returns: results });
});

app.put('/api/returns/:id/status', requireInternal, (req, res) => {
  const ret = returns.get(req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return not found' });

  ret.status = req.body.status;
  ret.updatedAt = new Date().toISOString();
  returns.set(ret.id, ret);

  // Restock items if approved
  if (req.body.status === 'approved') {
    const order = orders.get(ret.orderId);
    if (order) {
      ret.items.forEach(rItem => {
        const product = products.get(rItem.productId);
        if (product) {
          product.stock += rItem.quantity;
          products.set(product.id, product);
        }
      });
    }
  }

  res.json({ success: true, return: ret });
});

// ── Sellers ──────────────────────────────────────────────────────

app.post('/api/sellers', requireInternal, (req, res) => {
  const seller = {
    id: uuidv4(),
    ...req.body,
    status: 'pending',
    rating: 0,
    totalSales: 0,
    createdAt: new Date().toISOString()
  };
  sellers.set(seller.id, seller);
  res.status(201).json({ success: true, seller });
});

app.get('/api/sellers', (req, res) => {
  const results = Array.from(sellers.values());
  res.json({ success: true, count: results.length, sellers: results });
});

app.get('/api/sellers/:id', (req, res) => {
  const seller = sellers.get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Seller not found' });
  res.json({ success: true, seller });
});

app.put('/api/sellers/:id/status', requireInternal, (req, res) => {
  const seller = sellers.get(req.params.id);
  if (!seller) return res.status(404).json({ error: 'Seller not found' });

  seller.status = req.body.status;
  seller.updatedAt = new Date().toISOString();
  sellers.set(seller.id, seller);

  res.json({ success: true, seller });
});

// ── Search / Discovery ──────────────────────────────────────────

app.get('/api/search', (req, res) => {
  const { q, category, minPrice, maxPrice, sort } = req.query;

  let results = Array.from(products.values());

  if (q) {
    const query = q.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  }

  if (category) results = results.filter(p => p.category === category);
  if (minPrice) results = results.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) results = results.filter(p => p.price <= parseInt(maxPrice));

  if (sort === 'price_asc') results.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') results.sort((a, b) => b.price - a.price);
  if (sort === 'name') results.sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    success: true,
    count: results.length,
    query: q,
    products: results
  });
});

// ── Recommendations ─────────────────────────────────────────────

app.get('/api/recommendations', (req, res) => {
  const { productId, userId } = req.query;

  // Simple recommendation: same category products
  const product = products.get(productId);
  if (!product) return res.json({ success: true, recommendations: [] });

  const recommendations = Array.from(products.values())
    .filter(p => p.id !== productId && p.category === product.category)
    .slice(0, 5);

  res.json({ success: true, recommendations });
});

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════════╗
║  E-Commerce Services — PORT ${PORT}          ║
║  Inventory • Fulfillment • Returns  ║
╠══════════════════════════════════════════════╣
║  Products  Orders  Returns  Sellers ║
╚══════════════════════════════════════════════╝
`));

export default app;
