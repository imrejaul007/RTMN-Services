/**
 * Checkout Routes — Cart + Payment Processing
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();

const CART_URL = process.env.SITEOS_CART_URL || 'http://localhost:5477';
const CHECKOUT_URL = process.env.SITEOS_CHECKOUT_URL || 'http://localhost:5478';
const PAYMENT_URL = process.env.SITEOS_PAYMENT_URL || 'http://localhost:5479';

// === Cart Endpoints ===

// GET /api/checkout/cart/:userId
router.get('/cart/:userId', async (req, res) => {
  try {
    const response = await axios.get(`${CART_URL}/api/cart/${req.params.userId}`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Cart fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CART_ERROR', message: error.message },
    });
  }
});

// POST /api/checkout/cart/:userId/add
router.post('/cart/:userId/add', async (req, res) => {
  try {
    const response = await axios.post(
      `${CART_URL}/api/cart/${req.params.userId}/items`,
      req.body,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Cart add error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CART_ERROR', message: error.message },
    });
  }
});

// PUT /api/checkout/cart/:userId
router.put('/cart/:userId', async (req, res) => {
  try {
    const response = await axios.put(
      `${CART_URL}/api/cart/${req.params.userId}`,
      req.body,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Cart update error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CART_ERROR', message: error.message },
    });
  }
});

// DELETE /api/checkout/cart/:userId/items/:itemId
router.delete('/cart/:userId/items/:itemId', async (req, res) => {
  try {
    const response = await axios.delete(
      `${CART_URL}/api/cart/${req.params.userId}/items/${req.params.itemId}`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Cart remove error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CART_ERROR', message: error.message },
    });
  }
});

// === Checkout Session Endpoints ===

// POST /api/checkout/initiate
router.post('/initiate', async (req, res) => {
  try {
    const response = await axios.post(
      `${CHECKOUT_URL}/api/checkout/initiate`,
      req.body,
      { timeout: 10000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Checkout initiate error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CHECKOUT_ERROR', message: error.message },
    });
  }
});

// PUT /api/checkout/:sessionId/address
router.put('/:sessionId/address', async (req, res) => {
  try {
    const response = await axios.put(
      `${CHECKOUT_URL}/api/checkout/${req.params.sessionId}/address`,
      req.body,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Checkout address error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CHECKOUT_ERROR', message: error.message },
    });
  }
});

// PUT /api/checkout/:sessionId/shipping
router.put('/:sessionId/shipping', async (req, res) => {
  try {
    const response = await axios.put(
      `${CHECKOUT_URL}/api/checkout/${req.params.sessionId}/shipping`,
      req.body,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Checkout shipping error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CHECKOUT_ERROR', message: error.message },
    });
  }
});

// POST /api/checkout/:sessionId/payment
router.post('/:sessionId/payment', async (req, res) => {
  try {
    const response = await axios.post(
      `${CHECKOUT_URL}/api/checkout/${req.params.sessionId}/payment`,
      req.body,
      { timeout: 15000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Checkout payment error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: error.message },
    });
  }
});

// POST /api/checkout/:sessionId/confirm
router.post('/:sessionId/confirm', async (req, res) => {
  try {
    const response = await axios.post(
      `${CHECKOUT_URL}/api/checkout/${req.params.sessionId}/confirm`,
      req.body,
      { timeout: 10000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Checkout confirm error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CHECKOUT_ERROR', message: error.message },
    });
  }
});

// === Payment Gateway Endpoints ===

// POST /api/checkout/gateway/initiate
router.post('/gateway/initiate', async (req, res) => {
  try {
    const response = await axios.post(
      `${PAYMENT_URL}/api/initiate`,
      req.body,
      { timeout: 10000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Payment initiate error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: error.message },
    });
  }
});

// POST /api/checkout/gateway/verify
router.post('/gateway/verify', async (req, res) => {
  try {
    const response = await axios.post(
      `${PAYMENT_URL}/api/verify`,
      req.body,
      { timeout: 10000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Payment verify error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: error.message },
    });
  }
});

// GET /api/checkout/gateway/status/:transactionId
router.get('/gateway/status/:transactionId', async (req, res) => {
  try {
    const response = await axios.get(
      `${PAYMENT_URL}/api/status/${req.params.transactionId}`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Payment status error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: error.message },
    });
  }
});

export default router;
