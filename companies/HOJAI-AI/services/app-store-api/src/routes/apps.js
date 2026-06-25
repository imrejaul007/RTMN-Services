/**
 * App Store - Routes
 */

import express from 'express';
import {
  createApp, getApp, updateApp, deleteApp, listApps,
  getFeaturedApps, getAppsByCategory, getAppsByAuthor,
  createInstall, listInstalls, deleteInstall, uninstallApp,
  createReview, listReviews, markHelpful,
  listCategories, getCategory,
  getStats,
  AppType, AppStatus
} from '../store.js';

const router = express.Router();

// ── Apps ───────────────────────────────────────────────────────────────────

// List apps
router.get('/', (req, res) => {
  try {
    const { type, category, status, featured, search, limit, offset } = req.query;
    const result = listApps({
      type,
      category,
      status,
      featured: featured !== undefined ? featured === 'true' : undefined,
      search,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Featured apps
router.get('/featured', (req, res) => {
  try {
    const apps = getFeaturedApps();
    res.json({ success: true, apps });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get app by ID
router.get('/:id', (req, res) => {
  try {
    const app = getApp(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    res.json({ success: true, app });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create app
router.post('/', (req, res) => {
  try {
    const app = createApp(req.body);
    res.status(201).json({ success: true, app });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update app
router.patch('/:id', (req, res) => {
  try {
    const app = updateApp(req.params.id, req.body);
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    res.json({ success: true, app });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete app
router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteApp(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'App not found' });
    }
    res.json({ success: true, message: 'App deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Reviews ─────────────────────────────────────────────────────────────────

// Get reviews for an app
router.get('/:id/reviews', (req, res) => {
  try {
    const reviews = listReviews(req.params.id);
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create review
router.post('/:id/reviews', (req, res) => {
  try {
    const { userId, rating, title, content } = req.body;
    if (!rating || !content) {
      return res.status(400).json({ error: 'rating and content are required' });
    }
    const review = createReview({
      appId: req.params.id,
      userId: userId || 'anonymous',
      rating,
      title: title || '',
      content
    });
    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark review as helpful
router.post('/reviews/:reviewId/helpful', (req, res) => {
  try {
    markHelpful(req.params.reviewId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Installs ────────────────────────────────────────────────────────────────

// Install an app
router.post('/:id/install', (req, res) => {
  try {
    const { userId, projectId, config } = req.body;
    if (!userId || !projectId) {
      return res.status(400).json({ error: 'userId and projectId are required' });
    }
    const install = createInstall({
      appId: req.params.id,
      userId,
      projectId,
      config
    });
    res.status(201).json({ success: true, install });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Uninstall an app
router.delete('/:id/install', (req, res) => {
  try {
    const { userId, projectId } = req.query;
    if (!userId || !projectId) {
      return res.status(400).json({ error: 'userId and projectId are required' });
    }
    const uninstalled = uninstallApp(req.params.id, userId, projectId);
    if (!uninstalled) {
      return res.status(404).json({ error: 'Install not found' });
    }
    res.json({ success: true, message: 'App uninstalled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
