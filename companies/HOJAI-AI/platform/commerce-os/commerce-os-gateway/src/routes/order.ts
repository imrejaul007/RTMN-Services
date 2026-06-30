/**
 * Order Routes — Proxy to SiteOS Checkout/Order
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();
const CHECKOUT_URL = process.env.SITEOS_CHECKOUT_URL || 'http://localhost:5478';

// GET /api/order
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${CHECKOUT_URL}/api/orders`, {
      params: req.query,
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Order proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_ERROR', message: error.message },
    });
  }
});

// GET /api/order/:id
router.get('/:id', async (req, res) => {
  try {
    const response = await axios.get(`${CHECKOUT_URL}/api/orders/${req.params.id}`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Order proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_ERROR', message: error.message },
    });
  }
});

// POST /api/order
router.post('/', async (req, res) => {
  try {
    const response = await axios.post(`${CHECKOUT_URL}/api/orders`, req.body, {
      timeout: 5000,
    });
    res.status(201).json(response.data);
  } catch (error: any) {
    console.error('Order create error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_ERROR', message: error.message },
    });
  }
});

// PUT /api/order/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const response = await axios.put(
      `${CHECKOUT_URL}/api/orders/${req.params.id}/status`,
      req.body,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Order status update error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_ERROR', message: error.message },
    });
  }
});

// POST /api/order/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const response = await axios.post(
      `${CHECKOUT_URL}/api/orders/${req.params.id}/cancel`,
      req.body,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Order cancel error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_ERROR', message: error.message },
    });
  }
});

// POST /api/order/:id/return
router.post('/:id/return', async (req, res) => {
  try {
    const response = await axios.post(
      `${CHECKOUT_URL}/api/orders/${req.params.id}/return`,
      req.body,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Order return error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_ERROR', message: error.message },
    });
  }
});

export default router;
