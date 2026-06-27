/**
 * HOJAI SiteOS - Widget Analytics Service
 * Lightweight Heatmap and Session Recording (Port 5403)
 *
 * Tracks user interactions including clicks, scrolls, mouse movements,
 * rage clicks, and dead clicks. Stores sessions as compressed event sequences.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logger } from './logger.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// In-memory stores
const sessionsStore = new Map();
const pagesStore = new Map();
const heatmapStore = new Map();

/**
 * Event types tracked by the analytics service
 */
export const EVENT_TYPES = {
  CLICK: 'click',
  SCROLL: 'scroll',
  MOUSE_MOVE: 'mouse_move',
  RAGE_CLICK: 'rage_click',
  DEAD_CLICK: 'dead_click',
  PAGE_VIEW: 'page_view',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  FORM_INTERACTION: 'form_interaction',
  VIDEO_INTERACTION: 'video_interaction',
};

/**
 * Compress events using simple run-length encoding
 */
export function compressEvents(events) {
  if (!events || events.length === 0) return [];

  const compressed = [];
  let lastEvent = null;
  let count = 1;

  for (const event of events) {
    if (lastEvent && event.type === lastEvent.type &&
        event.x === lastEvent.x && event.y === lastEvent.y) {
      count++;
    } else {
      if (lastEvent) {
        compressed.push({ ...lastEvent, count });
      }
      lastEvent = event;
      count = 1;
    }
  }

  if (lastEvent) {
    compressed.push({ ...lastEvent, count });
  }

  return compressed;
}

/**
 * Decompress events
 */
export function decompressEvents(compressed) {
  const events = [];

  for (const item of compressed) {
    const count = item.count || 1;
    for (let i = 0; i < count; i++) {
      const { count: _, ...event } = item;
      events.push(event);
    }
  }

  return events;
}

/**
 * Detect rage clicks (rapid repeated clicks on same element)
 */
export function detectRageClicks(events) {
  const clicks = events.filter(e => e.type === EVENT_TYPES.CLICK);
  const rageClicks = [];

  for (let i = 1; i < clicks.length; i++) {
    const prev = clicks[i - 1];
    const curr = clicks[i];

    const timeDiff = curr.timestamp - prev.timestamp;
    const sameElement = prev.target === curr.target;

    // Rage click: 3+ clicks within 500ms on same element
    if (timeDiff < 500 && sameElement) {
      let cluster = [prev, curr];
      let j = i + 1;

      while (j < clicks.length) {
        const next = clicks[j];
        if (next.timestamp - cluster[cluster.length - 1].timestamp < 500 &&
            next.target === curr.target) {
          cluster.push(next);
          j++;
        } else {
          break;
        }
      }

      if (cluster.length >= 3) {
        rageClicks.push({
          target: curr.target,
          clicks: cluster.length,
          timeSpan: cluster[cluster.length - 1].timestamp - cluster[0].timestamp,
          position: { x: curr.x, y: curr.y },
        });
      }
    }
  }

  return rageClicks;
}

/**
 * Detect dead clicks (clicks on non-interactive elements)
 */
export function detectDeadClicks(events) {
  const deadClicks = events.filter(e =>
    e.type === EVENT_TYPES.DEAD_CLICK ||
    (e.type === EVENT_TYPES.CLICK && e.dead === true)
  );

  return deadClicks.map(e => ({
    target: e.target,
    position: { x: e.x, y: e.y },
    timestamp: e.timestamp,
  }));
}

/**
 * Create a new session
 */
