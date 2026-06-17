/**
 * Z-Events Service - Review Routes
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Get event reviews
router.get('/event/:eventId', async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const reviews = [
    {
      id: 'rev-1',
      eventId,
      userId: 'u1',
      userName: 'Rahul S.',
      rating: 5,
      title: 'Amazing experience!',
      content: 'The jazz night was incredible. Great music, good food, and wonderful people.',
      helpful: 45,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rev-2',
      eventId,
      userId: 'u2',
      userName: 'Priya M.',
      rating: 4,
      title: 'Great event',
      content: 'Loved the atmosphere. Would definitely attend again.',
      helpful: 23,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  res.json({
    success: true,
    data: { reviews, averageRating: 4.5, totalReviews: 2 },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Add review
router.post('/', async (req: Request, res: Response) => {
  const { eventId, userId, rating, title, content } = req.body;

  if (!eventId || !userId || !rating) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'eventId, userId, and rating are required' },
    });
  }

  const review = {
    id: `rev-${Date.now()}`,
    eventId,
    userId,
    rating,
    title: title || '',
    content: content || '',
    helpful: 0,
    createdAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: { review },
    meta: { timestamp: new Date().toISOString() },
  });
});

export default router;
