/**
 * Widget Routes — generate tiny payloads for each widget type
 *
 * Each widget returns a strictly bounded payload (<5KB) ready for
 * iOS WidgetKit / Android AppWidget. Pulled from in-memory seed
 * data + (in production) aggregated from upstream specialists.
 */

const express = require('express');

const WIDGET_TYPES = {
  briefing:  { size: '2x2', refreshMin: 30, icon: '☀️', label: 'Daily briefing' },
  focus:     { size: '2x2', refreshMin: 60, icon: '🎯', label: 'Current focus' },
  gratitude: { size: '2x1', refreshMin: 120, icon: '🙏', label: 'Today\'s gratitude' },
  prayer:    { size: '2x1', refreshMin: 120, icon: '🕊️', label: 'Today\'s prayer' },
  moment:    { size: '2x2', refreshMin: 240, icon: '📌', label: 'Latest moment' },
  twin:      { size: '2x2', refreshMin: 60, icon: '👤', label: 'Personal twin' },
  counter:   { size: '1x1', refreshMin: 30, icon: '⏱️', label: 'Days counter' },
  countdown: { size: '2x1', refreshMin: 60, icon: '⏳', label: 'Countdown' },
};

// Seed widget payloads (in production, these are computed on-demand
// by aggregating from genie-briefing, genie-spiritual, genie-personal-twin, etc.)
const SEED_WIDGETS = {
  briefing: {
    headline: 'Build HOJAI 30-min demo',
    subline: '3 priorities, 1 risk to watch',
    icon: '☀️',
    mood: 'focused',
    weather: '☀️',
    tempC: 28,
    location: 'Bengaluru',
  },
  focus: {
    title: '🎯 Today\'s focus',
    items: [
      'Ship C10 widgets',
      'Review investor deck',
      'Workout 30 min',
    ],
    nextAction: 'Open the killer demo deck',
  },
  gratitude: {
    text: 'Quiet morning walk before the city woke up',
    streak: 14,
    icon: '🙏',
  },
  prayer: {
    text: 'Wisdom for the team meeting at 3pm',
    answered: 7,
    icon: '🕊️',
  },
  moment: {
    title: 'Started HOJAI',
    date: '2024-01-10',
    daysSince: 896,
    icon: '📌',
  },
  twin: {
    name: 'You',
    headline: 'Building something that matters.',
    topTrait: 'Curiosity',
    icon: '👤',
  },
  counter: {
    label: 'Days of meditation',
    value: 96,
    icon: '⏱️',
  },
  countdown: {
    label: 'Until Series A close',
    daysLeft: 47,
    icon: '⏳',
  },
};

module.exports = function({ widgetsStore }) {
  const router = express.Router();

  /**
   * GET /widgets/types — list available widget types
   */
  router.get('/types', (req, res) => {
    const types = Object.entries(WIDGET_TYPES).map(([k, v]) => ({ type: k, ...v }));
    res.json({ success: true, total: types.length, types });
  });

  /**
   * GET /widgets/manifest/:userId — MUST be defined before `/:type/:userId`
   */
  router.get('/manifest/:userId', (req, res) => {
    const manifest = {
      provider: 'Genie',
      version: '1.0',
      platform: ['ios', 'android'],
      widgets: Object.entries(WIDGET_TYPES).map(([type, meta]) => ({
        type,
        ...meta,
        endpoint: `/widgets/${type}/{userId}`,
        renderEndpoint: '/widgets/render/{userId}',
        sample: SEED_WIDGETS[type] || null,
      })),
    };
    res.json({ success: true, data: manifest });
  });

  /**
   * GET /widgets/:type/:userId — get a single widget payload
   */
  router.get('/:type/:userId', (req, res) => {
    const { type, userId } = req.params;
    if (!WIDGET_TYPES[type]) {
      return res.status(404).json({ success: false, error: `Unknown widget type: ${type}`, available: Object.keys(WIDGET_TYPES) });
    }
    const basePayload = SEED_WIDGETS[type] || { placeholder: true };
    const payload = {
      type,
      userId,
      meta: WIDGET_TYPES[type],
      data: basePayload,
      generatedAt: new Date().toISOString(),
    };
    res.set('Cache-Control', `public, max-age=${WIDGET_TYPES[type].refreshMin * 60}`);
    res.json({ success: true, data: payload });
  });

  /**
   * POST /widgets/render/:userId — return ALL pinned widgets in one call
   * body: { widgetTypes: ['briefing', 'gratitude'] } — if omitted, returns all 8 types
   */
  router.post('/render/:userId', (req, res) => {
    const { userId } = req.params;
    const types = (req.body && req.body.widgetTypes) || Object.keys(WIDGET_TYPES);

    const bundle = types.map((t) => {
      if (!WIDGET_TYPES[t]) return { type: t, error: 'unknown type' };
      return {
        type: t,
        meta: WIDGET_TYPES[t],
        data: SEED_WIDGETS[t] || null,
      };
    });

    const totalBytes = Buffer.byteLength(JSON.stringify(bundle));

    res.json({
      success: true,
      userId,
      bundle,
      totalBytes,
      renderedAt: new Date().toISOString(),
    });
  });

  return router;
};