export function createSession(visitorId, metadata = {}) {
  const session = {
    id: uuidv4(),
    visitorId,
    startedAt: Date.now(),
    endedAt: null,
    events: [],
    metadata: {
      userAgent: metadata.userAgent,
      screenWidth: metadata.screenWidth,
      screenHeight: metadata.screenHeight,
      language: metadata.language,
      referrer: metadata.referrer,
      url: metadata.url,
    },
    stats: {
      clickCount: 0,
      scrollDepth: 0,
      maxScrollY: 0,
      mouseMoveCount: 0,
      rageClicks: 0,
      deadClicks: 0,
      sessionDuration: 0,
    },
    rageClicks: [],
    deadClicks: [],
  };

  sessionsStore.set(session.id, session);
  logger.info({
    event: 'session_created',
    sessionId: session.id,
    visitorId,
  });

  return session;
}

/**
 * Add an event to a session
 */
export function addEvent(sessionId, eventData) {
  const session = sessionsStore.get(sessionId);
  if (!session) {
    logger.warn({ event: 'session_not_found', sessionId });
    return null;
  }

  const event = {
    id: uuidv4(),
    timestamp: Date.now(),
    ...eventData,
  };

  session.events.push(event);

  // Update stats
  switch (event.type) {
    case EVENT_TYPES.CLICK:
      session.stats.clickCount++;
      break;
    case EVENT_TYPES.SCROLL:
      if (event.scrollY > session.stats.maxScrollY) {
        session.stats.maxScrollY = event.scrollY;
        session.stats.scrollDepth = event.scrollPercent || 0;
      }
      break;
    case EVENT_TYPES.MOUSE_MOVE:
      session.stats.mouseMoveCount++;
      break;
    case EVENT_TYPES.RAGE_CLICK:
      session.stats.rageClicks++;
      break;
    case EVENT_TYPES.DEAD_CLICK:
      session.stats.deadClicks++;
      break;
    case EVENT_TYPES.SESSION_END:
      session.endedAt = Date.now();
      session.stats.sessionDuration = session.endedAt - session.startedAt;
      // Analyze and store rage/dead clicks
      session.rageClicks = detectRageClicks(session.events);
      session.deadClicks = detectDeadClicks(session.events);
      session.stats.rageClicks = session.rageClicks.length;
      session.stats.deadClicks = session.deadClicks.length;
      break;
  }

  return event;
}

/**
 * Get session by ID
 */
export function getSession(sessionId) {
  return sessionsStore.get(sessionId);
}

/**
 * Get all sessions for a visitor
 */
export function getVisitorSessions(visitorId, options = {}) {
  const { limit = 20, offset = 0, activeOnly = false } = options;

  let sessions = Array.from(sessionsStore.values())
    .filter(s => s.visitorId === visitorId)
    .filter(s => !activeOnly || !s.endedAt)
    .sort((a, b) => b.startedAt - a.startedAt);

  return {
    total: sessions.length,
    sessions: sessions.slice(offset, offset + limit),
  };
}

/**
 * Generate heatmap data for a page
 */
export function generateHeatmap(pageId, options = {}) {
  const { limit = 1000 } = options;

  // Collect all click events for this page
  const clickEvents = [];

  for (const session of sessionsStore.values()) {
    const pageClicks = session.events.filter(e =>
      e.pageId === pageId && (e.type === EVENT_TYPES.CLICK || e.type === EVENT_TYPES.RAGE_CLICK)
    );
    clickEvents.push(...pageClicks);
  }

  // Create heatmap grid (100x100)
  const heatmap = Array(100).fill(null).map(() => Array(100).fill(0));

  for (const event of clickEvents) {
    // Normalize coordinates to grid (assuming max 1920x1080 viewport)
    const gridX = Math.min(99, Math.floor((event.x / 1920) * 100));
    const gridY = Math.min(99, Math.floor((event.y / 1080) * 100));

    if (gridX >= 0 && gridY >= 0) {
      heatmap[gridY][gridX]++;
    }
  }

  // Find hotspots (top 10% click density)
  const allValues = heatmap.flat().filter(v => v > 0).sort((a, b) => b - a);
  const threshold = allValues[Math.floor(allValues.length * 0.1)] || 0;

  const hotspots = [];
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      if (heatmap[y][x] >= threshold && heatmap[y][x] > 0) {
        hotspots.push({
          x: Math.round((x / 100) * 1920),
          y: Math.round((y / 100) * 1080),
          clicks: heatmap[y][x],
          intensity: heatmap[y][x] / (allValues[0] || 1),
        });
      }
    }
  }

  // Sort hotspots by clicks descending
  hotspots.sort((a, b) => b.clicks - a.clicks);

  const result = {
    pageId,
    generatedAt: new Date().toISOString(),
    totalClicks: clickEvents.length,
    totalSessions: new Set(clickEvents.map(e => e.sessionId)).size,
    heatmap: heatmap.slice(0, limit),
    hotspots: hotspots.slice(0, 50),
    stats: {
      avgClicksPerSession: clickEvents.length / Math.max(1, new Set(clickEvents.map(e => e.sessionId)).size),
      rageClickRate: clickEvents.filter(e => e.type === EVENT_TYPES.RAGE_CLICK).length / Math.max(1, clickEvents.length),
    },
  };

  // Cache the heatmap
  heatmapStore.set(pageId, result);

  return result;
}

