/**
 * Timeline Routes - Event timeline management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /timeline/event
 * Add timeline event
 */
router.post('/timeline/event', async (req, res) => {
  const { userId, title, description, date, type, category, people, location, emotions, photos } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!userId || !title) {
    return res.status(400).json({
      success: false,
      error: 'userId and title are required'
    });
  }

  if (!storage.events.has(userId)) {
    storage.events.set(userId, []);
  }

  const event = {
    id: uuidv4(),
    userId,
    title,
    description,
    date: date || new Date().toISOString().split('T')[0],
    year: new Date().getFullYear(),
    type: type || 'general',
    category: category || 'personal',
    people: people || [],
    location,
    emotions: emotions || [],
    photos: photos || [],
    importance: 5,
    archived: false,
    createdAt: new Date().toISOString()
  };

  storage.events.get(userId).push(event);

  res.json({ success: true, event });
});

/**
 * GET /timeline/:userId
 * Get timeline
 */
router.get('/timeline/:userId', async (req, res) => {
  const { userId } = req.params;
  const { year, month, category, type, limit } = req.query;
  const storage = req.app.locals.graphStorage;

  let events = storage.events.get(userId) || [];

  // Filter by year
  if (year) {
    events = events.filter(e => e.year === parseInt(year));
  }

  // Filter by month
  if (month) {
    events = events.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === parseInt(month);
    });
  }

  // Filter by category
  if (category) {
    events = events.filter(e => e.category === category);
  }

  // Filter by type
  if (type) {
    events = events.filter(e => e.type === type);
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Apply limit
  if (limit) {
    events = events.slice(0, parseInt(limit));
  }

  res.json({
    success: true,
    events,
    count: events.length
  });
});

/**
 * GET /timeline/:userId/replay
 * Get life replay for a date range
 */
router.get('/timeline/:userId/replay', async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;
  const storage = req.app.locals.graphStorage;

  let events = storage.events.get(userId) || [];

  // Filter by date range
  if (startDate) {
    events = events.filter(e => new Date(e.date) >= new Date(startDate));
  }
  if (endDate) {
    events = events.filter(e => new Date(e.date) <= new Date(endDate));
  }

  // Sort by date ascending (for replay)
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Group by date
  const replay = events.map(e => ({
    date: e.date,
    title: e.title,
    description: e.description,
    category: e.category,
    people: e.people,
    emotions: e.emotions,
    type: 'event'
  }));

  res.json({
    success: true,
    replay,
    period: { startDate, endDate },
    count: replay.length
  });
});

/**
 * GET /timeline/:userId/:eventId
 * Get specific event
 */
router.get('/timeline/:userId/:eventId', async (req, res) => {
  const { userId, eventId } = req.params;
  const storage = req.app.locals.graphStorage;

  const events = storage.events.get(userId) || [];
  const event = events.find(e => e.id === eventId);

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  res.json({ success: true, event });
});

/**
 * PUT /timeline/:userId/:eventId
 * Update event
 */
router.put('/timeline/:userId/:eventId', async (req, res) => {
  const { userId, eventId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.graphStorage;

  const events = storage.events.get(userId) || [];
  const index = events.findIndex(e => e.id === eventId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  events[index] = { ...events[index], ...updates };
  storage.events.set(userId, events);

  res.json({ success: true, event: events[index] });
});

/**
 * DELETE /timeline/:userId/:eventId
 * Delete event
 */
router.delete('/timeline/:userId/:eventId', async (req, res) => {
  const { userId, eventId } = req.params;
  const storage = req.app.locals.graphStorage;

  const events = storage.events.get(userId) || [];
  const filtered = events.filter(e => e.id !== eventId);

  if (filtered.length === events.length) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  storage.events.set(userId, filtered);

  res.json({ success: true, message: 'Event deleted' });
});

/**
 * GET /timeline/:userId/years
 * Get available years
 */
router.get('/timeline/:userId/years', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const events = storage.events.get(userId) || [];
  const years = [...new Set(events.map(e => e.year))].sort((a, b) => b - a);

  res.json({
    success: true,
    years,
    hasEvents: years.length > 0
  });
});

/**
 * GET /timeline/:userId/stats
 * Get timeline statistics
 */
router.get('/timeline/:userId/stats', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const events = storage.events.get(userId) || [];

  const stats = {
    total: events.length,
    byCategory: {},
    byYear: {},
    byMonth: {},
    averagePerMonth: 0
  };

  events.forEach(e => {
    stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
    stats.byYear[e.year] = (stats.byYear[e.year] || 0) + 1;

    const month = new Date(e.date).toLocaleString('default', { month: 'long' });
    stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
  });

  // Calculate average events per month
  if (events.length > 0) {
    const years = Object.keys(stats.byYear);
    const months = years.length * 12;
    stats.averagePerMonth = Math.round((events.length / months) * 10) / 10;
  }

  res.json({ success: true, stats });
});

export default router;
