import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { channelRegistry, CHANNEL_TYPES } from '../index.js';

const router = express.Router();

/**
 * GET /api/channels
 * List all channels
 */
router.get('/', async (req, res) => {
  try {
    const { type, status } = req.query;

    let channels = Array.from(channelRegistry.values());

    if (type) channels = channels.filter(c => c.type === type);
    if (status) channels = channels.filter(c => c.status === status);

    res.json({
      success: true,
      count: channels.length,
      channels
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/channels
 * Create a channel
 */
router.post('/', async (req, res) => {
  try {
    const { name, type = CHANNEL_TYPES.SOCIAL, config = {} } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Channel name is required'
      });
    }

    const channelId = `channel_${uuidv4()}`;
    const channel = {
      id: channelId,
      name,
      type,
      status: 'active',
      config,
      metrics: { impressions: 0, clicks: 0, conversions: 0 },
      createdAt: new Date().toISOString()
    };

    channelRegistry.set(channelId, channel);

    res.status(201).json({
      success: true,
      channel
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/channels/:id
 * Get channel details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const channel = channelRegistry.get(id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    res.json({
      success: true,
      channel
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/channels/:id/metrics
 * Update channel metrics
 */
router.post('/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const metrics = req.body;

    const channel = channelRegistry.get(id);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }

    channel.metrics = { ...channel.metrics, ...metrics };
    channelRegistry.set(id, channel);

    res.json({
      success: true,
      channel
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
