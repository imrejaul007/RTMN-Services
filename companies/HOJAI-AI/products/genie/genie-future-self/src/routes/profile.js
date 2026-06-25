/**
 * Profile Routes — store user values, goals, priorities, fears, hopes
 */

const express = require('express');

module.exports = function({ profilesStore }) {
  const router = express.Router();

  const DEFAULT_PROFILE = {
    values: ['growth', 'family', 'health'],
    goals: [],
    priorities: [],
    fears: [],
    hopes: [],
    age: null,
    year: new Date().getFullYear(),
  };

  /**
   * GET /profile/get/:userId
   * Returns the user's future-self profile (creates default if missing).
   */
  router.get('/get/:userId', (req, res) => {
    const { userId } = req.params;
    const id = `fp-${userId}`;
    let profile = profilesStore.get(id);
    if (!profile) {
      profile = { id, userId, ...DEFAULT_PROFILE, isDefault: true };
      profilesStore.set(id, profile);
    }
    res.json({ success: true, data: profile });
  });

  /**
   * POST /profile/update/:userId
   * body: { values?, goals?, priorities?, fears?, hopes?, age?, year? }
   */
  router.post('/update/:userId', (req, res) => {
    const { userId } = req.params;
    const body = req.body || {};

    const id = `fp-${userId}`;
    const existing = profilesStore.get(id) || { id, userId, ...DEFAULT_PROFILE };

    const updated = {
      ...existing,
      values: sanitizeList(body.values) || existing.values,
      goals: sanitizeList(body.goals) || existing.goals,
      priorities: sanitizeList(body.priorities) || existing.priorities,
      fears: sanitizeList(body.fears) || existing.fears,
      hopes: sanitizeList(body.hopes) || existing.hopes,
      age: typeof body.age === 'number' ? body.age : existing.age,
      year: typeof body.year === 'number' ? body.year : existing.year,
      updatedAt: new Date().toISOString(),
      isDefault: false,
    };

    profilesStore.set(id, updated);
    res.json({ success: true, message: 'Profile updated', data: updated });
  });

  return router;
};

function sanitizeList(v) {
  if (!Array.isArray(v)) return null;
  return v.filter(x => typeof x === 'string' && x.trim().length > 0).map(x => x.trim()).slice(0, 30);
}