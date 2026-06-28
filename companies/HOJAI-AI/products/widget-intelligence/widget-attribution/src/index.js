/**
 * HOJAI SiteOS - Widget Attribution Service
 * Attribution Widget: Multi-touch Attribution Models (Port 5409)
 *
 * Features:
 * - Multi-touch attribution
 * - Models: first-touch, last-touch, linear, time-decay, position-based
 * - POST /api/attribution/track, GET /api/attribution/journey/:visitorId, GET /api/attribution/report
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pino from 'pino';

// Logger setup
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Express app setup
const app = express();

// In-memory stores
const touchpointsStore = new Map();
const conversionsStore = new Map();
const journeysStore = new Map();
const reportsStore = new Map();

// Attribution models
export const ATTRIBUTION_MODELS = {
  FIRST_TOUCH: 'first_touch',
  LAST_TOUCH: 'last_touch',
  LINEAR: 'linear',
  TIME_DECAY: 'time_decay',
  POSITION_BASED: 'position_based',
};

// Channel types
export const CHANNELS = {
  ORGANIC_SEARCH: 'organic_search',
  PAID_SEARCH: 'paid_search',
  SOCIAL_MEDIA: 'social_media',
  EMAIL: 'email',
  DIRECT: 'direct',
  REFERRAL: 'referral',
  DISPLAY: 'display',
  VIDEO: 'video',
  AFFILIATE: 'affiliate',
  OTHER: 'other',
};

// ─────────────────────────────────────────────────────────────────────────────
// Touchpoint Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a touchpoint
 */
export function createTouchpoint(touchpointData) {
  const touchpoint = {
    id: uuidv4(),
    visitorId: touchpointData.visitorId,
    channel: touchpointData.channel,
    source: touchpointData.source,
    medium: touchpointData.medium,
    campaign: touchpointData.campaign,
    content: touchpointData.content,
    keyword: touchpointData.keyword,
    landingPage: touchpointData.landingPage,
    referrer: touchpointData.referrer,
    device: touchpointData.device || 'desktop',
    location: touchpointData.location,
    timestamp: touchpointData.timestamp || Date.now(),
    metadata: touchpointData.metadata || {},
  };

  touchpointsStore.set(touchpoint.id, touchpoint);

  // Update journey
  updateVisitorJourney(touchpoint.visitorId, touchpoint.id);

  logger.info({
    event: 'touchpoint_created',
    touchpointId: touchpoint.id,
    visitorId: touchpoint.visitorId,
    channel: touchpoint.channel
  });

  return touchpoint;
}

/**
 * Get touchpoint by ID
 */
export function getTouchpoint(touchpointId) {
  return touchpointsStore.get(touchpointId);
}

/**
 * Get touchpoints for visitor
 */
