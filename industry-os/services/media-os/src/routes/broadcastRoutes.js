/**
 * Media OS - Broadcasting & Streaming Routes
 * Program Grid, EPG, Streaming, Profiles
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware');
const { ProgramGrid, EPGEntry, Stream, ViewerProfile, ...models } = require('../models');
const { rtmnService } = require('../services');
const logger = require('../config/database');

// ============================================
// PROGRAM GRID ROUTES
// ============================================

// Get grid for channel and date
router.get('/grid/:channelId/:date', optionalAuth, async (req, res) => {
  try {
    const { channelId, date } = req.params;
    const grid = await ProgramGrid.findByChannelAndDate(channelId, new Date(date));

    if (!grid) {
      // Generate grid from EPG
      const epgEntries = await EPGEntry.find({
        channelId,
        startTime: { $gte: new Date(date) },
        endTime: { $lte: new Date(new Date(date).setHours(23, 59, 59)) },
      }).populate('channelId', 'name logo');

      if (epgEntries.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No grid found for this date',
        });
      }

      return res.json({
        success: true,
        grid: null,
        epgEntries,
        generated: true,
      });
    }

    res.json({ success: true, grid });
  } catch (error) {
    logger.error('Failed to fetch grid', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch grid' });
  }
});

// Get grids for date range
router.get('/grids', authenticate, async (req, res) => {
  try {
    const { channelId, startDate, endDate } = req.query;

    const grids = await ProgramGrid.findByDateRange(
      channelId,
      new Date(startDate),
      new Date(endDate)
    ).populate('channelId', 'name logo');

    res.json({ success: true, grids, count: grids.length });
  } catch (error) {
    logger.error('Failed to fetch grids', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch grids' });
  }
});

// Create/update grid
router.post('/grid', authenticate, authorize('admin', 'producer'), async (req, res) => {
  try {
    const { channelId, date, slots } = req.body;

    let grid = await ProgramGrid.findOne({
      channelId,
      date: new Date(date),
    });

    if (grid) {
      if (grid.locked) {
        return res.status(403).json({
          success: false,
          error: 'Grid is locked',
        });
      }
      grid.slots = slots;
    } else {
      grid = new ProgramGrid({
        channelId,
        date: new Date(date),
        slots,
      });
    }

    // Auto-fill ad breaks
    grid.autoFillAdBreaks(Math.floor(grid.summary.totalDuration / 60));

    // Check compliance
    grid.checkCompliance();

    await grid.save();

    res.json({ success: true, grid });
  } catch (error) {
    logger.error('Failed to create grid', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add slot to grid
router.post('/grid/:id/slots', authenticate, authorize('admin', 'producer'), async (req, res) => {
  try {
    const grid = await ProgramGrid.findById(req.params.id);
    if (!grid) {
      return res.status(404).json({ success: false, error: 'Grid not found' });
    }

    if (grid.locked) {
      return res.status(403).json({ success: false, error: 'Grid is locked' });
    }

    try {
      grid.addSlot(req.body);
      await grid.save();
      res.json({ success: true, grid });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  } catch (error) {
    logger.error('Failed to add slot', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add slot' });
  }
});

// Lock/unlock grid
router.post('/grid/:id/lock', authenticate, authorize('admin'), async (req, res) => {
  try {
    const grid = await ProgramGrid.findById(req.params.id);
    if (!grid) {
      return res.status(404).json({ success: false, error: 'Grid not found' });
    }

    grid.lock(req.user.id);
    await grid.save();

    res.json({ success: true, grid });
  } catch (error) {
    logger.error('Failed to lock grid', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to lock grid' });
  }
});

// Approve grid
router.post('/grid/:id/approve', authenticate, authorize('admin', 'editor'), async (req, res) => {
  try {
    const grid = await ProgramGrid.findById(req.params.id);
    if (!grid) {
      return res.status(404).json({ success: false, error: 'Grid not found' });
    }

    grid.approve(req.user.id);
    await grid.save();

    res.json({ success: true, grid });
  } catch (error) {
    logger.error('Failed to approve grid', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to approve grid' });
  }
});

// Publish grid
router.post('/grid/:id/publish', authenticate, authorize('admin'), async (req, res) => {
  try {
    const grid = await ProgramGrid.findById(req.params.id);
    if (!grid) {
      return res.status(404).json({ success: false, error: 'Grid not found' });
    }

    const published = grid.publish();
    if (!published) {
      return res.status(400).json({
        success: false,
        error: 'Grid must be approved and locked before publishing',
      });
    }

    await grid.save();

    // Generate EPG entries from grid
    const epgEntries = grid.slots.map(slot => ({
      channelId: grid.channelId,
      contentId: slot.contentId,
      gridSlotId: slot._id,
      startTime: new Date(`${grid.date.toISOString().split('T')[0]}T${slot.startTime}:00`),
      endTime: new Date(`${grid.date.toISOString().split('T')[0]}T${slot.endTime}:00`),
      title: slot.title,
      description: slot.description,
      thumbnail: slot.thumbnail,
      type: slot.type,
      isAdBreak: slot.type === 'ad',
      adSlots: slot.adBreak?.slots || 0,
    }));

    await EPGEntry.insertMany(epgEntries);

    res.json({ success: true, grid, epgEntriesGenerated: epgEntries.length });
  } catch (error) {
    logger.error('Failed to publish grid', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to publish grid' });
  }
});

// ============================================
// EPG ROUTES
// ============================================

// Get EPG for date
router.get('/epg', optionalAuth, async (req, res) => {
  try {
    const { date, channelId, region } = req.query;

    const epg = await EPGEntry.generateEPG(new Date(date), {
      channelIds: channelId ? [channelId] : undefined,
      region,
    });

    res.json({ success: true, epg, date });
  } catch (error) {
    logger.error('Failed to fetch EPG', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch EPG' });
  }
});

// Get what's playing now
router.get('/epg/now', optionalAuth, async (req, res) => {
  try {
    const { channelId } = req.query;
    const now = new Date();

    const query = {
      startTime: { $lte: now },
      endTime: { $gte: now },
      status: { $ne: 'cancelled' },
    };

    if (channelId) {
      query.channelId = channelId;
    }

    const currentlyPlaying = await EPGEntry.find(query)
      .populate('channelId', 'name logo type number')
      .sort({ 'channelId.number': 1 });

    res.json({ success: true, currentlyPlaying });
  } catch (error) {
    logger.error('Failed to fetch now playing', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch now playing' });
  }
});

// Get upcoming on channel
router.get('/epg/upcoming/:channelId', optionalAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const upcoming = await EPGEntry.findUpcoming(req.params.channelId, parseInt(limit));
    res.json({ success: true, upcoming });
  } catch (error) {
    logger.error('Failed to fetch upcoming', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch upcoming' });
  }
});

// Search EPG
router.get('/epg/search', optionalAuth, async (req, res) => {
  try {
    const { q, genre, channelId, type } = req.query;

    const results = await EPGEntry.search(q, {
      genre,
      channelId,
      type,
    });

    res.json({ success: true, results, count: results.length });
  } catch (error) {
    logger.error('Failed to search EPG', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to search EPG' });
  }
});

// ============================================
// STREAMING ROUTES
// ============================================

// Get stream for content
router.get('/stream/:contentId', optionalAuth, async (req, res) => {
  try {
    const stream = await Stream.findOne({
      contentId: req.params.contentId,
      status: 'ready',
    }).populate('contentId', 'title thumbnail type');

    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not available',
      });
    }

    res.json({ success: true, stream });
  } catch (error) {
    logger.error('Failed to fetch stream', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch stream' });
  }
});

// Get live streams
router.get('/stream/live/all', optionalAuth, async (req, res) => {
  try {
    const liveStreams = await Stream.findLiveStreams();
    res.json({ success: true, liveStreams, count: liveStreams.length });
  } catch (error) {
    logger.error('Failed to fetch live streams', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch live streams' });
  }
});

// Get streaming manifest
router.get('/stream/:contentId/manifest', optionalAuth, async (req, res) => {
  try {
    const { type = 'hls' } = req.query;

    const stream = await Stream.findOne({
      contentId: req.params.contentId,
      status: 'ready',
    });

    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not available',
      });
    }

    // Return manifest URL or generate inline manifest
    const manifest = stream.manifests?.[type];

    if (manifest?.url) {
      return res.json({
        success: true,
        manifest: manifest.url,
        type,
      });
    }

    // Generate inline manifest
    const m3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:1
${stream.variants.map((v, i) => `#EXT-X-STREAM-INF:BANDWIDTH=${v.bitrate * 1000},RESOLUTION=${v.resolution}
${v.url || `/stream/${stream._id}/variant/${i}`}`).join('\n')}`;

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u8);
  } catch (error) {
    logger.error('Failed to fetch manifest', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch manifest' });
  }
});

// Record stream view
router.post('/stream/:contentId/view', authenticate, async (req, res) => {
  try {
    const { watchDuration } = req.body;

    const stream = await Stream.findOne({ contentId: req.params.contentId });
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    await stream.recordView(req.user.id, watchDuration);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to record view', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to record view' });
  }
});

// ============================================
// VIEWER PROFILE ROUTES
// ============================================

// Get profiles for viewer
router.get('/profiles', authenticate, async (req, res) => {
  try {
    const profiles = await ViewerProfile.findByViewer(req.user.id);
    res.json({ success: true, profiles });
  } catch (error) {
    logger.error('Failed to fetch profiles', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch profiles' });
  }
});

// Create profile
router.post('/profiles', authenticate, async (req, res) => {
  try {
    const { name, type, avatar } = req.body;

    // Check max profiles per account (usually 5)
    const existingCount = await ViewerProfile.countDocuments({ viewerId: req.user.id });
    if (existingCount >= 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum profiles reached',
      });
    }

    const profile = new ViewerProfile({
      viewerId: req.user.id,
      name,
      type: type || 'adult',
      avatar,
    });

    await profile.save();

    res.status(201).json({ success: true, profile });
  } catch (error) {
    logger.error('Failed to create profile', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create profile' });
  }
});

// Update profile
router.patch('/profiles/:id', authenticate, async (req, res) => {
  try {
    const profile = await ViewerProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (profile.viewerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    Object.assign(profile, req.body);
    await profile.save();

    res.json({ success: true, profile });
  } catch (error) {
    logger.error('Failed to update profile', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Set PIN
router.post('/profiles/:id/pin', authenticate, async (req, res) => {
  try {
    const { pin } = req.body;
    const profile = await ViewerProfile.findById(req.params.id);

    if (!profile || profile.viewerId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    await profile.setPin(pin);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to set PIN', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to set PIN' });
  }
});

// Verify PIN
router.post('/profiles/:id/verify-pin', authenticate, async (req, res) => {
  try {
    const { pin } = req.body;
    const profile = await ViewerProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const valid = await profile.verifyPin(pin);

    res.json({ success: true, valid });
  } catch (error) {
    logger.error('Failed to verify PIN', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to verify PIN' });
  }
});

// Enable kids mode
router.post('/profiles/:id/kids-mode', authenticate, async (req, res) => {
  try {
    const { ageGroup } = req.body;
    const profile = await ViewerProfile.findById(req.params.id);

    if (!profile || profile.viewerId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    await profile.enableKidsMode(ageGroup);

    res.json({ success: true, profile });
  } catch (error) {
    logger.error('Failed to enable kids mode', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to enable kids mode' });
  }
});

// Check content access
router.post('/profiles/:id/check-access', authenticate, async (req, res) => {
  try {
    const { contentId } = req.body;
    const profile = await ViewerProfile.findById(req.params.id);

    if (!profile || profile.viewerId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const content = await models.Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    const access = profile.checkContentAccess(content);

    res.json({ success: true, access });
  } catch (error) {
    logger.error('Failed to check access', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to check access' });
  }
});

// Record watch time
router.post('/profiles/:id/watch-time', authenticate, async (req, res) => {
  try {
    const { minutes } = req.body;
    const profile = await ViewerProfile.findById(req.params.id);

    if (!profile || profile.viewerId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    await profile.recordWatchTime(minutes);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to record watch time', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to record watch time' });
  }
});

module.exports = router;
