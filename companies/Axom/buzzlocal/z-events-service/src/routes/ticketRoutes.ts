/**
 * Z-Events Service - Ticket Routes
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Book ticket
router.post('/', async (req: Request, res: Response) => {
  const { eventId, userId, ticketType, quantity } = req.body;

  if (!eventId || !userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'eventId and userId are required' },
    });
  }

  const ticket = {
    id: `tkt-${Date.now()}`,
    eventId,
    userId,
    ticketType: ticketType || 'general',
    quantity: quantity || 1,
    status: 'confirmed',
    qrCode: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    bookedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: { ticket },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Get user tickets
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const tickets = [
    {
      id: 'tkt-1',
      eventId: 'evt-1',
      eventTitle: 'Jazz Night at Sky Lounge',
      status: 'confirmed',
      qrCode: 'QR-abc123',
      bookedAt: new Date().toISOString(),
    },
  ];

  res.json({
    success: true,
    data: { tickets },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Verify ticket
router.post('/:id/verify', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { scannedBy } = req.body;

  res.json({
    success: true,
    data: {
      valid: true,
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      scannedBy,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

export default router;
