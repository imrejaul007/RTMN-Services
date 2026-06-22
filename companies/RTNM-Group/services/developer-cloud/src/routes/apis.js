import express from 'express';
import { apiRegistry, API_CATEGORIES } from '../index.js';

const router = express.Router();

/**
 * GET /api/apis
 * List all available APIs
 */
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;

    let apis = Array.from(apiRegistry.values());

    if (category) apis = apis.filter(a => a.category === category);
    if (status) apis = apis.filter(a => a.status === status);

    res.json({
      success: true,
      count: apis.length,
      categories: Object.values(API_CATEGORIES),
      apis
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/apis/:id
 * Get API details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const api = apiRegistry.get(id);

    if (!api) {
      return res.status(404).json({
        success: false,
        error: 'API not found'
      });
    }

    res.json({
      success: true,
      api
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/apis/:id/docs
 * Get API documentation
 */
router.get('/:id/docs', async (req, res) => {
  try {
    const { id } = req.params;
    const api = apiRegistry.get(id);

    if (!api) {
      return res.status(404).json({
        success: false,
        error: 'API not found'
      });
    }

    res.json({
      success: true,
      apiId: id,
      documentation: {
        overview: `API documentation for ${api.name}`,
        endpoints: api.endpoints,
        authentication: 'Bearer token',
        baseUrl: `http://localhost:8000/api/${id}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
