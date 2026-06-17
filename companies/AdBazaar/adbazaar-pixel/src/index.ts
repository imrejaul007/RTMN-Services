/**
 * AdBazaar Universal Pixel Service
 *
 * Website, Server-side, and Mobile tracking - equivalent to Meta Pixel, Google Tag, TikTok Pixel
 *
 * Port: 4962
 *
 * Features:
 * - Web Pixel SDK (JavaScript)
 * - Server-side Event Tracking
 * - Mobile SDK Events
 * - Event Deduplication
 * - Cross-device Identity Resolution
 * - Conversion Tracking
 * - CDP Integration
 * - Ad Channel Webhooks (Meta, Google, TikTok)
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import winston from 'winston';
import crypto from 'crypto';
import rateLimit from 'rate-limit-express';
import axios from 'axios';

// ============================================================================
// CONFIGURATION
// ============================================================================

dotenv.config();

const PORT = parseInt(process.env.PORT || '4962', 10);
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/adbazaar-pixel';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';
const TEST_EVENT_CODE = process.env.TEST_EVENT_CODE || 'TEST';

// CDP Service URL
const CDP_SERVICE_URL = process.env.CDP_SERVICE_URL || 'http://localhost:4901';

// Ad Channel URLs
const META_CONVERSIONS_API = process.env.META_CONVERSIONS_API_URL || 'https://graph.facebook.com/v18.0';
const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

const GOOGLE_CONVERSIONS_URL = process.env.GOOGLE_CONVERSIONS_URL || 'https://googleads.googleapis.com';
const GOOGLE_CONVERSION_ID = process.env.GOOGLE_CONVERSION_ID;
const GOOGLE_CONVERSION_TOKEN = process.env.GOOGLE_CONVERSION_TOKEN;

const TIKTOK_EVENTS_URL = process.env.TIKTOK_EVENTS_URL || 'https://business-api.tiktok.com';
const TIKTOK_PIXEL_ID = process.env.TIKTOK_PIXEL_ID;
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

// ============================================================================
// LOGGER
// ============================================================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/pixel.log' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ]
});

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
  message: { error: 'Too many requests' }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// Pixel Configuration Schema
const pixelConfigSchema = new mongoose.Schema({
  pixelId: { type: String, unique: true, index: true },
  merchantId: String,
  name: String,
  type: { type: String, enum: ['web', 'server', 'mobile'] },
  domain: String,
  events: [{
    name: String,
    enabled: Boolean
  }],
  settings: {
    deduplication: Boolean,
    crossDomain: Boolean,
    advancedMatching: Boolean
  },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PixelConfig = mongoose.model('PixelConfig', pixelConfigSchema);

// Pixel Event Schema
const pixelEventSchema = new mongoose.Schema({
  eventId: { type: String, unique: true, index: true },
  pixelId: String,
  merchantId: String,
  event: {
    name: String,
    category: String,
    properties: mongoose.Schema.Types.Mixed
  },
  user: {
    fbp: String,           // Facebook Browser ID
    fbc: String,           // Facebook Click ID
    gp: String,            // Google Pixel ID
    ttp: String,           // TikTok Pixel ID
    email: String,
    phone: String,
    externalId: String
  },
  context: {
    url: String,
    referrer: String,
    userAgent: String,
    ip: String,
    language: String
  },
  device: {
    type: String,
    os: String,
    browser: String,
    mobile: Boolean
  },
  location: {
    country: String,
    region: String,
    city: String,
    lat: Number,
    lng: Number
  },
  attribution: {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String,
    clickId: String
  },
  revenue: {
    value: Number,
    currency: String
  },
  timestamp: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false },
  processedAt: Date,
  sentToCDP: { type: Boolean, default: false },
  sentToChannels: { type: Boolean, default: false }
});

// Indexes for event queries
pixelEventSchema.index({ pixelId: 1, timestamp: -1 });
pixelEventSchema.index({ 'user.fbp': 1 });
pixelEventSchema.index({ 'user.email': 1 });
pixelEventSchema.index({ 'user.externalId': 1 });
pixelEventSchema.index({ 'event.name': 1 });
pixelEventSchema.index({ processed: 1, timestamp: -1 });

const PixelEvent = mongoose.model('PixelEvent', pixelEventSchema);

// Conversion Schema
const conversionSchema = new mongoose.Schema({
  conversionId: { type: String, unique: true, index: true },
  pixelId: String,
  merchantId: String,
  event: {
    name: String,
    value: Number,
    currency: String
  },
  user: {
    fbp: String,
    fbc: String,
    email: String,
    phone: String,
    externalId: String
  },
  attribution: {
    campaignId: String,
    channel: String,
    touchpoint: String,
    campaign: String,
    source: String
  },
  revenue: {
    value: Number,
    currency: String
  },
  status: { type: String, enum: ['attributed', 'reported', 'duplicate', 'pending'] },
  reportedTo: [String],  // ['meta', 'google', 'tiktok']
  reportedAt: Date,
  timestamp: { type: Date, default: Date.now }
});

conversionSchema.index({ pixelId: 1, timestamp: -1 });
conversionSchema.index({ status: 1 });

const Conversion = mongoose.model('Conversion', conversionSchema);

// Audience Schema (for CDP)
const audienceSchema = new mongoose.Schema({
  audienceId: { type: String, unique: true, index: true },
  pixelId: String,
  merchantId: String,
  name: String,
  description: String,
  criteria: mongoose.Schema.Types.Mixed,
  size: Number,
  status: { type: String, enum: ['building', 'ready', 'active', 'paused'] },
  users: [{
    fbp: String,
    fbc: String,
    email: String,
    phone: String,
    externalId: String,
    addedAt: Date
  }],
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

audienceSchema.index({ pixelId: 1, status: 1 });

const Audience = mongoose.model('Audience', audienceSchema);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateEventId(): string {
  return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

function generatePixelId(): string {
  return `pxl_${crypto.randomBytes(12).toString('hex')}`;
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex');
}

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
}

function detectDevice(userAgent: string | undefined): { type: string; os: string; browser: string; mobile: boolean } {
  const ua = userAgent || '';
  const mobile = /mobile|android|iphone|ipad/i.test(ua);
  const type = mobile ? 'mobile' : 'desktop';

  let os = 'unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

  let browser = 'unknown';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edge/i.test(ua)) browser = 'Edge';

  return { type, os, browser, mobile };
}

function isConversionEvent(eventName: string): boolean {
  const conversionEvents = [
    'Purchase', 'CompleteRegistration', 'Lead', 'Subscribe',
    'AddPaymentInfo', 'Purchase', 'checkout'
  ];
  return conversionEvents.includes(eventName);
}

function getDefaultEvents(type: string): { name: string; enabled: boolean }[] {
  const allEvents = [
    { name: 'PageView', enabled: true },
    { name: 'ViewContent', enabled: true },
    { name: 'AddToCart', enabled: true },
    { name: 'AddToWishlist', enabled: true },
    { name: 'InitiateCheckout', enabled: true },
    { name: 'AddPaymentInfo', enabled: true },
    { name: 'Purchase', enabled: true },
    { name: 'Lead', enabled: true },
    { name: 'CompleteRegistration', enabled: true },
    { name: 'Contact', enabled: true },
    { name: 'FindLocation', enabled: true },
    { name: 'Schedule', enabled: true },
    { name: 'CustomizeProduct', enabled: true },
    { name: 'Donate', enabled: true },
    { name: 'FindLocation', enabled: true },
    { name: 'Schedule', enabled: true },
    { name: 'StartTrial', enabled: true },
    { name: 'SubmitApplication', enabled: true },
    { name: 'Subscribe', enabled: true },
    { name: 'AdClick', enabled: true },
    { name: 'AdImpression', enabled: true },
    { name: 'Search', enabled: true },
    { name: 'ContentView', enabled: true },
    { name: 'CustomEvent', enabled: true }
  ];

  if (type === 'server') {
    return allEvents.filter(e => ['Purchase', 'Lead', 'CompleteRegistration'].includes(e.name));
  }
  return allEvents;
}

// ============================================================================
// CDP INTEGRATION
// ============================================================================

async function sendToCDP(event: any): Promise<void> {
  try {
    await axios.post(`${CDP_SERVICE_URL}/api/events`, {
      eventId: event.eventId,
      pixelId: event.pixelId,
      merchantId: event.merchantId,
      eventName: event.event.name,
      eventData: event.event.properties,
      user: {
        fbp: event.user.fbp,
        fbc: event.user.fbc,
        email: event.user.email,
        phone: event.user.phone,
        externalId: event.user.externalId
      },
      context: event.context,
      revenue: event.revenue,
      timestamp: event.timestamp
    }, {
      headers: {
        'X-Internal-Service': 'adbazaar-pixel',
        'X-Internal-Token': INTERNAL_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    event.sentToCDP = true;
    await event.save();
    logger.info('Event sent to CDP', { eventId: event.eventId });
  } catch (error) {
    logger.error('Failed to send to CDP', { eventId: event.eventId, error });
    // Don't throw - CDP is optional
  }
}

async function sendToAudienceGraph(userData: any, merchantId: string): Promise<void> {
  try {
    await axios.post(`${CDP_SERVICE_URL}/api/audiences/match`, {
      merchantId,
      user: userData,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'X-Internal-Service': 'adbazaar-pixel',
        'X-Internal-Token': INTERNAL_TOKEN
      },
      timeout: 5000
    });
  } catch (error) {
    logger.error('Failed to update audience graph', { error });
  }
}

// ============================================================================
// AD CHANNEL WEBHOOKS
// ============================================================================

// Meta Conversions API
async function sendToMeta(event: any): Promise<boolean> {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    logger.warn('Meta Conversions API not configured');
    return false;
  }

  try {
    const eventData: any = {
      event_name: event.event.name.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase(),
      event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
      event_source_url: event.context?.url,
      action_source: 'website',
      user_data: {}
    };

    // User data
    if (event.user.fbp) eventData.user_data.fb_pixel_id = event.user.fbp;
    if (event.user.fbc) eventData.user_data.click_id = event.user.fbc;
    if (event.user.email) eventData.user_data.em = hashEmail(event.user.email);
    if (event.user.phone) eventData.user_data.ph = hashPhone(event.user.phone);

    // Custom data
    if (event.revenue?.value) {
      eventData.custom_data = {
        value: event.revenue.value,
        currency: event.revenue.currency || 'INR'
      };
    }

    await axios.post(
      `${META_CONVERSIONS_API}/${META_PIXEL_ID}/events`,
      {
        data: [eventData],
        access_token: META_ACCESS_TOKEN
      },
      { timeout: 10000 }
    );

    logger.info('Event sent to Meta', { eventId: event.eventId });
    return true;
  } catch (error: any) {
    logger.error('Meta API error', { error: error.response?.data || error.message });
    return false;
  }
}

// Google Enhanced Conversions
async function sendToGoogle(event: any): Promise<boolean> {
  if (!GOOGLE_CONVERSION_ID || !GOOGLE_CONVERSION_TOKEN) {
    logger.warn('Google Enhanced Conversions not configured');
    return false;
  }

  try {
    const userIdentifiers: any = {};
    if (event.user.email) userIdentifiers.email_address = event.user.email;
    if (event.user.phone) userIdentifiers.phone_number = event.user.phone;

    const conversionData: any = {
      conversion_action: parseInt(GOOGLE_CONVERSION_ID),
      gclid: event.attribution?.clickId,
      cart_data: {},
      user_agent: event.context?.userAgent,
      user_identifiers: userIdentifiers
    };

    if (event.revenue?.value) {
      conversionData.cart_data.products = [{
        quantity: event.event.properties?.quantity || 1,
        price: event.revenue.value
      }];
    }

    await axios.post(
      `${GOOGLE_CONVERSIONS_URL}/merchant/api/partner/diagnostics`,
      conversionData,
      {
        headers: {
          'Authorization': `Bearer ${GOOGLE_CONVERSION_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    logger.info('Event sent to Google', { eventId: event.eventId });
    return true;
  } catch (error: any) {
    logger.error('Google API error', { error: error.response?.data || error.message });
    return false;
  }
}

// TikTok Events API
async function sendToTikTok(event: any): Promise<boolean> {
  if (!TIKTOK_PIXEL_ID || !TIKTOK_ACCESS_TOKEN) {
    logger.warn('TikTok Events API not configured');
    return false;
  }

  try {
    const eventData = {
      event: event.event.name.toLowerCase(),
      event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
      event_source_url: event.context?.url,
      user: {
        email: event.user.email ? hashEmail(event.user.email) : undefined,
        phone: event.user.phone ? hashPhone(event.user.phone) : undefined,
        ttp: event.user.ttp,
        external_id: event.user.externalId
      },
      properties: {
        value: event.revenue?.value,
        currency: event.revenue?.currency || 'INR',
        ...event.event.properties
      },
      context: {
        user_agent: event.context?.userAgent,
        ip: event.context?.ip
      }
    };

    await axios.post(
      `${TIKTOK_EVENTS_URL}/api/audience/match`,
      {
        pixel_code: TIKTOK_PIXEL_ID,
        events: [eventData]
      },
      {
        headers: {
          'Access-Token': TIKTOK_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    logger.info('Event sent to TikTok', { eventId: event.eventId });
    return true;
  } catch (error: any) {
    logger.error('TikTok API error', { error: error.response?.data || error.message });
    return false;
  }
}

async function sendToAdChannels(event: any): Promise<void> {
  const results = await Promise.allSettled([
    sendToMeta(event),
    sendToGoogle(event),
    sendToTikTok(event)
  ]);

  const sentTo = results
    .map((r, i) => (r.status === 'fulfilled' && r.value ? ['meta', 'google', 'tiktok'][i] : null))
    .filter(Boolean);

  if (sentTo.length > 0) {
    event.sentToChannels = true;
    event.save();
    logger.info('Event distributed to ad channels', { eventId: event.eventId, channels: sentTo });
  }
}

// ============================================================================
// CONVERSION REPORTING
// ============================================================================

async function processConversionEvent(event: any): Promise<void> {
  const conversionId = generateEventId();

  // Check for duplicate in 24-hour window
  const existing = await Conversion.findOne({
    pixelId: event.pixelId,
    'event.name': event.event.name,
    'user.externalId': event.user.externalId,
    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  if (existing) {
    existing.status = 'duplicate';
    await existing.save();
    return;
  }

  const conversion = new Conversion({
    conversionId,
    pixelId: event.pixelId,
    merchantId: event.merchantId,
    event: {
      name: event.event.name,
      value: event.revenue?.value,
      currency: event.revenue?.currency || 'INR'
    },
    user: {
      fbp: event.user.fbp,
      fbc: event.user.fbc,
      email: event.user.email,
      phone: event.user.phone,
      externalId: event.user.externalId
    },
    attribution: event.attribution,
    revenue: event.revenue,
    status: 'attributed',
    timestamp: new Date()
  });

  await conversion.save();

  // Report to ad channels
  const results = await Promise.allSettled([
    sendToMeta(event),
    sendToGoogle(event),
    sendToTikTok(event)
  ]);

  const reportedTo = results
    .map((r, i) => (r.status === 'fulfilled' && r.value ? ['meta', 'google', 'tiktok'][i] : null))
    .filter(Boolean);

  conversion.reportedTo = reportedTo as string[];
  conversion.status = reportedTo.length > 0 ? 'reported' : 'pending';
  conversion.reportedAt = new Date();
  await conversion.save();

  logger.info('Conversion recorded', { conversionId, pixelId: event.pixelId, reportedTo });
}

// ============================================================================
// WEB PIXEL SDK ENDPOINT
// ============================================================================

app.get('/sdk.js', async (req: Request, res: Response) => {
  const { pixel_id } = req.query;

  if (!pixel_id) {
    res.status(400).send('// Pixel ID required');
    return;
  }

  const pixel = await PixelConfig.findOne({ pixelId: pixel_id });

  if (!pixel) {
    res.status(404).send('// Pixel not found');
    return;
  }

  const enabledEvents = pixel.events.filter(e => e.enabled).map(e => e.name);

  const sdk = `
// AdBazaar Universal Pixel SDK
(function() {
  'use strict';

  window.AdBazaarPixel = window.AdBazaarPixel || {
    pixelId: '${pixel_id}',
    queue: [],
    events: ${JSON.stringify(enabledEvents)},
    config: ${JSON.stringify(pixel.settings || {})},

    // Track event
    track: function(eventName, eventData) {
      var eventPayload = {
        pixel_id: '${pixel_id}',
        event_name: eventName,
        event_data: eventData || {},
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent
      };

      // Advanced matching
      if (this.config.advancedMatching) {
        eventPayload.user_data = this.getUserData();
      }

      // Send to server
      this.send(eventPayload);
    },

    // Send to server
    send: function(data) {
      fetch('${process.env.PIXEL_API_URL || 'http://localhost:4962'}/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(function(err) {
        console.error('Pixel error:', err);
      });
    },

    // Get user data for advanced matching
    getUserData: function() {
      var userData = {};
      // Try to get email from page
      var emailInput = document.querySelector('input[type="email"]');
      if (emailInput) userData.email = emailInput.value;
      return userData;
    },

    // PageView
    pageView: function() {
      this.track('PageView', { url: window.location.href });
    },

    // ViewContent
    viewContent: function(data) {
      this.track('ViewContent', data);
    },

    // AddToCart
    addToCart: function(data) {
      this.track('AddToCart', data);
    },

    // InitiateCheckout
    initiateCheckout: function(data) {
      this.track('InitiateCheckout', data);
    },

    // Purchase
    purchase: function(data) {
      this.track('Purchase', data);
    }
  };

  // Auto-track page view
  if (document.readyState === 'complete') {
    window.AdBazaarPixel.pageView();
  } else {
    window.addEventListener('load', function() {
      window.AdBazaarPixel.pageView();
    });
  }

  // Process queued events
  window.AdBazaarPixel.queue.forEach(function(event) {
    window.AdBazaarPixel.track(event.name, event.data);
  });
})();
`;

  res.set('Content-Type', 'application/javascript');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(sdk);
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

app.get('/health', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'healthy',
    service: 'adbazaar-pixel',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  if (mongoose.connection.readyState === 1) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'MongoDB not connected' });
  }
});

// ============================================================================
// WEB TRACKING API
// ============================================================================

app.post('/track', async (req: Request, res: Response) => {
  try {
    const {
      pixel_id,
      event_name,
      event_data,
      user_data,
      context_data,
      timestamp
    } = req.body;

    if (!pixel_id || !event_name) {
      res.status(400).json({ success: false, error: 'pixel_id and event_name required' });
      return;
    }

    const eventId = generateEventId();

    const event = new PixelEvent({
      eventId,
      pixelId: pixel_id,
      event: {
        name: event_name,
        properties: event_data
      },
      user: {
        fbp: user_data?.fbp,
        fbc: user_data?.fbc,
        gp: user_data?.gp,
        ttp: user_data?.ttp,
        email: user_data?.email ? hashEmail(user_data.email) : undefined,
        phone: user_data?.phone ? hashPhone(user_data.phone) : undefined,
        externalId: user_data?.externalId
      },
      context: {
        url: context_data?.url || req.headers.referer,
        referrer: context_data?.referrer,
        userAgent: req.headers['user-agent'],
        ip: getClientIP(req),
        language: req.headers['accept-language']?.split(',')[0]
      },
      device: detectDevice(req.headers['user-agent']),
      attribution: user_data?.attribution,
      revenue: event_data?.value ? {
        value: event_data.value,
        currency: event_data.currency || 'INR'
      } : undefined,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      processed: false
    });

    await event.save();

    // Send to CDP
    sendToCDP(event);

    // Send to ad channels
    sendToAdChannels(event);

    // Check for conversions
    if (isConversionEvent(event_name)) {
      await processConversionEvent(event);
    }

    // Update audience graph
    if (user_data) {
      sendToAudienceGraph(user_data, event.merchantId);
    }

    res.json({ success: true, event_id: eventId });
  } catch (error) {
    logger.error('Track error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// SERVER-SIDE TRACKING API
// ============================================================================

app.post('/server/event', async (req: Request, res: Response) => {
  try {
    const { pixel_id, merchant_id, event_name, event_data, user_data, context_data, timestamp } = req.body;

    if (!pixel_id || !event_name) {
      res.status(400).json({ success: false, error: 'pixel_id and event_name required' });
      return;
    }

    // Verify internal token
    const token = req.headers['x-internal-token'] as string;
    if (token && token !== INTERNAL_TOKEN && token !== process.env.ADMIN_TOKEN) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    const eventId = generateEventId();

    const event = new PixelEvent({
      eventId,
      pixelId: pixel_id,
      merchantId: merchant_id,
      event: {
        name: event_name,
        properties: event_data
      },
      user: {
        fbp: user_data?.fbp,
        fbc: user_data?.fbc,
        gp: user_data?.gp,
        ttp: user_data?.ttp,
        email: user_data?.email ? hashEmail(user_data.email) : undefined,
        phone: user_data?.phone ? hashPhone(user_data.phone) : undefined,
        externalId: user_data?.externalId
      },
      context: {
        url: context_data?.url,
        referrer: context_data?.referrer,
        userAgent: context_data?.userAgent,
        ip: getClientIP(req),
        language: context_data?.language
      },
      device: detectDevice(context_data?.userAgent),
      attribution: context_data?.attribution,
      revenue: event_data?.value ? {
        value: event_data.value,
        currency: event_data.currency || 'INR'
      } : undefined,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      processed: true,
      processedAt: new Date()
    });

    await event.save();
    await sendToCDP(event);
    await sendToAdChannels(event);

    if (isConversionEvent(event_name)) {
      await processConversionEvent(event);
    }

    res.json({ success: true, event_id: eventId });
  } catch (error) {
    logger.error('Server event error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/server/conversion', async (req: Request, res: Response) => {
  try {
    const { pixel_id, merchant_id, conversion_data, test_event_code } = req.body;

    if (test_event_code && test_event_code !== TEST_EVENT_CODE) {
      res.status(401).json({ success: false, error: 'Invalid test code' });
      return;
    }

    // Deduplicate conversions
    const existing = await Conversion.findOne({
      pixelId: pixel_id,
      'event.name': conversion_data.event_name,
      'user.externalId': conversion_data.user_data?.externalId,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (existing) {
      res.json({
        success: true,
        duplicate: true,
        conversion_id: existing.conversionId
      });
      return;
    }

    const conversionId = generateEventId();

    const conversion = new Conversion({
      conversionId,
      pixelId: pixel_id,
      merchantId: merchant_id,
      event: {
        name: conversion_data.event_name,
        value: conversion_data.value,
        currency: conversion_data.currency || 'INR'
      },
      user: {
        fbp: conversion_data.user_data?.fbp,
        fbc: conversion_data.user_data?.fbc,
        email: conversion_data.user_data?.email ? hashEmail(conversion_data.user_data.email) : undefined,
        phone: conversion_data.user_data?.phone ? hashPhone(conversion_data.user_data.phone) : undefined,
        externalId: conversion_data.user_data?.externalId
      },
      attribution: conversion_data.attribution,
      status: 'attributed',
      reportedAt: new Date(),
      timestamp: new Date()
    });

    await conversion.save();
    await reportConversion(conversion);

    res.json({
      success: true,
      conversion_id: conversionId,
      status: 'attributed'
    });
  } catch (error) {
    logger.error('Server conversion error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// PIXEL MANAGEMENT API
// ============================================================================

// Create pixel
app.post('/api/pixels', async (req: Request, res: Response) => {
  try {
    const { merchant_id, name, type, domain, settings } = req.body;

    if (!merchant_id || !name) {
      res.status(400).json({ success: false, error: 'merchant_id and name required' });
      return;
    }

    const pixelId = generatePixelId();

    const pixel = new PixelConfig({
      pixelId,
      merchantId: merchant_id,
      name,
      type: type || 'web',
      domain,
      events: getDefaultEvents(type || 'web'),
      settings: settings || {
        deduplication: true,
        crossDomain: true,
        advancedMatching: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await pixel.save();

    logger.info('Pixel created', { pixelId, merchantId: merchant_id });

    res.status(201).json({
      success: true,
      pixel: {
        id: pixelId,
        name,
        type: pixel.type,
        domain,
        sdk_url: `${process.env.PIXEL_API_URL || 'http://localhost:4962'}/sdk.js?pixel_id=${pixelId}`
      }
    });
  } catch (error) {
    logger.error('Create pixel error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Get merchant's pixels
app.get('/api/pixels/:merchantId', async (req: Request, res: Response) => {
  try {
    const pixels = await PixelConfig.find({ merchantId: req.params.merchantId });

    res.json({
      success: true,
      pixels: pixels.map(p => ({
        id: p.pixelId,
        name: p.name,
        type: p.type,
        domain: p.domain,
        events: p.events.filter(e => e.enabled).map(e => e.name),
        settings: p.settings,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
    });
  } catch (error) {
    logger.error('Get pixels error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Get pixel events
app.get('/api/pixels/:pixelId/events', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit = 100, eventName } = req.query;

    const query: any = { pixelId: req.params.pixelId };

    if (eventName) query['event.name'] = eventName;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const events = await PixelEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    const total = await PixelEvent.countDocuments({ pixelId: req.params.pixelId });

    res.json({
      success: true,
      events: events.map(e => ({
        eventId: e.eventId,
        name: e.event.name,
        properties: e.event.properties,
        user: e.user,
        context: e.context,
        revenue: e.revenue,
        timestamp: e.timestamp,
        processed: e.processed
      })),
      total,
      limit: Number(limit)
    });
  } catch (error) {
    logger.error('Get events error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Get conversions
app.get('/api/conversions', async (req: Request, res: Response) => {
  try {
    const { pixelId, merchantId, startDate, endDate, limit = 100 } = req.query;

    const query: any = {};
    if (pixelId) query.pixelId = pixelId;
    if (merchantId) query.merchantId = merchantId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const conversions = await Conversion.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    const stats = await Conversion.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalValue: { $sum: '$event.value' },
          reported: {
            $sum: { $cond: [{ $eq: ['$status', 'reported'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      conversions: conversions.map(c => ({
        conversionId: c.conversionId,
        event: c.event,
        user: c.user,
        status: c.status,
        reportedTo: c.reportedTo,
        timestamp: c.timestamp
      })),
      stats: stats[0] || { total: 0, totalValue: 0, reported: 0 }
    });
  } catch (error) {
    logger.error('Get conversions error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Get pixel stats
app.get('/api/pixels/:pixelId/stats', async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;

    let startDate = new Date();
    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90d') startDate.setDate(startDate.getDate() - 90);

    const [eventStats, conversionStats] = await Promise.all([
      PixelEvent.aggregate([
        { match: { pixelId: req.params.pixelId, timestamp: { $gte: startDate } } },
        { $group: { _id: '$event.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Conversion.aggregate([
        { match: { pixelId: req.params.pixelId, timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            value: { $sum: '$event.value' },
            avgValue: { $avg: '$event.value' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      period,
      startDate,
      events: eventStats.map(e => ({ name: e._id, count: e.count })),
      conversions: conversionStats[0] || { total: 0, value: 0, avgValue: 0 }
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// AUDIENCE API
// ============================================================================

// Create audience
app.post('/api/audiences', async (req: Request, res: Response) => {
  try {
    const { pixelId, merchantId, name, description, criteria } = req.body;

    const audience = new Audience({
      audienceId: `aud_${generateEventId()}`,
      pixelId,
      merchantId,
      name,
      description,
      criteria,
      size: 0,
      status: 'building'
    });

    await audience.save();

    // Build audience based on criteria
    const query: any = { pixelId };
    if (criteria?.eventName) query['event.name'] = criteria.eventName;
    if (criteria?.minValue) query['revenue.value'] = { $gte: criteria.minValue };

    const users = await PixelEvent.find(query)
      .select('user.fbp user.fbc user.email user.phone user.externalId')
      .limit(10000);

    audience.users = users.map(u => ({
      fbp: u.user.fbp,
      fbc: u.user.fbc,
      email: u.user.email,
      phone: u.user.phone,
      externalId: u.user.externalId,
      addedAt: new Date()
    }));

    audience.size = audience.users.length;
    audience.status = 'ready';
    await audience.save();

    res.status(201).json({
      success: true,
      audience: {
        audienceId: audience.audienceId,
        name: audience.name,
        size: audience.size,
        status: audience.status
      }
    });
  } catch (error) {
    logger.error('Create audience error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Get audiences
app.get('/api/audiences/:merchantId', async (req: Request, res: Response) => {
  try {
    const audiences = await Audience.find({ merchantId: req.params.merchantId });

    res.json({
      success: true,
      audiences: audiences.map(a => ({
        audienceId: a.audienceId,
        name: a.name,
        description: a.description,
        size: a.size,
        status: a.status,
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    logger.error('Get audiences error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Sync audience to ad channels
app.post('/api/audiences/:audienceId/sync', async (req: Request, res: Response) => {
  try {
    const audience = await Audience.findOne({ audienceId: req.params.audienceId });

    if (!audience) {
      res.status(404).json({ success: false, error: 'Audience not found' });
      return;
    }

    const results = {
      meta: 0,
      google: 0,
      tiktok: 0
    };

    for (const user of audience.users) {
      const eventData = {
        user: {
          fbp: user.fbp,
          fbc: user.fbc,
          email: user.email,
          phone: user.phone,
          externalId: user.externalId
        },
        context: {},
        timestamp: new Date()
      };

      if (await sendToMeta(eventData as any)) results.meta++;
      if (await sendToGoogle(eventData as any)) results.google++;
      if (await sendToTikTok(eventData as any)) results.tiktok++;
    }

    res.json({
      success: true,
      synced: results
    });
  } catch (error) {
    logger.error('Sync audience error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// CONVERSION REPORTING
// ============================================================================

async function reportConversion(conversion: any): Promise<void> {
  logger.info('Reporting conversion', { conversionId: conversion.conversionId });

  const eventData = {
    user: conversion.user,
    context: {},
    revenue: conversion.revenue,
    timestamp: conversion.timestamp
  };

  await Promise.allSettled([
    sendToMeta(eventData as any),
    sendToGoogle(eventData as any),
    sendToTikTok(eventData as any)
  ]);
}

// ============================================================================
// SERVER START
// ============================================================================

async function start() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI });
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB connected');

    // Start server
    app.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║     AdBazaar Universal Pixel v1.0.0             ║
║  Port: ${PORT}                                      ║
╠══════════════════════════════════════════════════════════════╣
║  ENDPOINTS:                                       ║
║  GET  /sdk.js?pixel_id=xxx  - Pixel SDK           ║
║  POST /track               - Web tracking       ║
║  POST /server/event        - Server tracking     ║
║  POST /server/conversion   - Server conversion   ║
║  GET  /api/pixels/:id     - Get pixels         ║
║  GET  /api/conversions    - Get conversions    ║
║  POST /api/audiences      - Create audience    ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

start();

export default app;
