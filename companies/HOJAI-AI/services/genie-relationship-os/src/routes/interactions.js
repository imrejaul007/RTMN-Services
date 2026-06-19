/**
 * Interactions Routes - Track interactions with people
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Interaction types
const INTERACTION_TYPES = {
  call: { emoji: '📞', label: 'Phone Call' },
  video: { emoji: '📹', label: 'Video Call' },
  text: { emoji: '💬', label: 'Text Message' },
  whatsapp: { emoji: '📱', label: 'WhatsApp' },
  email: { emoji: '📧', label: 'Email' },
  in_person: { emoji: '🤝', label: 'In Person' },
  meeting: { emoji: '🏢', label: 'Meeting' },
  meal: { emoji: '🍽️', label: 'Meal Together' },
  event: { emoji: '🎉', label: 'Event Together' },
  gift: { emoji: '🎁', label: 'Gift Given' },
  help: { emoji: '🤝', label: 'Helped Each Other' },
  social: { emoji: '📸', label: 'Social Media' }
};

/**
 * POST /api/interactions
 * Log an interaction
 */
router.post('/api/interactions', async (req, res) => {
  const { userId, personId, personName, type, channel, topic, duration, notes, sentiment, outcome, nextSteps } = req.body;
  const storage = req.app.locals.storage;

  if (!userId || !personId) {
    return res.status(400).json({ success: false, error: 'userId and personId are required' });
  }

  if (!storage.interactions.has(userId)) {
    storage.interactions.set(userId, []);
  }

  const interaction = {
    id: uuidv4(),
    personId,
    personName,
    userId,
    type,
    channel,
    topic,
    duration,
    notes,
    sentiment: sentiment || 'neutral', // positive, neutral, negative
    outcome,
    nextSteps,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  storage.interactions.get(userId).push(interaction);

  // Update person's last contact
  const people = storage.people.get(userId) || [];
  const personIndex = people.findIndex(p => p.id === personId);
  if (personIndex !== -1) {
    people[personIndex].lastContact = new Date().toISOString();
    people[personIndex].totalInteractions += 1;
    people[personIndex].updatedAt = new Date().toISOString();
    storage.people.set(userId, people);
  }

  res.json({ success: true, interaction });
});

/**
 * GET /api/interactions/:userId
 * Get all interactions
 */
router.get('/api/interactions/:userId', async (req, res) => {
  const { userId } = req.params;
  const { personId, days, type, limit } = req.query;
  const storage = req.app.locals.storage;

  let interactions = storage.interactions.get(userId) || [];

  // Filter by person
  if (personId) {
    interactions = interactions.filter(i => i.personId === personId);
  }

  // Filter by days
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    interactions = interactions.filter(i => new Date(i.timestamp) >= cutoff);
  }

  // Filter by type
  if (type) {
    interactions = interactions.filter(i => i.type === type);
  }

  // Sort by timestamp
  interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply limit
  if (limit) {
    interactions = interactions.slice(0, parseInt(limit));
  }

  res.json({
    success: true,
    interactions,
    count: interactions.length
  });
});

/**
 * GET /api/interactions/:userId/stats
 * Get interaction statistics
 */
router.get('/api/interactions/:userId/stats', async (req, res) => {
  const { userId } = req.params;
  const { days } = req.query;
  const storage = req.app.locals.storage;

  let interactions = storage.interactions.get(userId) || [];

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    interactions = interactions.filter(i => new Date(i.timestamp) >= cutoff);
  }

  const stats = {
    total: interactions.length,
    byType: {},
    byPerson: {},
    byChannel: {},
    averageDuration: 0,
    totalDuration: 0,
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 }
  };

  let totalDuration = 0;
  interactions.forEach(i => {
    stats.byType[i.type] = (stats.byType[i.type] || 0) + 1;
    stats.byChannel[i.channel] = (stats.byChannel[i.channel] || 0) + 1;

    const personName = i.personName || i.personId;
    stats.byPerson[personName] = (stats.byPerson[personName] || 0) + 1;

    if (i.sentiment) {
      stats.sentimentBreakdown[i.sentiment] += 1;
    }

    if (i.duration) {
      totalDuration += i.duration;
    }
  });

  stats.totalDuration = totalDuration;
  stats.averageDuration = interactions.length > 0 ? Math.round(totalDuration / interactions.length) : 0;

  res.json({ success: true, stats, period: `${days || 'all'} days` });
});

/**
 * GET /api/interactions/:userId/types
 * Get interaction types
 */
router.get('/api/interactions/:userId/types', (req, res) => {
  res.json({
    success: true,
    types: INTERACTION_TYPES
  });
});

/**
 * DELETE /api/interactions/:userId/:interactionId
 * Delete interaction
 */
router.delete('/api/interactions/:userId/:interactionId', async (req, res) => {
  const { userId, interactionId } = req.params;
  const storage = req.app.locals.storage;

  const interactions = storage.interactions.get(userId) || [];
  const filtered = interactions.filter(i => i.id !== interactionId);

  if (filtered.length === interactions.length) {
    return res.status(404).json({ success: false, error: 'Interaction not found' });
  }

  storage.interactions.set(userId, filtered);

  res.json({ success: true, message: 'Interaction deleted' });
});

export default router;
