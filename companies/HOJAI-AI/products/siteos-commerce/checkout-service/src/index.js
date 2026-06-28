import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireAdmin } from './middleware/requireAuth.js';
import * as orderService from './services/orderService.js';
import { generateOrderNumber } from './utils/orderNumberGenerator.js';
import {
  canTransition,
  isValidOrderState,
  getNextStates,
  isTerminalState,
  ORDER_STATES
} from './utils/orderStateMachine.js';
import {
  validateAddress,
  validateCart,
  validateShippingMethod,
  validatePaymentMethod,
  isValidUUID,
  isValidCompanyId,
  calculateTotals
} from './utils/validators.js';

const app = express();
const PORT = process.env.PORT || 5478;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory checkout sessions (in production, use Redis)
const checkoutSessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'checkout-service', port: PORT });
});

// ============================================
// CHECKOUT ENDPOINTS
// ============================================

/**
 * POST /api/checkout/initiate
 * Start checkout - validate cart and create session
 */
app.post('/api/checkout/initiate', requireAuth, async (req, res) => {
  try {
    const { companyId, customerId, sessionId, items, couponCode } = req.body;

    // Validate required fields
    if (!companyId || !customerId || !items) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'companyId, customerId, and items are required'
      });
    }

    // Validate company ID
    if (!isValidCompanyId(companyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid companyId',
        message: 'companyId must be 3-50 characters'
      });
    }

    // Validate cart
    const cartValidation = validateCart(items);
    if (!cartValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cart',
        errors: cartValidation.errors
      });
    }

    // Calculate totals
    const totals = calculateTotals(items);

    // Create checkout session
    const checkoutSessionId = sessionId || uuidv4();
    const checkoutSession = {
      sessionId: checkoutSessionId,
      companyId,
      customerId,
      items,
      ...totals,
      couponCode: couponCode || null,
      shippingAddress: null,
      billingAddress: null,
      shippingMethod: null,
      paymentMethod: null,
      status: 'initiated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store session
    checkoutSessions.set(checkoutSessionId, checkoutSession);

    res.status(200).json({
      success: true,
      data: {
        sessionId: checkoutSessionId,
        ...checkoutSession
      },
      message: 'Checkout initiated successfully'
    });
  } catch (error) {
    console.error('Checkout initiate error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/checkout/address
 * Save shipping and/or billing address
 */
app.post('/api/checkout/address', requireAuth, async (req, res) => {
  try {
    const { sessionId, shippingAddress, billingAddress, useSameAddress } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId',
        message: 'sessionId is required'
      });
    }

    const session = checkoutSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Checkout session not found or expired'
      });
    }

    // Validate shipping address
    if (shippingAddress) {
      const shippingValidation = validateAddress(shippingAddress);
      if (!shippingValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid shipping address',
          errors: shippingValidation.errors
        });
      }
      session.shippingAddress = shippingAddress;
    }

    // Handle billing address
    if (useSameAddress || !billingAddress) {
      session.billingAddress = shippingAddress || session.shippingAddress;
    } else {
      const billingValidation = validateAddress(billingAddress);
      if (!billingValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid billing address',
          errors: billingValidation.errors
        });
      }
      session.billingAddress = billingAddress;
    }

    session.status = 'address_added';
    session.updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        shippingAddress: session.shippingAddress,
        billingAddress: session.billingAddress
      },
      message: 'Address saved successfully'
    });
  } catch (error) {
    console.error('Address save error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/checkout/shipping
 * Select shipping method
 */
app.post('/api/checkout/shipping', requireAuth, async (req, res) => {
  try {
    const { sessionId, shippingMethod } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId',
        message: 'sessionId is required'
      });
    }

    const session = checkoutSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Checkout session not found or expired'
      });
    }

    if (!session.shippingAddress) {
      return res.status(400).json({
        success: false,
        error: 'Address not set',
        message: 'Please add shipping address first'
      });
    }

    // Validate shipping method
    const methodValidation = validateShippingMethod(shippingMethod);
    if (!methodValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shipping method',
        errors: methodValidation.errors
      });
    }

    // Calculate shipping cost based on method
    const shippingCosts = {
      standard: 50,
      express: 150,
      pickup: 0
    };

    const shippingCost = shippingCosts[shippingMethod];
    session.shippingMethod = shippingMethod;
    session.shippingCost = shippingCost;

    // Recalculate totals
    const totals = calculateTotals(session.items, shippingCost, session.discount);
    Object.assign(session, totals);

    session.status = 'shipping_selected';
    session.updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        shippingMethod,
        shippingCost,
        subtotal: session.subtotal,
        total: session.total
      },
      message: 'Shipping method selected successfully'
    });
  } catch (error) {
    console.error('Shipping selection error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/checkout/payment
 * Get payment options or initiate payment
 */
app.post('/api/checkout/payment', requireAuth, async (req, res) => {
  try {
    const { sessionId, paymentMethod } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId',
        message: 'sessionId is required'
      });
    }

    const session = checkoutSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Checkout session not found or expired'
      });
    }

    if (!session.shippingMethod) {
      return res.status(400).json({
        success: false,
        error: 'Shipping not selected',
        message: 'Please select shipping method first'
      });
    }

    // Return payment options if no method specified
    if (!paymentMethod) {
      const paymentOptions = [
        { id: 'razorpay', name: 'Razorpay', icon: 'razorpay' },
        { id: 'upi', name: 'UPI', icon: 'upi' },
        { id: 'card', name: 'Credit/Debit Card', icon: 'card' },
        { id: 'wallet', name: 'Wallet', icon: 'wallet' }
      ];

      return res.status(200).json({
        success: true,
        data: {
          sessionId,
          total: session.total,
          paymentOptions,
          orderSummary: {
            subtotal: session.subtotal,
            shippingCost: session.shippingCost,
            tax: session.tax,
            discount: session.discount,
            total: session.total
          }
        },
        message: 'Payment options retrieved'
      });
    }

    // Validate payment method
    const methodValidation = validatePaymentMethod(paymentMethod);
    if (!methodValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        errors: methodValidation.errors
      });
    }

    session.paymentMethod = paymentMethod;
    session.status = 'payment_initiated';
    session.updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        paymentMethod,
        amount: session.total,
        currency: 'INR',
        paymentOptions: {
          razorpay: {
            key: 'rzp_test_key',
            amount: session.total * 100,
            currency: 'INR'
          },
          upi: {
            UPI_ID: 'checkout@hojai',
            amount: session.total
          },
          card: {
            type: 'card',
            amount: session.total
          },
          wallet: {
            type: 'wallet',
            amount: session.total
          }
        }
      },
      message: 'Payment initiated successfully'
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/checkout/confirm
 * Confirm order and create it
 */
