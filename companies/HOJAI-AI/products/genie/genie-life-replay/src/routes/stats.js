/**
 * Stats Routes — quick aggregated stats for a period
 */

const express = require('express');
const axios = require('axios');

module.exports = function({ services }) {
  const router = express.Router();

  /**
   * GET /stats/summary/:userId
   * Quick stats for the last 30 days (or ?days=N).
   */
  router.get('/summary/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days || '30', 10);

      const now = new Date();
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const safe = (promise) => promise.catch((e) => ({ error: e.message, data: null }));

      const [memories, moods, gratitudes, meditations, prayers] = await Promise.all([
        safe(axios.get(`${services.memory}/api/timeline`, {
          params: { userId, startDate: start.toISOString(), endDate: now.toISOString(), limit: 500 },
          timeout: 5000,
        })),
        safe(axios.get(`${services.wellness}/api/wellness/moods`, { timeout: 5000 })),
        safe(axios.get(`${services.spiritual}/api/spiritual/gratitude`, { timeout: 5000 })),
        safe(axios.get(`${services.spiritual}/api/spiritual/meditations`, { timeout: 5000 })),
        safe(axios.get(`${services.spiritual}/api/spiritual/prayers`, { timeout: 5000 })),
      ]);

      const mems = (memories.data?.memories || []).filter(m => m.userId === userId);
      const ms = moods.data?.moods || [];
      const gs = gratitudes.data?.gratitude || [];
      const meds = meditations.data?.meditations || [];
      const ps = prayers.data?.prayers || [];

      const moodScores = ms.map(m => m.score).filter(s => typeof s === 'number');

      res.json({
        success: true,
        data: {
          period: { days, start: start.toISOString(), end: now.toISOString() },
          memories: mems.length,
          moods: ms.length,
          moodAvg: moodScores.length > 0
            ? Math.round(moodScores.reduce((a, b) => a + b, 0) / moodScores.length * 10) / 10
            : null,
          gratitudes: gs.length,
          gratitudeItems: gs.reduce((sum, g) => sum + (g.items?.length || 0), 0),
          prayers: ps.length,
          prayersAnswered: ps.filter(p => p.answered).length,
          meditations: meds.length,
          meditationMinutes: meds.reduce((sum, m) => sum + (m.minutes || 0), 0),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /stats/thematic/:userId
   * Top themes over a period (no LLM, pure keyword frequency).
   */
  router.get('/thematic/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days || '30', 10);

      const now = new Date();
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const r = await axios.get(`${services.memory}/api/timeline`, {
        params: { userId, startDate: start.toISOString(), endDate: now.toISOString(), limit: 500 },
        timeout: 5000,
      });

      const allText = (r.data?.memories || [])
        .map((m) => m.content || m.text || '')
        .join(' ')
        .toLowerCase();

      const keywords = [
        'family', 'work', 'career', 'health', 'fitness', 'travel',
        'gratitude', 'meditation', 'prayer', 'friends', 'love',
        'creativity', 'mindfulness', 'sleep', 'food', 'reading',
        'music', 'nature', 'spirituality', 'kids', 'parents', 'meeting'
      ];

      const themeCounts = {};
      for (const kw of keywords) {
        const matches = (allText.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length;
        if (matches > 0) themeCounts[kw] = matches;
      }

      const themes = Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([theme, count]) => ({ theme, count }));

      res.json({
        success: true,
        data: {
          period: { days, start: start.toISOString(), end: now.toISOString() },
          themes,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};