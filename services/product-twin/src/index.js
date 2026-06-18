const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4720;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const products = new Map();
const categories = new Map();
const inventory = new Map();
const variants = new Map();
const syncEvents = new Map();

// Initialize with sample products
const sampleProducts = [
  {
    id: 'prod-1',
    name: 'Enterprise CRM Suite',
    sku: 'CRM-ENT-001',
    type: 'software',
    category: 'Sales Software',
    description: 'Full-featured CRM for enterprise sales teams',
    price: 999.99,
    cost: 200,
    currency: 'USD',
    status: 'active',
    features: ['Contact Management', 'Deal Tracking', 'Sales Analytics', 'Automation'],
    specifications: { users: 'Unlimited', storage: '100GB' },
    images: ['crm-enterprise.png'],
    metadata: { vendor: 'RTMN', version: '3.0' },
    stats: { sold: 1250, rating: 4.5, reviews: 234 },
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-06-15').toISOString()
  },
  {
    id: 'prod-2',
    name: 'Marketing Automation Pro',
    sku: 'MKT-PRO-002',
    type: 'software',
    category: 'Marketing Software',
    description: 'AI-powered marketing automation platform',
    price: 799.99,
    cost: 150,
    currency: 'USD',
    status: 'active',
    features: ['Email Campaigns', 'Lead Nurturing', 'A/B Testing', 'Analytics'],
    specifications: { users: 'Up to 50', storage: '50GB' },
    images: ['mkt-pro.png'],
    metadata: { vendor: 'RTMN', version: '2.5' },
    stats: { sold: 890, rating: 4.7, reviews: 156 },
    createdAt: new Date('2025-02-01').toISOString(),
    updatedAt: new Date('2025-06-10').toISOString()
  },
  {
    id: 'prod-3',
    name: 'AI Agent Bundle',
    sku: 'AI-BND-001',
    type: 'bundle',
    category: 'AI Solutions',
    description: 'Bundle of 10 AI agents for business automation',
    price: 4999.99,
    cost: 1500,
    currency: 'USD',
    status: 'active',
    features: ['10 AI Agents', 'Priority Support', 'Custom Training', 'API Access'],
    specifications: { agents: 10, languages: 'Multi-language' },
    images: ['ai-bundle.png'],
    metadata: { vendor: 'RTMN', version: '1.0' },
    stats: { sold: 156, rating: 4.9, reviews: 42 },
    createdAt: new Date('2025-03-01').toISOString(),
    updatedAt: new Date('2025-06-01').toISOString()
  }
];

sampleProducts.forEach(p => products.set(p.id, p));

// Initialize with sample inventory
const sampleInventory = [
  { id: 'inv-1', productId: 'prod-1', warehouseId: 'wh-1', quantity: 1000, reserved: 50, available: 950, reorderPoint: 100, status: 'in_stock' },
  { id: 'inv-2', productId: 'prod-2', warehouseId: 'wh-1', quantity: 500, reserved: 25, available: 475, reorderPoint: 50, status: 'in_stock' },
  { id: 'inv-3', productId: 'prod-3', warehouseId: 'wh-2', quantity: 100, reserved: 5, available: 95, reorderPoint: 10, status: 'in_stock' }
];

sampleInventory.forEach(i => inventory.set(i.id, i));

// ==================== PRODUCTS API ====================

// Get all products
app.get('/api/products', (req, res) => {
  const { category, type, status, search, minPrice, maxPrice } = req.query;

  let result = Array.from(products.values());

  if (category) result = result.filter(p => p.category === category);
  if (type) result = result.filter(p => p.type === type);
  if (status) result = result.filter(p => p.status === status);
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.sku.toLowerCase().includes(searchLower)
    );
  }
  if (minPrice) result = result.filter(p => p.price >= Number(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));

  res.json({ products: result, total: result.length });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// Create product
app.post('/api/products', (req, res) => {
  const { name, sku, type, category, description, price, cost } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Name and SKU are required' });
  }

  const product = {
    id: `prod-${uuidv4().slice(0, 8)}`,
    name,
    sku,
    type: type || 'standard',
    category: category || 'General',
    description: description || '',
    price: price || 0,
    cost: cost || 0,
    currency: 'USD',
    status: 'draft',
    features: [],
    specifications: {},
    images: [],
    metadata: {},
    stats: { sold: 0, rating: 0, reviews: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  products.set(product.id, product);

  res.status(201).json(product);
});

// Update product
app.put('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const fields = ['name', 'sku', 'type', 'category', 'description', 'price', 'cost', 'status', 'features', 'specifications', 'images'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  product.updatedAt = new Date().toISOString();

  res.json(product);
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  if (!products.has(req.params.id)) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products.delete(req.params.id);

  res.json({ message: 'Product deleted successfully' });
});

// ==================== INVENTORY API ====================

// Get product inventory
app.get('/api/products/:id/inventory', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const productInventory = Array.from(inventory.values()).filter(i => i.productId === req.params.id);

  res.json({ inventory: productInventory, total: productInventory.length });
});

