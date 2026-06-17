/**
 * Z-Events Service - Organizer Routes
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Get organizer profile
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const organizer = {
    id,
    name: 'Jazz Club Mumbai',
    description: 'Bringing the best jazz experiences to Mumbai',
    verified: true,
    eventCount: 24,
    followerCount: 1523,
    rating: 4.8,
    events: ['evt-1', 'evt-2'],
    socialLinks: {
      instagram: '@jazzclubmumbai',
      twitter: '@jazzclubmumbai',
    },
    createdAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: { organizer },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Get organizer's events
router.get('/:id/events', async (req: Request, res: Response) => {
  const { id } = req.params;

  const events = [
    {
      id: 'evt-1',
      title: 'Jazz Night at Sky Lounge',
      startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      status: 'upcoming',
      ticketSales: 45,
      revenue: 67455,
    },
  ];

  res.json({
    success: true,
    data: { events },
    meta: { timestamp: new Date().toISOString() },
  });
});

export default router;
