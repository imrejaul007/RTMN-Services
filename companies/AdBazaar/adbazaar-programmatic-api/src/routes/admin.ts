/**
 * Admin Routes
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// GET /admin/auctions
// Get auction statistics
// ============================================================================

router.get('/auctions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, screenId } = req.query;

  // In real implementation, query database
  res.json({
    success: true,
    data: {
      auctions: [],
      stats: {
        total: 0,
        completed: 0,
        pending: 0,
        avgPrice: 0,
      },
    },
  });
});

// ============================================================================
// GET /admin/floor-prices
// Get current floor prices
// ============================================================================

router.get('/floor-prices', asyncHandler(async (_req: Request, res: Response) => {
  const floorPrices = {
    billboard_digital: 50,
    bus_shelter: 20,
    metro_screen: 25,
    airport_display: 35,
    airport_gate: 40,
    airport_lounge: 60,
    mall_kiosk: 22,
    restaurant_tv: 10,
    hotel_lobby: 15,
    gym_screen: 12,
    office_elevator: 18,
    cab_tablet: 15,
  };

  res.json({
    success: true,
    data: floorPrices,
  });
});

// ============================================================================
// PUT /admin/floor-prices
// Update floor prices
// ============================================================================

router.put('/floor-prices', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { screenType, price } = req.body;

  // In real implementation, update database
  res.json({
    success: true,
    message: `Floor price for ${screenType} updated to ${price}`,
  });
});

export default router;
