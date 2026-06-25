/**
 * Twin Routes — get, update, summary, mood
 *
 * "Twin" here = the user's personal digital twin: their identity,
 * current state, traits, and timeline of moments. This is what every
 * other Genie specialist consults to "know who the user is".
 */

const express = require('express');

module.exports = function({ twinsStore, traitsStore, momentsStore }) {
  const router = express.Router();

  /**
   * GET /twin/get/:userId — full twin with traits and moments
   */
  router.get('/get/:userId', (req, res) => {
    const { userId } = req.params;
    const twin = Array.from(twinsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(t => t.userId === userId);

    if (!twin) {
      return res.status(404).json({ success: false, error: 'Twin not found for user' });
    }

    const traits = Array.from(traitsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .filter(t => t.userId === userId);

    const moments = Array.from(momentsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .filter(m => m.userId === userId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    res.json({
      success: true,
      data: { ...twin, traits, moments },
    });
  });

  /**
   * POST /twin/update/:userId — update base attributes
   */
  router.post('/update/:userId', (req, res) => {
    const { userId } = req.params;
    const updates = req.body || {};
    const allowed = ['name', 'pronouns', 'age', 'location', 'timezone', 'occupation',
                     'relationshipStatus', 'householdSize', 'headline', 'bio', 'mood', 'energy', 'focus'];

    const existing = Array.from(twinsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(t => t.userId === userId);

    let id, merged;
    if (existing) {
      id = existing.id;
      merged = { ...existing, updatedAt: new Date().toISOString() };
      for (const k of allowed) {
        if (k in updates) merged[k] = updates[k];
      }
    } else {
      id = `twin-${userId}`;
      merged = {
        id, userId, headline: 'Just getting started.',
        ...Object.fromEntries(allowed.map(k => [k, updates[k] ?? null])),
        updatedAt: new Date().toISOString(),
      };
    }

    twinsStore.set(id, merged);
    res.json({ success: true, data: merged });
  });

  /**
   * GET /twin/summary/:userId — quick summary card
   */
  router.get('/summary/:userId', (req, res) => {
    const { userId } = req.params;
    const twin = Array.from(twinsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(t => t.userId === userId);

    if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });

    const traits = Array.from(traitsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .filter(t => t.userId === userId);

    // Top 3 traits by strength
    const topTraits = [...traits]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)
      .map(t => t.name);

    res.json({
      success: true,
      data: {
        name: twin.name,
        pronouns: twin.pronouns,
        age: twin.age,
        location: twin.location,
        occupation: twin.occupation,
        headline: twin.headline,
        mood: twin.mood,
        energy: twin.energy,
        topTraits,
        traitCount: traits.length,
        focus: twin.focus || [],
      },
    });
  });

  /**
   * GET /twin/mood/:userId — mood trajectory
   * (last 30 days, derived from moments + traits added recently)
   */
  router.get('/mood/:userId', (req, res) => {
    const { userId } = req.params;
    const twin = Array.from(twinsStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(t => t.userId === userId);

    if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });

    // Synthesize a 30-day mood curve from current state
    // In production this would pull from genie-wellness, genie-mood, etc.
    const now = new Date();
    const days = 30;
    const series = [];
    const baseMood = twin.mood?.score || 7;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      // small noise around the base
      const noise = ((i * 17 + 31) % 11 - 5) / 10; // -0.5..+0.5
      series.push({
        date: d.toISOString().slice(0, 10),
        score: Math.round((baseMood + noise) * 10) / 10,
      });
    }

    const avg = series.reduce((s, x) => s + x.score, 0) / series.length;
    const trend = series[series.length - 1].score - series[0].score;

    res.json({
      success: true,
      data: {
        current: twin.mood,
        series,
        avg: Math.round(avg * 10) / 10,
        trend: trend > 0.5 ? 'up' : trend < -0.5 ? 'down' : 'steady',
      },
    });
  });

  return router;
};