// Update inventory
app.put('/api/products/:id/inventory', (req, res) => {
  const { warehouseId, quantity, reserved } = req.body;

  // Find existing inventory record
  let inv = Array.from(inventory.values()).find(i =>
    i.productId === req.params.id && (!warehouseId || i.warehouseId === warehouseId)
  );

  if (!inv) {
    // Create new inventory record
    inv = {
      id: `inv-${uuidv4().slice(0, 8)}`,
      productId: req.params.id,
      warehouseId: warehouseId || 'wh-1',
      quantity: quantity || 0,
      reserved: reserved || 0,
      available: 0,
      reorderPoint: 10,
      status: 'out_of_stock'
    };
    inventory.set(inv.id, inv);
  }

  if (quantity !== undefined) {
    inv.quantity = quantity;
    inv.available = quantity - inv.reserved;
  }
  if (reserved !== undefined) {
    inv.reserved = reserved;
    inv.available = inv.quantity - reserved;
  }

  // Update status based on availability
  if (inv.available > inv.reorderPoint) {
    inv.status = 'in_stock';
  } else if (inv.available > 0) {
    inv.status = 'low_stock';
  } else {
    inv.status = 'out_of_stock';
  }

  res.json(inv);
});

// Reserve inventory
app.post('/api/products/:id/inventory/reserve', (req, res) => {
  const { quantity, orderId } = req.body;

  if (!quantity) {
    return res.status(400).json({ error: 'Quantity is required' });
  }

  // Find inventory with available stock
  const inv = Array.from(inventory.values()).find(i =>
    i.productId === req.params.id && i.available >= quantity
  );

  if (!inv) {
    return res.status(400).json({ error: 'Insufficient inventory' });
  }

  inv.reserved += quantity;
  inv.available -= quantity;

  if (inv.available <= inv.reorderPoint) {
    inv.status = 'low_stock';
  }

  res.json({
    message: 'Inventory reserved',
    reservationId: `res-${uuidv4().slice(0, 8)}`,
    orderId,
    quantity,
    remainingAvailable: inv.available
  });
});

// ==================== VARIANTS API ====================

// Get product variants
app.get('/api/products/:id/variants', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const productVariants = Array.from(variants.values()).filter(v => v.productId === req.params.id);

  res.json({ variants: productVariants });
});

// Create variant
app.post('/api/products/:id/variants', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { name, sku, price, attributes } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Name and SKU are required' });
  }

  const variant = {
    id: `var-${uuidv4().slice(0, 8)}`,
    productId: req.params.id,
    name,
    sku,
    price: price || product.price,
    attributes: attributes || {},
    status: 'active',
    createdAt: new Date().toISOString()
  };

  variants.set(variant.id, variant);

  res.status(201).json(variant);
});

// ==================== ANALYTICS API ====================

// Get product analytics
app.get('/api/products/:id/analytics', (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const productInventory = Array.from(inventory.values()).filter(i => i.productId === req.params.id);

  const totalQuantity = productInventory.reduce((sum, i) => sum + i.quantity, 0);
  const totalAvailable = productInventory.reduce((sum, i) => sum + i.available, 0);
  const totalReserved = productInventory.reduce((sum, i) => sum + i.reserved, 0);

  const revenue = product.stats.sold * product.price;
  const profit = revenue - (product.stats.sold * product.cost);

  res.json({
    productId: product.id,
    sales: {
      unitsSold: product.stats.sold,
      revenue: revenue,
      profit: profit,
      margin: ((product.price - product.cost) / product.price * 100).toFixed(1) + '%',
      rating: product.stats.rating,
      reviews: product.stats.reviews
    },
    inventory: {
      totalQuantity,
      available: totalAvailable,
      reserved: totalReserved,
      value: totalQuantity * product.cost
    },
    pricing: {
      price: product.price,
      cost: product.cost,
      markup: ((product.price - product.cost) / product.cost * 100).toFixed(1) + '%'
    }
  });
});

// ==================== COMPARISON API ====================

app.post('/api/compare', (req, res) => {
  const { productIds } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
    return res.status(400).json({ error: 'At least 2 product IDs required' });
  }

  const prods = productIds.map(id => products.get(id)).filter(Boolean);

  res.json({
    products: prods.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      cost: p.cost,
      stats: p.stats
    }))
  });
});

// ==================== STATISTICS API ====================

app.get('/api/statistics', (req, res) => {
  const allProducts = Array.from(products.values());

  const stats = {
    total: allProducts.length,
    byCategory: {},
    byType: {},
    byStatus: {},
    totalRevenue: 0,
    totalUnitsSold: 0,
    avgPrice: 0,
    topProducts: []
  };

  allProducts.forEach(product => {
    stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1;
    stats.byType[product.type] = (stats.byType[product.type] || 0) + 1;
    stats.byStatus[product.status] = (stats.byStatus[product.status] || 0) + 1;
    stats.totalUnitsSold += product.stats.sold;
    stats.totalRevenue += product.stats.sold * product.price;
  });

  stats.avgPrice = (allProducts.reduce((sum, p) => sum + p.price, 0) / allProducts.length).toFixed(2);

  stats.topProducts = allProducts
    .filter(p => p.stats.sold > 0)
    .sort((a, b) => b.stats.sold - a.stats.sold)
    .slice(0, 5)
    .map(p => ({ id: p.id, name: p.name, sold: p.stats.sold, revenue: p.stats.sold * p.price }));

  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-twin',
    port: PORT,
    products: products.size,
    inventory: inventory.size,
    variants: variants.size
  });
});

app.listen(PORT, () => {
  console.log('📦 Product Twin Service running on port ' + PORT);
  console.log('   Products: ' + products.size);
  console.log('   Inventory Records: ' + inventory.size);
});