app.post('/api/checkout/confirm', requireAuth, async (req, res) => {
  try {
    const { sessionId, paymentId, paymentStatus } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId',
        message: 'sessionId is required'
      });
    }

    const session = checkoutSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Checkout session not found or expired'
      });
    }

    // Validate all required fields
    if (!session.shippingAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing shipping address',
        message: 'Please add shipping address'
      });
    }

    if (!session.shippingMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing shipping method',
        message: 'Please select shipping method'
      });
    }

    if (!session.paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment method',
        message: 'Please select payment method'
      });
    }

    // Determine payment status
    const orderPaymentStatus = paymentStatus || 'pending';

    // Create order
    const order = {
      orderId: uuidv4(),
      orderNumber: generateOrderNumber(),
      companyId: session.companyId,
      customerId: session.customerId,
      sessionId: session.sessionId,
      items: session.items,
      subtotal: session.subtotal,
      shippingCost: session.shippingCost,
      tax: session.tax,
      discount: session.discount,
      total: session.total,
      shippingAddress: session.shippingAddress,
      billingAddress: session.billingAddress,
      shippingMethod: session.shippingMethod,
      paymentMethod: session.paymentMethod,
      paymentId: paymentId || null,
      paymentStatus: orderPaymentStatus,
      orderStatus: orderPaymentStatus === 'paid' ? 'confirmed' : 'pending',
      couponCode: session.couponCode,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save order
    await orderService.saveOrder(order);

    // Clear session
    checkoutSessions.delete(sessionId);

    res.status(201).json({
      success: true,
      data: order,
      message: orderPaymentStatus === 'paid'
        ? 'Order confirmed successfully'
        : 'Order created with pending payment'
    });
  } catch (error) {
    console.error('Order confirm error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// ORDER ENDPOINTS
// ============================================

/**
 * GET /api/orders/:orderId
 * Get order details
 */
app.get('/api/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { companyId } = req.query;

    if (!isValidUUID(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid orderId',
        message: 'orderId must be a valid UUID'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing companyId',
        message: 'companyId query parameter is required'
      });
    }

    const order = await orderService.getOrderById(companyId, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: `Order ${orderId} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/orders
 * List orders (admin)
 */
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const { companyId, customerId, status, page = 1, limit = 20 } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing companyId',
        message: 'companyId query parameter is required'
      });
    }

    let orders = await orderService.getAllOrders(companyId);

    // Filter by customer
    if (customerId) {
      orders = orders.filter(o => o.customerId === customerId);
    }

    // Filter by status
    if (status) {
      if (!isValidOrderState(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: `Invalid order status. Valid states: ${Object.values(ORDER_STATES).join(', ')}`
        });
      }
      orders = orders.filter(o => o.orderStatus === status);
    }

    // Sort by createdAt descending
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedOrders = orders.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      data: paginatedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: orders.length,
        pages: Math.ceil(orders.length / limitNum)
      }
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/orders/:orderId/cancel
 * Cancel an order
 */
app.post('/api/orders/:orderId/cancel', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { companyId, reason } = req.body;

    if (!isValidUUID(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid orderId',
        message: 'orderId must be a valid UUID'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing companyId',
        message: 'companyId is required'
      });
    }

    const order = await orderService.getOrderById(companyId, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: `Order ${orderId} not found`
      });
    }

    // Check if order can be cancelled
    if (!canTransition(order.orderStatus, ORDER_STATES.CANCELLED)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel order',
        message: `Order in ${order.orderStatus} status cannot be cancelled`,
        currentStatus: order.orderStatus,
        nextValidStates: getNextStates(order.orderStatus)
      });
    }

    // Update order
    const updates = {
      orderStatus: ORDER_STATES.CANCELLED,
      notes: reason ? `Cancelled: ${reason}` : order.notes
    };

    const updatedOrder = await orderService.updateOrder(companyId, orderId, updates);

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * PATCH /api/orders/:orderId/status
 * Update order status (admin)
 */
app.patch('/api/orders/:orderId/status', requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { companyId, orderStatus } = req.body;

    if (!isValidUUID(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid orderId',
        message: 'orderId must be a valid UUID'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing companyId',
        message: 'companyId is required'
      });
    }

    if (!orderStatus || !isValidOrderState(orderStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid orderStatus',
        message: `orderStatus must be one of: ${Object.values(ORDER_STATES).join(', ')}`
      });
    }

    const order = await orderService.getOrderById(companyId, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: `Order ${orderId} not found`
      });
    }

    // Validate transition
    if (!canTransition(order.orderStatus, orderStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status transition',
        message: `Cannot transition from ${order.orderStatus} to ${orderStatus}`,
        currentStatus: order.orderStatus,
        nextValidStates: getNextStates(order.orderStatus)
      });
    }

    const updatedOrder = await orderService.updateOrder(companyId, orderId, { orderStatus });

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`Checkout Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;