/**
 * Get cached heatmap
 */
export function getHeatmap(pageId) {
  return heatmapStore.get(pageId);
}

/**
 * Register a page for tracking
 */
export function registerPage(pageId, metadata = {}) {
  const page = pagesStore.get(pageId) || {
    id: pageId,
    createdAt: Date.now(),
    views: 0,
    uniqueVisitors: new Set(),
  };

  page.name = metadata.name || pageId;
  page.url = metadata.url || pageId;
  page.updatedAt = Date.now();

  pagesStore.set(pageId, page);
  return page;
}

/**
 * Get page analytics
 */
export function getPageAnalytics(pageId) {
  const page = pagesStore.get(pageId);
  if (!page) {
    return null;
  }

  // Count events for this page
  let views = 0;
  let clicks = 0;
  let uniqueVisitors = new Set();

  for (const session of sessionsStore.values()) {
    const pageEvents = session.events.filter(e => e.pageId === pageId);
    if (pageEvents.length > 0) {
      views++;
      uniqueVisitors.add(session.visitorId);
      clicks += pageEvents.filter(e => e.type === EVENT_TYPES.CLICK).length;
    }
  }

  return {
    pageId,
    views,
    uniqueVisitors: uniqueVisitors.size,
    clicks,
    avgClicksPerView: views > 0 ? (clicks / views).toFixed(2) : 0,
  };
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary() {
  const totalSessions = sessionsStore.size;
  const activeSessions = Array.from(sessionsStore.values()).filter(s => !s.endedAt).length;
  const totalEvents = Array.from(sessionsStore.values()).reduce((acc, s) => acc + s.events.length, 0);

  return {
    totalSessions,
    activeSessions,
    totalEvents,
    totalPages: pagesStore.size,
    totalHeatmaps: heatmapStore.size,
    avgSessionDuration: calculateAvgSessionDuration(),
  };
}

/**
 * Calculate average session duration
 */
function calculateAvgSessionDuration() {
  const completedSessions = Array.from(sessionsStore.values()).filter(s => s.endedAt);
  if (completedSessions.length === 0) return 0;

  const totalDuration = completedSessions.reduce((acc, s) => acc + s.stats.sessionDuration, 0);
  return Math.round(totalDuration / completedSessions.length);
}

// Express app setup
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' })); // Allow larger body for batch events

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  const summary = getAnalyticsSummary();
  res.json({
    status: 'healthy',
    service: 'widget-analytics',
    version: '1.0.0',
    port: 5403,
    timestamp: new Date().toISOString(),
    stats: summary,
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method });

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 5403;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget Analytics Service running on port ${port}`);
      resolve(server);
    });
  });
}

// Start if run directly
const isMainModule = process.argv[1]?.includes('index.js');
if (isMainModule) {
  startServer();
}

export { app };