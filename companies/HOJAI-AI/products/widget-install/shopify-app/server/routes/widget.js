/**
 * Widget Configuration API
 */
import express from 'express';
import { storage } from '../services/storage.js';

const router = express.Router();

// Get widget config
router.get('/config/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const config = await storage.getWidgetConfig(shop);

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    res.json({
      success: true,
      data: {
        apiKey: config.apiKey,
        companyId: config.companyId || shop,
        color: config.color || '#3B82F6',
        position: config.position || 'bottom-right',
        greeting: config.greeting || 'Hi! How can I help you?',
        enabled: config.enabled !== false,
        features: config.features || {
          chat: true,
          voice: false,
          products: true,
          cart: true
        }
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update widget config
router.put('/config/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const { color, position, greeting, enabled, features } = req.body;

    const config = await storage.getWidgetConfig(shop) || {
      shop,
      apiKey: process.env.HOJAI_API_KEY,
      companyId: shop
    };

    if (color !== undefined) config.color = color;
    if (position !== undefined) config.position = position;
    if (greeting !== undefined) config.greeting = greeting;
    if (enabled !== undefined) config.enabled = enabled;
    if (features !== undefined) config.features = features;

    await storage.storeWidgetConfig(shop, config);

    res.json({ success: true, data: config });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get products
router.get('/products/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const session = await storage.getSession(shop);
    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // In production, call Shopify API
    // For now, return mock data
    res.json({
      success: true,
      data: {
        products: [],
        hasMore: false
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get orders
router.get('/orders/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const session = await storage.getSession(shop);

    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      success: true,
      data: { orders: [] }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get customer
router.get('/customer/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const { email } = req.query;

    res.json({
      success: true,
      data: null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
