/**
 * Insights Routes — discover themes + highlight moments across all data
 */

const express = require('express');
const axios = require('axios');

module.exports = function({ insightsStore, services }) {
  const router = express.Router();

  /**
   * GET /insights/themes
   * Cross-user theme discovery (admin-style).
   */
  router.get('/themes', async (req, res) => {
    try {
      const days = parseInt(req.query.days || '30', 10);
      const now = new Date();
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // For demo: just return cached themes
      const all = Array.from(insightsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
      res.json({ success: true, data: { themes: all } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /insights/highlights/:userId
   * Curated highlight moments — best memories, answered prayers, longest meditation streaks.
   */
  router.get('/highlights/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const safe = (promise) => promise.catch((e) => ({ data: null }));

      const [prayers, gratitudes, meditations, moods] = await Promise.all([
        safe(axios.get(`${services.spiritual}/api/spiritual/prayers`, { timeout: 5000 })),
        safe(axios.get(`${services.spiritual}/api/spiritual/gratitude`, { timeout: 5000 })),
        safe(axios.get(`${services.spiritual}/api/spiritual/meditations`, { timeout: 5000 })),
        safe(axios.get(`${services.wellness}/api/wellness/moods`, { timeout: 5000 })),
      ]);

      const highlights = [];

      // 1. Answered prayers
      const answered = (prayers.data?.prayers || []).filter(p => p.answered);
      if (answered.length > 0) {
        highlights.push({
          type: 'prayer_answered',
          icon: '🙏',
          title: `${answered.length} prayer${answered.length === 1 ? '' : 's'} answered`,
          detail: answered[0].text,
          date: answered[0].answeredAt,
        });
      }

      // 2. Longest gratitude streak (proxy: most recent week with daily entries)
      const gs = gratitudes.data?.gratitude || [];
      if (gs.length > 0) {
        const dates = new Set(gs.map(g => g.date));
        let streak = 0;
        const cursor = new Date();
        while (dates.has(cursor.toISOString().slice(0, 10))) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
        if (streak >= 3) {
          highlights.push({
            type: 'gratitude_streak',
            icon: '✨',
            title: `${streak}-day gratitude streak`,
            detail: 'You logged gratitude consistently',
            date: new Date().toISOString().slice(0, 10),
          });
        }
      }

      // 3. Total meditation time
      const meds = meditations.data?.meditations || [];
      const totalMin = meds.reduce((sum, m) => sum + (m.minutes || 0), 0);
      if (totalMin >= 60) {
        const hours = Math.round(totalMin / 60 * 10) / 10;
        highlights.push({
          type: 'meditation_total',
          icon: '🧘',
          title: `${hours} hours of meditation`,
          detail: `Across ${meds.length} session${meds.length === 1 ? '' : 's'}`,
          date: new Date().toISOString().slice(0, 10),
        });
      }

      // 4. Best mood day
      const ms = moods.data?.moods || [];
      const scoredMoods = ms.filter(m => typeof m.score === 'number');
      if (scoredMoods.length > 0) {
        const best = scoredMoods.reduce((a, b) => (a.score > b.score ? a : b));
        if (best.score >= 8) {
          highlights.push({
            type: 'best_mood',
            icon: '😊',
            title: `Brightest day: ${best.score}/10`,
            detail: best.note || 'A standout day',
            date: best.date || best.createdAt?.slice(0, 10),
          });
        }
      }

      res.json({
        success: true,
        data: {
          totalHighlights: highlights.length,
          highlights,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};