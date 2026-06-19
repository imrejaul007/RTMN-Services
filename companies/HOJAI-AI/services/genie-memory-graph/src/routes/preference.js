/**
 * Preference Routes - Preference graph management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /preference
 * Add or update preference
 */
router.post('/preference', async (req, res) => {
  const { userId, category, key, value, strength, notes } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!userId || !key) {
    return res.status(400).json({
      success: false,
      error: 'userId and key are required'
    });
  }

  if (!storage.preferences.has(userId)) {
    storage.preferences.set(userId, {});
  }

  const prefs = storage.preferences.get(userId);
  if (!prefs[category]) {
    prefs[category] = {};
  }

  prefs[category][key] = {
    value,
    strength: strength || 5,
    notes,
    source: 'explicit',
    updatedAt: new Date().toISOString()
  };

  storage.preferences.set(userId, prefs);

  res.json({ success: true, preference: prefs[category][key] });
});

/**
 * GET /preference/:userId
 * Get all preferences
 */
router.get('/preference/:userId', async (req, res) => {
  const { userId } = req.params;
  const { category } = req.query;
  const storage = req.app.locals.graphStorage;

  const prefs = storage.preferences.get(userId) || {};

  if (category) {
    return res.json({
      success: true,
      preferences: prefs[category] || {},
      category
    });
  }

  res.json({
    success: true,
    preferences: prefs,
    categories: Object.keys(prefs)
  });
});

/**
 * PUT /preference/:userId
 * Update preferences
 */
router.put('/preference/:userId', async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.graphStorage;

  const prefs = storage.preferences.get(userId) || {};
  Object.keys(updates).forEach(category => {
    if (!prefs[category]) {
      prefs[category] = {};
    }
    Object.keys(updates[category]).forEach(key => {
      prefs[category][key] = {
        ...prefs[category][key],
        ...updates[category][key],
        updatedAt: new Date().toISOString()
      };
    });
  });

  storage.preferences.set(userId, prefs);

  res.json({ success: true, preferences: prefs });
});

/**
 * DELETE /preference/:userId/:category/:key
 * Remove preference
 */
router.delete('/preference/:userId/:category/:key', async (req, res) => {
  const { userId, category, key } = req.params;
  const storage = req.app.locals.graphStorage;

  const prefs = storage.preferences.get(userId) || {};

  if (prefs[category] && prefs[category][key]) {
    delete prefs[category][key];
    storage.preferences.set(userId, prefs);
  }

  res.json({ success: true, message: 'Preference removed' });
});

/**
 * POST /preference/:userId/learn
 * Learn preference from behavior
 */
router.post('/preference/:userId/learn', async (req, res) => {
  const { userId, category, key, value, context } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!userId || !key) {
    return res.status(400).json({
      success: false,
      error: 'userId and key are required'
    });
  }

  if (!storage.preferences.has(userId)) {
    storage.preferences.set(userId, {});
  }

  const prefs = storage.preferences.get(userId);
  if (!prefs[category]) {
    prefs[category] = {};
  }

  // Check if this is a repeated behavior
  const existing = prefs[category][key];
  const newStrength = existing
    ? Math.min(10, (existing.strength || 5) + 1)
    : 3;

  prefs[category][key] = {
    value,
    strength: newStrength,
    source: 'inferred',
    context,
    updatedAt: new Date().toISOString()
  };

  storage.preferences.set(userId, prefs);

  res.json({
    success: true,
    preference: prefs[category][key],
    learned: true
  });
});

/**
 * GET /preference/:userId/summary
 * Get preference summary
 */
router.get('/preference/:userId/summary', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const prefs = storage.preferences.get(userId) || {};
  const summary = {
    total: 0,
    categories: {},
    strongest: [],
    weakest: []
  };

  Object.keys(prefs).forEach(category => {
    const categoryPrefs = Object.values(prefs[category]);
    summary.categories[category] = categoryPrefs.length;
    summary.total += categoryPrefs.length;

    categoryPrefs.forEach(p => {
      p.category = category;
    });

    summary.weakest.push(...categoryPrefs.filter(p => (p.strength || 5) <= 3));
  });

  // Get strongest preferences
  const all = Object.values(prefs).flat();
  summary.strongest = all
    .filter(p => (p.strength || 5) >= 7)
    .sort((a, b) => (b.strength || 5) - (a.strength || 5))
    .slice(0, 10);

  summary.weakest = summary.weakest.slice(0, 10);

  res.json({ success: true, summary });
});

export default router;
