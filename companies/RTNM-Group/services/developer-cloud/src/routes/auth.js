import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { developerRegistry, PLAN_TYPES, RATE_LIMITS } from '../index.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new developer
 */
router.post('/register', async (req, res) => {
  try {
    const { email, name, plan = PLAN_TYPES.FREE } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required'
      });
    }

    const developerId = `dev_${uuidv4()}`;
    const apiKey = `rtmn_${uuidv4()}_${Date.now()}`;

    const developer = {
      id: developerId,
      email,
      name,
      plan,
      apiKey,
      rateLimit: RATE_LIMITS[plan],
      createdAt: new Date().toISOString()
    };

    developerRegistry.set(developerId, developer);

    res.status(201).json({
      success: true,
      developer: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        plan: developer.plan
      },
      apiKey: developer.apiKey
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/token
 * Generate access token
 */
router.post('/token', async (req, res) => {
  try {
    const { apiKey, grantType = 'api_key' } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }

    // Find developer by API key
    let developer;
    for (const dev of developerRegistry.values()) {
      if (dev.apiKey === apiKey) {
        developer = dev;
        break;
      }
    }

    if (!developer) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Generate token
    const accessToken = `tok_${uuidv4()}`;

    res.json({
      success: true,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      rateLimit: developer.rateLimit
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current developer info
 */
router.get('/me', async (req, res) => {
  try {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authorization required'
      });
    }

    // Find developer
    let developer;
    for (const dev of developerRegistry.values()) {
      if (dev.apiKey === apiKey) {
        developer = dev;
        break;
      }
    }

    if (!developer) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    res.json({
      success: true,
      developer: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        plan: developer.plan
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
