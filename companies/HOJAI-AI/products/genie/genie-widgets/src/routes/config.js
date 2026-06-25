/**
 * Config Routes — per-user widget configuration
 *
 * Tracks which widgets the user has pinned to their home/lock screen,
 * their refresh interval preference, and theme.
 */

const express = require('express');

const VALID_THEMES = ['dark', 'light', 'auto'];

module.exports = function({ configStore }) {
  const router = express.Router();

  /**
   * GET /config/:userId — get user's widget config
   */
  router.get('/:userId', (req, res) => {
    const { userId } = req.params;
    const cfg = Array.from(configStore.entries())
      .map(([k, v]) => ({ id: k, ...v }))
      .find(c => c.userId === userId);

    if (!cfg) {
      return res.json({
        success: true,
        data: {
          userId,
          pinned: [],
          refreshIntervalMin: 30,
          theme: 'dark',
          updatedAt: new Date().toISOString(),
        },
      });
    }
    res.json({ success: true, data: cfg });
  });

  /**
   * POST /config/:userId — replace config
   */
  router.post('/:userId', (req, res) => {
    const { userId } = req.params;
    const { pinned = [], refreshIntervalMin = 30, theme = 'dark' } = req.body || {};

    if (typeof refreshIntervalMin !== 'number' || refreshIntervalMin < 5 || refreshIntervalMin > 1440) {
      return res.status(400).json({ success: false, error: 'refreshIntervalMin must be 5-1440' });
    }
    if (!VALID_THEMES.includes(theme)) {
      return res.status(400).json({ success: false, error: `theme must be one of: ${VALID_THEMES.join(', ')}` });
    }

    const id = `cfg-${userId}`;
    const cfg = { id, userId, pinned, refreshIntervalMin, theme, updatedAt: new Date().toISOString() };
    configStore.set(id, cfg);
    res.json({ success: true, data: cfg });
  });

  /**
   * POST /config/:userId/pin/:widgetType — pin a widget
   */
  router.post('/:userId/pin/:widgetType', (req, res) => {
    const { userId, widgetType } = req.params;
    const cfg = getOrDefault(configStore, userId);
    if (!cfg.pinned.includes(widgetType)) cfg.pinned.push(widgetType);
    cfg.updatedAt = new Date().toISOString();
    configStore.set(cfg.id, cfg);
    res.json({ success: true, pinned: cfg.pinned });
  });

  /**
   * POST /config/:userId/unpin/:widgetType — unpin a widget
   */
  router.post('/:userId/unpin/:widgetType', (req, res) => {
    const { userId, widgetType } = req.params;
    const cfg = getOrDefault(configStore, userId);
    cfg.pinned = cfg.pinned.filter((w) => w !== widgetType);
    cfg.updatedAt = new Date().toISOString();
    configStore.set(cfg.id, cfg);
    res.json({ success: true, pinned: cfg.pinned });
  });

  return router;
};

function getOrDefault(configStore, userId) {
  const found = Array.from(configStore.entries())
    .map(([k, v]) => ({ id: k, ...v }))
    .find(c => c.userId === userId);
  if (found) return found;
  return {
    id: `cfg-${userId}`,
    userId,
    pinned: [],
    refreshIntervalMin: 30,
    theme: 'dark',
    updatedAt: new Date().toISOString(),
  };
}
