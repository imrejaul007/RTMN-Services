/**
 * HOJAI SiteOS - Widget Ads Service
 * Ads Widget: Meta Pixel, CAPI, Google Enhanced Conversions, TikTok Events (Port 5405)
 *
 * Features:
 * - Meta Pixel Manager + CAPI (Conversions API)
 * - Auto-inject standard events (PageView, ViewContent, AddToCart, Purchase)
 * - Server-side CAPI for browser-blocked events
 * - Audience sync (cart abandoners, purchasers)
 * - ROAS tracking
 * - Google Enhanced Conversions API
 * - TikTok Events API
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pino from 'pino';
import fetch from 'node-fetch';

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
const pixelConfigsStore = new Map();
const eventsStore = new Map();
const audiencesStore = new Map();
const conversionsStore = new Map();

// External API endpoints
const META_CAPI_ENDPOINT = 'https://graph.facebook.com/v18.0';
const GOOGLE_CAPI_ENDPOINT = 'https://ads.google.com/apis/measurement/v2';
const TIKTOK_CAPI_ENDPOINT = 'https://business-api.tiktok.com/portal/api/v2';

// ─────────────────────────────────────────────────────────────────────────────
// Meta Pixel Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create or update Meta Pixel configuration
 */
export function createPixelConfig(config) {
  const pixelConfig = {
    id: config.id || uuidv4(),
    pixelId: config.pixelId,
    accessToken: config.accessToken,
    enabled: config.enabled ?? true,
    autoEvents: config.autoEvents ?? {
      PageView: true,
      ViewContent: true,
      AddToCart: true,
      Purchase: true,
      Lead: true,
      CompleteRegistration: true,
    },
    eventDeduplication: config.eventDeduplication ?? true,
    testMode: config.testMode ?? false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  pixelConfigsStore.set(pixelConfig.id, pixelConfig);
  logger.info({ event: 'pixel_config_created', pixelId: config.pixelId });

  return pixelConfig;
}

/**
 * Get pixel configuration
 */
export function getPixelConfig(configId) {
  return pixelConfigsStore.get(configId);
}

/**
 * Get all pixel configurations
 */
export function getAllPixelConfigs() {
  return Array.from(pixelConfigsStore.values());
}

/**
 * Update pixel configuration
 */
export function updatePixelConfig(configId, updates) {
  const config = pixelConfigsStore.get(configId);
  if (!config) return null;

  Object.assign(config, updates, { updatedAt: Date.now() });
  return config;
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta CAPI (Server-Side Events)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard Meta event names
 */
export const META_EVENTS = {
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  SEARCH: 'Search',
  ADD_TO_CART: 'AddToCart',
  ADD_TO_WISHLIST: 'AddToWishlist',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  PURCHASE: 'Purchase',
  LEAD: 'Lead',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  CONTACT: 'Contact',
  CUSTOMIZE_PRODUCT: 'CustomizeProduct',
  DONATE: 'Donate',
  FIND_LOCATION: 'FindLocation',
  SCHEDULE: 'Schedule',
  START_TRIAL: 'StartTrial',
  SUBMIT_APPLICATION: 'SubmitApplication',
  SUBSCRIBE: 'Subscribe',
};

/**
 * Send event to Meta Conversions API
 */
export async function sendMetaCAPIEvent(pixelId, accessToken, event) {
  const url = `${META_CAPI_ENDPOINT}/${pixelId}/events`;

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime || Math.floor(Date.now() / 1000),
        event_source_url: event.sourceUrl,
        action_source: 'website',
        user_data: {
          em: event.email ? hashData(event.email) : undefined,
          ph: event.phone ? hashData(event.phone) : undefined,
          fn: event.firstName ? hashData(event.firstName) : undefined,
          ln: event.lastName ? hashData(event.lastName) : undefined,
          client_ip_address: event.clientIp,
          client_user_agent: event.userAgent,
          fbc: event.fbc,
          fbp: event.fbp,
        },
        custom_data: {
          currency: event.currency,
          value: event.value,
          content_ids: event.contentIds,
          content_name: event.contentName,
          content_type: event.contentType,
          num_items: event.numItems,
          ...event.customData,
        },
      },
    ],
    test_event_code: event.testEventCode,
  };

  // Remove undefined values
  payload.data[0].user_data = Object.fromEntries(
    Object.entries(payload.data[0].user_data).filter(([_, v]) => v !== undefined)
  );

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'meta_capi_error', pixelId, error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'meta_capi_success', pixelId, eventName: event.eventName });
    return { success: true, result };
  } catch (err) {
    logger.error({ event: 'meta_capi_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Hash data for Meta CAPI (SHA-256)
 */
function hashData(data) {
  // Client-side hashing should use crypto.subtle.digest
  // Server-side simulation - in production, use Node crypto
  return `hashed_${data}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Enhanced Conversions API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send event to Google Enhanced Conversions API
 */
export async function sendGoogleEnhancedConversion(config, event) {
  const url = `${GOOGLE_CAPI_ENDPOINT}/conversions:clickConversion`;

  const payload = {
    conversion: {
      gclid: event.gclid,
      gclid_state: event.gclidState,
      conversion_timestamp: event.conversionTime || new Date().toISOString(),
      user_agent: event.userAgent,
      conversion_currency_code: event.currency || 'USD',
      conversion_value: event.value,
    },
    webhook: {
      keys: config.webhookKeys,
      conversion_transaction_id: event.transactionId,
    },
  };

  // User identification data
  if (event.email) {
    payload.userIdentifiers = {
      email: hashData(event.email),
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.developerToken}`,
        'developer-token': config.developerToken,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'google_capi_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'google_capi_success', eventType: event.type });
    return { success: true, result };
  } catch (err) {
    logger.error({ event: 'google_capi_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TikTok Events API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send event to TikTok Events API
 */
export async function sendTikTokEvent(config, event) {
  const url = `${TIKTOK_CAPI_ENDPOINT}/events`;

  const payload = {
    events: [
      {
        event: event.eventName,
        event_time: event.eventTime || Math.floor(Date.now() / 1000),
        event_source_url: event.sourceUrl,
        event_id: event.eventId || uuidv4(),
        action_source: 'website',
        context: {
          user: {
            email: event.email ? hashData(event.email) : undefined,
            phone_number: event.phone ? hashData(event.phone) : undefined,
          },
          ad: {
            callback: event.ttclid,
          },
        },
        properties: {
          content_type: event.contentType,
          content_id: event.contentId,
          currency: event.currency,
          value: event.value,
          description: event.description,
          query: event.query,
        },
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': config.accessToken,
        'Auth-ID': config.authId,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error({ event: 'tiktok_capi_error', error: result });
      return { success: false, error: result };
    }

    logger.info({ event: 'tiktok_capi_success', eventName: event.eventName });
    return { success: true, result };
  } catch (err) {
    logger.error({ event: 'tiktok_capi_fetch_error', error: err.message });
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track an event (store locally and optionally send to CAPI)
 */
export async function trackEvent(pixelConfigId, eventData) {
  const config = pixelConfigsStore.get(pixelConfigId);
  if (!config) {
    throw new Error('Pixel configuration not found');
  }

  const event = {
    id: uuidv4(),
    pixelConfigId,
    pixelId: config.pixelId,
    eventName: eventData.eventName,
    sourceUrl: eventData.sourceUrl,
    visitorId: eventData.visitorId,
    userData: {
      email: eventData.email,
      phone: eventData.phone,
      firstName: eventData.firstName,
      lastName: eventData.lastName,
      fbc: eventData.fbc,
      fbp: eventData.fbp,
    },
    eventData: {
      value: eventData.value,
      currency: eventData.currency,
      contentIds: eventData.contentIds,
      contentName: eventData.contentName,
      contentType: eventData.contentType,
      numItems: eventData.numItems,
    },
    timestamp: Date.now(),
    sentToCAPI: false,
    capiResponse: null,
  };

  // Store the event
  eventsStore.set(event.id, event);

  // Send to Meta CAPI if enabled
  if (config.enabled && !config.testMode) {
    const capiResult = await sendMetaCAPIEvent(config.pixelId, config.accessToken, {
      eventName: event.eventName,
      sourceUrl: event.sourceUrl,
      email: eventData.email,
      phone: eventData.phone,
      firstName: eventData.firstName,
      lastName: eventData.lastName,
      fbc: eventData.fbc,
      fbp: eventData.fbp,
      value: eventData.value,
      currency: eventData.currency,
      contentIds: eventData.contentIds,
      contentName: eventData.contentName,
      contentType: eventData.contentType,
      numItems: eventData.numItems,
    });

    event.sentToCAPI = true;
    event.capiResponse = capiResult;
  }

  logger.info({ event: 'event_tracked', eventId: event.id, eventName: event.eventName });

  return event;
}

/**
 * Get event by ID
 */
export function getEvent(eventId) {
  return eventsStore.get(eventId);
}

/**
 * Get events by visitor ID
 */
export function getVisitorEvents(visitorId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  const events = Array.from(eventsStore.values())
    .filter(e => e.visitorId === visitorId)
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    total: events.length,
    events: events.slice(offset, offset + limit),
  };
}

/**
 * Get events by type
 */
export function getEventsByType(eventName, options = {}) {
  const { limit = 100, offset = 0, startDate, endDate } = options;

  let events = Array.from(eventsStore.values())
    .filter(e => e.eventName === eventName);

  if (startDate) {
    events = events.filter(e => e.timestamp >= new Date(startDate).getTime());
  }
  if (endDate) {
    events = events.filter(e => e.timestamp <= new Date(endDate).getTime());
  }

  events.sort((a, b) => b.timestamp - a.timestamp);

  return {
    total: events.length,
    events: events.slice(offset, offset + limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audience Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an audience
 */
export function createAudience(audienceData) {
  const audience = {
    id: uuidv4(),
    name: audienceData.name,
    description: audienceData.description,
    type: audienceData.type || 'custom', // custom, cart_abandoners, purchasers, visitors
    source: audienceData.source || 'meta',
    rules: audienceData.rules || [],
    pixelId: audienceData.pixelId,
    status: 'active',
    size: 0,
    memberIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  audiencesStore.set(audience.id, audience);
  logger.info({ event: 'audience_created', audienceId: audience.id, name: audience.name });

  return audience;
}

/**
 * Get audience by ID
 */
export function getAudience(audienceId) {
  return audiencesStore.get(audienceId);
}

/**
 * Add members to audience
 */
export function addAudienceMembers(audienceId, memberIds) {
  const audience = audiencesStore.get(audienceId);
  if (!audience) return null;

  const newMembers = memberIds.filter(id => !audience.memberIds.includes(id));
  audience.memberIds.push(...newMembers);
  audience.size = audience.memberIds.length;
  audience.updatedAt = Date.now();

  logger.info({ event: 'audience_members_added', audienceId, added: newMembers.length });

  return audience;
}

/**
 * Remove members from audience
 */
export function removeAudienceMembers(audienceId, memberIds) {
  const audience = audiencesStore.get(audienceId);
  if (!audience) return null;

  audience.memberIds = audience.memberIds.filter(id => !memberIds.includes(id));
  audience.size = audience.memberIds.length;
  audience.updatedAt = Date.now();

  return audience;
}

/**
 * Get cart abandoners audience
 */
export function getCartAbandoners(pixelId, timeWindowHours = 24) {
  const cutoff = Date.now() - (timeWindowHours * 60 * 60 * 1000);

  const abandoners = Array.from(eventsStore.values())
    .filter(e =>
      e.pixelId === pixelId &&
      e.eventName === META_EVENTS.ADD_TO_CART &&
      e.timestamp >= cutoff
    )
    .filter(e => {
      // Check if they didn't purchase within the time window
      const purchases = Array.from(eventsStore.values())
        .filter(p =>
          p.visitorId === e.visitorId &&
          p.eventName === META_EVENTS.PURCHASE &&
          p.timestamp >= e.timestamp &&
          p.timestamp <= e.timestamp + (timeWindowHours * 60 * 60 * 1000)
        );
      return purchases.length === 0;
    })
    .map(e => e.visitorId);

  return [...new Set(abandoners)];
}

/**
 * Get recent purchasers audience
 */
export function getRecentPurchasers(pixelId, timeWindowHours = 7 * 24) {
  const cutoff = Date.now() - (timeWindowHours * 60 * 60 * 1000);

  const purchasers = Array.from(eventsStore.values())
    .filter(e =>
      e.pixelId === pixelId &&
      e.eventName === META_EVENTS.PURCHASE &&
      e.timestamp >= cutoff
    )
    .map(e => e.visitorId);

  return [...new Set(purchasers)];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROAS Tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track a conversion
 */
export function trackConversion(conversionData) {
  const conversion = {
    id: uuidv4(),
    visitorId: conversionData.visitorId,
    campaignId: conversionData.campaignId,
    adId: conversionData.adId,
    channel: conversionData.channel || 'meta', // meta, google, tiktok
    eventId: conversionData.eventId,
    revenue: conversionData.revenue || 0,
    orderId: conversionData.orderId,
    attributedEvents: conversionData.attributedEvents || [],
    timestamp: Date.now(),
  };

  conversionsStore.set(conversion.id, conversion);
  logger.info({ event: 'conversion_tracked', conversionId: conversion.id, revenue: conversion.revenue });

  return conversion;
}

/**
 * Calculate ROAS (Return on Ad Spend)
 */
export function calculateROAS(campaignId, adSpend) {
  const conversions = Array.from(conversionsStore.values())
    .filter(c => c.campaignId === campaignId);

  const totalRevenue = conversions.reduce((sum, c) => sum + c.revenue, 0);
  const roas = adSpend > 0 ? totalRevenue / adSpend : 0;

  return {
    campaignId,
    adSpend,
    totalRevenue,
    roas: Math.round(roas * 100) / 100,
    conversions: conversions.length,
    avgOrderValue: conversions.length > 0 ? totalRevenue / conversions.length : 0,
  };
}

/**
 * Get ROAS report
 */
export function getROASReport(options = {}) {
  const { startDate, endDate, channel } = options;

  let conversions = Array.from(conversionsStore.values());

  if (startDate) {
    conversions = conversions.filter(c => c.timestamp >= new Date(startDate).getTime());
  }
  if (endDate) {
    conversions = conversions.filter(c => c.timestamp <= new Date(endDate).getTime());
  }
  if (channel) {
    conversions = conversions.filter(c => c.channel === channel);
  }

  const byChannel = {};
  for (const conversion of conversions) {
    if (!byChannel[conversion.channel]) {
      byChannel[conversion.channel] = { revenue: 0, count: 0 };
    }
    byChannel[conversion.channel].revenue += conversion.revenue;
    byChannel[conversion.channel].count++;
  }

  return {
    totalRevenue: conversions.reduce((sum, c) => sum + c.revenue, 0),
    totalConversions: conversions.length,
    byChannel,
    avgOrderValue: conversions.length > 0
      ? conversions.reduce((sum, c) => sum + c.revenue, 0) / conversions.length
      : 0,
  };
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
  max: 1000,
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
    service: 'widget-ads',
    version: '1.0.0',
    port: process.env.PORT || 5405,
    timestamp: new Date().toISOString(),
    stats: {
      pixelConfigs: pixelConfigsStore.size,
      totalEvents: eventsStore.size,
      audiences: audiencesStore.size,
      conversions: conversionsStore.size,
    },
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pixel Configuration Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create pixel configuration
 * POST /api/ads/pixel
 */
app.post('/api/ads/pixel',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      pixelId: z.string().min(1),
      accessToken: z.string().min(1),
      enabled: z.boolean().optional(),
      autoEvents: z.record(z.boolean()).optional(),
      eventDeduplication: z.boolean().optional(),
      testMode: z.boolean().optional(),
    });

    const config = createPixelConfig(schema.parse(req.body));
    res.status(201).json({ success: true, config });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all pixel configurations
 * GET /api/ads/pixel
 */
app.get('/api/ads/pixel', (req, res) => {
  const configs = getAllPixelConfigs().map(c => ({
    ...c,
    accessToken: c.accessToken ? '***' : undefined, // Mask token
  }));
  res.json({ success: true, configs });
});

/**
 * Get pixel configuration
 * GET /api/ads/pixel/:configId
 */
app.get('/api/ads/pixel/:configId', (req, res) => {
  const config = getPixelConfig(req.params.configId);
  if (!config) {
    return res.status(404).json({ error: 'Pixel configuration not found' });
  }

  res.json({
    success: true,
    config: {
      ...config,
      accessToken: config.accessToken ? '***' : undefined,
    },
  });
});

/**
 * Update pixel configuration
 * PATCH /api/ads/pixel/:configId
 */
app.patch('/api/ads/pixel/:configId',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      enabled: z.boolean().optional(),
      autoEvents: z.record(z.boolean()).optional(),
      eventDeduplication: z.boolean().optional(),
      testMode: z.boolean().optional(),
    });

    const config = updatePixelConfig(req.params.configId, schema.parse(req.body));
    if (!config) {
      return res.status(404).json({ error: 'Pixel configuration not found' });
    }

    res.json({ success: true, config });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Event Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track event
 * POST /api/ads/event
 */
app.post('/api/ads/event',requireAuth,  async (req, res) => {
  try {
    const schema = z.object({
      pixelConfigId: z.string().min(1),
      eventName: z.string().min(1),
      sourceUrl: z.string().optional(),
      visitorId: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      fbc: z.string().optional(),
      fbp: z.string().optional(),
      value: z.number().optional(),
      currency: z.string().optional(),
      contentIds: z.array(z.string()).optional(),
      contentName: z.string().optional(),
      contentType: z.string().optional(),
      numItems: z.number().optional(),
    });

    const event = await trackEvent(req.body.pixelConfigId, schema.parse(req.body));
    res.status(201).json({ success: true, event });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send server-side CAPI event
 * POST /api/ads/capi/event
 */
app.post('/api/ads/capi/event',requireAuth,  async (req, res) => {
  try {
    const schema = z.object({
      pixelId: z.string().min(1),
      accessToken: z.string().min(1),
      eventName: z.string().min(1),
      eventTime: z.number().optional(),
      sourceUrl: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      fbc: z.string().optional(),
      fbp: z.string().optional(),
      clientIp: z.string().optional(),
      userAgent: z.string().optional(),
      value: z.number().optional(),
      currency: z.string().optional(),
      contentIds: z.array(z.string()).optional(),
      contentName: z.string().optional(),
      contentType: z.string().optional(),
      numItems: z.number().optional(),
      testEventCode: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const result = await sendMetaCAPIEvent(data.pixelId, data.accessToken, data);

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get event
 * GET /api/ads/event/:eventId
 */
app.get('/api/ads/event/:eventId', (req, res) => {
  const event = getEvent(req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({ success: true, event });
});

/**
 * Get visitor events
 * GET /api/ads/events/visitor/:visitorId
 */
app.get('/api/ads/events/visitor/:visitorId', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const result = getVisitorEvents(req.params.visitorId, { limit, offset });
  res.json({ success: true, ...result });
});

/**
 * Get events by type
 * GET /api/ads/events/type/:eventName
 */
app.get('/api/ads/events/type/:eventName', (req, res) => {
  const { limit = 100, offset = 0, startDate, endDate } = req.query;
  const result = getEventsByType(req.params.eventName, { limit, offset, startDate, endDate });
  res.json({ success: true, ...result });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audience Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create audience
 * POST /api/ads/audience
 */
app.post('/api/ads/audience',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(['custom', 'cart_abandoners', 'purchasers', 'visitors']).optional(),
      source: z.string().optional(),
      rules: z.array(z.any()).optional(),
      pixelId: z.string().optional(),
    });

    const audience = createAudience(schema.parse(req.body));
    res.status(201).json({ success: true, audience });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get audience
 * GET /api/ads/audience/:audienceId
 */
app.get('/api/ads/audience/:audienceId', (req, res) => {
  const audience = getAudience(req.params.audienceId);
  if (!audience) {
    return res.status(404).json({ error: 'Audience not found' });
  }
  res.json({ success: true, audience });
});

/**
 * Add audience members
 * POST /api/ads/audience/:audienceId/members
 */
app.post('/api/ads/audience/:audienceId/members',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      memberIds: z.array(z.string()).min(1),
    });

    const audience = addAudienceMembers(req.params.audienceId, schema.parse(req.body).memberIds);
    if (!audience) {
      return res.status(404).json({ error: 'Audience not found' });
    }

    res.json({ success: true, audience });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get cart abandoners
 * GET /api/ads/audiences/cart-abandoners
 */
app.get('/api/ads/audiences/cart-abandoners', (req, res) => {
  const { pixelId, timeWindow = 24 } = req.query;
  if (!pixelId) {
    return res.status(400).json({ error: 'pixelId is required' });
  }

  const abandoners = getCartAbandoners(pixelId, parseInt(timeWindow));
  res.json({
    success: true,
    count: abandoners.length,
    visitorIds: abandoners,
  });
});

/**
 * Get recent purchasers
 * GET /api/ads/audiences/purchasers
 */
app.get('/api/ads/audiences/purchasers', (req, res) => {
  const { pixelId, timeWindow = 168 } = req.query;
  if (!pixelId) {
    return res.status(400).json({ error: 'pixelId is required' });
  }

  const purchasers = getRecentPurchasers(pixelId, parseInt(timeWindow));
  res.json({
    success: true,
    count: purchasers.length,
    visitorIds: purchasers,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROAS Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track conversion
 * POST /api/ads/conversion
 */
app.post('/api/ads/conversion',requireAuth,  (req, res) => {
  try {
    const schema = z.object({
      visitorId: z.string().min(1),
      campaignId: z.string().optional(),
      adId: z.string().optional(),
      channel: z.enum(['meta', 'google', 'tiktok']).optional(),
      eventId: z.string().optional(),
      revenue: z.number().optional(),
      orderId: z.string().optional(),
      attributedEvents: z.array(z.string()).optional(),
    });

    const conversion = trackConversion(schema.parse(req.body));
    res.status(201).json({ success: true, conversion });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Calculate ROAS
 * GET /api/ads/roas/:campaignId
 */
app.get('/api/ads/roas/:campaignId', (req, res) => {
  const { spend } = req.query;
  const roas = calculateROAS(req.params.campaignId, parseFloat(spend) || 0);
  res.json({ success: true, roas });
});

/**
 * Get ROAS report
 * GET /api/ads/roas
 */
app.get('/api/ads/roas', (req, res) => {
  const { startDate, endDate, channel } = req.query;
  const report = getROASReport({ startDate, endDate, channel });
  res.json({ success: true, report });
});

// ─────────────────────────────────────────────────────────────────────────────
// External CAPI Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send Google Enhanced Conversion
 * POST /api/ads/google/capi
 */
app.post('/api/ads/google/capi',requireAuth,  async (req, res) => {
  try {
    const schema = z.object({
      configId: z.string().min(1),
      gclid: z.string().optional(),
      conversionTime: z.string().optional(),
      userAgent: z.string().optional(),
      currency: z.string().optional(),
      value: z.number(),
      transactionId: z.string(),
      email: z.string().email().optional(),
    });

    const config = getPixelConfig(req.body.configId);
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const result = await sendGoogleEnhancedConversion(config, schema.parse(req.body));
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send TikTok Event
 * POST /api/ads/tiktok/event
 */
app.post('/api/ads/tiktok/event',requireAuth,  async (req, res) => {
  try {
    const schema = z.object({
      configId: z.string().min(1),
      accessToken: z.string().min(1),
      authId: z.string().min(1),
      eventName: z.string().min(1),
      sourceUrl: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      ttclid: z.string().optional(),
      contentType: z.string().optional(),
      contentId: z.string().optional(),
      currency: z.string().optional(),
      value: z.number().optional(),
      description: z.string().optional(),
      query: z.string().optional(),
    });

    const result = await sendTikTokEvent(schema.parse(req.body));
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

const PORT = process.env.PORT || 5405;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget Ads Service running on port ${port}`);
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
