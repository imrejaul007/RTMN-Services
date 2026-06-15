import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5030;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Stores
const products = new Map();
const orders = new Map();
const customers = new Map();
const inventory = new Map();
const suppliers = new Map();
const cart = new Map();

function initSampleData() {
  const sampleProducts = [
    { id: 'p1', name: 'Laptop', category: 'electronics', price: 999.99, sku: 'ELEC-001' },
    { id: 'p2', name: 'T-Shirt', category: 'clothing', price: 29.99, sku: 'CLTH-001' },
    { id: 'p3', name: 'Coffee Maker', category: 'home', price: 79.99, sku: 'HOME-001' },
  ];
  sampleProducts.forEach(p => {
    products.set(p.id, { ...p, createdAt: new Date().toISOString() });
    inventory.set(p.id, { productId: p.id, quantity: 100, reorderLevel: 20 });
  });
  logger.info('Retail OS initialized');
}
initSampleData();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'retail-os', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Products
app.get('/api/products', (req, res) => {
  const { category, minPrice, maxPrice, inStock } = req.query;
  let result = Array.from(products.values());
  if (category) result = result.filter(p => p.category === category);
  if (minPrice) result = result.filter(p => p.price >= parseFloat(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= parseFloat(maxPrice));
  if (inStock === 'true') {
    result = result.filter(p => (inventory.get(p.id)?.quantity || 0) > 0);
  }
  res.json({ success: true, count: result.length, products: result });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  res.json({ success: true, product, inventory: inventory.get(req.params.id) });
});

app.post('/api/products', (req, res) => {
  const { name, category, price, sku, description, images } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ success: false, error: 'Name, category, and price required' });
  }
  const product = {
    id: uuidv4(),
    name,
    category,
    price: parseFloat(price),
    sku: sku || `SKU-${Date.now()}`,
    description: description || '',
    images: images || [],
    createdAt: new Date().toISOString()
  };
  products.set(product.id, product);
  inventory.set(product.id, { productId: product.id, quantity: 0, reorderLevel: 10 });
  res.status(201).json({ success: true, product });
});

app.put('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  const updated = { ...product, ...req.body, id: product.id };
  products.set(product.id, updated);
  res.json({ success: true, product: updated });
});

// Inventory
app.get('/api/inventory', (req, res) => {
  const items = Array.from(inventory.values());
  const lowStock = items.filter(i => i.quantity <= i.reorderLevel);
  res.json({ success: true, count: items.length, inventory: items, lowStock: lowStock.length });
});

app.patch('/api/inventory/:productId', (req, res) => {
  const item = inventory.get(req.params.productId);
  if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found' });
  const { quantity, operation } = req.body;
  if (operation === 'add') item.quantity += quantity || 0;
  else if (operation === 'subtract') item.quantity = Math.max(0, item.quantity - (quantity || 0));
  else if (quantity !== undefined) item.quantity = quantity;
  if (req.body.reorderLevel) item.reorderLevel = req.body.reorderLevel;
  inventory.set(req.params.productId, item);
  res.json({ success: true, inventory: item });
});

// Customers
app.get('/api/customers', (req, res) => {
  const { tier } = req.query;
  let result = Array.from(customers.values());
  if (tier) result = result.filter(c => c.tier === tier);
  res.json({ success: true, count: result.length, customers: result });
});

app.post('/api/customers', (req, res) => {
  const { name, email, phone } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const customer = {
    id: uuidv4(),
    name,
    email: email || null,
    phone: phone || null,
    tier: 'bronze',
    loyaltyPoints: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString()
  };
  customers.set(customer.id, customer);
  res.status(201).json({ success: true, customer });
});

// Cart
app.post('/api/cart', (req, res) => {
  const { customerId, items } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Items required' });
  }
  const cartItems = items.map(i => {
    const product = products.get(i.productId);
    if (!product) throw new Error(`Product ${i.productId} not found`);
    return { ...i, product, subtotal: product.price * i.quantity };
  });
  const cartId = uuidv4();
  cart.set(cartId, {
    id: cartId,
    customerId: customerId || null,
    items: cartItems,
    subtotal: cartItems.reduce((s, i) => s + i.subtotal, 0),
    tax: 0,
    total: 0,
    createdAt: new Date().toISOString()
  });
  const c = cart.get(cartId);
  c.tax = c.subtotal * 0.08;
  c.total = c.subtotal + c.tax;
  cart.set(cartId, c);
  res.status(201).json({ success: true, cart: cart.get(cartId) });
});

// Orders
app.post('/api/orders', (req, res) => {
  const { cartId, customerId, shippingAddress, paymentMethod } = req.body;
  if (!cartId) return res.status(400).json({ success: false, error: 'Cart ID required' });
  const c = cart.get(cartId);
  if (!c) return res.status(404).json({ success: false, error: 'Cart not found' });

  // Check inventory
  for (const item of c.items) {
    const inv = inventory.get(item.productId);
    if (!inv || inv.quantity < item.quantity) {
      return res.status(400).json({ success: false, error: `Insufficient stock for ${item.product.name}` });
    }
  }

  // Deduct inventory
  for (const item of c.items) {
    inventory.get(item.productId).quantity -= item.quantity;
  }

  const order = {
    id: uuidv4(),
    orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
    customerId: c.customerId,
    items: c.items,
    subtotal: c.subtotal,
    tax: c.tax,
    total: c.total,
    shippingAddress: shippingAddress || {},
    paymentMethod: paymentMethod || 'card',
    status: 'processing',
    createdAt: new Date().toISOString()
  };
  orders.set(order.id, order);
  cart.delete(cartId);

  // Update customer stats
  if (customerId && customers.has(customerId)) {
    const cust = customers.get(customerId);
    cust.totalSpent += order.total;
    cust.loyaltyPoints += Math.floor(order.total);
  }

  res.status(201).json({ success: true, order });
});

app.get('/api/orders', (req, res) => {
  const { customerId, status } = req.query;
  let result = Array.from(orders.values());
  if (customerId) result = result.filter(o => o.customerId === customerId);
  if (status) result = result.filter(o => o.status === status);
  res.json({ success: true, count: result.length, orders: result });
});

app.patch('/api/orders/:id/status', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
  order.status = req.body.status || order.status;
  order.updatedAt = new Date().toISOString();
  orders.set(order.id, order);
  res.json({ success: true, order });
});

// Suppliers
app.get('/api/suppliers', (req, res) => {
  res.json({ success: true, count: suppliers.size, suppliers: Array.from(suppliers.values()) });
});

app.post('/api/suppliers', (req, res) => {
  const { name, contact, products } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const supplier = {
    id: uuidv4(),
    name,
    contact: contact || {},
    products: products || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };
  suppliers.set(supplier.id, supplier);
  res.status(201).json({ success: true, supplier });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = Array.from(orders.values()).filter(o => o.createdAt.startsWith(today));
  const totalRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const lowStock = Array.from(inventory.values()).filter(i => i.quantity <= i.reorderLevel);
  res.json({
    success: true,
    analytics: {
      totalProducts: products.size,
      totalOrders: orders.size,
      todayOrders: todayOrders.length,
      todayRevenue: totalRevenue.toFixed(2),
      totalCustomers: customers.size,
      lowStockItems: lowStock.length
    }
  });
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  logger.info(`🛒 Retail OS running on port ${PORT}`);
});

export default app;
