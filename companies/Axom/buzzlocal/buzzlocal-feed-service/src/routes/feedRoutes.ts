/**
 * BuzzLocal Feed Service - API Routes
 */

import { Router, Request, Response } from 'express';
import { feedService } from '../services/feedService';
import type { FeedFilters } from '../types';

const router = Router();

// Get personalized feed
router.get('/', async (req: Request, res: Response) => {
  const filters: FeedFilters = {
    types: req.query.types ? req.query.types.toString().split(',') as any : undefined,
    categories: req.query.categories ? req.query.categories.toString().split(',') : undefined,
    area: req.query.area as string,
    city: req.query.city as string,
    lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
    lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
    radiusKm: req.query.radiusKm ? parseInt(req.query.radiusKm as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
  };

  const result = await feedService.getFeed(filters);
  res.json({ success: true, data: result, meta: { timestamp: new Date().toISOString() } });
});

// Get alerts
router.get('/alerts', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string) || 12.9716;
  const lng = parseFloat(req.query.lng as string) || 77.5946;
  const radiusKm = parseInt(req.query.radiusKm as string) || 5;

  const alerts = await feedService.getAlerts(lat, lng, radiusKm);
  res.json({ success: true, data: { alerts }, meta: { timestamp: new Date().toISOString() } });
});

// Get offers
router.get('/offers', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string) || 12.9716;
  const lng = parseFloat(req.query.lng as string) || 77.5946;
  const limit = parseInt(req.query.limit as string) || 20;

  const offers = await feedService.getOffers(lat, lng, limit);
  res.json({ success: true, data: { offers }, meta: { timestamp: new Date().toISOString() } });
});

// Get events
router.get('/events', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string) || 12.9716;
  const lng = parseFloat(req.query.lng as string) || 77.5946;
  const limit = parseInt(req.query.limit as string) || 20;

  const events = await feedService.getEvents(lat, lng, limit);
  res.json({ success: true, data: { events }, meta: { timestamp: new Date().toISOString() } });
});

// Get trending
router.get('/trending', async (req: Request, res: Response) => {
  const city = req.query.city as string;
  const trending = await feedService.getTrending(city);
  res.json({ success: true, data: { trending }, meta: { timestamp: new Date().toISOString() } });
});

// Get single item
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const feed = await feedService.getFeed({});
  const item = feed.items.find(i => i.id === id);

  if (!item) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Feed item not found' } });
  }

  res.json({ success: true, data: { item }, meta: { timestamp: new Date().toISOString() } });
});

// Like/unlike
router.post('/:id/like', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  const result = await feedService.toggleLike(id, userId);
  res.json({ success: true, data: result, meta: { timestamp: new Date().toISOString() } });
});

// Save/unsave
router.post('/:id/save', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  const result = await feedService.toggleSave(id, userId);
  res.json({ success: true, data: result, meta: { timestamp: new Date().toISOString() } });
});

// Get comments
router.get('/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;

  const comments = await feedService.getComments(id, limit);
  res.json({ success: true, data: { comments }, meta: { timestamp: new Date().toISOString() } });
});

// Add comment
router.post('/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, content } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Content required' } });
  }

  const comment = await feedService.addComment(id, userId, content);
  res.json({ success: true, data: { comment }, meta: { timestamp: new Date().toISOString() } });
});

// Report
router.post('/:id/report', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, reason } = req.body;

  await feedService.reportItem(id, userId, reason);
  res.json({ success: true, data: { message: 'Report submitted' }, meta: { timestamp: new Date().toISOString() } });
});

export default router;
