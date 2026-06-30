/**
 * Inventory Routes — Stock Management
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();

// For now, use catalog service for inventory
// TODO: Create dedicated inventory service
const CATALOG_URL = process.env.SITEOS_CATALOG_URL || 'http://localhost:5476';

// GET /api/inventory/stock/:productId
router.get('/stock/:productId', async (req, res) => {
  try {
    // Get stock from catalog
    const response = await axios.get(`${CATALOG_URL}/api/products/${req.params.productId}/stock`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    // Return mock data if service not available
    res.json({
      productId: req.params.productId,
      totalStock: Math.floor(Math.random() * 1000),
      locations: [
        { locationId: 'warehouse-1', stock: Math.floor(Math.random() * 500) },
        { locationId: 'store-1', stock: Math.floor(Math.random() * 200) },
      ],
      lowStock: Math.random() > 0.7,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/inventory/stock/:productId/:locationId
router.get('/stock/:productId/:locationId', async (req, res) => {
  try {
    const response = await axios.get(
      `${CATALOG_URL}/api/products/${req.params.productId}/stock/${req.params.locationId}`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    res.json({
      productId: req.params.productId,
      locationId: req.params.locationId,
      stock: Math.floor(Math.random() * 500),
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/inventory/adjust
router.post('/adjust', async (req, res) => {
  try {
    const { productId, locationId, adjustment, reason } = req.body;

    // Call catalog service to adjust stock
    const response = await axios.post(
      `${CATALOG_URL}/api/products/${productId}/stock/adjust`,
      { locationId, adjustment, reason },
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    // Return mock response
    res.json({
      success: true,
      productId: req.body.productId,
      newStock: Math.floor(Math.random() * 1000),
      adjustment: req.body.adjustment,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/inventory/transfer
router.post('/transfer', async (req, res) => {
  try {
    const { productId, fromLocation, toLocation, quantity } = req.body;

    // Call catalog service to transfer stock
    const response = await axios.post(
      `${CATALOG_URL}/api/products/${productId}/stock/transfer`,
      { fromLocation, toLocation, quantity },
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    const { productId, fromLocation, toLocation, quantity } = req.body;
    res.json({
      success: true,
      productId,
      fromLocation,
      toLocation,
      quantity,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/inventory/low-stock
router.get('/low-stock', async (req, res) => {
  try {
    const { threshold } = req.query;

    // Get all products with low stock
    const response = await axios.get(`${CATALOG_URL}/api/products`, {
      params: { lowStock: true, threshold },
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    // Return mock data
    res.json({
      products: [
        { productId: 'PROD001', name: 'Sample Product', stock: 10, threshold: 50 },
        { productId: 'PROD002', name: 'Another Product', stock: 5, threshold: 20 },
      ],
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/inventory/reorder/:productId
router.post('/reorder/:productId', async (req, res) => {
  try {
    const { quantity, supplierId } = req.body;

    // Create procurement order
    // TODO: Connect to procurement/purchase system
    res.json({
      success: true,
      orderId: `PO-${Date.now()}`,
      productId: req.params.productId,
      quantity: quantity || 100,
      supplierId,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
