import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5010;

// Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory data stores
const menuItems = new Map();
const orders = new Map();
const tables = new Map();
const kitchenQueue = [];
const reservations = new Map();
const customers = new Map();
const reviews = new Map();

// Digital Twins
const twins = {
  menu: { id: 'menu-twin', status: 'active', items: [] },
  order: { id: 'order-twin', status: 'active', activeOrders: [] },
  kitchen: { id: 'kitchen-twin', status: 'active', queue: [] },
  table: { id: 'table-twin', status: 'active', occupancy: [] },
  customer: { id: 'customer-twin', status: 'active', loyalty: [] }
};

// Initialize sample data
function initializeSampleData() {
  // Sample menu items
  const sampleMenu = [
    { id: 'm1', name: 'Margherita Pizza', category: 'pizza', price: 12.99, prepTime: 15 },
    { id: 'm2', name: 'Chicken Alfredo', category: 'pasta', price: 14.99, prepTime: 18 },
    { id: 'm3', name: 'Caesar Salad', category: 'salad', price: 8.99, prepTime: 5 },
    { id: 'm4', name: 'Grilled Salmon', category: 'seafood', price: 22.99, prepTime: 20 },
    { id: 'm5', name: 'BBQ Ribs', category: 'meat', price: 19.99, prepTime: 25 }
  ];
  sampleMenu.forEach(item => menuItems.set(item.id, item));

  // Sample tables (20 tables)
  for (let i = 1; i <= 20; i++) {
    const table = {
      id: `t${i}`,
      capacity: i <= 10 ? 4 : 6,
      status: 'available',
      section: i <= 10 ? 'main' : 'patio'
    };
    tables.set(table.id, table);
  }

  // Update twins
  twins.menu.items = Array.from(menuItems.values());
  twins.table.occupancy = Array.from(tables.values());

  logger.info('Sample data initialized');
}

initializeSampleData();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'restaurant-os', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============= MENU ENDPOINTS =============

// Get full menu
app.get('/api/menu', (req, res) => {
  const { category, minPrice, maxPrice } = req.query;
  let items = Array.from(menuItems.values());

  if (category) items = items.filter(i => i.category === category);
  if (minPrice) items = items.filter(i => i.price >= parseFloat(minPrice));
  if (maxPrice) items = items.filter(i => i.price <= parseFloat(maxPrice));

  res.json({ success: true, count: items.length, items });
});

// Get menu item
app.get('/api/menu/:id', (req, res) => {
  const item = menuItems.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });
  res.json({ success: true, item });
});

// Create menu item
app.post('/api/menu', (req, res) => {
  const { name, category, price, prepTime, description, ingredients, calories, available } = req.body;

  if (!name || !category || !price) {
    return res.status(400).json({ success: false, error: 'Name, category, and price required' });
  }

  const item = {
    id: uuidv4(),
    name,
    category,
    price: parseFloat(price),
    prepTime: prepTime || 15,
    description: description || '',
    ingredients: ingredients || [],
    calories: calories || 0,
    available: available !== false,
    createdAt: new Date().toISOString()
  };

  menuItems.set(item.id, item);
  twins.menu.items.push(item);

  logger.info(`Menu item created: ${item.name}`);
  res.status(201).json({ success: true, item });
});

// Update menu item
app.put('/api/menu/:id', (req, res) => {
  const item = menuItems.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });

  const updated = { ...item, ...req.body, id: item.id, updatedAt: new Date().toISOString() };
  menuItems.set(item.id, updated);

  const twinIndex = twins.menu.items.findIndex(i => i.id === item.id);
  if (twinIndex >= 0) twins.menu.items[twinIndex] = updated;

  logger.info(`Menu item updated: ${updated.name}`);
  res.json({ success: true, item: updated });
});

