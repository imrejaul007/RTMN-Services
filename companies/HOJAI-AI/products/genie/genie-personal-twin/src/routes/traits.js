/**
 * Traits Routes — add, list, remove traits
 *
 * A trait is a single labeled attribute about the user:
 *   - category: 'value' | 'skill' | 'interest' | 'goal' | 'fear'
 *   - name: short label ('Curiosity', 'System design', 'Meditation')
 *   - strength: 1-10
 *   - examples: optional list of behaviors
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const VALID_CATEGORIES = ['value', 'skill', 'interest', 'goal', 'fear'];

module.exports = function({ traitsStore }) {
  const router = express.Router();

  router.post('/add/:userId', (req, res) => {
    const { userId } = req.params;
    const { category, name, strength = 5, examples = [] } = req.body || {};

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: `category required (${VALID_CATEGORIES.join('|')})` });
    }
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'name required (min 2 chars)' });
    }
    if (typeof strength !== 'number' || strength < 1 || strength > 10) {
      return res.status(400).json({ success: false, error: 'strength must be 1-10' });
    }

    const id = `tr-${uuidv4().slice(0, 8)}`;
    const trait = {
      id, userId, category, name: name.trim(), strength,
      examples: Array.isArray(examples) ? examples : [],
      addedAt: new Date().toISOString(),
    };
    traitsStore.set(id, trait);

    res.status(201).json({ success: true, data: trait });
  });

  router.get('/list/:userId', (req, res) => {
    const { userId } = req.params;
    const { category } = req.query;
    let traits = Array.from(traitsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .filter(t => t.userId === userId);
    if (category && VALID_CATEGORIES.includes(category)) {
      traits = traits.filter(t => t.category === category);
    }
    // group by category for UI consumption
    const grouped = {};
    for (const t of traits) {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    }
    res.json({ success: true, total: traits.length, traits, grouped });
  });

  router.delete('/remove/:userId/:traitId', (req, res) => {
    const { userId, traitId } = req.params;
    const existing = traitsStore.get(traitId);
    if (!existing) return res.status(404).json({ success: false, error: 'Trait not found' });
    if (existing.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Not your trait' });
    }
    traitsStore.delete(traitId);
    res.json({ success: true, removed: traitId });
  });

  return router;
};
