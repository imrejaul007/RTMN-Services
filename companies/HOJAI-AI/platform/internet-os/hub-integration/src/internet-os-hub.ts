/**
 * HOJAI InternetOS Hub Integration
 *
 * Provides Express middleware and route handlers to expose
 * the InternetOS API server through any RTMN Hub.
 *
 * Usage in any hub:
 * ```typescript
 * import { internetOSRoutes } from '@hojai/internet-os-hub';
 * app.use('/api/internet-os', internetOSRoutes);
 * ```
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const INTERNET_OS_URL = process.env.INTERNET_OS_URL || 'http://localhost:4595';

/**
 * Service manifest for auto-registration
 */
export const internetOSManifest = {
  id: 'internet-os',
  name: 'InternetOS',
  version: '1.0.0',
  description: 'Web intelligence layer for AI workforces',
  port: 4595,
  baseUrl: INTERNET_OS_URL,
  healthCheck: '/health',
  capabilities: [
    'web-scraping',
    'change-detection',
    'entity-extraction',
    'memory-storage',
    'skill-execution',
  ],
  endpoints: {
    actors: '/api/actors',
    watchers: '/api/watchers',
    history: '/api/history',
    stats: '/api/stats',
    health: '/health',
    ready: '/ready',
  },
  actors: 17,
  skills: 5,
  integrations: [
    'memory-os:4703',
    'twin-os:4705',
    'knowledge-extraction:4784',
    'webhook-bus:4110',
    'skill-os:4743',
  ],
};

/**
 * Create Express routes that proxy to InternetOS
 */
export const internetOSRoutes = Router();

/**
 * Health check
 */
internetOSRoutes.get('/health', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${INTERNET_OS_URL}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(503).json({
      status: 'unavailable',
      service: 'internet-os',
      error: error.message,
    });
  }
});

/**
 * Readiness check
 */
internetOSRoutes.get('/ready', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${INTERNET_OS_URL}/ready`, { timeout: 5000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

/**
 * Get service manifest
 */
internetOSRoutes.get('/manifest', async (_req: Request, res: Response) => {
  res.json(internetOSManifest);
});

/**
 * Get stats
 */
internetOSRoutes.get('/stats', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${INTERNET_OS_URL}/api/stats`, { timeout: 10000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generic proxy for all /api/* routes
 */
internetOSRoutes.use('/*', async (req: Request, res: Response) => {
  try {
    const path = req.originalUrl.replace(/^.*\/api\/internet-os/, '');
    const url = `${INTERNET_OS_URL}${req.path}${path}`;

    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * Auto-register with a hub
 */
export function autoRegister(hub: any, config?: { basePath?: string }): void {
  const basePath = config?.basePath || '/api/internet-os';

  if (hub && typeof hub.registerService === 'function') {
    hub.registerService({
      ...internetOSManifest,
      routes: {
        actors: `${basePath}/actors`,
        watchers: `${basePath}/watchers`,
        history: `${basePath}/history`,
        stats: `${basePath}/stats`,
        health: `${basePath}/health`,
      },
    });
  }
}

export default internetOSRoutes;