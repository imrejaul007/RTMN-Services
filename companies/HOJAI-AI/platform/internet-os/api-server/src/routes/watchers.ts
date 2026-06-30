/**
 * Watcher Routes
 * HTTP endpoints for watcher operations
 */

import { Router } from 'express';
import { watcherService } from '../services/watcherService.js';

export const watcherRoutes = Router();

// List all watchers
watcherRoutes.get('/', async (_req, res) => {
  try {
    const watchers = watcherService.listWatchers();
    res.json({ watchers, count: watchers.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get watcher details
watcherRoutes.get('/:id', async (req, res) => {
  try {
    const watcher = watcherService.getWatcher(req.params.id);
    if (!watcher) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    res.json(watcher);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Create a watcher
watcherRoutes.post('/', async (req, res) => {
  try {
    const { id, name, url, type, interval, selector, transform } = req.body;

    if (!id || !url || !type) {
      return res.status(400).json({
        error: 'Missing required fields: id, url, type'
      });
    }

    const watcher = watcherService.createWatcher({
      id,
      name: name || `Watcher: ${id}`,
      url,
      type,
      interval: interval || 3600000, // 1 hour default
      selector,
      transform,
    });

    res.status(201).json(watcher);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Delete a watcher
watcherRoutes.delete('/:id', async (req, res) => {
  try {
    const deleted = watcherService.deleteWatcher(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get watcher state
watcherRoutes.get('/:id/state', async (req, res) => {
  try {
    const state = watcherService.getWatcherState(req.params.id);
    if (!state) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get watcher changes
watcherRoutes.get('/:id/changes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const changes = watcherService.getWatcherChanges(req.params.id, limit);
    res.json({ changes, count: changes.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Start a watcher
watcherRoutes.post('/:id/start', async (req, res) => {
  try {
    const started = watcherService.startWatcher(req.params.id);
    if (!started) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    res.json({ success: true, status: 'active' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Stop a watcher
watcherRoutes.post('/:id/stop', async (req, res) => {
  try {
    const stopped = watcherService.stopWatcher(req.params.id);
    if (!stopped) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    res.json({ success: true, status: 'paused' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Force check a watcher
watcherRoutes.post('/:id/check', async (req, res) => {
  try {
    const state = await watcherService.forceCheck(req.params.id);
    if (!state) {
      return res.status(404).json({ error: 'Watcher not found' });
    }
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Pause a watcher temporarily
watcherRoutes.post('/:id/pause', async (req, res) => {
  try {
    const { duration } = req.body; // duration in ms
    watcherService.pauseWatcher(req.params.id, duration);
    res.json({ success: true, status: 'paused', pauseDuration: duration });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
