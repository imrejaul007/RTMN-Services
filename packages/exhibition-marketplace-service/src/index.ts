import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5051;

app.use(cors());
app.use(express.json());

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  vendorId: string;
  vendorName: string;
  boothNumber: string;
  stock: number;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  createdAt: string;
}

interface Order {
  id: string;
  userId: string;
  items: { productId: string; quantity: number; price: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress?: string;
  createdAt: string;
  updatedAt: string;
}

interface RFQ {
  id: string;
  userId: string;
  title: string;
  description: string;
  quantity: number;
  budget?: number;
  status: 'open' | 'quoted' | 'accepted' | 'rejected' | 'closed';
  quotes: Quote[];
  createdAt: string;
}

interface Quote {
  id: string;
  rfqId: string;
  vendorId: string;
  vendorName: string;
  price: number;
  notes?: string;
  validUntil: string;
  createdAt: string;
}

interface CartItem {
  productId: string;
  quantity: number;
}

// Mock Data
const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Smart Display Kiosk',
    description: 'Interactive 21-inch smart display for retail',
    price: 2999.99,
    category: 'Technology',
    vendorId: 'vendor-1',
    vendorName: 'TechCorp Solutions',
    boothNumber: 'A-12',
    stock: 50,
    images: ['/images/kiosk-1.jpg'],
    tags: ['display', 'smart', 'retail'],
    rating: 4.5,
    reviewCount: 28,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Portable POS System',
    description: 'All-in-one point of sale solution',
    price: 899.99,
    category: 'Technology',
    vendorId: 'vendor-1',
    vendorName: 'TechCorp Solutions',
    boothNumber: 'A-12',
    stock: 120,
    images: ['/images/pos-1.jpg'],
    tags: ['pos', 'payment', 'portable'],
    rating: 4.8,
    reviewCount: 64,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    name: 'Eco-Friendly Packaging Set',
    description: '100% biodegradable packaging materials',
    price: 149.99,
    category: 'Sustainability',
    vendorId: 'vendor-2',
    vendorName: 'GreenPack Inc',
    boothNumber: 'B-05',
    stock: 500,
    images: ['/images/packaging-1.jpg'],
    tags: ['eco', 'packaging', 'sustainable'],
    rating: 4.2,
    reviewCount: 42,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-4',
    name: 'AI Analytics Dashboard',
    description: 'Real-time business intelligence platform',
    price: 1999.99,
    category: 'Software',
    vendorId: 'vendor-3',
    vendorName: 'DataMind AI',
    boothNumber: 'C-08',
    stock: 999,
    images: ['/images/analytics-1.jpg'],
    tags: ['ai', 'analytics', 'dashboard'],
    rating: 4.9,
    reviewCount: 112,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-5',
    name: 'Exhibition Stand Kit',
    description: 'Professional modular exhibition booth',
    price: 2499.99,
    category: 'Exhibition',
    vendorId: 'vendor-4',
    vendorName: 'ExpoDesign Co',
    boothNumber: 'D-15',
    stock: 25,
    images: ['/images/stand-1.jpg'],
    tags: ['exhibition', 'booth', 'modular'],
    rating: 4.6,
    reviewCount: 18,
    createdAt: new Date().toISOString()
  }
];

const orders: Order[] = [
  {
    id: 'order-1',
    userId: 'user-1',
    items: [{ productId: 'prod-1', quantity: 1, price: 2999.99 }],
    total: 2999.99,
    status: 'delivered',
    shippingAddress: '123 Main St, City',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'order-2',
    userId: 'user-2',
    items: [
      { productId: 'prod-2', quantity: 2, price: 899.99 },
      { productId: 'prod-3', quantity: 5, price: 149.99 }
    ],
    total: 2549.93,
    status: 'shipped',
    shippingAddress: '456 Oak Ave, Town',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const rfqs: RFQ[] = [
  {
    id: 'rfq-1',
    userId: 'user-1',
    title: 'Bulk POS Systems',
    description: 'Need 50 POS systems for retail chain deployment',
    quantity: 50,
    budget: 40000,
    status: 'quoted',
    quotes: [
      {
        id: 'quote-1',
        rfqId: 'rfq-1',
        vendorId: 'vendor-1',
        vendorName: 'TechCorp Solutions',
        price: 42500,
        notes: 'Includes installation and 2-year support',
        validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
        createdAt: new Date().toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'rfq-2',
    userId: 'user-3',
    title: 'Custom Exhibition Booths',
    description: 'Looking for 10 custom-designed exhibition booths',
    quantity: 10,
    status: 'open',
    quotes: [],
    createdAt: new Date().toISOString()
  }
];

const carts: Map<string, CartItem[]> = new Map();

// Response helper
const response = <T>(data: T, req: Request) => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string || uuidv4()
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-marketplace-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Product routes
app.get('/api/products', (req: Request, res: Response) => {
  const { category, vendorId, search, minPrice, maxPrice } = req.query;

  let filtered = [...products];

  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }
  if (vendorId) {
    filtered = filtered.filter(p => p.vendorId === vendorId);
  }
  if (search) {
    const searchLower = (search as string).toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }
  if (minPrice) {
    filtered = filtered.filter(p => p.price >= parseFloat(minPrice as string));
  }
  if (maxPrice) {
    filtered = filtered.filter(p => p.price <= parseFloat(maxPrice as string));
  }

  res.json(response(filtered, req));
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }
  res.json(response(product, req));
});

app.get('/api/products/category/:category', (req: Request, res: Response) => {
  const categoryProducts = products.filter(
    p => p.category.toLowerCase() === req.params.category.toLowerCase()
  );
  res.json(response(categoryProducts, req));
});

app.get('/api/products/vendor/:vendorId', (req: Request, res: Response) => {
  const vendorProducts = products.filter(p => p.vendorId === req.params.vendorId);
  res.json(response(vendorProducts, req));
});

// Cart routes
app.get('/api/cart/:userId', (req: Request, res: Response) => {
  const cart = carts.get(req.params.userId) || [];
  const cartWithProducts = cart.map(item => ({
    ...item,
    product: products.find(p => p.id === item.productId)
  }));
  const total = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
  res.json(response({ items: cartWithProducts, total }, req));
});

app.post('/api/cart/:userId/items', (req: Request, res: Response) => {
  const { productId, quantity = 1 } = req.body;
  const product = products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  let cart = carts.get(req.params.userId) || [];
  const existingItem = cart.find(item => item.productId === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }

  carts.set(req.params.userId, cart);
  res.json(response({ cart, message: 'Item added to cart' }, req));
});

app.patch('/api/cart/:userId/items/:productId', (req: Request, res: Response) => {
  const cart = carts.get(req.params.userId) || [];
  const item = cart.find(i => i.productId === req.params.productId);

  if (!item) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Item not in cart' }
    });
  }

  item.quantity = req.body.quantity;
  res.json(response({ cart, message: 'Cart updated' }, req));
});

