/**
 * Media OS - Content & Production Routes
 * Editorial Calendar, Scripts, Productions, AI Content
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware');
const { aiContentService } = require('../services');
const { EditorialCalendar, Script, Metadata, Production, CallSheet, DailyReport, ...models } = require('../models');
const { eventBus, EVENTS } = require('../services/EventBus');
const logger = require('../config/database');

// ============================================
// EDITORIAL CALENDAR ROUTES
// ============================================

// Get calendar entries
router.get('/calendar', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, status, channelId, groupBy = 'day' } = req.query;

    let entries;
    if (startDate && endDate) {
      entries = await EditorialCalendar.findByDateRange(
        new Date(startDate),
        new Date(endDate),
        status ? { 'planning.status': status } : {},
      );
    } else if (status) {
      entries = await EditorialCalendar.findByStatus(status);
    } else {
      entries = await EditorialCalendar.find()
        .populate('channel', 'name logo')
        .populate('assignedTo.userId', 'profile.displayName')
        .sort('schedule.plannedDate')
        .limit(100);
    }

    res.json({ success: true, entries, count: entries.length });
  } catch (error) {
    logger.error('Failed to fetch calendar entries', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch calendar entries' });
  }
});

// Get calendar view (grouped)
router.get('/calendar/view', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const entries = await EditorialCalendar.getCalendarView(
      new Date(startDate),
      new Date(endDate),
      groupBy,
    );

    res.json({ success: true, view: entries, groupBy });
  } catch (error) {
    logger.error('Failed to fetch calendar view', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch calendar view' });
  }
});

// Create calendar entry
router.post('/calendar', authenticate, authorize('admin', 'producer', 'editor'), async (req, res) => {
  try {
    const entry = new EditorialCalendar({
      ...req.body,
      createdBy: req.user.id,
    });

    await entry.save();

    eventBus.publish(EVENTS.CALENDAR_ENTRY_CREATED, {
      entryId: entry._id,
      title: entry.title,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, entry });
  } catch (error) {
    logger.error('Failed to create calendar entry', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create calendar entry' });
  }
});

// Update calendar entry
router.patch('/calendar/:id', authenticate, async (req, res) => {
  try {
    const entry = await EditorialCalendar.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    Object.assign(entry, req.body);
    await entry.save();

    res.json({ success: true, entry });
  } catch (error) {
    logger.error('Failed to update calendar entry', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update calendar entry' });
  }
});

// Assign user to calendar entry
router.post('/calendar/:id/assign', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.body;

    const entry = await EditorialCalendar.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    await entry.assignUser(userId, role);

    res.json({ success: true, entry });
  } catch (error) {
    logger.error('Failed to assign user', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to assign user' });
  }
});

// Submit calendar entry for approval
router.post('/calendar/:id/submit-approval', authenticate, async (req, res) => {
  try {
    const entry = await EditorialCalendar.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    await entry.submitForApproval(req.user.id);

    res.json({ success: true, entry });
  } catch (error) {
    logger.error('Failed to submit for approval', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to submit for approval' });
  }
});

// Approve calendar entry
router.post('/calendar/:id/approve', authenticate, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { comments } = req.body;

    const entry = await EditorialCalendar.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    await entry.approve(req.user.id, comments);

    res.json({ success: true, entry });
  } catch (error) {
    logger.error('Failed to approve entry', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to approve entry' });
  }
});

// Get overdue entries
router.get('/calendar/overdue', authenticate, async (req, res) => {
  try {
    const entries = await EditorialCalendar.findOverdue();
    res.json({ success: true, entries, count: entries.length });
  } catch (error) {
    logger.error('Failed to fetch overdue entries', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch overdue entries' });
  }
});

// Get my tasks
router.get('/calendar/my-tasks', authenticate, async (req, res) => {
  try {
    const entries = await EditorialCalendar.findMyTasks(req.user.id);
    res.json({ success: true, entries, count: entries.length });
  } catch (error) {
    logger.error('Failed to fetch my tasks', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch my tasks' });
  }
});

// ============================================
// SCRIPT ROUTES
// ============================================

// Get all scripts
router.get('/scripts', authenticate, async (req, res) => {
  try {
    const { status, type, writerId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (writerId) query.writer = writerId;

    const scripts = await Script.find(query)
      .populate('writer', 'profile.displayName')
      .sort('-updatedAt')
      .limit(50);

    res.json({ success: true, scripts, count: scripts.length });
  } catch (error) {
    logger.error('Failed to fetch scripts', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch scripts' });
  }
});

// Get script by ID
router.get('/scripts/:id', authenticate, async (req, res) => {
  try {
    const script = await Script.findById(req.params.id)
      .populate('writer', 'profile.displayName')
      .populate('contentId', 'title type');

    if (!script) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    res.json({ success: true, script });
  } catch (error) {
    logger.error('Failed to fetch script', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch script' });
  }
});

// Create script
router.post('/scripts', authenticate, authorize('admin', 'producer', 'writer'), async (req, res) => {
  try {
    const script = new Script({
      ...req.body,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id,
    });

    await script.save();

    res.status(201).json({ success: true, script });
  } catch (error) {
    logger.error('Failed to create script', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create script' });
  }
});

// Update script
router.patch('/scripts/:id', authenticate, async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    if (script.lockStatus === 'locked') {
      return res.status(403).json({ success: false, error: 'Script is locked' });
    }

    Object.assign(script, req.body);
    script.lastModifiedBy = req.user.id;
    await script.save();

    res.json({ success: true, script });
  } catch (error) {
    logger.error('Failed to update script', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update script' });
  }
});

// Create new version
router.post('/scripts/:id/version', authenticate, async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    const version = await script.createVersion(req.user.id, req.body);

    res.json({ success: true, version, currentVersion: script.currentVersion });
  } catch (error) {
    logger.error('Failed to create version', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create version' });
  }
});

// Add scene
router.post('/scripts/:id/scenes', authenticate, async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    const sceneNumber = script.scenes.length + 1;
    script.scenes.push({ ...req.body, sceneNumber });
    script.lastModifiedBy = req.user.id;
    await script.save();

    res.json({ success: true, scene: script.scenes[script.scenes.length - 1] });
  } catch (error) {
    logger.error('Failed to add scene', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add scene' });
  }
});

// Lock/unlock script
router.post('/scripts/:id/lock', authenticate, async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }

    await script.lock(req.user.id);

    res.json({ success: true, script });
  } catch (error) {
    logger.error('Failed to lock script', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to lock script' });
  }
});

// ============================================
// PRODUCTION ROUTES
// ============================================

// Get all productions
router.get('/productions', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) query.status = status;

    const productions = await Production.find(query)
      .populate('director', 'name')
      .populate('producer', 'name')
      .sort('-createdAt')
      .limit(50);

    res.json({ success: true, productions, count: productions.length });
  } catch (error) {
    logger.error('Failed to fetch productions', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch productions' });
  }
});

// Get production by ID
router.get('/productions/:id', authenticate, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id)
      .populate('director', 'name email')
      .populate('producer', 'name email')
      .populate('crew.userId', 'name role')
      .populate('cast.userId', 'name');

    if (!production) {
      return res.status(404).json({ success: false, error: 'Production not found' });
    }

    res.json({ success: true, production });
  } catch (error) {
    logger.error('Failed to fetch production', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch production' });
  }
});

// Create production
router.post('/productions', authenticate, authorize('admin', 'producer'), async (req, res) => {
  try {
    const production = new Production({
      ...req.body,
      createdBy: req.user.id,
    });

    await production.save();

    eventBus.publish(EVENTS.PRODUCTION_CREATED, {
      productionId: production._id,
      title: production.title,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, production });
  } catch (error) {
    logger.error('Failed to create production', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create production' });
  }
});

// Update production
router.patch('/productions/:id', authenticate, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);
    if (!production) {
      return res.status(404).json({ success: false, error: 'Production not found' });
    }

    Object.assign(production, req.body);
    await production.save();

    res.json({ success: true, production });
  } catch (error) {
    logger.error('Failed to update production', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update production' });
  }
});

// Add daily report
router.post('/productions/:id/daily-report', authenticate, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);
    if (!production) {
      return res.status(404).json({ success: false, error: 'Production not found' });
    }

    const report = await production.addDailyReport({
      ...req.body,
      createdBy: req.user.id,
    });

    await production.calculateProgress();

    res.json({ success: true, report, progress: production.progress });
  } catch (error) {
    logger.error('Failed to add daily report', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add daily report' });
  }
});

// Get production stats
router.get('/productions/stats/summary', authenticate, async (req, res) => {
  try {
    const stats = await Production.getStats();
    const active = await Production.findActive();

    res.json({
      success: true,
      stats,
      activeProductions: active.length,
    });
  } catch (error) {
    logger.error('Failed to fetch production stats', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch production stats' });
  }
});

// ============================================
// METADATA ROUTES
// ============================================

// Get metadata for content
router.get('/metadata/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    let metadata = await Metadata.findByEntity(entityType, entityId);

    if (!metadata) {
      // Create default metadata
      metadata = new Metadata({
        entityType,
        entityId,
        createdBy: req.user.id,
      });
      await metadata.save();
    }

    res.json({ success: true, metadata });
  } catch (error) {
    logger.error('Failed to fetch metadata', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch metadata' });
  }
});

// Update metadata
router.patch('/metadata/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    let metadata = await Metadata.findByEntity(entityType, entityId);

    if (!metadata) {
      metadata = new Metadata({
        entityType,
        entityId,
        createdBy: req.user.id,
      });
    }

    const { field, value } = req.body;
    if (field) {
      await metadata.updateField(field, value, req.user.id);
    } else {
      Object.assign(metadata, req.body);
      metadata.lastModifiedBy = req.user.id;
      await metadata.save();
    }

    res.json({ success: true, metadata });
  } catch (error) {
    logger.error('Failed to update metadata', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update metadata' });
  }
});

module.exports = router;
