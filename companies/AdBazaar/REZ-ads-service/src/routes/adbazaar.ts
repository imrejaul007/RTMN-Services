/**
 * AdBazaar Routes
 *
 * General AdBazaar routes
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /
 * API info
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'REZ Ads Service',
    version: '1.0.0',
    description: 'Core ad serving and campaign management',
    endpoints: {
      serve: '/ads/serve',
      click: '/ads/click',
      impression: '/ads/impression',
      campaigns: '/merchant/ads/campaigns',
    },
  });
});

export default router;
