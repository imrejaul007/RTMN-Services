import express from 'express';
import { apiRegistry } from '../index.js';

const router = express.Router();

/**
 * GET /api/docs
 * Get documentation index
 */
router.get('/', async (req, res) => {
  try {
    const apis = Array.from(apiRegistry.values());

    res.json({
      success: true,
      documentation: {
        title: 'RTMN Developer Documentation',
        version: '1.0.0',
        baseUrl: 'http://localhost:8000',
        sections: [
          { id: 'getting-started', title: 'Getting Started' },
          { id: 'authentication', title: 'Authentication' },
          { id: 'rate-limits', title: 'Rate Limits' },
          { id: 'apis', title: 'API Reference' }
        ],
        apis: apis.map(api => ({
          id: api.id,
          name: api.name,
          category: api.category,
          version: api.version,
          endpoints: api.endpoints.length
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/docs/getting-started
 * Get started guide
 */
router.get('/getting-started', async (req, res) => {
  res.json({
    success: true,
    content: {
      title: 'Getting Started with RTMN API',
      steps: [
        {
          step: 1,
          title: 'Get API Key',
          description: 'Sign up for a developer account and get your API key',
          code: 'POST /api/auth/register'
        },
        {
          step: 2,
          title: 'Choose SDK',
          description: 'Select your preferred SDK language',
          code: 'npm install @rtmn/sdk-javascript'
        },
        {
          step: 3,
          title: 'Initialize Client',
          description: 'Set up the client with your API key',
          code: `const client = new RTMN.Client({
  apiKey: 'your-api-key'
});`
        },
        {
          step: 4,
          title: 'Make First Call',
          description: 'Start using the RTMN APIs',
          code: `const result = await client.capabilityMatrix.list();`
        }
      ]
    }
  });
});

/**
 * GET /api/docs/authentication
 * Authentication guide
 */
router.get('/authentication', async (req, res) => {
  res.json({
    success: true,
    content: {
      title: 'Authentication',
      methods: [
        {
          method: 'API Key',
          description: 'Pass your API key in the Authorization header',
          example: 'Authorization: Bearer your-api-key'
        },
        {
          method: 'OAuth 2.0',
          description: 'For user-facing applications',
          endpoints: {
            authorize: 'GET /api/auth/authorize',
            token: 'POST /api/auth/token'
          }
        }
      ]
    }
  });
});

/**
 * GET /api/docs/rate-limits
 * Rate limits documentation
 */
router.get('/rate-limits', async (req, res) => {
  res.json({
    success: true,
    content: {
      title: 'Rate Limits',
      plans: [
        { name: 'Free', requests: '1,000/min', features: 'Basic APIs' },
        { name: 'Starter', requests: '10,000/min', features: 'Core APIs' },
        { name: 'Professional', requests: '100,000/min', features: 'All APIs' },
        { name: 'Enterprise', requests: 'Unlimited', features: 'Custom limits' }
      ]
    }
  });
});

export default router;