export function getVisitorTouchpoints(visitorId) {
  return Array.from(touchpointsStore.values())
    .filter(t => t.visitorId === visitorId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Delete touchpoint
 */
export function deleteTouchpoint(touchpointId) {
  const touchpoint = touchpointsStore.get(touchpointId);
  if (touchpoint) {
    touchpointsStore.delete(touchpointId);
    logger.info({ event: 'touchpoint_deleted', touchpointId });
  }
  return !!touchpoint;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a conversion
 */
export function createConversion(conversionData) {
  const conversion = {
    id: uuidv4(),
    visitorId: conversionData.visitorId,
    type: conversionData.type || 'purchase',
    value: conversionData.value || 0,
    orderId: conversionData.orderId,
    revenue: conversionData.revenue || 0,
    touchpoints: conversionData.touchpoints || [],
    timestamp: conversionData.timestamp || Date.now(),
    metadata: conversionData.metadata || {},
  };

  conversionsStore.set(conversion.id, conversion);

  // Calculate attribution for this conversion
  const attribution = calculateAttribution(conversion.visitorId, conversionData.model);

  logger.info({
    event: 'conversion_created',
    conversionId: conversion.id,
    visitorId: conversion.visitorId,
    value: conversion.value
  });

  return { conversion, attribution };
}

/**
 * Get conversion by ID
 */
export function getConversion(conversionId) {
  return conversionsStore.get(conversionId);
}

/**
 * Get conversions for visitor
 */
export function getVisitorConversions(visitorId) {
  return Array.from(conversionsStore.values())
    .filter(c => c.visitorId === visitorId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// ─────────────────────────────────────────────────────────────────────────────
// Journey Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update visitor journey
 */
function updateVisitorJourney(visitorId, touchpointId) {
  let journey = journeysStore.get(visitorId);

  if (!journey) {
    journey = {
      visitorId,
      touchpoints: [],
      conversions: [],
      firstTouch: null,
      lastTouch: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    journeysStore.set(visitorId, journey);
  }

  const touchpoint = touchpointsStore.get(touchpointId);
  if (touchpoint && !journey.touchpoints.includes(touchpointId)) {
    journey.touchpoints.push(touchpointId);

    if (!journey.firstTouch) {
      journey.firstTouch = touchpointId;
    }
    journey.lastTouch = touchpointId;
  }

  journey.updatedAt = Date.now();
}

/**
 * Get visitor journey
 */
export function getVisitorJourney(visitorId) {
  const journey = journeysStore.get(visitorId);
  if (!journey) return null;

  const touchpoints = journey.touchpoints
    .map(id => touchpointsStore.get(id))
    .filter(Boolean)
    .map(t => ({
      id: t.id,
      channel: t.channel,
      source: t.source,
      medium: t.medium,
      campaign: t.campaign,
      timestamp: t.timestamp,
    }));

  const conversions = journey.conversions
    .map(id => conversionsStore.get(id))
    .filter(Boolean)
    .map(c => ({
      id: c.id,
      type: c.type,
      value: c.value,
      revenue: c.revenue,
      timestamp: c.timestamp,
    }));

  return {
    visitorId,
    touchpoints,
    conversions,
    firstTouch: touchpoints[0] || null,
    lastTouch: touchpoints[touchpoints.length - 1] || null,
    touchpointCount: touchpoints.length,
    createdAt: journey.createdAt,
    updatedAt: journey.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Attribution Models
// ─────────────────────────────────────────────────────────────────────────────

/**
 * First-touch attribution
 * 100% credit to first touchpoint
 */
function firstTouchAttribution(touchpoints, conversionValue = 0) {
  if (touchpoints.length === 0) return [];

  const attribution = new Map();
  const first = touchpoints[0];

  attribution.set(first.id, {
    touchpointId: first.id,
    channel: first.channel,
    credit: conversionValue || 100,
    percentage: 100,
  });

  return [{ ...attribution.get(first.id) }];
}

/**
 * Last-touch attribution
 * 100% credit to last touchpoint
 */
function lastTouchAttribution(touchpoints, conversionValue = 0) {
  if (touchpoints.length === 0) return [];

  const attribution = new Map();
  const last = touchpoints[touchpoints.length - 1];

  attribution.set(last.id, {
    touchpointId: last.id,
    channel: last.channel,
    credit: conversionValue || 100,
    percentage: 100,
  });

  return [{ ...attribution.get(last.id) }];
}

/**
 * Linear attribution
 * Equal credit to all touchpoints
 */
function linearAttribution(touchpoints, conversionValue = 0) {
  if (touchpoints.length === 0) return [];

  const credit = (conversionValue || 100) / touchpoints.length;
  const attribution = [];

  for (const touchpoint of touchpoints) {
    attribution.push({
      touchpointId: touchpoint.id,
      channel: touchpoint.channel,
      credit: credit,
      percentage: (1 / touchpoints.length) * 100,
    });
  }

  return attribution;
}

/**
 * Time-decay attribution
 * More credit to recent touchpoints (half-life based)
 */
function timeDecayAttribution(touchpoints, conversionTime, conversionValue = 0, halfLifeHours = 24) {
  if (touchpoints.length === 0) return [];

  const attribution = new Map();
  const halfLifeMs = halfLifeHours * 60 * 60 * 1000;

  let totalWeight = 0;
  for (const touchpoint of touchpoints) {
    const timeDiff = conversionTime - touchpoint.timestamp;
    const weight = Math.pow(0.5, timeDiff / halfLifeMs);
    totalWeight += weight;
    attribution.set(touchpoint.id, weight);
  }

  const result = [];
  for (const touchpoint of touchpoints) {
    const weight = attribution.get(touchpoint.id);
    const percentage = (weight / totalWeight) * 100;
    const credit = ((conversionValue || 100) * percentage) / 100;

    result.push({
      touchpointId: touchpoint.id,
      channel: touchpoint.channel,
      credit: credit,
      percentage: percentage,
    });
  }

  return result;
}

/**
 * Position-based (U-shaped) attribution
 * 40% to first, 40% to last, remaining distributed among middle
 */
function positionBasedAttribution(touchpoints, conversionValue = 0) {
  if (touchpoints.length === 0) return [];
  if (touchpoints.length === 1) {
    return [{
      touchpointId: touchpoints[0].id,
      channel: touchpoints[0].channel,
      credit: conversionValue || 100,
      percentage: 100,
    }];
  }
  if (touchpoints.length === 2) {
    const half = (conversionValue || 100) / 2;
    return [
      {
        touchpointId: touchpoints[0].id,
        channel: touchpoints[0].channel,
        credit: half,
        percentage: 50,
      },
      {
        touchpointId: touchpoints[1].id,
        channel: touchpoints[1].channel,
        credit: half,
        percentage: 50,
      },
    ];
  }

  const firstLastCredit = (conversionValue || 100) * 0.4;
  const middleCredit = (conversionValue || 100) - (firstLastCredit * 2);
  const middleCount = touchpoints.length - 2;
  const middlePerTouch = middleCredit / middleCount;

  const attribution = [];
  attribution.push({
    touchpointId: touchpoints[0].id,
    channel: touchpoints[0].channel,
    credit: firstLastCredit,
    percentage: 40,
  });

  for (let i = 1; i < touchpoints.length - 1; i++) {
    attribution.push({
      touchpointId: touchpoints[i].id,
      channel: touchpoints[i].channel,
      credit: middlePerTouch,
      percentage: (middlePerTouch / (conversionValue || 100)) * 100,
    });
  }

  attribution.push({
    touchpointId: touchpoints[touchpoints.length - 1].id,
    channel: touchpoints[touchpoints.length - 1].channel,
    credit: firstLastCredit,
    percentage: 40,
  });

  return attribution;
}

/**
 * Calculate attribution for a visitor
 */
export function calculateAttribution(visitorId, model = ATTRIBUTION_MODELS.LINEAR) {
  const touchpoints = getVisitorTouchpoints(visitorId);
  const conversions = getVisitorConversions(visitorId);

  if (touchpoints.length === 0) {
    return { model, touchpoints: [], totalValue: 0, attribution: [] };
  }

  const latestConversion = conversions[conversions.length - 1];
  const conversionTime = latestConversion?.timestamp || Date.now();
  const conversionValue = latestConversion?.value || 0;

  let attribution;
  switch (model) {
    case ATTRIBUTION_MODELS.FIRST_TOUCH:
      attribution = firstTouchAttribution(touchpoints, conversionValue);
      break;
    case ATTRIBUTION_MODELS.LAST_TOUCH:
      attribution = lastTouchAttribution(touchpoints, conversionValue);
      break;
    case ATTRIBUTION_MODELS.LINEAR:
      attribution = linearAttribution(touchpoints, conversionValue);
      break;
    case ATTRIBUTION_MODELS.TIME_DECAY:
      attribution = timeDecayAttribution(touchpoints, conversionTime, conversionValue);
      break;
    case ATTRIBUTION_MODELS.POSITION_BASED:
      attribution = positionBasedAttribution(touchpoints, conversionValue);
      break;
    default:
      attribution = linearAttribution(touchpoints, conversionValue);
  }

  return {
    model,
    visitorId,
    touchpointCount: touchpoints.length,
    conversionValue,
    totalValue: attribution.reduce((sum, a) => sum + a.credit, 0),
    attribution,
    calculatedAt: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate attribution report
 */
export function generateReport(options = {}) {
  const {
    model = ATTRIBUTION_MODELS.LINEAR,
    startDate,
    endDate,
    channel,
    limit = 100,
  } = options;

  const reportId = uuidv4();

  let conversions = Array.from(conversionsStore.values());
  let touchpoints = Array.from(touchpointsStore.values());

  // Filter by date
  if (startDate) {
    const start = new Date(startDate).getTime();
    conversions = conversions.filter(c => c.timestamp >= start);
    touchpoints = touchpoints.filter(t => t.timestamp >= start);
  }
  if (endDate) {
    const end = new Date(endDate).getTime();
    conversions = conversions.filter(c => c.timestamp <= end);
    touchpoints = touchpoints.filter(t => t.timestamp <= end);
  }
  if (channel) {
    touchpoints = touchpoints.filter(t => t.channel === channel);
  }

  // Calculate attribution by channel
  const channelAttribution = {};
  const visitorAttribution = {};

  // Process each visitor's journey
  const visitors = [...new Set(touchpoints.map(t => t.visitorId))];
  for (const visitorId of visitors) {
    const visitorTouchpoints = touchpoints.filter(t => t.visitorId === visitorId);
    const visitorConversions = conversions.filter(c => c.visitorId === visitorId);

    if (visitorTouchpoints.length === 0) continue;

    const conversionTime = visitorConversions[visitorConversions.length - 1]?.timestamp || Date.now();
    const conversionValue = visitorConversions[visitorConversions.length - 1]?.value || 0;

    let attribution;
    switch (model) {
      case ATTRIBUTION_MODELS.FIRST_TOUCH:
        attribution = firstTouchAttribution(visitorTouchpoints, conversionValue);
        break;
      case ATTRIBUTION_MODELS.LAST_TOUCH:
        attribution = lastTouchAttribution(visitorTouchpoints, conversionValue);
        break;
      case ATTRIBUTION_MODELS.LINEAR:
        attribution = linearAttribution(visitorTouchpoints, conversionValue);
        break;
      case ATTRIBUTION_MODELS.TIME_DECAY:
        attribution = timeDecayAttribution(visitorTouchpoints, conversionTime, conversionValue);
        break;
      case ATTRIBUTION_MODELS.POSITION_BASED:
        attribution = positionBasedAttribution(visitorTouchpoints, conversionValue);
        break;
      default:
        attribution = linearAttribution(visitorTouchpoints, conversionValue);
    }

    // Aggregate by channel
    for (const a of attribution) {
      if (!channelAttribution[a.channel]) {
        channelAttribution[a.channel] = { credit: 0, count: 0 };
      }
      channelAttribution[a.channel].credit += a.credit;
      channelAttribution[a.channel].count++;
    }

    // Store visitor attribution
    visitorAttribution[visitorId] = attribution;
  }

  // Calculate percentages
  const totalCredit = Object.values(channelAttribution).reduce((sum, c) => sum + c.credit, 0);
  const channelBreakdown = Object.entries(channelAttribution)
    .map(([channel, data]) => ({
      channel,
      credit: data.credit,
      count: data.count,
      percentage: totalCredit > 0 ? (data.credit / totalCredit) * 100 : 0,
    }))
    .sort((a, b) => b.credit - a.credit);

  const report = {
    id: reportId,
    model,
    generatedAt: Date.now(),
    dateRange: { startDate, endDate },
    filters: { channel },
    summary: {
      totalConversions: conversions.length,
      totalTouchpoints: touchpoints.length,
      totalVisitors: visitors.length,
      totalValue: totalCredit,
    },
    channelBreakdown,
    visitorCount: visitors.length,
    conversions: conversions.slice(0, limit),
  };

  reportsStore.set(reportId, report);

  logger.info({
    event: 'report_generated',
    reportId,
    model,
    totalConversions: conversions.length,
  });

  return report;
}

/**
 * Get report by ID
 */
export function getReport(reportId) {
  return reportsStore.get(reportId);
}

/**
 * Compare attribution models
 */
export function compareModels(visitorId) {
  const touchpoints = getVisitorTouchpoints(visitorId);
  const conversions = getVisitorConversions(visitorId);

  if (touchpoints.length === 0) {
    return { visitorId, error: 'No touchpoints found' };
  }

  const conversionTime = conversions[conversions.length - 1]?.timestamp || Date.now();
  const conversionValue = conversions[conversions.length - 1]?.value || 0;

  const comparison = {
    visitorId,
    touchpointCount: touchpoints.length,
    conversionValue,
    models: {
      first_touch: firstTouchAttribution(touchpoints, conversionValue),
      last_touch: lastTouchAttribution(touchpoints, conversionValue),
      linear: linearAttribution(touchpoints, conversionValue),
      time_decay: timeDecayAttribution(touchpoints, conversionTime, conversionValue),
      position_based: positionBasedAttribution(touchpoints, conversionValue),
    },
  };

  return comparison;
}

// ─────────────────────────────────────────────────────────────────────────────
// Express Routes
// ─────────────────────────────────────────────────────────────────────────────

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json());

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
  res.json({
    status: 'healthy',
    service: 'widget-attribution',
    version: '1.0.0',
    port: process.env.PORT || 5409,
    timestamp: new Date().toISOString(),
    stats: {
      touchpoints: touchpointsStore.size,
      conversions: conversionsStore.size,
      journeys: journeysStore.size,
      reports: reportsStore.size,
    },
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Touchpoint Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track touchpoint
 * POST /api/attribution/track
 */
app.post('/api/attribution/track',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      visitorId: z.string().min(1),
      channel: z.string().min(1),
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      content: z.string().optional(),
      keyword: z.string().optional(),
      landingPage: z.string().optional(),
      referrer: z.string().optional(),
      device: z.string().optional(),
      location: z.string().optional(),
      timestamp: z.number().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const touchpoint = createTouchpoint(schema.parse(req.body));
    res.status(201).json({ success: true, touchpoint });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get touchpoint
 * GET /api/attribution/touchpoint/:touchpointId
 */
app.get('/api/attribution/touchpoint/:touchpointId', (req, res) => {
  const touchpoint = getTouchpoint(req.params.touchpointId);
  if (!touchpoint) {
    return res.status(404).json({ error: 'Touchpoint not found' });
  }
  res.json({ success: true, touchpoint });
});

/**
 * Delete touchpoint
 * DELETE /api/attribution/touchpoint/:touchpointId
 */
app.delete('/api/attribution/touchpoint/:touchpointId',requireAuth,  (req, res) => {
  const deleted = deleteTouchpoint(req.params.touchpointId);
  if (!deleted) {
    return res.status(404).json({ error: 'Touchpoint not found' });
  }
  res.json({ success: true, message: 'Touchpoint deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track conversion
 * POST /api/attribution/conversion
 */
app.post('/api/attribution/conversion',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      visitorId: z.string().min(1),
      type: z.string().optional(),
      value: z.number().optional(),
      orderId: z.string().optional(),
      revenue: z.number().optional(),
      touchpoints: z.array(z.string()).optional(),
      timestamp: z.number().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const { conversion, attribution } = createConversion(schema.parse(req.body));
    res.status(201).json({ success: true, conversion, attribution });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get conversion
 * GET /api/attribution/conversion/:conversionId
 */
app.get('/api/attribution/conversion/:conversionId', (req, res) => {
  const conversion = getConversion(req.params.conversionId);
  if (!conversion) {
    return res.status(404).json({ error: 'Conversion not found' });
  }
  res.json({ success: true, conversion });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get visitor journey
 * GET /api/attribution/journey/:visitorId
 */
app.get('/api/attribution/journey/:visitorId', (req, res) => {
  const journey = getVisitorJourney(req.params.visitorId);
  if (!journey) {
    return res.status(404).json({ error: 'Journey not found' });
  }

  // Optionally calculate attribution
  const { model = 'linear' } = req.query;
  const attribution = calculateAttribution(req.params.visitorId, model);

  res.json({ success: true, journey, attribution });
});

// ────────────────────────��────────────────────────────────────────────────────
// Attribution Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate attribution
 * POST /api/attribution/calculate
 */
app.post('/api/attribution/calculate',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      visitorId: z.string().min(1),
      model: z.enum([
        'first_touch',
        'last_touch',
        'linear',
        'time_decay',
        'position_based',
      ]).optional(),
    });

    const { visitorId, model } = schema.parse(req.body);
    const attribution = calculateAttribution(visitorId, model);

    res.json({ success: true, attribution });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Compare attribution models
 * GET /api/attribution/compare/:visitorId
 */
app.get('/api/attribution/compare/:visitorId', (req, res) => {
  const comparison = compareModels(req.params.visitorId);
  if (comparison.error) {
    return res.status(404).json({ error: comparison.error });
  }
  res.json({ success: true, comparison });
});

// ─────────────────────────────────────────────────────────────────────────────
// Report Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate attribution report
 * GET /api/attribution/report
 */
app.get('/api/attribution/report', (req, res) => {
  try {
    const {
      model = 'linear',
      startDate,
      endDate,
      channel,
      limit = 100,
    } = req.query;

    const report = generateReport({
      model,
      startDate,
      endDate,
      channel,
      limit: parseInt(limit),
    });

    res.json({ success: true, report });
  } catch (err) {
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get report
 * GET /api/attribution/report/:reportId
 */
app.get('/api/attribution/report/:reportId', (req, res) => {
  const report = getReport(req.params.reportId);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json({ success: true, report });
});

// ─────────────────────────────────────────────────────────────────────────────
// Info Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get available attribution models
 * GET /api/attribution/models
 */
app.get('/api/attribution/models', (req, res) => {
  res.json({
    success: true,
    models: Object.entries(ATTRIBUTION_MODELS).map(([key, value]) => ({
      key,
      value,
      description: getModelDescription(value),
    })),
  });
});

/**
 * Get available channels
 * GET /api/attribution/channels
 */
app.get('/api/attribution/channels', (req, res) => {
  res.json({
    success: true,
    channels: Object.entries(CHANNELS).map(([key, value]) => ({
      key,
      value,
    })),
  });
});

function getModelDescription(model) {
  const descriptions = {
    first_touch: 'Gives 100% credit to the first touchpoint in the customer journey.',
    last_touch: 'Gives 100% credit to the last touchpoint before conversion.',
    linear: 'Distributes credit equally across all touchpoints.',
    time_decay: 'Gives more credit to touchpoints closer to conversion time (24-hour half-life).',
    position_based: 'Gives 40% credit to first and last touchpoints, distributes remaining 20% among middle touchpoints.',
  };
  return descriptions[model] || '';
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5409;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget Attribution Service running on port ${port}`);
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
