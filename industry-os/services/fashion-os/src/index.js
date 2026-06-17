/**
 * Fashion OS - AI Fashion Brand Management Platform
 *
 * Complete Fashion/Clothing Brand Management with:
 * - Collection/Design Management
 * - Product Catalog (clothing, accessories, sizes)
 * - SKU/Variant Management
 * - Fabric/Material Inventory
 * - Supplier/Vendor Management
 * - Order Management
 * - Showroom/Retail Management
 * - Style/Trend Tracking
 * - Analytics
 *
 * Port: 5095
 * Industry: Fashion & Apparel
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5095;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const authUsers = new Map();
const authSessions = new Map();
const collections = new Map();
const products = new Map();
const skus = new Map();
const fabrics = new Map();
const suppliers = new Map();
const orders = new Map();
const showrooms = new Map();
const trends = new Map();
const styleProfiles = new Map();

// ============ SAMPLE DATA ============

function initializeSampleData() {
  // Sample Collections (4)
  const sampleCollections = [
    {
      id: 'col-001',
      name: 'Summer Breeze 2026',
      season: 'SS26',
      year: 2026,
      theme: 'Light, airy fabrics with tropical prints',
      description: 'A vibrant collection featuring lightweight cotton and linen pieces perfect for summer days',
      status: 'active',
      releaseDate: '2026-04-01',
      products: ['prod-001', 'prod-002', 'prod-003'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'col-002',
      name: 'Urban Edge',
      season: 'FW26',
      year: 2026,
      theme: 'Modern streetwear meets sophistication',
      description: 'Bold silhouettes and edgy designs for the modern urbanite',
      status: 'planning',
      releaseDate: '2026-09-01',
      products: ['prod-004', 'prod-005'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'col-003',
      name: 'Ethnic Elegance',
      season: 'FW26',
      year: 2026,
      theme: 'Traditional craftsmanship meets contemporary design',
      description: 'Hand-woven textiles and intricate embroidery reimagined for modern occasions',
      status: 'active',
      releaseDate: '2026-08-15',
      products: ['prod-006', 'prod-007', 'prod-008'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'col-004',
      name: 'Minimalist Luxe',
      season: 'FW26',
      year: 2026,
      theme: 'Less is more - premium basics',
      description: 'Timeless essentials crafted from the finest materials',
      status: 'development',
      releaseDate: '2026-10-01',
      products: ['prod-009', 'prod-010'],
      createdAt: new Date().toISOString()
    }
  ];
  sampleCollections.forEach(c => collections.set(c.id, c));

  // Sample Products (10)
  const sampleProducts = [
    {
      id: 'prod-001',
      name: 'Linen Blend Shirt',
      sku: 'LBS-001',
      category: 'tops',
      subcategory: 'shirts',
      collection: 'col-001',
      description: 'Relaxed fit linen blend shirt with mother of pearl buttons',
      basePrice: 3499,
      currency: 'INR',
      colors: ['white', 'sky-blue', 'sage-green'],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      materials: ['60% linen', '40% cotton'],
      careInstructions: 'Machine wash cold, hang dry',
      status: 'active',
      images: ['/images/lbs-001-1.jpg'],
      tags: ['summer', 'breathable', 'casual'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-002',
      name: 'Tropical Print Dress',
      sku: 'TPD-001',
      category: 'dresses',
      subcategory: 'maxi',
      collection: 'col-001',
      description: 'Flowing maxi dress with hand-painted tropical floral print',
      basePrice: 5999,
      currency: 'INR',
      colors: ['coral', 'teal'],
      sizes: ['XS', 'S', 'M', 'L'],
      materials: ['100% viscose'],
      careInstructions: 'Hand wash only',
      status: 'active',
      images: ['/images/tpd-001-1.jpg'],
      tags: ['summer', 'floral', 'vacation'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-003',
      name: 'Cotton Cargo Shorts',
      sku: 'CCS-001',
      category: 'bottoms',
      subcategory: 'shorts',
      collection: 'col-001',
      description: 'Relaxed fit cargo shorts with utility pockets',
      basePrice: 2499,
      currency: 'INR',
      colors: ['olive', 'khaki', 'sand'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      materials: ['100% organic cotton'],
      careInstructions: 'Machine wash cold',
      status: 'active',
      images: ['/images/ccs-001-1.jpg'],
      tags: ['summer', 'casual', 'utility'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-004',
      name: 'Leather Bomber Jacket',
      sku: 'LBJ-001',
      category: 'outerwear',
      subcategory: 'jackets',
      collection: 'col-002',
      description: 'Premium leather bomber with quilted lining',
      basePrice: 15999,
      currency: 'INR',
      colors: ['black', 'cognac'],
      sizes: ['S', 'M', 'L', 'XL'],
      materials: ['100% lambskin leather'],
      careInstructions: 'Professional leather clean only',
      status: 'active',
      images: ['/images/lbj-001-1.jpg'],
      tags: ['premium', 'urban', 'winter'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-005',
      name: 'Graphic Hoodie',
      sku: 'GH-001',
      category: 'tops',
      subcategory: 'hoodies',
      collection: 'col-002',
      description: 'Oversized hoodie with embroidered logo',
      basePrice: 3499,
      currency: 'INR',
      colors: ['black', 'charcoal', 'cream'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      materials: ['80% cotton', '20% polyester'],
      careInstructions: 'Machine wash cold inside out',
      status: 'active',
      images: ['/images/gh-001-1.jpg'],
      tags: ['streetwear', 'urban', 'comfort'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-006',
      name: 'Embroidered Kurta',
      sku: 'EK-001',
      category: 'ethnic',
      subcategory: 'kurtas',
      collection: 'col-003',
      description: 'Hand-embroidered cotton kurta with Lucknowi chikankari work',
      basePrice: 8999,
      currency: 'INR',
      colors: ['ivory', 'blush-pink'],
      sizes: ['S', 'M', 'L', 'XL'],
      materials: ['100% cotton muslin'],
      careInstructions: 'Dry clean recommended',
      status: 'active',
      images: ['/images/ek-001-1.jpg'],
      tags: ['ethnic', 'handcrafted', 'premium'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-007',
      name: 'Block Print Palazzo',
      sku: 'BPP-001',
      category: 'bottoms',
      subcategory: 'palazzos',
      collection: 'col-003',
      description: 'Wide-leg palazzo pants with traditional block print',
      basePrice: 3999,
      currency: 'INR',
      colors: ['indigo', 'rust'],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      materials: ['100% rayon'],
      careInstructions: 'Hand wash separately',
      status: 'active',
      images: ['/images/bpp-001-1.jpg'],
      tags: ['ethnic', 'comfortable', 'traditional'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-008',
      name: 'Silk Saree Blouse',
      sku: 'SSB-001',
      category: 'ethnic',
      subcategory: 'blouses',
      collection: 'col-003',
      description: 'Hand-embroidered silk blouse piece',
      basePrice: 4999,
      currency: 'INR',
      colors: ['gold', 'maroon', 'emerald'],
      sizes: ['S', 'M', 'L'],
      materials: ['100% silk'],
      careInstructions: 'Dry clean only',
      status: 'active',
      images: ['/images/ssb-001-1.jpg'],
      tags: ['ethnic', 'luxury', 'occasion'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-009',
      name: 'Cashmere Sweater',
      sku: 'CS-001',
      category: 'tops',
      subcategory: 'sweaters',
      collection: 'col-004',
      description: 'Ultra-soft 100% cashmere crew neck sweater',
      basePrice: 12999,
      currency: 'INR',
      colors: ['oatmeal', 'charcoal', 'navy', 'burgundy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      materials: ['100% cashmere'],
      careInstructions: 'Hand wash cold, lay flat to dry',
      status: 'active',
      images: ['/images/cs-001-1.jpg'],
      tags: ['luxury', 'essentials', 'winter'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-010',
      name: 'Merino Wool Coat',
      sku: 'MWC-001',
      category: 'outerwear',
      subcategory: 'coats',
      collection: 'col-004',
      description: 'Tailored merino wool overcoat with satin lining',
      basePrice: 24999,
      currency: 'INR',
      colors: ['camel', 'black', 'charcoal'],
      sizes: ['S', 'M', 'L', 'XL'],
      materials: ['100% merino wool'],
      careInstructions: 'Dry clean only',
      status: 'active',
      images: ['/images/mwc-001-1.jpg'],
      tags: ['luxury', 'essentials', 'professional'],
      createdAt: new Date().toISOString()
    }
  ];
  sampleProducts.forEach(p => products.set(p.id, p));

  // Generate SKUs for products
  let skuCounter = 1000;
  products.forEach(product => {
    product.sizes.forEach(size => {
      product.colors.forEach(color => {
        const skuId = `SKU-${String(skuCounter++).padStart(5, '0')}`;
        const sku = {
          id: skuId,
          productId: product.id,
          productName: product.name,
          sku: `${product.sku}-${size}-${color.toUpperCase().substring(0, 3)}`,
          size,
          color,
          price: product.basePrice,
          compareAtPrice: Math.round(product.basePrice * 1.2),
          cost: Math.round(product.basePrice * 0.4),
          inventory: Math.floor(Math.random() * 50) + 10,
          reserved: 0,
          available: Math.floor(Math.random() * 50) + 10,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        skus.set(skuId, sku);
      });
    });
  });

  // Sample Suppliers (3)
  const sampleSuppliers = [
    {
      id: 'sup-001',
      name: 'Mumbai Textile Mills',
      type: 'fabric',
      contact: {
        name: 'Rajesh Mehta',
        email: 'rajesh@mumbaitx.com',
        phone: '+91 98765 43210'
      },
      address: {
        street: '45 Industrial Area, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400069'
      },
      materials: [
        { name: 'Organic Cotton', leadTime: '14 days', moq: 500, unit: 'meters', pricePerUnit: 180 },
        { name: 'Linen Blend', leadTime: '21 days', moq: 300, unit: 'meters', pricePerUnit: 320 }
      ],
      rating: 4.5,
      status: 'active',
      paymentTerms: 'Net 30',
      createdAt: new Date().toISOString()
    },
    {
      id: 'sup-002',
      name: 'Leather Craft Co.',
      type: 'materials',
      contact: {
        name: 'Priya Sharma',
        email: 'priya@leathercraft.co',
        phone: '+91 99887 76655'
      },
      address: {
        street: '12 Craft Lane, Kanpur',
        city: 'Kanpur',
        state: 'Uttar Pradesh',
        pincode: '208001'
      },
      materials: [
        { name: 'Lambskin Leather', leadTime: '30 days', moq: 50, unit: 'sqft', pricePerUnit: 850 },
        { name: 'PU Leather', leadTime: '14 days', moq: 100, unit: 'sqft', pricePerUnit: 280 }
      ],
      rating: 4.2,
      status: 'active',
      paymentTerms: 'Net 45',
      createdAt: new Date().toISOString()
    },
    {
      id: 'sup-003',
      name: 'Silk Route Exports',
      type: 'fabric',
      contact: {
        name: 'Ananya Desai',
        email: 'ananya@silkroute.in',
        phone: '+91 87654 32109'
      },
      address: {
        street: '78 MG Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001'
      },
      materials: [
        { name: 'Mulberry Silk', leadTime: '21 days', moq: 100, unit: 'meters', pricePerUnit: 1200 },
        { name: 'Tussar Silk', leadTime: '28 days', moq: 75, unit: 'meters', pricePerUnit: 780 }
      ],
      rating: 4.8,
      status: 'active',
      paymentTerms: 'Net 30',
      createdAt: new Date().toISOString()
    }
  ];
  sampleSuppliers.forEach(s => suppliers.set(s.id, s));

  // Sample Fabrics Inventory
  const sampleFabrics = [
    { id: 'fab-001', name: 'Organic Cotton - White', supplier: 'sup-001', quantity: 2500, unit: 'meters', minStock: 500, unitPrice: 180, location: 'Warehouse A', status: 'in-stock' },
    { id: 'fab-002', name: 'Linen Blend - Natural', supplier: 'sup-001', quantity: 800, unit: 'meters', minStock: 300, unitPrice: 320, location: 'Warehouse A', status: 'in-stock' },
    { id: 'fab-003', name: 'Lambskin Leather - Black', supplier: 'sup-002', quantity: 200, unit: 'sqft', minStock: 50, unitPrice: 850, location: 'Warehouse B', status: 'in-stock' },
    { id: 'fab-004', name: 'Mulberry Silk - Gold', supplier: 'sup-003', quantity: 150, unit: 'meters', minStock: 50, unitPrice: 1200, location: 'Warehouse A', status: 'low-stock' },
    { id: 'fab-005', name: 'Viscose Rayon - Indigo', supplier: 'sup-001', quantity: 1200, unit: 'meters', minStock: 400, unitPrice: 220, location: 'Warehouse A', status: 'in-stock' }
  ];
  sampleFabrics.forEach(f => fabrics.set(f.id, f));

  // Sample Orders (5)
  const sampleOrders = [
    {
      id: 'ord-001',
      orderNumber: 'FO-2026-0001',
      customer: {
        name: 'Priya Patel',
        email: 'priya.patel@email.com',
        phone: '+91 98765 12345'
      },
      items: [
        { skuId: 'SKU-1000', productId: 'prod-001', name: 'Linen Blend Shirt', size: 'M', color: 'white', quantity: 2, price: 3499 },
        { skuId: 'SKU-1001', productId: 'prod-002', name: 'Tropical Print Dress', size: 'S', color: 'coral', quantity: 1, price: 5999 }
      ],
      subtotal: 12997,
      discount: 500,
      shipping: 0,
      total: 12497,
      status: 'delivered',
      paymentStatus: 'paid',
      shippingAddress: {
        street: '42 Green Park',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001'
      },
      createdAt: '2026-06-01T10:30:00Z',
      deliveredAt: '2026-06-05T14:20:00Z'
    },
    {
      id: 'ord-002',
      orderNumber: 'FO-2026-0002',
      customer: {
        name: 'Rahul Singh',
        email: 'rahul.singh@gmail.com',
        phone: '+91 99887 66554'
      },
      items: [
        { skuId: 'SKU-1003', productId: 'prod-004', name: 'Leather Bomber Jacket', size: 'L', color: 'black', quantity: 1, price: 15999 }
      ],
      subtotal: 15999,
      discount: 0,
      shipping: 0,
      total: 15999,
      status: 'shipped',
      paymentStatus: 'paid',
      shippingAddress: {
        street: '78 MG Road, Apt 302',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001'
      },
      createdAt: '2026-06-10T15:45:00Z',
      shippedAt: '2026-06-12T09:00:00Z'
    },
    {
      id: 'ord-003',
      orderNumber: 'FO-2026-0003',
      customer: {
        name: 'Ananya Gupta',
        email: 'ananya.g@outlook.com',
        phone: '+91 88776 55443'
      },
      items: [
        { skuId: 'SKU-1004', productId: 'prod-006', name: 'Embroidered Kurta', size: 'M', color: 'ivory', quantity: 1, price: 8999 },
        { skuId: 'SKU-1005', productId: 'prod-007', name: 'Block Print Palazzo', size: 'M', color: 'indigo', quantity: 1, price: 3999 }
      ],
      subtotal: 12998,
      discount: 1000,
      shipping: 0,
      total: 11998,
      status: 'processing',
      paymentStatus: 'paid',
      shippingAddress: {
        street: '15 Lake View Colony',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001'
      },
      createdAt: '2026-06-13T11:20:00Z'
    },
    {
      id: 'ord-004',
      orderNumber: 'FO-2026-0004',
      customer: {
        name: 'Vikram Malhotra',
        email: 'vikram.m@company.com',
        phone: '+91 77665 54433'
      },
      items: [
        { skuId: 'SKU-1006', productId: 'prod-009', name: 'Cashmere Sweater', size: 'L', color: 'oatmeal', quantity: 2, price: 12999 }
      ],
      subtotal: 25998,
      discount: 0,
      shipping: 100,
      total: 26098,
      status: 'confirmed',
      paymentStatus: 'paid',
      shippingAddress: {
        street: 'Tower B, Cyber Hub',
        city: 'Gurgaon',
        state: 'Haryana',
        pincode: '122002'
      },
      createdAt: '2026-06-14T09:15:00Z'
    },
    {
      id: 'ord-005',
      orderNumber: 'FO-2026-0005',
      customer: {
        name: 'Sneha Reddy',
        email: 'sneha.reddy@email.com',
        phone: '+91 66554 43322'
      },
      items: [
        { skuId: 'SKU-1007', productId: 'prod-005', name: 'Graphic Hoodie', size: 'M', color: 'black', quantity: 3, price: 3499 }
      ],
      subtotal: 10497,
      discount: 500,
      shipping: 0,
      total: 9997,
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress: {
        street: '89 Jubilee Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500033'
      },
      createdAt: '2026-06-15T08:00:00Z'
    }
  ];
  sampleOrders.forEach(o => orders.set(o.id, o));

  // Sample Showrooms
  const sampleShowrooms = [
    {
      id: 'show-001',
      name: 'Flagship Store - Mumbai',
      type: 'retail',
      address: {
        street: '123 Fashion Street, Linking Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050'
      },
      manager: 'Meera Shah',
      phone: '+91 22 2645 1234',
      email: 'mumbai@fashionbrand.com',
      inventory: [
        { skuId: 'SKU-1000', quantity: 15 },
        { skuId: 'SKU-1001', quantity: 8 },
        { skuId: 'SKU-1003', quantity: 5 }
      ],
      staff: ['staff-001', 'staff-002', 'staff-003'],
      status: 'open',
      hours: '10:00 AM - 9:00 PM',
      createdAt: new Date().toISOString()
    },
    {
      id: 'show-002',
      name: 'Boutique - Delhi',
      type: 'boutique',
      address: {
        street: '45 Emporio Mall, Nelson Mandela Marg',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110070'
      },
      manager: 'Arjun Kapoor',
      phone: '+91 11 4567 8901',
      email: 'delhi@fashionbrand.com',
      inventory: [
        { skuId: 'SKU-1004', quantity: 10 },
        { skuId: 'SKU-1005', quantity: 6 }
      ],
      staff: ['staff-004', 'staff-005'],
      status: 'open',
      hours: '11:00 AM - 8:00 PM',
      createdAt: new Date().toISOString()
    }
  ];
  sampleShowrooms.forEach(s => showrooms.set(s.id, s));

  // Sample Trends
  const sampleTrends = [
    { id: 'trend-001', name: 'Quiet Luxury', category: 'style', popularity: 95, sentiment: 'positive', products: ['prod-009', 'prod-010'] },
    { id: 'trend-002', name: 'Indian Heritage', category: 'style', popularity: 88, sentiment: 'positive', products: ['prod-006', 'prod-007', 'prod-008'] },
    { id: 'trend-003', name: 'Sustainable Fashion', category: 'movement', popularity: 92, sentiment: 'positive', products: ['prod-001', 'prod-003'] },
    { id: 'trend-004', name: 'Streetwear Luxe', category: 'style', popularity: 85, sentiment: 'positive', products: ['prod-004', 'prod-005'] },
    { id: 'trend-005', name: 'Tropical Prints', category: 'pattern', popularity: 78, sentiment: 'positive', products: ['prod-002'] }
  ];
  sampleTrends.forEach(t => trends.set(t.id, t));

  console.log('Fashion OS initialized with sample data');
}

// ============ AUTH MIDDLEWARE ============

function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !authSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid session required' });
  }
  const session = authSessions.get(sessionId);
  req.user = session.user;
  req.sessionId = sessionId;
  next();
}

// ============ RTMN LAYER INTEGRATION ============

const RTMN_LAYERS = {
  intelligence: 'http://localhost:4881',
  customerTwin: 'http://localhost:4885',
  eventBus: 'http://localhost:4510',
  memory: 'http://localhost:4703'
};

// ============ HEALTH ENDPOINT ============

app.get('/health', (req, res) => {
  res.json({
    service: 'Fashion OS',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      collections: collections.size,
      products: products.size,
      skus: skus.size,
      suppliers: suppliers.size,
      orders: orders.size,
      showrooms: showrooms.size,
      trends: trends.size
    }
  });
});

// ============ AUTH ROUTES ============

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role = 'user' } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name required' });
  }

  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const userId = uuidv4();
  const user = {
    id: userId,
    email,
    name,
    role,
    createdAt: new Date().toISOString()
  };

  authUsers.set(email, { ...user, password });

  const sessionId = uuidv4();
  authSessions.set(sessionId, { user, createdAt: new Date().toISOString() });

  res.status(201).json({
    message: 'Registration successful',
    sessionId,
    user
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const userData = authUsers.get(email);
  if (!userData || userData.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionId = uuidv4();
  const { password: _, ...user } = userData;
  authSessions.set(sessionId, { user, createdAt: new Date().toISOString() });

  res.json({
    message: 'Login successful',
    sessionId,
    user
  });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  authSessions.delete(req.sessionId);
  res.json({ message: 'Logged out successfully' });
});

// ============ COLLECTIONS ROUTES ============

app.get('/api/collections', (req, res) => {
  const allCollections = Array.from(collections.values());
  const { status, season, year } = req.query;

  let filtered = allCollections;
  if (status) filtered = filtered.filter(c => c.status === status);
  if (season) filtered = filtered.filter(c => c.season === season);
  if (year) filtered = filtered.filter(c => c.year === parseInt(year));

  res.json({ collections: filtered, total: filtered.length });
});

app.get('/api/collections/:id', (req, res) => {
  const collection = collections.get(req.params.id);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const collectionProducts = Array.from(products.values())
    .filter(p => collection.products.includes(p.id));

  res.json({ ...collection, productDetails: collectionProducts });
});

app.post('/api/collections', requireAuth, (req, res) => {
  const { name, season, year, theme, description, releaseDate } = req.body;

  if (!name || !season || !year) {
    return res.status(400).json({ error: 'Name, season, and year required' });
  }

  const id = `col-${uuidv4().substring(0, 8)}`;
  const collection = {
    id,
    name,
    season,
    year,
    theme: theme || '',
    description: description || '',
    status: 'planning',
    releaseDate: releaseDate || null,
    products: [],
    createdAt: new Date().toISOString()
  };

  collections.set(id, collection);
  res.status(201).json({ message: 'Collection created', collection });
});

app.put('/api/collections/:id', requireAuth, (req, res) => {
  const collection = collections.get(req.params.id);
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const updated = { ...collection, ...req.body, id: collection.id, updatedAt: new Date().toISOString() };
  collections.set(req.params.id, updated);

  res.json({ message: 'Collection updated', collection: updated });
});

app.delete('/api/collections/:id', requireAuth, (req, res) => {
  if (!collections.has(req.params.id)) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  collections.delete(req.params.id);
  res.json({ message: 'Collection deleted' });
});

// ============ PRODUCTS ROUTES ============

app.get('/api/products', (req, res) => {
  const allProducts = Array.from(products.values());
  const { category, collection, status, search } = req.query;

  let filtered = allProducts;
  if (category) filtered = filtered.filter(p => p.category === category);
  if (collection) filtered = filtered.filter(p => p.collection === collection);
  if (status) filtered = filtered.filter(p => p.status === status);
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }

  res.json({ products: filtered, total: filtered.length });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const productSkus = Array.from(skus.values()).filter(s => s.productId === product.id);
  const totalInventory = productSkus.reduce((sum, s) => sum + s.inventory, 0);

  res.json({ ...product, skus: productSkus, totalInventory });
});

app.post('/api/products', requireAuth, (req, res) => {
  const { name, sku, category, subcategory, collection, description, basePrice, colors, sizes, materials, tags } = req.body;

  if (!name || !sku || !category || !basePrice) {
    return res.status(400).json({ error: 'Name, SKU, category, and base price required' });
  }

  const id = `prod-${uuidv4().substring(0, 8)}`;
  const product = {
    id,
    name,
    sku,
    category: category || 'general',
    subcategory: subcategory || '',
    collection: collection || null,
    description: description || '',
    basePrice,
    currency: 'INR',
    colors: colors || [],
    sizes: sizes || ['S', 'M', 'L'],
    materials: materials || [],
    careInstructions: '',
    status: 'active',
    images: [],
    tags: tags || [],
    createdAt: new Date().toISOString()
  };

  products.set(id, product);

  // Add to collection if specified
  if (collection && collections.has(collection)) {
    const col = collections.get(collection);
    col.products.push(id);
    collections.set(collection, col);
  }

  res.status(201).json({ message: 'Product created', product });
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const product = products.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const updated = { ...product, ...req.body, id: product.id, updatedAt: new Date().toISOString() };
  products.set(req.params.id, updated);

  res.json({ message: 'Product updated', product: updated });
});

// ============ SKU ROUTES ============

app.get('/api/skus', (req, res) => {
  const allSkus = Array.from(skus.values());
  const { productId, color, size, lowStock } = req.query;

  let filtered = allSkus;
  if (productId) filtered = filtered.filter(s => s.productId === productId);
  if (color) filtered = filtered.filter(s => s.color === color);
  if (size) filtered = filtered.filter(s => s.size === size);
  if (lowStock === 'true') filtered = filtered.filter(s => s.available < 10);

  res.json({ skus: filtered, total: filtered.length });
});

app.get('/api/skus/:id', (req, res) => {
  const sku = skus.get(req.params.id);
  if (!sku) {
    return res.status(404).json({ error: 'SKU not found' });
  }
  res.json(sku);
});

app.put('/api/skus/:id/inventory', requireAuth, (req, res) => {
  const sku = skus.get(req.params.id);
  if (!sku) {
    return res.status(404).json({ error: 'SKU not found' });
  }

  const { quantity, operation = 'set' } = req.body;

  if (operation === 'set') {
    sku.inventory = quantity;
    sku.available = quantity - sku.reserved;
  } else if (operation === 'add') {
    sku.inventory += quantity;
    sku.available += quantity;
  } else if (operation === 'subtract') {
    sku.inventory = Math.max(0, sku.inventory - quantity);
    sku.available = Math.max(0, sku.available - quantity);
  }

  sku.updatedAt = new Date().toISOString();
  skus.set(req.params.id, sku);

  res.json({ message: 'Inventory updated', sku });
});

// ============ FABRICS/MATERIALS ROUTES ============

app.get('/api/fabrics', (req, res) => {
  const allFabrics = Array.from(fabrics.values());
  const { supplier, status, lowStock } = req.query;

  let filtered = allFabrics;
  if (supplier) filtered = filtered.filter(f => f.supplier === supplier);
  if (status) filtered = filtered.filter(f => f.status === status);
  if (lowStock === 'true') filtered = filtered.filter(f => f.quantity < f.minStock);

  const totalValue = filtered.reduce((sum, f) => sum + (f.quantity * f.unitPrice), 0);

  res.json({ fabrics: filtered, total: filtered.length, totalValue });
});

app.get('/api/fabrics/:id', (req, res) => {
  const fabric = fabrics.get(req.params.id);
  if (!fabric) {
    return res.status(404).json({ error: 'Fabric not found' });
  }
  res.json(fabric);
});

app.post('/api/fabrics', requireAuth, (req, res) => {
  const { name, supplier, quantity, unit, minStock, unitPrice, location } = req.body;

  if (!name || !supplier) {
    return res.status(400).json({ error: 'Name and supplier required' });
  }

  const id = `fab-${uuidv4().substring(0, 8)}`;
  const fabric = {
    id,
    name,
    supplier,
    quantity: quantity || 0,
    unit: unit || 'meters',
    minStock: minStock || 100,
    unitPrice: unitPrice || 0,
    location: location || 'Warehouse A',
    status: quantity >= minStock ? 'in-stock' : 'low-stock',
    createdAt: new Date().toISOString()
  };

  fabrics.set(id, fabric);
  res.status(201).json({ message: 'Fabric added', fabric });
});

app.put('/api/fabrics/:id', requireAuth, (req, res) => {
  const fabric = fabrics.get(req.params.id);
  if (!fabric) {
    return res.status(404).json({ error: 'Fabric not found' });
  }

  const updated = { ...fabric, ...req.body, id: fabric.id };
  if (updated.quantity >= updated.minStock) {
    updated.status = 'in-stock';
  } else if (updated.quantity > 0) {
    updated.status = 'low-stock';
  } else {
    updated.status = 'out-of-stock';
  }

  fabrics.set(req.params.id, updated);
  res.json({ message: 'Fabric updated', fabric: updated });
});

// ============ SUPPLIERS ROUTES ============

app.get('/api/suppliers', (req, res) => {
  const allSuppliers = Array.from(suppliers.values());
  const { type, status } = req.query;

  let filtered = allSuppliers;
  if (type) filtered = filtered.filter(s => s.type === type);
  if (status) filtered = filtered.filter(s => s.status === status);

  res.json({ suppliers: filtered, total: filtered.length });
});

app.get('/api/suppliers/:id', (req, res) => {
  const supplier = suppliers.get(req.params.id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  const supplierFabrics = Array.from(fabrics.values()).filter(f => f.supplier === supplier.id);
  res.json({ ...supplier, fabrics: supplierFabrics });
});

app.post('/api/suppliers', requireAuth, (req, res) => {
  const { name, type, contact, address, materials, paymentTerms } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type required' });
  }

  const id = `sup-${uuidv4().substring(0, 8)}`;
  const supplier = {
    id,
    name,
    type,
    contact: contact || {},
    address: address || {},
    materials: materials || [],
    rating: 0,
    status: 'active',
    paymentTerms: paymentTerms || 'Net 30',
    createdAt: new Date().toISOString()
  };

  suppliers.set(id, supplier);
  res.status(201).json({ message: 'Supplier added', supplier });
});

app.put('/api/suppliers/:id', requireAuth, (req, res) => {
  const supplier = suppliers.get(req.params.id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  const updated = { ...supplier, ...req.body, id: supplier.id };
  suppliers.set(req.params.id, updated);

  res.json({ message: 'Supplier updated', supplier: updated });
});

// ============ ORDERS ROUTES ============

app.get('/api/orders', (req, res) => {
  const allOrders = Array.from(orders.values());
  const { status, paymentStatus, customer } = req.query;

  let filtered = allOrders;
  if (status) filtered = filtered.filter(o => o.status === status);
  if (paymentStatus) filtered = filtered.filter(o => o.paymentStatus === paymentStatus);
  if (customer) filtered = filtered.filter(o => o.customer.email.includes(customer) || o.customer.name.toLowerCase().includes(customer.toLowerCase()));

  // Sort by creation date descending
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ orders: filtered, total: filtered.length });
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const { customer, items, shippingAddress } = req.body;

  if (!customer || !items || items.length === 0) {
    return res.status(400).json({ error: 'Customer and items required' });
  }

  // Calculate totals
  let subtotal = 0;
  const orderItems = items.map(item => {
    const sku = skus.get(item.skuId);
    if (!sku) {
      throw new Error(`SKU ${item.skuId} not found`);
    }
    subtotal += item.quantity * item.price;

    // Reserve inventory
    sku.reserved += item.quantity;
    sku.available -= item.quantity;
    skus.set(item.skuId, sku);

    return {
      skuId: item.skuId,
      productId: sku.productId,
      name: sku.productName,
      size: sku.size,
      color: sku.color,
      quantity: item.quantity,
      price: item.price
    };
  });

  const id = `ord-${uuidv4().substring(0, 8)}`;
  const orderNumber = `FO-2026-${String(orders.size + 1).padStart(4, '0')}`;

  const order = {
    id,
    orderNumber,
    customer,
    items: orderItems,
    subtotal,
    discount: 0,
    shipping: 0,
    total: subtotal,
    status: 'pending',
    paymentStatus: 'pending',
    shippingAddress: shippingAddress || {},
    createdAt: new Date().toISOString()
  };

  orders.set(id, order);

  res.status(201).json({ message: 'Order created', order });
});

app.put('/api/orders/:id', requireAuth, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const { status, paymentStatus, trackingNumber } = req.body;

  if (status) {
    order.status = status;
    if (status === 'delivered') order.deliveredAt = new Date().toISOString();
    if (status === 'shipped') order.shippedAt = new Date().toISOString();
  }

  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (trackingNumber) order.trackingNumber = trackingNumber;

  order.updatedAt = new Date().toISOString();
  orders.set(req.params.id, order);

  res.json({ message: 'Order updated', order });
});

app.post('/api/orders/:id/cancel', requireAuth, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status === 'delivered' || order.status === 'cancelled') {
    return res.status(400).json({ error: 'Cannot cancel this order' });
  }

  // Release reserved inventory
  order.items.forEach(item => {
    const sku = skus.get(item.skuId);
    if (sku) {
      sku.reserved = Math.max(0, sku.reserved - item.quantity);
      sku.available += item.quantity;
      skus.set(item.skuId, sku);
    }
  });

  order.status = 'cancelled';
  order.cancelledAt = new Date().toISOString();
  orders.set(req.params.id, order);

  res.json({ message: 'Order cancelled', order });
});

// ============ SHOWROOMS ROUTES ============

app.get('/api/showrooms', (req, res) => {
  const allShowrooms = Array.from(showrooms.values());
  const { type, status } = req.query;

  let filtered = allShowrooms;
  if (type) filtered = filtered.filter(s => s.type === type);
  if (status) filtered = filtered.filter(s => s.status === status);

  res.json({ showrooms: filtered, total: filtered.length });
});

app.get('/api/showrooms/:id', (req, res) => {
  const showroom = showrooms.get(req.params.id);
  if (!showroom) {
    return res.status(404).json({ error: 'Showroom not found' });
  }

  // Get full SKU details
  const inventoryWithDetails = showroom.inventory.map(inv => {
    const sku = skus.get(inv.skuId);
    return { ...inv, skuDetails: sku };
  });

  res.json({ ...showroom, inventory: inventoryWithDetails });
});

app.post('/api/showrooms', requireAuth, (req, res) => {
  const { name, type, address, manager, phone, email, hours } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type required' });
  }

  const id = `show-${uuidv4().substring(0, 8)}`;
  const showroom = {
    id,
    name,
    type,
    address: address || {},
    manager: manager || '',
    phone: phone || '',
    email: email || '',
    inventory: [],
    staff: [],
    status: 'open',
    hours: hours || '10:00 AM - 8:00 PM',
    createdAt: new Date().toISOString()
  };

  showrooms.set(id, showroom);
  res.status(201).json({ message: 'Showroom created', showroom });
});

// ============ TRENDS ROUTES ============

app.get('/api/trends', (req, res) => {
  const allTrends = Array.from(trends.values());
  const { category, sentiment } = req.query;

  let filtered = allTrends;
  if (category) filtered = filtered.filter(t => t.category === category);
  if (sentiment) filtered = filtered.filter(t => t.sentiment === sentiment);

  filtered.sort((a, b) => b.popularity - a.popularity);

  res.json({ trends: filtered, total: filtered.length });
});

app.get('/api/trends/:id', (req, res) => {
  const trend = trends.get(req.params.id);
  if (!trend) {
    return res.status(404).json({ error: 'Trend not found' });
  }

  const relatedProducts = trend.products.map(pid => products.get(pid)).filter(Boolean);
  res.json({ ...trend, relatedProducts });
});

app.post('/api/trends', requireAuth, (req, res) => {
  const { name, category, popularity, sentiment, products: productIds } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category required' });
  }

  const id = `trend-${uuidv4().substring(0, 8)}`;
  const trend = {
    id,
    name,
    category,
    popularity: popularity || 50,
    sentiment: sentiment || 'neutral',
    products: productIds || [],
    createdAt: new Date().toISOString()
  };

  trends.set(id, trend);
  res.status(201).json({ message: 'Trend added', trend });
});

// ============ ANALYTICS ROUTES ============

app.get('/api/analytics/dashboard', (req, res) => {
  const totalRevenue = Array.from(orders.values())
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  const totalOrders = orders.size;
  const pendingOrders = Array.from(orders.values()).filter(o => o.status === 'pending').length;
  const completedOrders = Array.from(orders.values()).filter(o => o.status === 'delivered').length;

  const totalInventoryValue = Array.from(skus.values())
    .reduce((sum, s) => sum + (s.inventory * s.cost), 0);

  const lowStockSkus = Array.from(skus.values()).filter(s => s.available < 10).length;
  const outOfStockSkus = Array.from(skus.values()).filter(s => s.available === 0).length;

  const categoryBreakdown = {};
  products.forEach(p => {
    if (!categoryBreakdown[p.category]) categoryBreakdown[p.category] = 0;
    categoryBreakdown[p.category]++;
  });

  const topProducts = Array.from(orders.values())
    .flatMap(o => o.items)
    .reduce((acc, item) => {
      if (!acc[item.productId]) acc[item.productId] = { productId: item.productId, name: item.name, quantity: 0, revenue: 0 };
      acc[item.productId].quantity += item.quantity;
      acc[item.productId].revenue += item.quantity * item.price;
      return acc;
    }, {});

  res.json({
    revenue: {
      total: totalRevenue,
      currency: 'INR',
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
    },
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      completed: completedOrders,
      conversionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
    },
    inventory: {
      totalSkus: skus.size,
      totalValue: totalInventoryValue,
      lowStock: lowStockSkus,
      outOfStock: outOfStockSkus
    },
    products: {
      total: products.size,
      byCategory: categoryBreakdown
    },
    topProducts: Object.values(topProducts).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  });
});

app.get('/api/analytics/sales', (req, res) => {
  const { period = '30d' } = req.query;

  const ordersList = Array.from(orders.values())
    .filter(o => o.paymentStatus === 'paid')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const dailySales = {};
  ordersList.forEach(o => {
    const date = o.createdAt.split('T')[0];
    if (!dailySales[date]) dailySales[date] = { date, orders: 0, revenue: 0, items: 0 };
    dailySales[date].orders++;
    dailySales[date].revenue += o.total;
    dailySales[date].items += o.items.reduce((sum, i) => sum + i.quantity, 0);
  });

  res.json({
    period,
    salesByDay: Object.values(dailySales),
    summary: {
      totalOrders: ordersList.length,
      totalRevenue: ordersList.reduce((sum, o) => sum + o.total, 0),
      totalItems: ordersList.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
    }
  });
});

// ============ RTMN LAYER ROUTES ============

app.get('/api/layers', (req, res) => {
  res.json({
    layers: [
      { id: 1, name: 'Intelligence', url: RTMN_LAYERS.intelligence },
      { id: 2, name: 'Customer Twin', url: RTMN_LAYERS.customerTwin },
      { id: 3, name: 'Event Bus', url: RTMN_LAYERS.eventBus },
      { id: 4, name: 'Memory', url: RTMN_LAYERS.memory }
    ]
  });
});

app.get('/api/layer/:name', async (req, res) => {
  const { name } = req.params;
  const layerUrl = RTMN_LAYERS[name];

  if (!layerUrl) {
    return res.status(404).json({ error: 'Layer not found', available: Object.keys(RTMN_LAYERS) });
  }

  try {
    const response = await fetch(`${layerUrl}/health`);
    const data = await response.json();
    res.json({ layer: name, status: 'available', data });
  } catch (error) {
    res.json({ layer: name, status: 'unavailable', error: error.message });
  }
});

// ============ STYLE PROFILES ============

app.get('/api/style-profiles', (req, res) => {
  const allProfiles = Array.from(styleProfiles.values());
  res.json({ profiles: allProfiles, total: allProfiles.length });
});

app.get('/api/style-profiles/:customerId', (req, res) => {
  const profile = styleProfiles.get(req.params.customerId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

app.post('/api/style-profiles', requireAuth, (req, res) => {
  const { customerId, preferences, sizes, favoriteCategories, budgetRange } = req.body;

  const profile = {
    customerId,
    preferences: preferences || [],
    sizes: sizes || {},
    favoriteCategories: favoriteCategories || [],
    budgetRange: budgetRange || { min: 0, max: 100000 },
    createdAt: new Date().toISOString()
  };

  styleProfiles.set(customerId, profile);
  res.status(201).json({ message: 'Style profile created', profile });
});

// ============ START SERVER ============

initializeSampleData();

app.listen(PORT, () => {
  console.log(`Fashion OS running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Collections: ${collections.size}`);
  console.log(`Products: ${products.size}`);
  console.log(`SKUs: ${skus.size}`);
  console.log(`Suppliers: ${suppliers.size}`);
  console.log(`Orders: ${orders.size}`);
});

module.exports = app;
