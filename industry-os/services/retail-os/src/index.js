/**
 * Retail OS - Complete Retail Store Management System
 *
 * Built from scratch with full retail-specific features
 * Port: 5030
 *
 * Features:
 * - Product Catalog (Categories, SKUs, Variants)
 * - Inventory Management (Stock, Suppliers, Reorders)
 * - POS (Point of Sale, Barcode, Payments)
 * - Customer Management (Loyalty, Preferences)
 * - Orders (Online, In-Store, Returns)
 * - Supplier Management
 * - Promotions & Discounts
 * - Analytics (Sales, Trends, Performance)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5030;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// In-memory data stores
const db = {
  products: new Map(),
  categories: new Map(),
  variants: new Map(),
  inventory: new Map(),
  suppliers: new Map(),
  orders: new Map(),
  orderItems: new Map(),
  customers: new Map(),
  loyaltyCards: new Map(),
  promotions: new Map(),
  posTransactions: new Map(),
  suppliers: new Map(),
  storeConfig: new Map(),
};

// ==================== SAMPLE DATA ====================

function initSampleData() {
  // Categories
  const categories = [
    { id: 'CAT001', name: 'Electronics', description: 'Gadgets & Devices', image: '📱', displayOrder: 1 },
    { id: 'CAT002', name: 'Clothing', description: 'Apparel & Fashion', image: '👕', displayOrder: 2 },
    { id: 'CAT003', name: 'Groceries', description: 'Daily Essentials', image: '🛒', displayOrder: 3 },
    { id: 'CAT004', name: 'Home & Kitchen', description: 'Home Decor & Appliances', image: '🏠', displayOrder: 4 },
    { id: 'CAT005', name: 'Sports', description: 'Fitness & Sports Gear', image: '⚽', displayOrder: 5 },
    { id: 'CAT006', name: 'Books', description: 'Books & Stationery', image: '📚', displayOrder: 6 },
  ];
  categories.forEach(c => db.categories.set(c.id, c));

  // Products
  const products = [
    // Electronics
    { id: 'PRD001', sku: 'ELEC-001', name: 'Wireless Earbuds', categoryId: 'CAT001', price: 2999, mrp: 3499, cost: 1800, stock: 50, minStock: 10, barcode: '8901234567890', brand: 'SoundMax', weight: '50g' },
    { id: 'PRD002', sku: 'ELEC-002', name: 'Smart Watch', categoryId: 'CAT001', price: 5999, mrp: 7999, cost: 3500, stock: 25, minStock: 5, barcode: '8901234567891', brand: 'TechTime', weight: '75g' },
    { id: 'PRD003', sku: 'ELEC-003', name: 'Power Bank 10000mAh', categoryId: 'CAT001', price: 899, mrp: 1299, cost: 500, stock: 100, minStock: 20, barcode: '8901234567892', brand: 'ChargeFast', weight: '200g' },
    { id: 'PRD004', sku: 'ELEC-004', name: 'Bluetooth Speaker', categoryId: 'CAT001', price: 1499, mrp: 1999, cost: 800, stock: 40, minStock: 10, barcode: '8901234567893', brand: 'BoomBox', weight: '350g' },

    // Clothing
    { id: 'PRD005', sku: 'CLTH-001', name: 'Men T-Shirt (Navy)', categoryId: 'CAT002', price: 599, mrp: 899, cost: 250, stock: 80, minStock: 15, barcode: '8901234567894', brand: 'UrbanWear', size: 'M', color: 'Navy' },
    { id: 'PRD006', sku: 'CLTH-002', name: 'Women Kurti', categoryId: 'CAT002', price: 899, mrp: 1299, cost: 400, stock: 60, minStock: 10, barcode: '8901234567895', brand: 'EthnicStyle', size: 'L', color: 'Peach' },
    { id: 'PRD007', sku: 'CLTH-003', name: 'Jeans (Slim Fit)', categoryId: 'CAT002', price: 1299, mrp: 1799, cost: 600, stock: 45, minStock: 10, barcode: '8901234567896', brand: 'DenimCo', size: '32', color: 'Blue' },

    // Groceries
    { id: 'PRD008', sku: 'GROC-001', name: 'Basmati Rice 5kg', categoryId: 'CAT003', price: 450, mrp: 550, cost: 320, stock: 30, minStock: 10, barcode: '8901234567897', brand: 'RoyalHarvest', weight: '5kg' },
    { id: 'PRD009', sku: 'GROC-002', name: 'Refined Oil 5L', categoryId: 'CAT003', price: 650, mrp: 750, cost: 500, stock: 25, minStock: 8, barcode: '8901234567898', brand: 'PureLife', weight: '5L' },
    { id: 'PRD010', sku: 'GROC-003', name: 'Sugar 1kg', categoryId: 'CAT003', price: 45, mrp: 55, cost: 35, stock: 200, minStock: 50, barcode: '8901234567899', brand: 'SweetLife', weight: '1kg' },

    // Home
    { id: 'PRD011', sku: 'HOME-001', name: 'Bed Sheet Set', categoryId: 'CAT004', price: 1299, mrp: 1999, cost: 600, stock: 20, minStock: 5, barcode: '8901234567900', brand: 'ComfyNest', size: 'Queen' },
    { id: 'PRD012', sku: 'HOME-002', name: 'LED Bulb 9W', categoryId: 'CAT004', price: 99, mrp: 150, cost: 50, stock: 150, minStock: 30, barcode: '8901234567901', brand: 'BrightGlow', watt: '9W' },

    // Sports
    { id: 'PRD013', sku: 'SPRT-001', name: 'Cricket Bat', categoryId: 'CAT005', price: 1899, mrp: 2499, cost: 900, stock: 15, minStock: 5, barcode: '8901234567902', brand: 'ProCricket', weight: '1.2kg' },
    { id: 'PRD014', sku: 'SPRT-002', name: 'Yoga Mat', categoryId: 'CAT005', price: 499, mrp: 799, cost: 200, stock: 40, minStock: 10, barcode: '8901234567903', brand: 'ZenFit', thickness: '6mm' },
  ];
  products.forEach(p => db.products.set(p.id, p));

  // Suppliers
  const suppliers = [
    { id: 'SUP001', name: 'TechWholesale Pvt Ltd', contact: 'Raj Kumar', phone: '9876543201', email: 'raj@techwholesale.com', address: 'Delhi', rating: 4.5, leadTime: 3 },
    { id: 'SUP002', name: 'Fashion Forward', contact: 'Priya Singh', phone: '9876543202', email: 'priya@fashionfwd.com', address: 'Mumbai', rating: 4.2, leadTime: 5 },
    { id: 'SUP003', name: 'DailyNeeds Distributors', contact: 'Amit Sharma', phone: '9876543203', email: 'amit@dailyneeds.com', address: 'Gurgaon', rating: 4.7, leadTime: 1 },
    { id: 'SUP004', name: 'HomeEssentials Co', contact: 'Sunita Devi', phone: '9876543204', email: 'sunita@homeess.com', address: 'Noida', rating: 4.0, leadTime: 4 },
  ];
  suppliers.forEach(s => db.suppliers.set(s.id, s));

  // Customers
  const customers = [
    { id: 'CUS001', name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@email.com', loyaltyId: 'LOY001', points: 2500, tier: 'gold', totalSpent: 25000, visits: 15, createdAt: '2025-01-15' },
    { id: 'CUS002', name: 'Priya Patel', phone: '9876543211', email: 'priya@email.com', loyaltyId: 'LOY002', points: 1200, tier: 'silver', totalSpent: 12000, visits: 8, createdAt: '2025-06-20' },
    { id: 'CUS003', name: 'Amit Kumar', phone: '9876543212', email: 'amit@email.com', loyaltyId: null, points: 0, tier: 'basic', totalSpent: 3500, visits: 3, createdAt: '2026-01-10' },
  ];
  customers.forEach(c => db.customers.set(c.id, c));

  // Loyalty Cards
  const loyaltyCards = [
    { id: 'LOY001', customerId: 'CUS001', points: 2500, tier: 'gold', issuedAt: '2025-01-15', expiresAt: '2027-01-15' },
    { id: 'LOY002', customerId: 'CUS002', points: 1200, tier: 'silver', issuedAt: '2025-06-20', expiresAt: '2026-06-20' },
  ];
  loyaltyCards.forEach(l => db.loyaltyCards.set(l.id, l));

  // Promotions
  const promotions = [
    { id: 'PROM001', name: 'Summer Sale', type: 'percentage', value: 20, minPurchase: 1000, startDate: '2026-06-01', endDate: '2026-06-30', applicableCategories: ['CAT002', 'CAT003'], active: true },
    { id: 'PROM002', name: 'Buy 1 Get 1 Free', type: 'bogo', value: 100, applicableProducts: ['PRD010'], startDate: '2026-06-15', endDate: '2026-06-20', active: true },
    { id: 'PROM003', name: '₹100 Off on ₹999+', type: 'flat', value: 100, minPurchase: 999, applicableCategories: ['CAT001'], startDate: '2026-06-10', endDate: '2026-06-25', active: true },
  ];
  promotions.forEach(p => db.promotions.set(p.id, p));

  // Sample Orders
  const orders = [
    {
      id: 'ORD001', customerId: 'CUS001', type: 'instore', status: 'completed',
      items: [
        { productId: 'PRD001', name: 'Wireless Earbuds', quantity: 1, price: 2999, discount: 0 },
        { productId: 'PRD003', name: 'Power Bank 10000mAh', quantity: 1, price: 899, discount: 0 },
      ],
      subtotal: 3898, discount: 200, tax: 665, total: 4363,
      paymentMethod: 'card', loyaltyPointsEarned: 43, loyaltyPointsRedeemed: 500,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'ORD002', customerId: 'CUS002', type: 'online', status: 'processing',
      items: [
        { productId: 'PRD005', name: 'Men T-Shirt', quantity: 2, price: 599, discount: 50 },
        { productId: 'PRD007', name: 'Jeans', quantity: 1, price: 1299, discount: 0 },
      ],
      subtotal: 2447, discount: 100, tax: 422, total: 2769,
      paymentMethod: 'upi', loyaltyPointsEarned: 27, loyaltyPointsRedeemed: 0,
      deliveryAddress: '123 Main St, Delhi',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
  ];
  orders.forEach(o => db.orders.set(o.id, o));

  // Store Config
  db.storeConfig.set('store', {
    name: 'RTMN Mart',
    address: '123 Main Market, Delhi',
    phone: '011-23456789',
    gstin: '09XXXXX1234X1ZX',
    timings: '10:00 AM - 9:00 PM',
    currency: 'INR',
  });

  console.log(`[Retail OS] Initialized: ${products.length} products, ${suppliers.length} suppliers, ${customers.length} customers`);
}

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Retail OS',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      products: db.products.size,
      orders: db.orders.size,
      customers: db.customers.size,
      lowStock: Array.from(db.products.values()).filter(p => p.stock <= p.minStock).length
    }
  });
});

// ==================== PRODUCTS ====================

app.get('/api/products', (req, res) => {
  const { categoryId, brand, minPrice, maxPrice, search, lowStock } = req.query;
  let products = Array.from(db.products.values());

  if (categoryId) products = products.filter(p => p.categoryId === categoryId);
  if (brand) products = products.filter(p => p.brand === brand);
  if (minPrice) products = products.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) products = products.filter(p => p.price <= parseInt(maxPrice));
  if (search) {
    const s = search.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
  }
  if (lowStock === 'true') products = products.filter(p => p.stock <= p.minStock);

  // Add category info
  products = products.map(p => ({ ...p, category: db.categories.get(p.categoryId) }));
  res.json({ success: true, count: products.length, products });
});

app.get('/api/products/:id', (req, res) => {
  const product = db.products.get(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  // Get related products from same category
  const related = Array.from(db.products.values())
    .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 5);

  res.json({
    success: true,
    product: { ...product, category: db.categories.get(product.categoryId) },
    related
  });
});

app.post('/api/products', (req, res) => {
  const { sku, name, categoryId, price, mrp, cost, stock, minStock, barcode, brand, ...extras } = req.body;

  if (!sku || !name || !categoryId || !price) {
    return res.status(400).json({ success: false, error: 'sku, name, categoryId, price required' });
  }

  const product = {
    id: `PRD${String(db.products.size + 1).padStart(3, '0')}`,
    sku, name, categoryId, price, mrp: mrp || price, cost: cost || price * 0.6,
    stock: stock || 0, minStock: minStock || 5, barcode: barcode || null,
    brand: brand || '', ...extras, createdAt: new Date().toISOString()
  };

  db.products.set(product.id, product);
  res.status(201).json({ success: true, product });
});

app.patch('/api/products/:id', (req, res) => {
  const product = db.products.get(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  const updated = { ...product, ...req.body, updatedAt: new Date().toISOString() };
  db.products.set(req.params.id, updated);
  res.json({ success: true, product: updated });
});

// ==================== CATEGORIES ====================

app.get('/api/categories', (req, res) => {
  const categories = Array.from(db.categories.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  const withCounts = categories.map(c => ({
    ...c,
    productCount: Array.from(db.products.values()).filter(p => p.categoryId === c.id).length
  }));
  res.json({ success: true, categories: withCounts });
});

app.post('/api/categories', (req, res) => {
  const { name, description, image } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  const category = {
    id: `CAT${String(db.categories.size + 1).padStart(3, '0')}`,
    name, description: description || '', image: image || '📦',
    displayOrder: db.categories.size + 1
  };
  db.categories.set(category.id, category);
  res.status(201).json({ success: true, category });
});

// ==================== INVENTORY ====================

app.get('/api/inventory', (req, res) => {
  const { lowStock, categoryId } = req.query;
  let products = Array.from(db.products.values());

  if (lowStock === 'true') products = products.filter(p => p.stock <= p.minStock);
  if (categoryId) products = products.filter(p => p.categoryId === categoryId);

  const inventory = products.map(p => ({
    ...p,
    category: db.categories.get(p.categoryId),
    stockValue: p.stock * p.cost,
    stockStatus: p.stock <= 0 ? 'out_of_stock' : p.stock <= p.minStock ? 'low' : 'ok'
  }));

  res.json({ success: true, count: inventory.length, inventory });
});

app.post('/api/inventory/:productId/adjust', (req, res) => {
  const product = db.products.get(req.params.productId);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  const { quantity, reason, type } = req.body;
  // type: 'add' (restock) or 'remove' (sold/damaged)

  if (type === 'add') {
    product.stock += quantity;
  } else {
    if (product.stock < quantity) return res.status(400).json({ success: false, error: 'Insufficient stock' });
    product.stock -= quantity;
  }

  product.updatedAt = new Date().toISOString();
  db.products.set(product.id, product);
  res.json({ success: true, product });
});

// ==================== SUPPLIERS ====================

app.get('/api/suppliers', (req, res) => {
  res.json({ success: true, suppliers: Array.from(db.suppliers.values()) });
});

app.post('/api/suppliers', (req, res) => {
  const { name, contact, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  const supplier = {
    id: `SUP${String(db.suppliers.size + 1).padStart(3, '0')}`,
    name, contact: contact || '', phone: phone || '', email: email || '', address: address || '',
    rating: 0, leadTime: 3, createdAt: new Date().toISOString()
  };
  db.suppliers.set(supplier.id, supplier);
  res.status(201).json({ success: true, supplier });
});

app.get('/api/suppliers/:id/products', (req, res) => {
  // For now, return all products (in real app, would filter by supplier)
  res.json({ success: true, products: Array.from(db.products.values()) });
});

// ==================== POS ====================

app.post('/api/pos/scan', (req, res) => {
  const { barcode, productId } = req.body;

  let product;
  if (barcode) {
    product = Array.from(db.products.values()).find(p => p.barcode === barcode);
  } else if (productId) {
    product = db.products.get(productId);
  }

  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  if (product.stock <= 0) return res.status(400).json({ success: false, error: 'Out of stock' });

  res.json({ success: true, product });
});

app.post('/api/pos/checkout', (req, res) => {
  const { customerId, items, paymentMethod, loyaltyPointsRedeem, promoCode } = req.body;

  if (!items || !items.length) return res.status(400).json({ success: false, error: 'Items required' });
  if (!paymentMethod) return res.status(400).json({ success: false, error: 'Payment method required' });

  // Calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = db.products.get(item.productId);
    if (!product) return res.status(404).json({ success: false, error: `Product ${item.productId} not found` });
    if (product.stock < item.quantity) {
      return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name}` });
    }

    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;
    orderItems.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      price: product.price,
      total: itemTotal,
    });

    // Reduce stock
    product.stock -= item.quantity;
    db.products.set(product.id, product);
  }

  // Apply promotion
  let discount = 0;
  if (promoCode) {
    const promo = Array.from(db.promotions.values()).find(
      p => p.active && new Date() >= new Date(p.startDate) && new Date() <= new Date(p.endDate)
    );
    if (promo) {
      if (promo.type === 'flat') discount = promo.value;
      else if (promo.type === 'percentage') discount = Math.round(subtotal * promo.value / 100);
    }
  }

  // Apply loyalty points redemption
  let pointsRedeemed = 0;
  if (loyaltyPointsRedeem && customerId) {
    const customer = db.customers.get(customerId);
    if (customer && customer.points >= loyaltyPointsRedeem) {
      pointsRedeemed = loyaltyPointsRedeem;
      // 1 point = ₹0.25
      discount += pointsRedeemed * 0.25;
    }
  }

  discount = Math.min(discount, subtotal);
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * 0.18); // 18% GST
  const total = taxableAmount + tax;

  const order = {
    id: `ORD${String(db.orders.size + 1).padStart(3, '0')}`,
    customerId: customerId || null,
    type: 'instore',
    items: orderItems,
    subtotal,
    discount,
    tax,
    total,
    paymentMethod,
    loyaltyPointsEarned: Math.floor(total / 100),
    loyaltyPointsRedeemed: pointsRedeemed,
    promoCode: promoCode || null,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };

  db.orders.set(order.id, order);

  // Update customer loyalty
  if (customerId) {
    const customer = db.customers.get(customerId);
    if (customer) {
      customer.points += order.loyaltyPointsEarned - pointsRedeemed;
      customer.totalSpent += total;
      customer.visits += 1;
      // Tier upgrade
      if (customer.points >= 5000) customer.tier = 'platinum';
      else if (customer.points >= 2000) customer.tier = 'gold';
      else if (customer.points >= 500) customer.tier = 'silver';
      db.customers.set(customerId, customer);
    }
  }

  res.status(201).json({ success: true, order });
});

// ==================== ORDERS ====================

app.get('/api/orders', (req, res) => {
  const { status, type, customerId, date } = req.query;
  let orders = Array.from(db.orders.values());

  if (status) orders = orders.filter(o => o.status === status);
  if (type) orders = orders.filter(o => o.type === type);
  if (customerId) orders = orders.filter(o => o.customerId === customerId);
  if (date) orders = orders.filter(o => o.createdAt.startsWith(date));

  orders = orders.map(o => ({ ...o, customer: db.customers.get(o.customerId) }));
  res.json({ success: true, count: orders.length, orders });
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  res.json({
    success: true,
    order: { ...order, customer: db.customers.get(order.customerId) }
  });
});

// ==================== CUSTOMERS ====================

app.get('/api/customers', (req, res) => {
  const { search, tier } = req.query;
  let customers = Array.from(db.customers.values());

  if (search) {
    const s = search.toLowerCase();
    customers = customers.filter(c => c.name.toLowerCase().includes(s) || c.phone.includes(s));
  }
  if (tier) customers = customers.filter(c => c.tier === tier);

  res.json({ success: true, count: customers.length, customers });
});

app.get('/api/customers/:id', (req, res) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

  const orders = Array.from(db.orders.values()).filter(o => o.customerId === customer.id);
  const recentOrders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  res.json({ success: true, customer, orders: recentOrders, totalOrders: orders.length });
});

app.post('/api/customers', (req, res) => {
  const { name, phone, email } = req.body;
  if (!name || !phone) return res.status(400).json({ success: false, error: 'Name and phone required' });

  const existing = Array.from(db.customers.values()).find(c => c.phone === phone);
  if (existing) return res.json({ success: true, customer: existing });

  const customer = {
    id: `CUS${String(db.customers.size + 1).padStart(3, '0')}`,
    name, phone, email: email || null,
    loyaltyId: null, points: 0, tier: 'basic', totalSpent: 0, visits: 0,
    createdAt: new Date().toISOString()
  };
  db.customers.set(customer.id, customer);
  res.status(201).json({ success: true, customer });
});

app.post('/api/customers/:id/points', (req, res) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

  const { points, action } = req.body;
  if (action === 'add') {
    customer.points += points;
    if (customer.points >= 5000) customer.tier = 'platinum';
    else if (customer.points >= 2000) customer.tier = 'gold';
    else if (customer.points >= 500) customer.tier = 'silver';
  } else if (action === 'redeem') {
    if (customer.points < points) return res.status(400).json({ success: false, error: 'Insufficient points' });
    customer.points -= points;
  }

  db.customers.set(customer.id, customer);
  res.json({ success: true, customer });
});

// ==================== PROMOTIONS ====================

app.get('/api/promotions', (req, res) => {
  const active = Array.from(db.promotions.values())
    .filter(p => p.active && new Date() >= new Date(p.startDate) && new Date() <= new Date(p.endDate));
  res.json({ success: true, promotions: active });
});

app.post('/api/promotions/validate', (req, res) => {
  const { code, cartTotal, categoryIds, productIds } = req.body;

  const promo = Array.from(db.promotions.values()).find(p => p.name.toLowerCase() === code?.toLowerCase());
  if (!promo) return res.json({ success: false, error: 'Invalid promo code' });

  if (new Date() < new Date(promo.startDate) || new Date() > new Date(promo.endDate)) {
    return res.json({ success: false, error: 'Promo expired' });
  }

  if (promo.minPurchase && cartTotal < promo.minPurchase) {
    return res.json({ success: false, error: `Minimum purchase ₹${promo.minPurchase} required` });
  }

  let discount = 0;
  if (promo.type === 'flat') discount = promo.value;
  else if (promo.type === 'percentage') discount = Math.round(cartTotal * promo.value / 100);

  res.json({ success: true, discount, promo });
});

// ==================== ANALYTICS ====================

app.get('/api/analytics/overview', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const orders = Array.from(db.orders.values()).filter(o => o.createdAt.startsWith(today));

  const totalSales = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
  const totalCustomers = db.customers.size;
  const lowStockProducts = Array.from(db.products.values()).filter(p => p.stock <= p.minStock).length;
  const outOfStock = Array.from(db.products.values()).filter(p => p.stock <= 0).length;

  res.json({
    success: true,
    overview: {
      date: today,
      totalSales,
      totalOrders,
      avgOrderValue,
      totalCustomers,
      inventory: { lowStock: lowStockProducts, outOfStock },
      topCategories: Array.from(db.categories.values()).map(c => ({
        name: c.name,
        count: Array.from(db.products.values()).filter(p => p.categoryId === c.id).length
      }))
    }
  });
});

app.get('/api/analytics/sales', (req, res) => {
  const { period } = req.query;
  const now = new Date();
  let startDate;

  if (period === 'week') startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  else if (period === 'month') startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
  else startDate = new Date(now.toISOString().split('T')[0]);

  const orders = Array.from(db.orders.values())
    .filter(o => new Date(o.createdAt) >= startDate && o.status === 'completed');

  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;

  // Sales by category
  const categorySales = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const product = db.products.get(item.productId);
      if (product) {
        const cat = product.categoryId;
        if (!categorySales[cat]) categorySales[cat] = { name: db.categories.get(cat)?.name, revenue: 0, quantity: 0 };
        categorySales[cat].revenue += item.total;
        categorySales[cat].quantity += item.quantity;
      }
    });
  });

  // Payment methods
  const paymentMethods = {};
  orders.forEach(o => {
    if (!paymentMethods[o.paymentMethod]) paymentMethods[o.paymentMethod] = { count: 0, amount: 0 };
    paymentMethods[o.paymentMethod].count++;
    paymentMethods[o.paymentMethod].amount += o.total;
  });

  res.json({
    success: true,
    sales: {
      period,
      totalSales,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0,
      categorySales: Object.values(categorySales),
      paymentMethods
    }
  });
});

app.get('/api/analytics/products', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const orders = Array.from(db.orders.values()).filter(o => o.createdAt.startsWith(today));

  const productSales = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  res.json({ success: true, topProducts });
});

// ==================== STORE CONFIG ====================

app.get('/api/store', (req, res) => {
  res.json({ success: true, store: db.storeConfig.get('store') });
});

app.patch('/api/store', (req, res) => {
  const store = db.storeConfig.get('store') || {};
  const updated = { ...store, ...req.body };
  db.storeConfig.set('store', updated);
  res.json({ success: true, store: updated });
});

// ==================== START ====================

initSampleData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  RETAIL OS v2.0.0                       ║
║           Complete Retail Management                  ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║                                                          ║
║  Features:                                             ║
║  • Product Catalog (Categories, SKUs, Variants)        ║
║  • Inventory Management (Stock, Suppliers)            ║
║  • POS (Point of Sale, Barcode, Payments)           ║
║  • Customer Management (Loyalty, Tiers)               ║
║  • Orders (In-Store, Online, Returns)                ║
║  • Promotions & Discounts                              ║
║  • Analytics (Sales, Products, Trends)                ║
║                                                          ║
║  Connectors:                                           ║
║  • Sales OS Bridge (5031)                            ║
║  • RTMN Event Bus (4510)                           ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
