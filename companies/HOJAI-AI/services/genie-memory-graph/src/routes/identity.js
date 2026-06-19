/**
 * Identity Routes - User identity management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/identity
 * Create user identity
 */
router.post('/api/identity', async (req, res) => {
  const { userId, name, email, birthday, gender, location, occupation, bio } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const identity = {
    id: uuidv4(),
    userId,
    name,
    email,
    birthday,
    gender,
    location,
    occupation,
    bio,
    personality: {
      traits: [],
      communicationStyle: 'friendly',
      values: [],
      interests: []
    },
    communication: {
      preferredLanguage: 'en',
      tone: 'casual',
      formality: 'moderate'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };

  storage.identities.set(userId, identity);

  // Also create nodes for identity
  if (!storage.nodes.has(userId)) {
    storage.nodes.set(userId, new Map());
  }
  storage.nodes.get(userId).set(`identity:${userId}`, {
    type: 'person',
    data: identity,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, identity });
});

/**
 * GET /api/identity/:userId
 * Get user identity
 */
router.get('/api/identity/:userId', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const identity = storage.identities.get(userId);

  if (!identity) {
    return res.status(404).json({ success: false, error: 'Identity not found' });
  }

  res.json({ success: true, identity });
});

/**
 * PUT /api/identity/:userId
 * Update user identity
 */
router.put('/api/identity/:userId', async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.graphStorage;

  let identity = storage.identities.get(userId);

  if (!identity) {
    // Create if doesn't exist
    identity = { userId, createdAt: new Date().toISOString() };
  }

  identity = { ...identity, ...updates, updatedAt: new Date().toISOString() };
  storage.identities.set(userId, identity);

  res.json({ success: true, identity });
});

/**
 * PUT /api/identity/:userId/personality
 * Update personality traits
 */
router.put('/api/identity/:userId/personality', async (req, res) => {
  const { userId } = req.params;
  const { traits, communicationStyle, values, interests } = req.body;
  const storage = req.app.locals.graphStorage;

  const identity = storage.identities.get(userId);

  if (!identity) {
    return res.status(404).json({ success: false, error: 'Identity not found' });
  }

  identity.personality = {
    ...identity.personality,
    traits: traits || identity.personality.traits,
    communicationStyle: communicationStyle || identity.personality.communicationStyle,
    values: values || identity.personality.values,
    interests: interests || identity.personality.interests
  };
  identity.updatedAt = new Date().toISOString();

  storage.identities.set(userId, identity);

  res.json({ success: true, personality: identity.personality });
});

/**
 * PUT /api/identity/:userId/communication
 * Update communication preferences
 */
router.put('/api/identity/:userId/communication', async (req, res) => {
  const { userId } = req.params;
  const { preferredLanguage, tone, formality } = req.body;
  const storage = req.app.locals.graphStorage;

  const identity = storage.identities.get(userId);

  if (!identity) {
    return res.status(404).json({ success: false, error: 'Identity not found' });
  }

  identity.communication = {
    ...identity.communication,
    preferredLanguage: preferredLanguage || identity.communication.preferredLanguage,
    tone: tone || identity.communication.tone,
    formality: formality || identity.communication.formality
  };
  identity.updatedAt = new Date().toISOString();

  storage.identities.set(userId, identity);

  res.json({ success: true, communication: identity.communication });
});

/**
 * POST /api/identity/:userId/learn
 * Learn new fact about user
 */
router.post('/api/identity/:userId/learn', async (req, res) => {
  const { userId } = req.params;
  const { fact, source, confidence } = req.body;
  const storage = req.app.locals.graphStorage;

  let identity = storage.identities.get(userId);

  if (!identity) {
    identity = { userId, learnedFacts: [], createdAt: new Date().toISOString() };
  }

  if (!identity.learnedFacts) {
    identity.learnedFacts = [];
  }

  const learnedFact = {
    id: uuidv4(),
    fact,
    source: source || 'conversation',
    confidence: confidence || 0.8,
    learnedAt: new Date().toISOString()
  };

  identity.learnedFacts.push(learnedFact);
  identity.updatedAt = new Date().toISOString();
  identity.lastActive = new Date().toISOString();

  storage.identities.set(userId, identity);

  res.json({ success: true, fact: learnedFact });
});

/**
 * GET /api/identity/:userId/facts
 * Get learned facts about user
 */
router.get('/api/identity/:userId/facts', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const identity = storage.identities.get(userId);

  if (!identity) {
    return res.json({ success: true, facts: [] });
  }

  res.json({
    success: true,
    facts: identity.learnedFacts || [],
    count: identity.learnedFacts?.length || 0
  });
});

/**
 * POST /api/identity/:userId/activity
 * Record user activity
 */
router.post('/api/identity/:userId/activity', async (req, res) => {
  const { userId } = req.params;
  const { activity, metadata } = req.body;
  const storage = req.app.locals.graphStorage;

  let identity = storage.identities.get(userId);

  if (!identity) {
    identity = { userId, activities: [], createdAt: new Date().toISOString() };
  }

  if (!identity.activities) {
    identity.activities = [];
  }

  const activityEntry = {
    id: uuidv4(),
    activity,
    metadata,
    timestamp: new Date().toISOString()
  };

  identity.activities.push(activityEntry);
  identity.lastActive = new Date().toISOString();

  // Keep only last 100 activities
  if (identity.activities.length > 100) {
    identity.activities = identity.activities.slice(-100);
  }

  storage.identities.set(userId, identity);

  res.json({ success: true, activity: activityEntry });
});

/**
 * GET /api/identity/:userId/activity
 * Get user activities
 */
router.get('/api/identity/:userId/activity', async (req, res) => {
  const { userId } = req.params;
  const { days } = req.query;
  const storage = req.app.locals.graphStorage;

  const identity = storage.identities.get(userId);

  if (!identity || !identity.activities) {
    return res.json({ success: true, activities: [] });
  }

  let activities = identity.activities;

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    activities = activities.filter(a => new Date(a.timestamp) >= cutoff);
  }

  res.json({
    success: true,
    activities,
    count: activities.length
  });
});

export default router;
