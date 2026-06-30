/**
 * Templates Routes
 * Browse and search industry templates
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();

const TEMPLATE_ENGINE_URL = process.env.TEMPLATE_ENGINE_URL || 'http://localhost:5670';
const VENDOR_POOLS_URL = process.env.VENDOR_POOLS_URL || 'http://localhost:5680';

// GET /api/studio/templates
router.get('/', async (req, res) => {
  try {
    const { category, industry, search } = req.query;

    let url = `${TEMPLATE_ENGINE_URL}/api/templates`;
    const params = new URLSearchParams();
    if (category) params.set('category', String(category));
    if (industry) params.set('industry', String(industry));
    if (search) params.set('search', String(search));
    if (params.toString()) url += `?${params.toString()}`;

    const response = await axios.get(url, { timeout: 5000 });
    res.json(response.data);
  } catch (error: any) {
    // Return mock data
    res.json({
      templates: [
        {
          id: 'restaurant',
          name: 'Restaurant Commerce',
          industry: 'restaurant',
          description: 'Complete restaurant commerce template',
          icon: '🍽️',
          tier: 'P0',
          workerCount: 5,
          departmentCount: 3,
          moduleCount: 7,
          estimatedCost: 4900,
        },
        {
          id: 'hotel',
          name: 'Hotel & Hospitality',
          industry: 'hospitality',
          description: 'Hotel template with rooms and bookings',
          icon: '🏨',
          tier: 'P0',
          workerCount: 4,
          departmentCount: 3,
          moduleCount: 6,
          estimatedCost: 6300,
        },
      ],
      total: 26,
      note: 'Fallback data - template engine unavailable',
    });
  }
});

// GET /api/studio/templates/:id
router.get('/:id', async (req, res) => {
  try {
    const response = await axios.get(
      `${TEMPLATE_ENGINE_URL}/api/templates/${req.params.id}`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'TEMPLATE_ERROR', message: error.message },
    });
  }
});

// GET /api/studio/templates/categories/all
router.get('/categories/all', async (req, res) => {
  try {
    const response = await axios.get(
      `${TEMPLATE_ENGINE_URL}/api/categories`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    res.json({
      categories: [
        { name: 'restaurant', poolCount: 1, estimatedCost: 4900 },
        { name: 'hotel', poolCount: 1, estimatedCost: 6300 },
        { name: 'healthcare', poolCount: 1, estimatedCost: 7000 },
        { name: 'retail', poolCount: 1, estimatedCost: 5400 },
      ],
      total: 26,
      note: 'Fallback data',
    });
  }
});

// GET /api/studio/pools - Get vendor pools
router.get('/pools/all', async (req, res) => {
  try {
    const response = await axios.get(
      `${VENDOR_POOLS_URL}/api/pools`,
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    res.json({
      pools: [
        { id: 'electronics-pool', name: 'Electronics Vendors', vendorCount: 500 },
        { id: 'fashion-pool', name: 'Fashion Vendors', vendorCount: 400 },
        { id: 'food-pool', name: 'Food & Beverage Vendors', vendorCount: 300 },
      ],
      total: 12,
      note: 'Fallback data',
    });
  }
});

// GET /api/studio/pools/:id/vendors
router.get('/pools/:id/vendors', async (req, res) => {
  try {
    const response = await axios.get(
      `${VENDOR_POOLS_URL}/api/pools/${req.params.id}/vendors`,
      { params: req.query, timeout: 5000 }
    );
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'POOL_ERROR', message: error.message },
    });
  }
});

export default router;