app.delete('/api/cart/:userId/items/:productId', (req: Request, res: Response) => {
  let cart = carts.get(req.params.userId) || [];
  cart = cart.filter(i => i.productId !== req.params.productId);
  carts.set(req.params.userId, cart);
  res.json(response({ cart, message: 'Item removed from cart' }, req));
});

app.delete('/api/cart/:userId', (req: Request, res: Response) => {
  carts.set(req.params.userId, []);
  res.json(response({ message: 'Cart cleared' }, req));
});

// Order routes
app.get('/api/orders', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const status = req.query.status as string;

  let filtered = [...orders];
  if (userId) filtered = filtered.filter(o => o.userId === userId);
  if (status) filtered = filtered.filter(o => o.status === status);

  res.json(response(filtered, req));
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Order not found' }
    });
  }
  res.json(response(order, req));
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { userId, items, shippingAddress } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ITEMS', message: 'No items in order' }
    });
  }

  let total = 0;
  const orderItems = items.map((item: any) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    total += product.price * item.quantity;
    return {
      productId: item.productId,
      quantity: item.quantity,
      price: product.price
    };
  });

  const order: Order = {
    id: uuidv4(),
    userId,
    items: orderItems,
    total,
    status: 'pending',
    shippingAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  orders.push(order);
  carts.set(userId, []);

  res.status(201).json(response(order, req));
});

app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Order not found' }
    });
  }

  order.status = req.body.status;
  order.updatedAt = new Date().toISOString();
  res.json(response(order, req));
});

// RFQ routes
app.get('/api/rfqs', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const status = req.query.status as string;

  let filtered = [...rfqs];
  if (userId) filtered = filtered.filter(r => r.userId === userId);
  if (status) filtered = filtered.filter(r => r.status === status);

  res.json(response(filtered, req));
});

app.get('/api/rfqs/:id', (req: Request, res: Response) => {
  const rfq = rfqs.find(r => r.id === req.params.id);
  if (!rfq) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'RFQ not found' }
    });
  }
  res.json(response(rfq, req));
});

app.post('/api/rfqs', (req: Request, res: Response) => {
  const rfq: RFQ = {
    id: uuidv4(),
    userId: req.body.userId,
    title: req.body.title,
    description: req.body.description,
    quantity: req.body.quantity,
    budget: req.body.budget,
    status: 'open',
    quotes: [],
    createdAt: new Date().toISOString()
  };
  rfqs.push(rfq);
  res.status(201).json(response(rfq, req));
});

app.post('/api/rfqs/:id/quotes', (req: Request, res: Response) => {
  const rfq = rfqs.find(r => r.id === req.params.id);
  if (!rfq) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'RFQ not found' }
    });
  }

  const quote: Quote = {
    id: uuidv4(),
    rfqId: rfq.id,
    vendorId: req.body.vendorId,
    vendorName: req.body.vendorName,
    price: req.body.price,
    notes: req.body.notes,
    validUntil: req.body.validUntil || new Date(Date.now() + 86400000 * 7).toISOString(),
    createdAt: new Date().toISOString()
  };

  rfq.quotes.push(quote);
  rfq.status = 'quoted';

  res.status(201).json(response({ rfq, quote }, req));
});

app.patch('/api/rfqs/:id/accept-quote/:quoteId', (req: Request, res: Response) => {
  const rfq = rfqs.find(r => r.id === req.params.id);
  if (!rfq) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'RFQ not found' }
    });
  }

  rfq.status = 'accepted';
  rfq.updatedAt = new Date().toISOString();
  res.json(response(rfq, req));
});

// Categories
app.get('/api/categories', (req: Request, res: Response) => {
  const categories = [...new Set(products.map(p => p.category))];
  const categoryStats = categories.map(cat => ({
    name: cat,
    count: products.filter(p => p.category === cat).length
  }));
  res.json(response(categoryStats, req));
});

// Analytics
app.get('/api/analytics', (req: Request, res: Response) => {
  res.json(response({
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRFQs: rfqs.length,
    revenue: orders.reduce((sum, o) => sum + o.total, 0),
    ordersByStatus: {
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    },
    openRFQs: rfqs.filter(r => r.status === 'open').length,
    topProducts: products.sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 5)
  }, req));
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

app.listen(PORT, () => {
  console.log(`Exhibition Marketplace Service running on port ${PORT}`);
});

export default app;