// Delete menu item
app.delete('/api/menu/:id', (req, res) => {
  const item = menuItems.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });

  menuItems.delete(req.params.id);
  twins.menu.items = twins.menu.items.filter(i => i.id !== req.params.id);

  logger.info(`Menu item deleted: ${item.name}`);
  res.json({ success: true, message: 'Menu item deleted' });
});

// ============= ORDER ENDPOINTS =============

// Create order
app.post('/api/orders', (req, res) => {
  const { tableId, items, customerId, notes, orderType } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Order items required' });
  }

  const orderItems = items.map(i => {
    const menuItem = menuItems.get(i.itemId);
    if (!menuItem) throw new Error(`Item ${i.itemId} not found`);
    return { ...i, menuItem, subtotal: menuItem.price * (i.quantity || 1) };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const order = {
    id: uuidv4(),
    orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
    tableId: tableId || null,
    customerId: customerId || null,
    items: orderItems,
    subtotal,
    tax,
    total,
    status: 'pending',
    priority: 'normal',
    notes: notes || '',
    orderType: orderType || 'dine-in',
    createdAt: new Date().toISOString(),
    estimatedReady: new Date(Date.now() + 20 * 60000).toISOString()
  };

  orders.set(order.id, order);
  kitchenQueue.push({ orderId: order.id, ...order });
  twins.order.activeOrders.push(order);

  // Update table status
  if (tableId && tables.has(tableId)) {
    const table = tables.get(tableId);
    table.status = 'occupied';
    table.currentOrder = order.id;
  }

  logger.info(`Order created: ${order.orderNumber}, total: $${total.toFixed(2)}`);
  res.status(201).json({ success: true, order });
});

// Get orders
app.get('/api/orders', (req, res) => {
  const { status, tableId, date } = req.query;
  let allOrders = Array.from(orders.values());

  if (status) allOrders = allOrders.filter(o => o.status === status);
  if (tableId) allOrders = allOrders.filter(o => o.tableId === tableId);
  if (date) allOrders = allOrders.filter(o => o.createdAt.startsWith(date));

  res.json({ success: true, count: allOrders.length, orders: allOrders });
});

// Get order by ID
app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
  res.json({ success: true, order });
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  const { status, priority } = req.body;
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Valid: ${validStatuses.join(', ')}` });
  }

  if (status) order.status = status;
  if (priority) order.priority = priority;
  order.updatedAt = new Date().toISOString();

  // Update kitchen queue
  const kqIndex = kitchenQueue.findIndex(q => q.orderId === order.id);
  if (kqIndex >= 0) {
    if (status === 'completed' || status === 'cancelled') {
      kitchenQueue.splice(kqIndex, 1);
    } else {
      kitchenQueue[kqIndex].status = status;
    }
  }

  // Update twin
  const twinIndex = twins.order.activeOrders.findIndex(o => o.id === order.id);
  if (twinIndex >= 0) twins.order.activeOrders[twinIndex] = order;

  logger.info(`Order ${order.orderNumber} status: ${status || order.status}`);
  res.json({ success: true, order });
});

// Cancel order
app.delete('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  order.status = 'cancelled';
  order.cancelledAt = new Date().toISOString();

  const kqIndex = kitchenQueue.findIndex(q => q.orderId === order.id);
  if (kqIndex >= 0) kitchenQueue.splice(kqIndex, 1);

  twins.order.activeOrders = twins.order.activeOrders.filter(o => o.id !== order.id);

  logger.info(`Order cancelled: ${order.orderNumber}`);
  res.json({ success: true, order });
});

// ============= TABLE ENDPOINTS =============

// Get all tables
app.get('/api/tables', (req, res) => {
  const { status, section, minCapacity } = req.query;
  let allTables = Array.from(tables.values());

  if (status) allTables = allTables.filter(t => t.status === status);
  if (section) allTables = allTables.filter(t => t.section === section);
  if (minCapacity) allTables = allTables.filter(t => t.capacity >= parseInt(minCapacity));

  res.json({ success: true, count: allTables.length, tables: allTables });
});

// Get table
app.get('/api/tables/:id', (req, res) => {
  const table = tables.get(req.params.id);
  if (!table) return res.status(404).json({ success: false, error: 'Table not found' });
  res.json({ success: true, table });
});

// Update table
app.put('/api/tables/:id', (req, res) => {
  const table = tables.get(req.params.id);
  if (!table) return res.status(404).json({ success: false, error: 'Table not found' });

  const updated = { ...table, ...req.body, id: table.id };
  tables.set(table.id, updated);
  twins.table.occupancy = Array.from(tables.values());

  res.json({ success: true, table: updated });
});

// Reserve table
app.post('/api/tables/:id/reserve', (req, res) => {
  const table = tables.get(req.params.id);
  if (!table) return res.status(404).json({ success: false, error: 'Table not found' });

  const { customerId, guestCount, date, time, duration } = req.body;
  if (!customerId || !date || !time) {
    return res.status(400).json({ success: false, error: 'customerId, date, and time required' });
  }

  const reservation = {
    id: uuidv4(),
    tableId: table.id,
    customerId,
    guestCount: guestCount || table.capacity,
    date,
    time,
    duration: duration || 90,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  reservations.set(reservation.id, reservation);
  logger.info(`Table ${table.id} reserved for ${date} at ${time}`);
  res.status(201).json({ success: true, reservation });
});

// ============= KITCHEN QUEUE =============

// Get kitchen queue
app.get('/api/kitchen', (req, res) => {
  const { status } = req.query;
  let queue = kitchenQueue;

  if (status) queue = queue.filter(q => q.status === status);

  const stats = {
    pending: kitchenQueue.filter(q => q.status === 'pending').length,
    preparing: kitchenQueue.filter(q => q.status === 'preparing').length,
    ready: kitchenQueue.filter(q => q.status === 'ready').length,
    total: kitchenQueue.length
  };

  res.json({ success: true, queue, stats });
});

// Update kitchen item
app.patch('/api/kitchen/:orderId', (req, res) => {
  const queueItem = kitchenQueue.find(q => q.orderId === req.params.orderId);
  if (!queueItem) return res.status(404).json({ success: false, error: 'Order not in kitchen queue' });

  const { status, prepNotes } = req.body;
  if (status) queueItem.status = status;
  if (prepNotes) queueItem.prepNotes = prepNotes;

  res.json({ success: true, item: queueItem });
});

// ============= CUSTOMERS =============

// Create/Update customer
app.post('/api/customers', (req, res) => {
  const { name, email, phone, preferences } = req.body;

  if (!name && !email && !phone) {
    return res.status(400).json({ success: false, error: 'Name, email, or phone required' });
  }

  // Check if customer exists
  const existing = Array.from(customers.values()).find(
    c => (email && c.email === email) || (phone && c.phone === phone)
  );

  if (existing) {
    Object.assign(existing, req.body, { updatedAt: new Date().toISOString() });
    customers.set(existing.id, existing);
    return res.json({ success: true, customer: existing, isNew: false });
  }

  const customer = {
    id: uuidv4(),
    name: name || 'Guest',
    email: email || null,
    phone: phone || null,
    loyaltyPoints: 0,
    tier: 'bronze',
    preferences: preferences || {},
    visitCount: 1,
    totalSpent: 0,
    createdAt: new Date().toISOString()
  };

  customers.set(customer.id, customer);
  twins.customer.loyalty.push(customer);

  logger.info(`New customer: ${customer.name}`);
  res.status(201).json({ success: true, customer, isNew: true });
});

// Get customers
app.get('/api/customers', (req, res) => {
  const { tier, minVisits, minSpent } = req.query;
  let allCustomers = Array.from(customers.values());

  if (tier) allCustomers = allCustomers.filter(c => c.tier === tier);
  if (minVisits) allCustomers = allCustomers.filter(c => c.visitCount >= parseInt(minVisits));
  if (minSpent) allCustomers = allCustomers.filter(c => c.totalSpent >= parseFloat(minSpent));

  res.json({ success: true, count: allCustomers.length, customers: allCustomers });
});

// Add loyalty points
app.post('/api/customers/:id/points', (req, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

  const { points, amount } = req.body;
  const earned = amount ? Math.floor(amount * 10) : (points || 0);
  customer.loyaltyPoints += earned;
  customer.totalSpent += amount || 0;
  customer.visitCount++;

  // Update tier
  if (customer.loyaltyPoints >= 5000) customer.tier = 'platinum';
  else if (customer.loyaltyPoints >= 2000) customer.tier = 'gold';
  else if (customer.loyaltyPoints >= 500) customer.tier = 'silver';

  customers.set(customer.id, customer);
  res.json({ success: true, customer });
});

// ============= REVIEWS =============

// Create review
app.post('/api/reviews', (req, res) => {
  const { customerId, orderId, rating, comment, service } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating 1-5 required' });
  }

  const review = {
    id: uuidv4(),
    customerId: customerId || null,
    orderId: orderId || null,
    rating,
    comment: comment || '',
    service: service || 3,
    food: service || 3,
    ambiance: service || 3,
    status: 'published',
    createdAt: new Date().toISOString()
  };

  reviews.set(review.id, review);
  logger.info(`New review: ${rating} stars`);
  res.status(201).json({ success: true, review });
});

// Get reviews
app.get('/api/reviews', (req, res) => {
  const { minRating, maxRating } = req.query;
  let allReviews = Array.from(reviews.values());

  if (minRating) allReviews = allReviews.filter(r => r.rating >= parseInt(minRating));
  if (maxRating) allReviews = allReviews.filter(r => r.rating <= parseInt(maxRating));

  const avgRating = allReviews.length > 0
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    : 0;

  res.json({ success: true, count: allReviews.length, reviews: allReviews, averageRating: avgRating.toFixed(1) });
});

// ============= ANALYTICS =============

// Get analytics
app.get('/api/analytics', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = Array.from(orders.values()).filter(o => o.createdAt.startsWith(today));

  const totalRevenue = todayOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const orderCount = todayOrders.filter(o => o.status !== 'cancelled').length;
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  const availableTables = Array.from(tables.values()).filter(t => t.status === 'available').length;
  const occupiedTables = Array.from(tables.values()).filter(t => t.status === 'occupied').length;

  const topItems = {};
  todayOrders.forEach(order => {
    order.items.forEach(item => {
      topItems[item.menuItem?.name || item.name] = (topItems[item.menuItem?.name || item.name] || 0) + item.quantity;
    });
  });

  const topMenuItems = Object.entries(topItems)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  res.json({
    success: true,
    analytics: {
      date: today,
      revenue: { total: totalRevenue.toFixed(2), avgPerOrder: avgOrderValue.toFixed(2) },
      orders: { count: orderCount, pending: kitchenQueue.length },
      tables: { available: availableTables, occupied: occupiedTables, total: tables.size },
      kitchen: { queue: kitchenQueue.length, avgPrepTime: 18 },
      topMenuItems
    }
  });
});

// ============= DIGITAL TWINS =============

// Get all twins
app.get('/api/twins', (req, res) => {
  res.json({ success: true, twins });
});

// Get specific twin
app.get('/api/twins/:name', (req, res) => {
  const twin = twins[req.params.name];
  if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });
  res.json({ success: true, twin });
});

// Sync twins
app.post('/api/twins/sync', (req, res) => {
  twins.menu.items = Array.from(menuItems.values());
  twins.order.activeOrders = Array.from(orders.values()).filter(o => !['completed', 'cancelled'].includes(o.status));
  twins.kitchen.queue = kitchenQueue;
  twins.table.occupancy = Array.from(tables.values());
  twins.customer.loyalty = Array.from(customers.values());

  logger.info('All twins synchronized');
  res.json({ success: true, twins });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🍽️  Restaurant OS running on port ${PORT}`);
});

export default app;
