import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 5477;
const TAX_RATE = 0.18; // 18% GST
const CART_TTL_HOURS = 24;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Key Authentication Middleware
const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  // In production, validate against a database or config
  if (apiKey.length < 16) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  req.apiKey = apiKey;
  next();
};

// Helper: Get storage path for a company's carts
const getStoragePath = (companyId) => {
  return `/tmp/siteos-carts-${companyId}.json`;
};

// Helper: Read carts from file
const readCarts = async (companyId) => {
  try {
    const data = await fs.readFile(getStoragePath(companyId), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
};

// Helper: Write carts to file
const writeCarts = async (companyId, carts) => {
  await fs.writeFile(getStoragePath(companyId), JSON.stringify(carts, null, 2));
};

// Helper: Clean expired carts
const cleanExpiredCarts = async (carts) => {
  const now = Date.now();
  const ttlMs = CART_TTL_HOURS * 60 * 60 * 1000;
  const cleaned = {};

  for (const [sessionId, cart] of Object.entries(carts)) {
    const age = now - new Date(cart.updatedAt).getTime();
    if (age < ttlMs) {
      cleaned[sessionId] = cart;
    }
  }

  return cleaned;
};

// Helper: Calculate cart totals
const calculateTotals = (cart) => {
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = cart.discount || 0;
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * TAX_RATE * 100) / 100;
  const total = Math.round((taxableAmount + tax) * 100) / 100;

  return { subtotal, discount, tax, total };
};

// Helper: Initialize a new cart
const createCart = (sessionId, companyId, customerId) => {
  return {
    sessionId,
    companyId,
    customerId,
    items: [],
    couponCode: null,
    discount: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Valid coupon codes (in production, this would come from a database)
const VALID_COUPONS = {
  'SAVE10': { type: 'percentage', value: 10, description: '10% off' },
  'SAVE20': { type: 'percentage', value: 20, description: '20% off' },
  'FLAT50': { type: 'fixed', value: 50, description: '₹50 off' },
  'FLAT100': { type: 'fixed', value: 100, description: '₹100 off' },
  'WELCOME': { type: 'percentage', value: 15, description: '15% off for new customers' }
};

// Validate coupon
const validateCoupon = (code, cartSubtotal) => {
  const coupon = VALID_COUPONS[code.toUpperCase()];
  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code' };
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (cartSubtotal * coupon.value) / 100;
  } else {
    discount = coupon.value;
  }

  // Cap discount at cart subtotal
  discount = Math.min(discount, cartSubtotal);

  return { valid: true, discount: Math.round(discount * 100) / 100, coupon };
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cart-service', port: PORT });
});

// Get cart
app.get('/api/cart/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const companyId = req.headers['x-company-id'] || 'default';

    const carts = await readCarts(companyId);
    const cleanedCarts = await cleanExpiredCarts(carts);
    const cart = cleanedCarts[sessionId];

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    res.json(cart);
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to cart
app.post('/api/cart/:sessionId/items', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { productId, variantId, name, price, quantity, image } = req.body;
    const companyId = req.headers['x-company-id'] || 'default';
    const customerId = req.headers['x-customer-id'] || 'anonymous';

    if (!productId || !name || price === undefined || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: productId, name, price, quantity' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const carts = await readCarts(companyId);
    let cart = carts[sessionId];

    if (!cart) {
      cart = createCart(sessionId, companyId, customerId);
    }

    // Check if item already exists (by productId + variantId)
    const existingIndex = cart.items.findIndex(
      item => item.productId === productId && item.variantId === variantId
    );

    if (existingIndex >= 0) {
      // Update quantity
      cart.items[existingIndex].quantity += quantity;
    } else {
      // Add new item
      const newItem = {
        id: uuidv4(),
        productId,
        variantId: variantId || null,
        name,
        price,
        quantity,
        image: image || null
      };
      cart.items.push(newItem);
    }

    // Recalculate totals
    const totals = calculateTotals(cart);
    Object.assign(cart, totals);
    cart.updatedAt = new Date().toISOString();

    // If there's an existing coupon, recalculate discount
    if (cart.couponCode) {
      const couponResult = validateCoupon(cart.couponCode, cart.subtotal);
      if (couponResult.valid) {
        cart.discount = couponResult.discount;
        const finalTotals = calculateTotals(cart);
        Object.assign(cart, finalTotals);
      }
    }

    carts[sessionId] = cart;
    await writeCarts(companyId, carts);

    res.status(201).json(cart);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item quantity
app.put('/api/cart/:sessionId/items/:itemId', requireAuth, async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const { quantity } = req.body;
    const companyId = req.headers['x-company-id'] || 'default';

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a non-negative number' });
    }

    const carts = await readCarts(companyId);
    const cart = carts[sessionId];

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.id === itemId);

    if (itemIndex < 0) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    // Recalculate totals
    const totals = calculateTotals(cart);
    Object.assign(cart, totals);
    cart.updatedAt = new Date().toISOString();

    // If there's an existing coupon, recalculate discount
    if (cart.couponCode) {
      const couponResult = validateCoupon(cart.couponCode, cart.subtotal);
      if (couponResult.valid) {
        cart.discount = couponResult.discount;
        const finalTotals = calculateTotals(cart);
        Object.assign(cart, finalTotals);
      }
    }

    carts[sessionId] = cart;
    await writeCarts(companyId, carts);

    res.json(cart);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from cart
app.delete('/api/cart/:sessionId/items/:itemId', requireAuth, async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const companyId = req.headers['x-company-id'] || 'default';

    const carts = await readCarts(companyId);
    const cart = carts[sessionId];

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.id === itemId);

    if (itemIndex < 0) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    cart.items.splice(itemIndex, 1);

    // Recalculate totals
    const totals = calculateTotals(cart);
    Object.assign(cart, totals);
    cart.updatedAt = new Date().toISOString();

    // If there's an existing coupon, recalculate discount
    if (cart.couponCode) {
      const couponResult = validateCoupon(cart.couponCode, cart.subtotal);
      if (couponResult.valid) {
        cart.discount = couponResult.discount;
        const finalTotals = calculateTotals(cart);
        Object.assign(cart, finalTotals);
      }
    }

    carts[sessionId] = cart;
    await writeCarts(companyId, carts);

    res.json(cart);
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear cart
app.delete('/api/cart/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const companyId = req.headers['x-company-id'] || 'default';

    const carts = await readCarts(companyId);

    if (!carts[sessionId]) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    delete carts[sessionId];
    await writeCarts(companyId, carts);

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply coupon
app.post('/api/cart/:sessionId/apply-coupon', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { couponCode } = req.body;
    const companyId = req.headers['x-company-id'] || 'default';

    if (!couponCode) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const carts = await readCarts(companyId);
    const cart = carts[sessionId];

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cannot apply coupon to empty cart' });
    }

    const couponResult = validateCoupon(couponCode, cart.subtotal);

    if (!couponResult.valid) {
      return res.status(400).json({ error: couponResult.error });
    }

    cart.couponCode = couponCode.toUpperCase();
    cart.discount = couponResult.discount;

    // Recalculate totals with discount
    const totals = calculateTotals(cart);
    Object.assign(cart, totals);
    cart.updatedAt = new Date().toISOString();

    carts[sessionId] = cart;
    await writeCarts(companyId, carts);

    res.json({
      cart,
      couponApplied: {
        code: cart.couponCode,
        description: couponResult.coupon.description,
        discount: couponResult.discount
      }
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cart summary
app.get('/api/cart/:sessionId/summary', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const companyId = req.headers['x-company-id'] || 'default';

    const carts = await readCarts(companyId);
    const cleanedCarts = await cleanExpiredCarts(carts);
    const cart = cleanedCarts[sessionId];

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const summary = {
      sessionId: cart.sessionId,
      itemCount: cart.items.length,
      totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.subtotal,
      discount: cart.discount,
      couponCode: cart.couponCode,
      tax: cart.tax,
      total: cart.total,
      items: cart.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.price * item.quantity
      }))
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Cart Service running on port ${PORT}`);
  });
}

export default app;
export { app, TAX_RATE, CART_TTL_HOURS, VALID_COUPONS, requireAuth, calculateTotals, createCart, validateCoupon };
