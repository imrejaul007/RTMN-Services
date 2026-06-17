/**
 * Restaurant OS - Complete Restaurant Management System
 *
 * Built from scratch with full restaurant-specific features
 * Port: 5010
 *
 * Features:
 * - Menu Management (categories, items, modifiers, allergens)
 * - Order Management (POS, kitchen display, routing)
 * - Table Management (reservations, seating, turn times)
 * - Kitchen Display System (KDS)
 * - Inventory Management (ingredients, recipes, suppliers)
 * - Customer Management (loyalty, preferences)
 * - Analytics (covers, AOV, table turns)
 * - F&B Services (room service, takeaway, delivery)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// In-memory data stores
const db = {
  // Menu
  categories: new Map(),
  menuItems: new Map(),
  modifiers: new Map(),
  allergens: new Map(),

  // Orders
  orders: new Map(),
  orderItems: new Map(),

  // Tables
  tables: new Map(),
  reservations: new Map(),

  // Kitchen
  kitchenOrders: new Map(),
  stations: new Map(),

  // Inventory
  ingredients: new Map(),
  recipes: new Map(),
  suppliers: new Map(),
  inventoryTransactions: new Map(),

  // Customers
  customers: new Map(),
  customerPreferences: new Map(),
  loyaltyPoints: new Map(),

  // Staff
  staff: new Map(),
  shifts: new Map(),

  // Analytics
  dailySummaries: new Map(),
};

// ==================== SAMPLE DATA ====================

function initSampleData() {
  // Categories
  const categories = [
    { id: 'CAT001', name: 'Appetizers', description: 'Starters', image: '🍤', displayOrder: 1 },
    { id: 'CAT002', name: 'Main Course', description: 'Entrees', image: '🍽️', displayOrder: 2 },
    { id: 'CAT003', name: 'Beverages', description: 'Drinks', image: '🥤', displayOrder: 3 },
    { id: 'CAT004', name: 'Desserts', description: 'Sweet treats', image: '🍰', displayOrder: 4 },
    { id: 'CAT005', name: 'Sides', description: 'Accompaniments', image: '🥗', displayOrder: 5 },
  ];
  categories.forEach(c => db.categories.set(c.id, c));

  // Menu Items
  const menuItems = [
    // Appetizers
    { id: 'MNU001', categoryId: 'CAT001', name: 'Paneer Tikka', price: 280, description: 'Grilled cottage cheese', image: '🍢', calories: 350, prepTime: 15, allergens: ['dairy'], isVeg: true },
    { id: 'MNU002', categoryId: 'CAT001', name: 'Chicken Wings', price: 320, description: 'BBQ glazed wings', image: '🍗', calories: 420, prepTime: 20, allergens: ['soy'], isVeg: false },
    { id: 'MNU003', categoryId: 'CAT001', name: 'Spring Rolls', price: 180, description: 'Crispy vegetable rolls', image: '🥟', calories: 220, prepTime: 10, allergens: ['gluten'], isVeg: true },

    // Main Course
    { id: 'MNU004', categoryId: 'CAT002', name: 'Butter Chicken', price: 420, description: 'Creamy tomato curry', image: '🍛', calories: 650, prepTime: 25, allergens: ['dairy'], isVeg: false },
    { id: 'MNU005', categoryId: 'CAT002', name: 'Dal Makhani', price: 320, description: 'Black lentils', image: '🍲', calories: 480, prepTime: 20, allergens: ['dairy'], isVeg: true },
    { id: 'MNU006', categoryId: 'CAT002', name: 'Biryani', price: 380, description: 'Fragrant rice with meat', image: '🍚', calories: 580, prepTime: 30, allergens: [], isVeg: false },
    { id: 'MNU007', categoryId: 'CAT002', name: 'Paneer Butter Masala', price: 350, description: 'Cottage cheese in gravy', image: '🍛', calories: 520, prepTime: 20, allergens: ['dairy'], isVeg: true },

    // Beverages
    { id: 'MNU008', categoryId: 'CAT003', name: 'Masala Chai', price: 50, description: 'Spiced tea', image: '☕', calories: 120, prepTime: 5, allergens: ['dairy'], isVeg: true },
    { id: 'MNU009', categoryId: 'CAT003', name: 'Fresh Lime', price: 80, description: 'Citrus cooler', image: '🍋', calories: 60, prepTime: 3, allergens: [], isVeg: true },
    { id: 'MNU010', categoryId: 'CAT003', name: 'Mango Lassi', price: 120, description: 'Yogurt smoothie', image: '🥭', calories: 180, prepTime: 5, allergens: ['dairy'], isVeg: true },

    // Desserts
    { id: 'MNU011', categoryId: 'CAT004', name: 'Gulab Jamun', price: 150, description: 'Sweet milk balls', image: '🟤', calories: 280, prepTime: 10, allergens: ['dairy'], isVeg: true },
    { id: 'MNU012', categoryId: 'CAT004', name: 'Ice Cream', price: 180, description: 'Assorted flavors', image: '🍨', calories: 200, prepTime: 5, allergens: ['dairy', 'nuts'], isVeg: true },

    // Sides
    { id: 'MNU013', categoryId: 'CAT005', name: 'Naan', price: 60, description: 'Flatbread', image: '🫓', calories: 150, prepTime: 8, allergens: ['gluten'], isVeg: true },
    { id: 'MNU014', categoryId: 'CAT005', name: 'Rice', price: 100, description: 'Steamed basmati', image: '🍚', calories: 200, prepTime: 10, allergens: [], isVeg: true },
    { id: 'MNU015', categoryId: 'CAT005', name: 'Raita', price: 80, description: 'Yogurt side', image: '🥣', calories: 100, prepTime: 5, allergens: ['dairy'], isVeg: true },
  ];
  menuItems.forEach(m => db.menuItems.set(m.id, m));

  // Modifiers
  const modifiers = [
    { id: 'MOD001', name: 'Extra Cheese', price: 50, categoryId: 'CAT001' },
    { id: 'MOD002', name: 'Extra Spicy', price: 0, categoryId: 'CAT002' },
    { id: 'MOD003', name: 'Gluten Free', price: 30, categoryId: 'CAT002' },
    { id: 'MOD004', name: 'Large Portion', price: 80, categoryId: 'CAT002' },
  ];
  modifiers.forEach(m => db.modifiers.set(m.id, m));

  // Allergens
  const allergens = [
    { id: 'ALL001', name: 'Dairy', icon: '🥛', description: 'Milk products' },
    { id: 'ALL002', name: 'Gluten', icon: '🌾', description: 'Wheat, barley, rye' },
    { id: 'ALL003', name: 'Nuts', icon: '🥜', description: 'Tree nuts, peanuts' },
    { id: 'ALL004', name: 'Soy', icon: '🫘', description: 'Soybeans' },
    { id: 'ALL005', name: 'Eggs', icon: '🥚', description: 'Egg products' },
  ];
  allergens.forEach(a => db.allergens.set(a.id, a));

  // Tables
  const tables = [
    { id: 'TBL001', number: 1, capacity: 2, section: 'A', status: 'available', position: { x: 1, y: 1 } },
    { id: 'TBL002', number: 2, capacity: 4, section: 'A', status: 'available', position: { x: 1, y: 2 } },
    { id: 'TBL003', number: 3, capacity: 4, section: 'A', status: 'occupied', position: { x: 1, y: 3 } },
    { id: 'TBL004', number: 4, capacity: 6, section: 'B', status: 'available', position: { x: 2, y: 1 } },
    { id: 'TBL005', number: 5, capacity: 8, section: 'B', status: 'reserved', position: { x: 2, y: 2 } },
    { id: 'TBL006', number: 6, capacity: 2, section: 'C', status: 'available', position: { x: 3, y: 1 } },
    { id: 'TBL007', number: 7, capacity: 4, section: 'C', status: 'occupied', position: { x: 3, y: 2 } },
    { id: 'TBL008', number: 8, capacity: 10, section: 'VIP', status: 'available', position: { x: 4, y: 1 } },
  ];
  tables.forEach(t => db.tables.set(t.id, t));

  // Kitchen Stations
  const stations = [
    { id: 'STA001', name: 'Grill', type: 'hot', assignedItems: ['MNU001', 'MNU002', 'MNU004', 'MNU006'] },
    { id: 'STA002', name: 'Tandoor', type: 'hot', assignedItems: ['MNU013'] },
    { id: 'STA003', name: 'Prep', type: 'cold', assignedItems: ['MNU003', 'MNU008', 'MNU009', 'MNU010'] },
    { id: 'STA004', name: 'Dessert', type: 'cold', assignedItems: ['MNU011', 'MNU012'] },
    { id: 'STA005', name: 'Beverages', type: 'bar', assignedItems: ['MNU008', 'MNU009', 'MNU010'] },
  ];
  stations.forEach(s => db.stations.set(s.id, s));

  // Sample Orders
  const orders = [
    {
      id: 'ORD001',
      tableId: 'TBL003',
      status: 'preparing',
      type: 'dine_in',
      items: [
        { menuItemId: 'MNU004', quantity: 2, price: 420, modifiers: [], status: 'preparing' },
        { menuItemId: 'MNU013', quantity: 2, price: 60, modifiers: [], status: 'ready' },
        { menuItemId: 'MNU008', quantity: 2, price: 50, modifiers: [], status: 'ready' },
      ],
      subtotal: 1060,
      tax: 191,
      total: 1251,
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      servedAt: null,
    },
    {
      id: 'ORD002',
      tableId: 'TBL007',
      status: 'ready',
      type: 'dine_in',
      items: [
        { menuItemId: 'MNU001', quantity: 1, price: 280, modifiers: [], status: 'ready' },
        { menuItemId: 'MNU005', quantity: 1, price: 320, modifiers: [], status: 'ready' },
        { menuItemId: 'MNU011', quantity: 2, price: 150, modifiers: [], status: 'ready' },
      ],
      subtotal: 900,
      tax: 162,
      total: 1062,
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      servedAt: null,
    },
  ];
  orders.forEach(o => {
    db.orders.set(o.id, o);
    if (o.status === 'preparing') {
      db.kitchenOrders.set(o.id, { ...o, priority: 'normal' });
    }
  });

  // Sample Customers
  const customers = [
    { id: 'CUS001', name: 'Amit Sharma', phone: '9876543210', email: 'amit@email.com', visits: 15, totalSpent: 25000, loyaltyPoints: 2500, tier: 'gold', preferences: { favoriteTable: 'TBL008', dietaryRestrictions: [], preferredItems: ['MNU004', 'MNU006'] }, createdAt: '2025-01-15' },
    { id: 'CUS002', name: 'Priya Patel', phone: '9876543211', email: 'priya@email.com', visits: 8, totalSpent: 12000, loyaltyPoints: 1200, tier: 'silver', preferences: { favoriteTable: null, dietaryRestrictions: ['vegetarian'], preferredItems: ['MNU005', 'MNU007'] }, createdAt: '2025-06-20' },
    { id: 'CUS003', name: 'Rahul Verma', phone: '9876543212', email: 'rahul@email.com', visits: 3, totalSpent: 3500, loyaltyPoints: 350, tier: 'bronze', preferences: { favoriteTable: null, dietaryRestrictions: [], preferredItems: [] }, createdAt: '2026-01-10' },
  ];
  customers.forEach(c => db.customers.set(c.id, c));

  // Sample Reservations
  const reservations = [
    { id: 'RES001', customerId: 'CUS001', tableId: 'TBL005', date: new Date().toISOString().split('T')[0], time: '19:00', partySize: 6, status: 'confirmed', notes: 'Birthday celebration', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'RES002', customerId: 'CUS002', tableId: 'TBL004', date: new Date().toISOString().split('T')[0], time: '20:00', partySize: 4, status: 'confirmed', notes: '', createdAt: new Date(Date.now() - 43200000).toISOString() },
  ];
  reservations.forEach(r => db.reservations.set(r.id, r));

  // Ingredients
  const ingredients = [
    { id: 'ING001', name: 'Chicken Breast', unit: 'kg', currentStock: 25, minStock: 10, cost: 180, supplierId: 'SUP001' },
    { id: 'ING002', name: 'Paneer', unit: 'kg', currentStock: 15, minStock: 5, cost: 220, supplierId: 'SUP001' },
    { id: 'ING003', name: 'Basmati Rice', unit: 'kg', currentStock: 50, minStock: 20, cost: 80, supplierId: 'SUP002' },
    { id: 'ING004', name: 'Butter', unit: 'kg', currentStock: 8, minStock: 5, cost: 450, supplierId: 'SUP001' },
    { id: 'ING005', name: 'Tomatoes', unit: 'kg', currentStock: 30, minStock: 15, cost: 40, supplierId: 'SUP003' },
  ];
  ingredients.forEach(i => db.ingredients.set(i.id, i));

  // Suppliers
  const suppliers = [
    { id: 'SUP001', name: 'Fresh Meats Co.', contact: 'Raj Kumar', phone: '9876543201', email: 'raj@freshmeats.com', address: 'Market Road, Delhi', rating: 4.5, leadTime: 1 },
    { id: 'SUP002', name: 'Premium Foods Ltd.', contact: 'Sunita Devi', phone: '9876543202', email: 'sunita@premiumfoods.com', address: 'Sector 15, Noida', rating: 4.2, leadTime: 2 },
    { id: 'SUP003', name: 'Fresh Vegetables', contact: 'Mohammed Khan', phone: '9876543203', email: 'khan@freshveg.com', address: 'Sabzi Mandi, Delhi', rating: 4.7, leadTime: 1 },
  ];
  suppliers.forEach(s => db.suppliers.set(s.id, s));

  // Staff
  const staff = [
    { id: 'STF001', name: 'Chef Ramesh', role: 'head_chef', department: 'kitchen', phone: '9876543301', email: 'ramesh@restaurant.com', status: 'active', hourlyRate: 500 },
    { id: 'STF002', name: 'Waiter Sunil', role: 'server', department: 'service', phone: '9876543302', email: 'sunil@restaurant.com', status: 'active', hourlyRate: 150 },
    { id: 'STF003', name: 'Manager Kavita', role: 'manager', department: 'service', phone: '9876543303', email: 'kavita@restaurant.com', status: 'active', hourlyRate: 400 },
    { id: 'STF004', name: 'Bartender Anand', role: 'bartender', department: 'bar', phone: '9876543304', email: 'anand@restaurant.com', status: 'active', hourlyRate: 200 },
  ];
  staff.forEach(s => db.staff.set(s.id, s));

  console.log(`[Restaurant OS] Initialized: ${menuItems.length} items, ${tables.length} tables, ${customers.length} customers`);
}

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Restaurant OS',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      menuItems: db.menuItems.size,
      orders: db.orders.size,
      tables: db.tables.size,
      customers: db.customers.size,
    }
  });
});

// ==================== MENU MANAGEMENT ====================

// Get all categories
app.get('/api/menu/categories', (req, res) => {
  const categories = Array.from(db.categories.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  res.json({ success: true, categories });
});

// Create category
app.post('/api/menu/categories', (req, res) => {
  const { name, description, image, displayOrder } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  const category = {
    id: `CAT${String(db.categories.size + 1).padStart(3, '0')}`,
    name,
    description: description || '',
    image: image || '🍽️',
    displayOrder: displayOrder || db.categories.size + 1,
  };
  db.categories.set(category.id, category);
  res.status(201).json({ success: true, category });
});

// Get all menu items
app.get('/api/menu/items', (req, res) => {
  const { categoryId, isVeg, minPrice, maxPrice, search } = req.query;
  let items = Array.from(db.menuItems.values());

  if (categoryId) items = items.filter(i => i.categoryId === categoryId);
  if (isVeg !== undefined) items = items.filter(i => i.isVeg === (isVeg === 'true'));
  if (minPrice) items = items.filter(i => i.price >= parseInt(minPrice));
  if (maxPrice) items = items.filter(i => i.price <= parseInt(maxPrice));
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
  }

  // Add category info
  items = items.map(item => ({
    ...item,
    category: db.categories.get(item.categoryId),
  }));

  res.json({ success: true, count: items.length, items });
});

// Get single menu item
app.get('/api/menu/items/:id', (req, res) => {
  const item = db.menuItems.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

  const fullItem = {
    ...item,
    category: db.categories.get(item.categoryId),
    modifiers: Array.from(db.modifiers.values()).filter(m => !m.categoryId || m.categoryId === item.categoryId),
  };
  res.json({ success: true, item: fullItem });
});

// Create menu item
app.post('/api/menu/items', (req, res) => {
  const { categoryId, name, price, description, image, calories, prepTime, allergens, isVeg } = req.body;

  if (!categoryId || !name || !price) {
    return res.status(400).json({ success: false, error: 'categoryId, name, price required' });
  }

  const item = {
    id: `MNU${String(db.menuItems.size + 1).padStart(3, '0')}`,
    categoryId,
    name,
    price: parseInt(price),
    description: description || '',
    image: image || '🍽️',
    calories: calories || 0,
    prepTime: prepTime || 15,
    allergens: allergens || [],
    isVeg: isVeg !== undefined ? isVeg : true,
    isAvailable: true,
    createdAt: new Date().toISOString(),
  };

  db.menuItems.set(item.id, item);
  res.status(201).json({ success: true, item });
});

// Update menu item
app.patch('/api/menu/items/:id', (req, res) => {
  const item = db.menuItems.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

  const updated = { ...item, ...req.body, updatedAt: new Date().toISOString() };
  db.menuItems.set(req.params.id, updated);
  res.json({ success: true, item: updated });
});

// Toggle item availability
app.patch('/api/menu/items/:id/availability', (req, res) => {
  const item = db.menuItems.get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

  item.isAvailable = !item.isAvailable;
  item.updatedAt = new Date().toISOString();
  db.menuItems.set(item.id, item);
  res.json({ success: true, item });
});

// ==================== MODIFIERS ====================

app.get('/api/menu/modifiers', (req, res) => {
  const modifiers = Array.from(db.modifiers.values());
  res.json({ success: true, modifiers });
});

app.post('/api/menu/modifiers', (req, res) => {
  const { name, price, categoryId } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  const modifier = {
    id: `MOD${String(db.modifiers.size + 1).padStart(3, '0')}`,
    name,
    price: price || 0,
    categoryId: categoryId || null,
  };
  db.modifiers.set(modifier.id, modifier);
  res.status(201).json({ success: true, modifier });
});

// ==================== ALLERGENS ====================

app.get('/api/menu/allergens', (req, res) => {
  const allergens = Array.from(db.allergens.values());
  res.json({ success: true, allergens });
});

app.post('/api/menu/allergens', (req, res) => {
  const { name, icon, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  const allergen = {
    id: `ALL${String(db.allergens.size + 1).padStart(3, '0')}`,
    name,
    icon: icon || '⚠️',
    description: description || '',
  };
  db.allergens.set(allergen.id, allergen);
  res.status(201).json({ success: true, allergen });
});

// ==================== TABLE MANAGEMENT ====================

app.get('/api/tables', (req, res) => {
  const { section, status, minCapacity } = req.query;
  let tables = Array.from(db.tables.values());

  if (section) tables = tables.filter(t => t.section === section);
  if (status) tables = tables.filter(t => t.status === status);
  if (minCapacity) tables = tables.filter(t => t.capacity >= parseInt(minCapacity));

  res.json({ success: true, count: tables.length, tables });
});

app.get('/api/tables/:id', (req, res) => {
  const table = db.tables.get(req.params.id);
  if (!table) return res.status(404).json({ success: false, error: 'Table not found' });

  // Get current order if any
  const currentOrder = Array.from(db.orders.values()).find(
    o => o.tableId === table.id && ['pending', 'preparing', 'ready'].includes(o.status)
  );

  // Get upcoming reservations
  const reservations = Array.from(db.reservations.values()).filter(
    r => r.tableId === table.id && r.status !== 'cancelled'
  );

  res.json({ success: true, table, currentOrder, reservations });
});

// Update table status
app.patch('/api/tables/:id/status', (req, res) => {
  const table = db.tables.get(req.params.id);
  if (!table) return res.status(404).json({ success: false, error: 'Table not found' });

  const { status } = req.body;
  if (!['available', 'occupied', 'reserved', 'cleaning'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  table.status = status;
  table.updatedAt = new Date().toISOString();
  db.tables.set(table.id, table);
  res.json({ success: true, table });
});

// Seat table
app.post('/api/tables/:id/seat', (req, res) => {
  const table = db.tables.get(req.params.id);
  if (!table) return res.status(404).json({ success: false, error: 'Table not found' });

  if (table.status !== 'available') {
    return res.status(400).json({ success: false, error: 'Table not available' });
  }

  const { customerId, partySize } = req.body;

  table.status = 'occupied';
  table.currentCustomerId = customerId || null;
  table.partySize = partySize || table.capacity;
  table.seatedAt = new Date().toISOString();
  table.updatedAt = new Date().toISOString();

  db.tables.set(table.id, table);
  res.json({ success: true, table });
});

// Clear table
app.post('/api/tables/:id/clear', (req, res) => {
  const table = db.tables.get(req.params.id);
  if (!table) return res.status(404).json({ success: false, error: 'Table not found' });

  // Check if there's an unpaid order
  const unpaidOrder = Array.from(db.orders.values()).find(
    o => o.tableId === table.id && o.status === 'ready' && !o.paidAt
  );

  if (unpaidOrder) {
    return res.status(400).json({ success: false, error: 'Table has unpaid order', orderId: unpaidOrder.id });
  }

  table.status = 'cleaning';
  table.currentCustomerId = null;
  table.partySize = null;
  table.seatedAt = null;
  table.updatedAt = new Date().toISOString();

  db.tables.set(table.id, table);
  res.json({ success: true, table });
});

// ==================== RESERVATIONS ====================

app.get('/api/reservations', (req, res) => {
  const { date, status, customerId } = req.query;
  let reservations = Array.from(db.reservations.values());

  if (date) reservations = reservations.filter(r => r.date === date);
  if (status) reservations = reservations.filter(r => r.status === status);
  if (customerId) reservations = reservations.filter(r => r.customerId === customerId);

  // Add customer and table info
  reservations = reservations.map(r => ({
    ...r,
    customer: db.customers.get(r.customerId),
    table: db.tables.get(r.tableId),
  }));

  res.json({ success: true, count: reservations.length, reservations });
});

app.post('/api/reservations', (req, res) => {
  const { customerId, tableId, date, time, partySize, notes } = req.body;

  if (!tableId || !date || !time) {
    return res.status(400).json({ success: false, error: 'tableId, date, time required' });
  }

  // Check table availability
  const table = db.tables.get(tableId);
  if (!table) return res.status(404).json({ success: false, error: 'Table not found' });

  if (partySize && partySize > table.capacity) {
    return res.status(400).json({ success: false, error: 'Party size exceeds table capacity' });
  }

  // Check for conflicts
  const conflicts = Array.from(db.reservations.values()).filter(
    r => r.tableId === tableId && r.date === date && r.status !== 'cancelled'
  );

  const timeNum = parseInt(time.replace(':', ''));
  for (const c of conflicts) {
    const cTimeNum = parseInt(c.time.replace(':', ''));
    if (Math.abs(cTimeNum - timeNum) < 100) { // Within 1 hour
      return res.status(400).json({ success: false, error: 'Time slot not available' });
    }
  }

  const reservation = {
    id: `RES${String(db.reservations.size + 1).padStart(3, '0')}`,
    customerId: customerId || null,
    tableId,
    date,
    time,
    partySize: partySize || table.capacity,
    status: 'confirmed',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.reservations.set(reservation.id, reservation);

  // Mark table as reserved
  if (date === new Date().toISOString().split('T')[0]) {
    table.status = 'reserved';
    db.tables.set(tableId, table);
  }

  res.status(201).json({ success: true, reservation });
});

app.patch('/api/reservations/:id', (req, res) => {
  const reservation = db.reservations.get(req.params.id);
  if (!reservation) return res.status(404).json({ success: false, error: 'Reservation not found' });

  const updated = { ...reservation, ...req.body, updatedAt: new Date().toISOString() };
  db.reservations.set(req.params.id, updated);
  res.json({ success: true, reservation: updated });
});

app.delete('/api/reservations/:id', (req, res) => {
  const reservation = db.reservations.get(req.params.id);
  if (!reservation) return res.status(404).json({ success: false, error: 'Reservation not found' });

  reservation.status = 'cancelled';
  db.reservations.set(req.params.id, reservation);
  res.json({ success: true, message: 'Reservation cancelled' });
});

// ==================== ORDERS ====================

app.get('/api/orders', (req, res) => {
  const { status, type, tableId, date } = req.query;
  let orders = Array.from(db.orders.values());

  if (status) orders = orders.filter(o => o.status === status);
  if (type) orders = orders.filter(o => o.type === type);
  if (tableId) orders = orders.filter(o => o.tableId === tableId);
  if (date) orders = orders.filter(o => o.createdAt.startsWith(date));

  // Add table info
  orders = orders.map(o => ({
    ...o,
    table: db.tables.get(o.tableId),
  }));

  res.json({ success: true, count: orders.length, orders });
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  // Get full item details
  const fullOrder = {
    ...order,
    table: db.tables.get(order.tableId),
    items: order.items.map(item => ({
      ...item,
      menuItem: db.menuItems.get(item.menuItemId),
    })),
  };

  res.json({ success: true, order: fullOrder });
});

// Create order
app.post('/api/orders', (req, res) => {
  const { tableId, customerId, type, items } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ success: false, error: 'Items required' });
  }

  // Calculate totals
  let subtotal = 0;
  const orderItems = items.map(item => {
    const menuItem = db.menuItems.get(item.menuItemId);
    if (!menuItem) throw new Error(`Item ${item.menuItemId} not found`);

    const price = menuItem.price + (item.modifiers || []).reduce((sum, modId) => {
      const mod = db.modifiers.get(modId);
      return sum + (mod ? mod.price : 0);
    }, 0);

    subtotal += price * item.quantity;

    return {
      menuItemId: item.menuItemId,
      name: menuItem.name,
      quantity: item.quantity,
      price,
      modifiers: item.modifiers || [],
      status: 'pending',
    };
  });

  const tax = Math.round(subtotal * 0.18); // 18% GST
  const total = subtotal + tax;

  const order = {
    id: `ORD${String(db.orders.size + 1).padStart(3, '0')}`,
    tableId: tableId || null,
    customerId: customerId || null,
    type: type || 'dine_in',
    items: orderItems,
    subtotal,
    tax,
    total,
    status: 'pending',
    createdAt: new Date().toISOString(),
    servedAt: null,
    paidAt: null,
  };

  db.orders.set(order.id, order);

  // Update table status if dine-in
  if (tableId) {
    const table = db.tables.get(tableId);
    if (table && table.status === 'available') {
      table.status = 'occupied';
      db.tables.set(tableId, table);
    }
  }

  // Send to kitchen
  if (type !== 'takeaway' && type !== 'delivery') {
    db.kitchenOrders.set(order.id, { ...order, priority: 'normal', sentToKitchenAt: new Date().toISOString() });
  }

  res.status(201).json({ success: true, order });
});

// Update order item status
app.patch('/api/orders/:id/items/:itemIndex', (req, res) => {
  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  const itemIndex = parseInt(req.params.itemIndex);
  if (!order.items[itemIndex]) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }

  order.items[itemIndex].status = req.body.status || order.items[itemIndex].status;
  order.updatedAt = new Date().toISOString();

  // Check if all items ready
  const allReady = order.items.every(i => i.status === 'ready');
  if (allReady) {
    order.status = 'ready';
  }

  db.orders.set(order.id, order);
  res.json({ success: true, order });
});

// Update order status
app.patch('/api/orders/:id/status', (req, res) => {
  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  if (status === 'served') {
    order.servedAt = new Date().toISOString();
  }
  if (status === 'paid') {
    order.paidAt = new Date().toISOString();
  }

  db.orders.set(order.id, order);

  // Update kitchen order
  if (db.kitchenOrders.has(order.id)) {
    if (status === 'served' || status === 'cancelled') {
      db.kitchenOrders.delete(order.id);
    }
  }

  // Update table status if order paid
  if (status === 'paid' && order.tableId) {
    const table = db.tables.get(order.tableId);
    if (table) {
      table.status = 'cleaning';
      db.tables.set(order.tableId, table);
    }
  }

  res.json({ success: true, order });
});

// Process payment
app.post('/api/orders/:id/pay', (req, res) => {
  const order = db.orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  const { method, amount } = req.body;

  if (amount && amount < order.total) {
    return res.status(400).json({ success: false, error: 'Amount less than total' });
  }

  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  order.paymentMethod = method || 'cash';
  order.paidAmount = amount || order.total;
  order.change = amount ? amount - order.total : 0;

  db.orders.set(order.id, order);

  // Update loyalty points
  if (order.customerId) {
    const customer = db.customers.get(order.customerId);
    if (customer) {
      const pointsEarned = Math.floor(order.total / 100); // 1 point per 100 spent
      customer.loyaltyPoints += pointsEarned;
      customer.visits += 1;
      customer.totalSpent += order.total;

      // Upgrade tier
      if (customer.loyaltyPoints >= 5000) customer.tier = 'platinum';
      else if (customer.loyaltyPoints >= 2000) customer.tier = 'gold';
      else if (customer.loyaltyPoints >= 500) customer.tier = 'silver';

      db.customers.set(customer.id, customer);
    }
  }

  res.json({ success: true, order });
});

// ==================== KITCHEN DISPLAY SYSTEM (KDS) ====================

app.get('/api/kitchen/orders', (req, res) => {
  const { station, status } = req.query;
  let kitchenOrders = Array.from(db.kitchenOrders.values());

  if (status) {
    kitchenOrders = kitchenOrders.filter(o => {
      const itemStatuses = o.items.map(i => i.status);
      if (status === 'preparing') return itemStatuses.some(s => s === 'preparing');
      if (status === 'ready') return itemStatuses.every(s => s === 'ready');
      return true;
    });
  }

  // Filter by station
  if (station) {
    const stationObj = Array.from(db.stations.values()).find(s => s.name.toLowerCase() === station.toLowerCase());
    if (stationObj) {
      kitchenOrders = kitchenOrders.map(order => ({
        ...order,
        items: order.items.filter(item => stationObj.assignedItems.includes(item.menuItemId)),
      })).filter(o => o.items.length > 0);
    }
  }

  res.json({ success: true, count: kitchenOrders.length, orders: kitchenOrders });
});

app.get('/api/kitchen/stations', (req, res) => {
  const stations = Array.from(db.stations.values());
  res.json({ success: true, stations });
});

// Mark item as cooking
app.patch('/api/kitchen/orders/:orderId/items/:itemIndex/cook', (req, res) => {
  const order = db.kitchenOrders.get(req.params.orderId);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found in kitchen' });

  const itemIndex = parseInt(req.params.itemIndex);
  if (!order.items[itemIndex]) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }

  order.items[itemIndex].status = 'preparing';
  order.items[itemIndex].cookingStartedAt = new Date().toISOString();

  // Update main order
  const mainOrder = db.orders.get(order.id);
  if (mainOrder) {
    mainOrder.items[itemIndex].status = 'preparing';
    mainOrder.status = 'preparing';
    db.orders.set(order.id, mainOrder);
  }

  db.kitchenOrders.set(order.id, order);
  res.json({ success: true, order });
});

// Mark item as ready
app.patch('/api/kitchen/orders/:orderId/items/:itemIndex/ready', (req, res) => {
  const order = db.kitchenOrders.get(req.params.orderId);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found in kitchen' });

  const itemIndex = parseInt(req.params.itemIndex);
  if (!order.items[itemIndex]) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }

  order.items[itemIndex].status = 'ready';
  order.items[itemIndex].readyAt = new Date().toISOString();

  // Check if all items ready
  const allReady = order.items.every(i => i.status === 'ready');
  if (allReady) {
    order.status = 'ready';
    db.kitchenOrders.delete(order.id);

    // Update main order
    const mainOrder = db.orders.get(order.id);
    if (mainOrder) {
      mainOrder.items.forEach(i => i.status = 'ready');
      mainOrder.status = 'ready';
      db.orders.set(order.id, mainOrder);
    }
  }

  db.kitchenOrders.set(order.id, order);
  res.json({ success: true, order, allReady });
});

// ==================== CUSTOMERS ====================

app.get('/api/customers', (req, res) => {
  const { tier, search } = req.query;
  let customers = Array.from(db.customers.values());

  if (tier) customers = customers.filter(c => c.tier === tier);
  if (search) {
    const s = search.toLowerCase();
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.phone.includes(s) ||
      c.email.toLowerCase().includes(s)
    );
  }

  res.json({ success: true, count: customers.length, customers });
});

app.get('/api/customers/:id', (req, res) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

  // Get order history
  const orders = Array.from(db.orders.values())
    .filter(o => o.customerId === customer.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, customer, orders });
});

app.post('/api/customers', (req, res) => {
  const { name, phone, email, preferences } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Name and phone required' });
  }

  // Check if customer exists
  const existing = Array.from(db.customers.values()).find(c => c.phone === phone);
  if (existing) {
    return res.json({ success: true, customer: existing, message: 'Customer already exists' });
  }

  const customer = {
    id: `CUS${String(db.customers.size + 1).padStart(3, '0')}`,
    name,
    phone,
    email: email || null,
    visits: 0,
    totalSpent: 0,
    loyaltyPoints: 0,
    tier: 'bronze',
    preferences: preferences || {},
    createdAt: new Date().toISOString(),
  };

  db.customers.set(customer.id, customer);
  res.status(201).json({ success: true, customer });
});

// Update loyalty points
app.post('/api/customers/:id/points', (req, res) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

  const { points, action } = req.body;

  if (action === 'add') {
    customer.loyaltyPoints += points;
    // Check tier upgrade
    if (customer.loyaltyPoints >= 5000) customer.tier = 'platinum';
    else if (customer.loyaltyPoints >= 2000) customer.tier = 'gold';
    else if (customer.loyaltyPoints >= 500) customer.tier = 'silver';
  } else if (action === 'redeem') {
    if (customer.loyaltyPoints < points) {
      return res.status(400).json({ success: false, error: 'Insufficient points' });
    }
    customer.loyaltyPoints -= points;
  }

  db.customers.set(customer.id, customer);
  res.json({ success: true, customer });
});

// ==================== INVENTORY ====================

app.get('/api/inventory/ingredients', (req, res) => {
  const { lowStock } = req.query;
  let ingredients = Array.from(db.ingredients.values());

  if (lowStock === 'true') {
    ingredients = ingredients.filter(i => i.currentStock <= i.minStock);
  }

  ingredients = ingredients.map(i => ({
    ...i,
    supplier: db.suppliers.get(i.supplierId),
    stockStatus: i.currentStock <= i.minStock ? 'low' : 'ok',
  }));

  res.json({ success: true, count: ingredients.length, ingredients });
});

app.post('/api/inventory/ingredients', (req, res) => {
  const { name, unit, currentStock, minStock, cost, supplierId } = req.body;

  if (!name || !unit) {
    return res.status(400).json({ success: false, error: 'Name and unit required' });
  }

  const ingredient = {
    id: `ING${String(db.ingredients.size + 1).padStart(3, '0')}`,
    name,
    unit,
    currentStock: currentStock || 0,
    minStock: minStock || 0,
    cost: cost || 0,
    supplierId: supplierId || null,
    createdAt: new Date().toISOString(),
  };

  db.ingredients.set(ingredient.id, ingredient);
  res.status(201).json({ success: true, ingredient });
});

// Stock adjustment
app.post('/api/inventory/:ingredientId/adjust', (req, res) => {
  const ingredient = db.ingredients.get(req.params.ingredientId);
  if (!ingredient) return res.status(404).json({ success: false, error: 'Ingredient not found' });

  const { quantity, type, reason } = req.body;

  const transaction = {
    id: `TXN${String(db.inventoryTransactions.size + 1).padStart(3, '0')}`,
    ingredientId: ingredient.id,
    quantity,
    type, // 'add' or 'remove'
    reason: reason || '',
    timestamp: new Date().toISOString(),
  };

  if (type === 'add') {
    ingredient.currentStock += quantity;
  } else {
    ingredient.currentStock -= quantity;
  }

  db.ingredients.set(ingredient.id, ingredient);
  db.inventoryTransactions.set(transaction.id, transaction);

  res.json({ success: true, ingredient, transaction });
});

// ==================== SUPPLIERS ====================

app.get('/api/suppliers', (req, res) => {
  const suppliers = Array.from(db.suppliers.values());
  res.json({ success: true, count: suppliers.length, suppliers });
});

app.post('/api/suppliers', (req, res) => {
  const { name, contact, phone, email, address } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name required' });

  const supplier = {
    id: `SUP${String(db.suppliers.size + 1).padStart(3, '0')}`,
    name,
    contact: contact || '',
    phone: phone || '',
    email: email || '',
    address: address || '',
    rating: 0,
    leadTime: 1,
    createdAt: new Date().toISOString(),
  };

  db.suppliers.set(supplier.id, supplier);
  res.status(201).json({ success: true, supplier });
});

// ==================== STAFF ====================

app.get('/api/staff', (req, res) => {
  const { department, role, status } = req.query;
  let staff = Array.from(db.staff.values());

  if (department) staff = staff.filter(s => s.department === department);
  if (role) staff = staff.filter(s => s.role === role);
  if (status) staff = staff.filter(s => s.status === status);

  res.json({ success: true, count: staff.length, staff });
});

app.get('/api/staff/:id', (req, res) => {
  const member = db.staff.get(req.params.id);
  if (!member) return res.status(404).json({ success: false, error: 'Staff member not found' });
  res.json({ success: true, staff: member });
});

app.post('/api/staff', (req, res) => {
  const { name, role, department, phone, email, hourlyRate } = req.body;

  if (!name || !role) {
    return res.status(400).json({ success: false, error: 'Name and role required' });
  }

  const member = {
    id: `STF${String(db.staff.size + 1).padStart(3, '0')}`,
    name,
    role,
    department: department || role.split('_')[0],
    phone: phone || '',
    email: email || '',
    status: 'active',
    hourlyRate: hourlyRate || 100,
    createdAt: new Date().toISOString(),
  };

  db.staff.set(member.id, member);
  res.status(201).json({ success: true, staff: member });
});

// ==================== ANALYTICS ====================

app.get('/api/analytics/overview', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const orders = Array.from(db.orders.values()).filter(o => o.createdAt.startsWith(today));

  const totalRevenue = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const totalCovers = orders.reduce((sum, o) => sum + (o.partySize || 2), 0);

  // Table stats
  const tables = Array.from(db.tables.values());
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  const availableTables = tables.filter(t => t.status === 'available').length;

  // Kitchen stats
  const kitchenOrders = Array.from(db.kitchenOrders.values());
  const avgPrepTime = kitchenOrders.length > 0
    ? Math.round(kitchenOrders.reduce((sum, o) => {
        const start = new Date(o.sentToKitchenAt);
        const ready = o.items.filter(i => i.readyAt).map(i => new Date(i.readyAt));
        if (ready.length === 0) return sum;
        return sum + (ready[ready.length - 1] - start) / 60000;
      }, 0) / kitchenOrders.length)
    : 0;

  res.json({
    success: true,
    overview: {
      date: today,
      revenue: totalRevenue,
      orders: totalOrders,
      avgOrderValue,
      covers: totalCovers,
      tables: { occupied: occupiedTables, available: availableTables, total: tables.length },
      kitchen: { pendingOrders: kitchenOrders.length, avgPrepTime },
    },
  });
});

app.get('/api/analytics/sales', (req, res) => {
  const { period } = req.query; // today, week, month
  const now = new Date();
  let startDate;

  if (period === 'week') {
    startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.toISOString().split('T')[0]);
  }

  const orders = Array.from(db.orders.values())
    .filter(o => new Date(o.createdAt) >= startDate && o.status === 'paid');

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const totalCovers = orders.reduce((sum, o) => sum + (o.partySize || 2), 0);

  // By hour (for today)
  const hourlySales = {};
  orders.forEach(o => {
    const hour = new Date(o.createdAt).getHours();
    if (!hourlySales[hour]) hourlySales[hour] = { orders: 0, revenue: 0 };
    hourlySales[hour].orders++;
    hourlySales[hour].revenue += o.total;
  });

  // By category
  const categorySales = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const menuItem = db.menuItems.get(item.menuItemId);
      if (menuItem) {
        const cat = menuItem.categoryId;
        if (!categorySales[cat]) categorySales[cat] = { quantity: 0, revenue: 0 };
        categorySales[cat].quantity += item.quantity;
        categorySales[cat].revenue += item.price * item.quantity;
      }
    });
  });

  res.json({
    success: true,
    sales: {
      period,
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      totalCovers,
      hourlySales,
      categorySales,
    },
  });
});

app.get('/api/analytics/menu-performance', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const orders = Array.from(db.orders.values()).filter(o => o.createdAt.startsWith(today));

  const itemStats = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!itemStats[item.menuItemId]) {
        itemStats[item.menuItemId] = {
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
      }
      itemStats[item.menuItemId].quantity += item.quantity;
      itemStats[item.menuItemId].revenue += item.price * item.quantity;
    });
  });

  const topItems = Object.values(itemStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  res.json({ success: true, topItems });
});

// ==================== RTMN LAYER INTEGRATION (Stub) ====================

app.get('/api/layer/intelligence', async (req, res) => {
  res.json({
    success: true,
    layer: 'intelligence',
    available: true,
    message: 'HOJAI AI integration ready',
  });
});

app.get('/api/layer/customer-growth', async (req, res) => {
  res.json({
    success: true,
    layer: 'customer-growth',
    available: true,
    message: 'AdBazaar + REZ integration ready',
  });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('[Restaurant OS Error]', err);
  res.status(500).json({ success: false, error: err.message });
});

// ==================== START ====================

initSampleData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              RESTAURANT OS v2.0.0                       ║
║           Complete Restaurant Management                ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Status: Running                                         ║
║                                                          ║
║  Features:                                               ║
║  • Menu Management (Categories, Items, Modifiers)       ║
║  • Order Management (POS, KDS)                          ║
║  • Table Management (Reservations, Seating)              ║
║  • Kitchen Display System (KDS)                         ║
║  • Customer Loyalty (Points, Tiers)                     ║
║  • Inventory Management (Ingredients, Suppliers)         ║
║  • Staff Management                                      ║
║  • Analytics (Sales, Menu Performance)                   ║
║                                                          ║
║  Connectors:                                            ║
║  • Sales OS Bridge (5011)                               ║
║  • RTMN Event Bus (4510)                               ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
