/**
 * Z-Events Service - Event Routes
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Mock events data
const MOCK_EVENTS = [
  {
    id: 'evt-1',
    title: 'Jazz Night at Sky Lounge',
    description: 'Enjoy smooth jazz with fellow enthusiasts',
    category: 'music',
    startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    startTime: '19:00',
    venue: { name: 'Sky Lounge Rooftop', address: '123 MG Road, Mumbai', latitude: 19.076, longitude: 72.8777 },
    organizer: { id: 'org-1', name: 'Jazz Club Mumbai', verified: true },
    isPaid: true,
    minPrice: 999,
    maxPrice: 2499,
    currentAttendees: 45,
    maxAttendees: 100,
    interestedCount: 128,
    images: ['https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt-2',
    title: 'Tech Founders Meetup',
    description: 'Networking for startup founders and investors',
    category: 'networking',
    startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    startTime: '18:00',
    venue: { name: 'WeWork Chroma', address: '456 Innovation Hub, Bangalore', latitude: 12.9716, longitude: 77.5946 },
    organizer: { id: 'org-2', name: 'Bangalore Startup Network', verified: true },
    isPaid: false,
    minPrice: 0,
    maxPrice: 0,
    currentAttendees: 78,
    maxAttendees: 150,
    interestedCount: 245,
    images: ['https://images.unsplash.com/photo-1540575467063-178a50c2df71'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt-3',
    title: 'Art & Wine Evening',
    description: 'Experience contemporary art with wine tasting',
    category: 'arts',
    startDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    startTime: '17:00',
    venue: { name: 'Gallery 91', address: '789 Cultural Lane, Delhi', latitude: 28.6139, longitude: 77.209 },
    organizer: { id: 'org-3', name: 'Delhi Arts Collective', verified: true },
    isPaid: true,
    minPrice: 1999,
    maxPrice: 3999,
    currentAttendees: 32,
    maxAttendees: 60,
    interestedCount: 89,
    images: ['https://images.unsplash.com/photo-1510812431401-41cb2d5a1d8e'],
    createdAt: new Date().toISOString(),
  },
];

// Get all events
router.get('/', async (req: Request, res: Response) => {
  const { category, city, lat, lng, radius, limit = 20, offset = 0 } = req.query;

  let events = [...MOCK_EVENTS];

  if (category) {
    events = events.filter(e => e.category === category);
  }

  res.json({
    success: true,
    data: {
      events: events.slice(Number(offset), Number(offset) + Number(limit)),
      total: events.length,
      limit: Number(limit),
      offset: Number(offset),
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Get event by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const event = MOCK_EVENTS.find(e => e.id === id);

  if (!event) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Event not found' },
    });
  }

  res.json({
    success: true,
    data: { event },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Get event attendees
router.get('/:id/attendees', async (req: Request, res: Response) => {
  const { id } = req.params;

  const attendees = [
    { userId: 'u1', name: 'Priya S.', compatibility: 92, interests: ['tech', 'music'] },
    { userId: 'u2', name: 'Rahul M.', compatibility: 87, interests: ['networking', 'travel'] },
    { userId: 'u3', name: 'Ananya K.', compatibility: 95, interests: ['food', 'art'] },
  ];

  res.json({
    success: true,
    data: { attendees },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Get categories
router.get('/meta/categories', async (_req: Request, res: Response) => {
  const categories = [
    { id: 'music', name: 'Music', emoji: '🎵', count: 234 },
    { id: 'networking', name: 'Networking', emoji: '🤝', count: 189 },
    { id: 'food', name: 'Food & Drinks', emoji: '🍽️', count: 156 },
    { id: 'arts', name: 'Arts & Culture', emoji: '🎨', count: 123 },
    { id: 'sports', name: 'Sports', emoji: '⚽', count: 98 },
    { id: 'tech', name: 'Technology', emoji: '💻', count: 87 },
    { id: 'business', name: 'Business', emoji: '💼', count: 76 },
    { id: 'fitness', name: 'Health & Fitness', emoji: '💪', count: 65 },
  ];

  res.json({
    success: true,
    data: { categories },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Interest/Uninterest
router.post('/:id/interest', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, interested } = req.body;

  res.json({
    success: true,
    data: { interested: interested ?? true },
    meta: { timestamp: new Date().toISOString() },
  });
});

export default router;
