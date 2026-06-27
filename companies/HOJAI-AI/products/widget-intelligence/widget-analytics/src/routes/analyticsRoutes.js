/**
 * Widget Analytics - Routes
 *
 * Endpoints:
 * - POST /api/analytics/session
 * - POST /api/analytics/session/:sessionId/event
 * - POST /api/analytics/session/:sessionId/events/batch
 * - GET /api/analytics/session/:sessionId
 * - GET /api/analytics/sessions/:visitorId
 * - GET /api/analytics/heatmap/:pageId
 * - GET /api/analytics/pages/:pageId
 * - GET /api/analytics/summary
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  createSession,
  addEvent,
  getSession,
  getVisitorSessions,
  generateHeatmap,
  getHeatmap,
  registerPage,
  getPageAnalytics,
  getAnalyticsSummary,
  compressEvents,
  EVENT_TYPES,
} from '../index.js';
import { logger } from '../logger.js';

const router = Router();

// Validation schemas
const eventSchema = z.object({
  type: z.enum([
    'click', 'scroll', 'mouse_move', 'rage_click', 'dead_click',
    'page_view', 'session_start', 'session_end',
    'form_interaction', 'video_interaction',
  ]),
  x: z.number().optional(),
  y: z.number().optional(),
  scrollY: z.number().optional(),
  scrollPercent: z.number().optional(),
  target: z.string().optional(),
  pageId: z.string().optional(),
  elementId: z.string().optional(),
  elementClass: z.string().optional(),
  url: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const sessionSchema = z.object({
  visitorId: z.string().min(1).max(255),
  userAgent: z.string().optional(),
  screenWidth: z.number().optional(),
  screenHeight: z.number().optional(),
  language: z.string().optional(),
  referrer: z.string().optional(),
  url: z.string().optional(),
});

/**
 * POST /api/analytics/session
 * Create a new analytics session
 */
router.post('/session', async (req, res, next) => {
  try {
    const validation = sessionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const session = createSession(validation.data.visitorId, validation.data);

    // Also register the page if provided
    if (validation.data.url) {
      registerPage(validation.data.url, { url: validation.data.url });
    }

    logger.info({
      event: 'session_created',
      sessionId: session.id,
      visitorId: validation.data.visitorId,
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/analytics/session/:sessionId/event
 * Add an event to a session
 */
router.post('/session/:sessionId/event', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const validation = eventSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const event = addEvent(sessionId, {
      ...validation.data,
      sessionId,
    });

    if (!event) {
      return res.status(404).json({ error: 'Session not found' });
    }

    logger.debug({
      event: 'event_added',
      sessionId,
      eventType: validation.data.type,
    });

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/analytics/session/:sessionId/events/batch
 * Add multiple events to a session
 */
router.post('/session/:sessionId/events/batch', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const batchSchema = z.object({
      events: z.array(eventSchema).min(1).max(1000),
      compress: z.boolean().optional().default(false),
    });

    const validation = batchSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { events, compress } = validation.data;
    const addedEvents = [];

    for (const eventData of events) {
      const event = addEvent(sessionId, {
        ...eventData,
        sessionId,
      });
      if (event) {
        addedEvents.push(event);
      }
    }

    // Optionally compress stored events
    if (compress) {
      const session = getSession(sessionId);
      if (session) {
        session.events = compressEvents(session.events);
      }
    }

    logger.info({
      event: 'batch_events_added',
      sessionId,
      count: addedEvents.length,
    });

    res.status(201).json({
      success: true,
      data: {
        added: addedEvents.length,
        total: addedEvents.length,
        compressed: compress,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/session/:sessionId
 * Get a session with its events
 */
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    success: true,
    data: session,
  });
});

/**
 * GET /api/analytics/sessions/:visitorId
 * Get all sessions for a visitor
 */
router.get('/sessions/:visitorId', (req, res) => {
  const { visitorId } = req.params;
  const { limit = 20, offset = 0, activeOnly } = req.query;

  const result = getVisitorSessions(visitorId, {
    limit: parseInt(limit),
    offset: parseInt(offset),
    activeOnly: activeOnly === 'true',
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/analytics/heatmap/:pageId
 * Get or generate heatmap for a page
 */
router.get('/heatmap/:pageId', (req, res) => {
  const { pageId } = req.params;
  const { regenerate } = req.query;

  // Check cache first (unless regenerating)
  if (regenerate !== 'true') {
    const cached = getHeatmap(pageId);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }
  }

  // Generate new heatmap
  const heatmap = generateHeatmap(pageId);

  logger.info({
    event: 'heatmap_generated',
    pageId,
    totalClicks: heatmap.totalClicks,
  });

  res.json({
    success: true,
    data: heatmap,
    cached: false,
  });
});

/**
 * GET /api/analytics/pages/:pageId
 * Get analytics for a specific page
 */
router.get('/pages/:pageId', (req, res) => {
  const { pageId } = req.params;

  const analytics = getPageAnalytics(pageId);
  if (!analytics) {
    return res.status(404).json({ error: 'Page not found' });
  }

  res.json({
    success: true,
    data: analytics,
  });
});

/**
 * POST /api/analytics/pages
 * Register a new page for tracking
 */
router.post('/pages', async (req, res, next) => {
  try {
    const pageSchema = z.object({
      pageId: z.string().min(1).max(255),
      name: z.string().max(255).optional(),
      url: z.string().max(500).optional(),
    });

    const validation = pageSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const page = registerPage(validation.data.pageId, validation.data);

    res.status(201).json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/summary
 * Get overall analytics summary
 */
router.get('/summary', (req, res) => {
  const summary = getAnalyticsSummary();

  res.json({
    success: true,
    data: summary,
  });
});

/**
 * GET /api/analytics/event-types
 * Get available event types
 */
router.get('/event-types', (req, res) => {
  res.json({
    success: true,
    data: {
      eventTypes: Object.entries(EVENT_TYPES).map(([key, value]) => ({
        name: key,
        value,
        description: getEventTypeDescription(value),
      })),
    },
  });
});

function getEventTypeDescription(type) {
  const descriptions = {
    click: 'User clicked on an element',
    scroll: 'User scrolled the page',
    mouse_move: 'Mouse movement detected',
    rage_click: 'Rapid repeated clicks on same element (3+ within 500ms)',
    dead_click: 'Click on non-interactive element',
    page_view: 'Page was viewed',
    session_start: 'Session started',
    session_end: 'Session ended',
    form_interaction: 'Form field interaction',
    video_interaction: 'Video player interaction',
  };
  return descriptions[type] || 'Unknown event type';
}

export default router;