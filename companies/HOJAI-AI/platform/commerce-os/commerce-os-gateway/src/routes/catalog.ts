/**
 * Catalog Routes — Proxy to SiteOS Product Catalog
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();
const CATALOG_URL = process.env.SITEOS_CATALOG_URL || 'http://localhost:5476';

// GET /api/catalog/products
router.get('/products', async (req, res) => {
  try {
    const { category, search, page, limit } = req.query;
    const response = await axios.get(`${CATALOG_URL}/api/products`, {
      params: { category, search, page, limit },
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Catalog proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CATALOG_ERROR', message: error.message },
    });
  }
});

// GET /api/catalog/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const response = await axios.get(`${CATALOG_URL}/api/products/${req.params.id}`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Catalog proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CATALOG_ERROR', message: error.message },
    });
  }
});

// POST /api/catalog/products
router.post('/products', async (req, res) => {
  try {
    const response = await axios.post(`${CATALOG_URL}/api/products`, req.body, {
      timeout: 5000,
    });
    res.status(201).json(response.data);
  } catch (error: any) {
    console.error('Catalog proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CATALOG_ERROR', message: error.message },
    });
  }
});

// PUT /api/catalog/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    const response = await axios.put(`${CATALOG_URL}/api/products/${req.params.id}`, req.body, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Catalog proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CATALOG_ERROR', message: error.message },
    });
  }
});

// DELETE /api/catalog/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    const response = await axios.delete(`${CATALOG_URL}/api/products/${req.params.id}`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Catalog proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CATALOG_ERROR', message: error.message },
    });
  }
});

// GET /api/catalog/categories
router.get('/categories', async (req, res) => {
  try {
    const response = await axios.get(`${CATALOG_URL}/api/categories`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Catalog proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'CATALOG_ERROR', message: error.message },
    });
  }
});

// POST /api/catalog/search
router.post('/search', async (req, res) => {
  try {
    const response = await axios.post(`${CATALOG_URL}/api/search`, req.body, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Catalog search error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_ERROR', message: error.message },
    });
  }
});

export default router;
