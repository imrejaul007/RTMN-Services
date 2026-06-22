/**
 * NextaBizz Procurement Routes
 * Corporate gifting procurement, bulk orders
 */

const express = require('express');
const router = express.Router();

// Simple auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// Demo products
const DEMO_PRODUCTS = [
  { productId: 'PRD001', sku: 'GIFT-PREM-001', name: 'Premium Gift Box', description: 'Assorted chocolates & cookies', category: 'food', pricing: { mrp: 1500, corpPrice: 1200, bulkPrice: 999, minBulkQuantity: 50 }, inventory: { inStock: true, quantity: 500 } },
  { productId: 'PRD002', sku: 'ELEC-BT-SP-001', name: 'Bluetooth Speaker', description: 'Portable wireless speaker', category: 'electronics', pricing: { mrp: 2500, corpPrice: 1999, bulkPrice: 1799, minBulkQuantity: 25 }, inventory: { inStock: true, quantity: 200 } },
  { productId: 'PRD003', sku: 'HOME-CANDLE-001', name: 'Scented Candle Set', description: 'Set of 3 hand-poured candles', category: 'home', pricing: { mrp: 800, corpPrice: 650, bulkPrice: 550, minBulkQuantity: 100 }, inventory: { inStock: true, quantity: 1000 } },
  { productId: 'PRD004', sku: 'VOUCHER-FOOD-500', name: 'Food Court Voucher ₹500', description: 'Redeemable at partner restaurants', category: 'voucher', pricing: { mrp: 500, corpPrice: 475, bulkPrice: 450, minBulkQuantity: 10 }, inventory: { inStock: true, quantity: 10000 } },
  { productId: 'PRD005', sku: 'MERCH-T-SHIRT', name: 'Custom Branded T-Shirt', description: 'Premium cotton with company logo', category: 'merchandise', pricing: { mrp: 1200, corpPrice: 800, bulkPrice: 650, minBulkQuantity: 100 }, inventory: { inStock: true, quantity: 5000 } },
];

// In-memory orders
const ordersStore = [];

// GET /api/nextabizz/products
router.get('/products', requireAuth, (req, res) => {
  const { q, category } = req.query;
  let products = DEMO_PRODUCTS;
  
  if (q) {
    products = products.filter(p => 
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.description.toLowerCase().includes(q.toLowerCase())
    );
  }
  
  if (category) {
    products = products.filter(p => p.category === category);
  }
  
  res.json({ success: true, data: products });
});

// GET /api/nextabizz/products/:productId
router.get('/products/:productId', requireAuth, (req, res) => {
  const { productId } = req.params;
  const product = DEMO_PRODUCTS.find(p => p.productId === productId);
  
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  
  res.json({ success: true, data: product });
});

// POST /api/nextabizz/orders
router.post('/orders', requireAuth, (req, res) => {
  const { items, deliveryAddress, deliveryType, branding } = req.body;
  
  const orderItems = items.map(item => {
    const product = DEMO_PRODUCTS.find(p => p.productId === item.productId);
    if (!product) return null;
    
    const isBulk = item.quantity >= product.pricing.minBulkQuantity;
    const unitPrice = isBulk ? product.pricing.bulkPrice : product.pricing.corpPrice;
    
    return {
      product: { productId: product.productId, name: product.name, sku: product.sku },
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
    };
  }).filter(Boolean);
  
  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const gstAmount = Math.round(subtotal * 0.12);
  
  const order = {
    orderId: `ORD${Date.now()}`,
    orderNumber: `NB${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    status: 'confirmed',
    items: orderItems,
    pricing: { subtotal, bulkDiscount: 0, gstAmount, totalAmount: subtotal + gstAmount },
    delivery: { type: deliveryType, address: deliveryAddress },
    branding,
    invoice: { invoiceNumber: `NB/GST/${new Date().getFullYear()}/${Date.now()}`, gstIn: '27AABCU9603R1ZM' },
    createdAt: new Date().toISOString(),
  };
  
  ordersStore.push(order);
  res.status(201).json({ success: true, data: order });
});

// GET /api/nextabizz/orders
router.get('/orders', requireAuth, (req, res) => {
  res.json({ success: true, data: ordersStore });
});

// GET /api/nextabizz/orders/:orderId
router.get('/orders/:orderId', requireAuth, (req, res) => {
  const { orderId } = req.params;
  const order = ordersStore.find(o => o.orderId === orderId);
  
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  
  res.json({ success: true, data: order });
});

// POST /api/nextabizz/quotes
router.post('/quotes', requireAuth, (req, res) => {
  const { productIds, quantities } = req.body;
  
  const quoteItems = productIds.map((productId, idx) => {
    const product = DEMO_PRODUCTS.find(p => p.productId === productId);
    if (!product) return null;
    
    const qty = quantities?.[idx] || 1;
    const totalPrice = product.pricing.bulkPrice * qty;
    
    return {
      productId,
      name: product.name,
      quantity: qty,
      unitPrice: product.pricing.bulkPrice,
      totalPrice,
    };
  }).filter(Boolean);
  
  const estimatedPrice = quoteItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  res.json({
    success: true,
    data: {
      quoteId: `QT${Date.now()}`,
      items: quoteItems,
      estimatedPrice,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    },
  });
});

module.exports = router;
