/**
 * AdBazaar Customer Data Platform (CDP)
 *
 * Unified customer data platform for AdBazaar advertising.
 * Combines data from all touchpoints to create unified customer profiles.
 *
 * Port: 4901
 *
 * Features:
 * - Unified Customer Profiles
 * - Identity Resolution
 * - Customer Segmentation
 * - Audience Sync
 * - Data Activation
 * - Privacy Compliance
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import winston from 'winston';
import promClient from 'prom-client';
import axios from 'axios';

promClient.collectDefaultMetrics();
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '4901', 10);

// Config
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adbazaar-cdp';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';

// Audience Intelligence URL
const AUDIENCE_INTELLIGENCE_URL = process.env.AUDIENCE_INTELLIGENCE_URL || 'http://localhost:4805';
const PIXEL_SERVICE_URL = process.env.PIXEL_SERVICE_URL || 'http://localhost:4962';

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/cdp.log' })
  ]
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req: Request, _res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// Unified Customer Profile
const customerProfileSchema = new mongoose.Schema({
  customerId: { type: String, unique: true, index: true },
  corpId: String,

  // Identity
  identifiers: [{
    type: { type: String },
    value: String,
    verified: Boolean,
    firstSeen: Date,
    lastSeen: Date
  }],

  // Demographics
  demographics: {
    age: Number,
    gender: String,
    location: {
      city: String,
      state: String,
      country: String,
      pincode: String
    }
  },

  // Commerce Data
  commerce: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 },
    lastOrderDate: Date,
    favoriteCategories: [String],
    favoriteBrands: [String]
  },

  // Intent Signals
  intent: {
    signals: [{
      type: String,
      query: String,
      category: String,
      score: Number,
      timestamp: Date
    }],
    primaryIntent: String,
    intentScore: Number
  },

  // Engagement
  engagement: {
    totalVisits: { type: Number, default: 0 },
    lastVisit: Date,
    avgSessionDuration: Number,
    devices: [String],
    channels: [String]
  },

  // Consent
  consent: {
    marketing: { type: Boolean, default: false },
    personalization: { type: Boolean, default: false },
    thirdPartySharing: { type: Boolean, default: false },
    gdprConsent: { type: Boolean, default: false },
    updatedAt: Date
  },

  // Segments
  segments: [{
    segmentId: String,
    segmentName: String,
    addedAt: Date,
    score: Number
  }],

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

customerProfileSchema.index({ 'commerce.totalSpent': -1 });
customerProfileSchema.index({ 'intent.primaryIntent': 1 });
customerProfileSchema.index({ 'engagement.totalVisits': -1 });
customerProfileSchema.index({ 'segments.segmentId': 1 });

const CustomerProfile = mongoose.model('CustomerProfile', customerProfileSchema);

// Customer Activity
const activitySchema = new mongoose.Schema({
  activityId: { type: String, unique: true, index: true },
  customerId: { type: String, index: true },
  type: { type: String, enum: ['pageview', 'addtocart', 'purchase', 'search', 'custom'] },
  properties: mongoose.Schema.Types.Mixed,
  source: String,
  channel: String,
  device: String,
  timestamp: { type: Date, default: Date.now }
});

activitySchema.index({ customerId: 1, timestamp: -1 });
activitySchema.index({ type: 1, timestamp: -1 });

const CustomerActivity = mongoose.model('CustomerActivity', activitySchema);

// Segment Definition
const segmentDefinitionSchema = new mongoose.Schema({
  segmentId: { type: String, unique: true, index: true },
  name: String,
  description: String,
  type: { type: String, enum: ['behavioral', 'demographic', 'intent', 'purchase', 'engagement'] },
  criteria: mongoose.Schema.Types.Mixed,
  size: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'building'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SegmentDefinition = mongoose.model('SegmentDefinition', segmentDefinitionSchema);

// ============================================================================
// HEALTH
// ============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    service: 'adbazaar-cdp',
    version: '1.0.0',
    port: PORT,
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API Info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'AdBazaar CDP',
    version: '1.0.0',
    description: 'Customer Data Platform',
    endpoints: {
      profiles: '/api/profiles',
      activities: '/api/activities',
      segments: '/api/segments',
      audiences: '/api/audiences',
      sync: '/api/sync'
    }
  });
});

// ============================================================================
// CUSTOMER PROFILE API
// ============================================================================

/**
 * POST /api/profiles
 * Create or update customer profile
 */
app.post('/api/profiles', async (req: Request, res: Response) => {
  try {
    const { customerId, corpId, identifiers, demographics, commerce, intent, consent } = req.body;

    if (!customerId) {
      res.status(400).json({ success: false, error: 'customerId required' });
      return;
    }

    const profile = await CustomerProfile.findOneAndUpdate(
      { customerId },
      {
        $set: {
          corpId,
          ...(identifiers && { identifiers }),
          ...(demographics && { demographics }),
          ...(commerce && { commerce }),
          ...(intent && { intent }),
          ...(consent && { consent, 'consent.updatedAt': new Date() }),
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, new: true }
    );

    logger.info('Profile upserted', { customerId });

    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('Profile error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/profiles/:customerId
 * Get customer profile
 */
app.get('/api/profiles/:customerId', async (req: Request, res: Response) => {
  try {
    const profile = await CustomerProfile.findOne({ customerId: req.params.customerId });

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('Get profile error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/profiles
 * Search profiles
 */
app.get('/api/profiles', async (req: Request, res: Response) => {
  try {
    const { segment, intent, minSpent, limit = 100 } = req.query;

    const query: any = {};

    if (segment) query['segments.segmentId'] = segment;
    if (intent) query['intent.primaryIntent'] = intent;
    if (minSpent) query['commerce.totalSpent'] = { $gte: Number(minSpent) };

    const profiles = await CustomerProfile.find(query)
      .sort({ updatedAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        profiles,
        count: profiles.length
      }
    });
  } catch (error) {
    logger.error('Search profiles error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/profiles/identify
 * Identity resolution
 */
app.post('/api/profiles/identify', async (req: Request, res: Response) => {
  try {
    const { email, phone, externalId, fbp, fbc, deviceId } = req.body;

    // Find existing profiles matching identifiers
    const identifiers = [];
    if (email) identifiers.push({ type: 'email', value: email.toLowerCase() });
    if (phone) identifiers.push({ type: 'phone', value: phone.replace(/\D/g, '') });
    if (externalId) identifiers.push({ type: 'externalId', value: externalId });
    if (fbp) identifiers.push({ type: 'fbp', value: fbp });
    if (fbc) identifiers.push({ type: 'fbc', value: fbc });
    if (deviceId) identifiers.push({ type: 'deviceId', value: deviceId });

    // Check for existing profile
    let profile = await CustomerProfile.findOne({
      $or: [
        { 'identifiers.value': email?.toLowerCase() },
        { 'identifiers.value': phone?.replace(/\D/g, '') },
        { 'identifiers.value': externalId },
        { 'identifiers.value': fbp }
      ]
    });

    // Or create new profile
    if (!profile) {
      const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      profile = new CustomerProfile({
        customerId,
        identifiers: identifiers.map(i => ({ ...i, verified: true, firstSeen: new Date(), lastSeen: new Date() })),
        segments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await profile.save();
    }

    // Update identifiers
    for (const identifier of identifiers) {
      const existing = profile.identifiers.find(i => i.type === identifier.type);
      if (!existing) {
        profile.identifiers.push({ ...identifier, verified: true, firstSeen: new Date(), lastSeen: new Date() });
      } else {
        existing.lastSeen = new Date();
        existing.verified = true;
      }
    }
    profile.updatedAt = new Date();
    await profile.save();

    res.json({
      success: true,
      data: {
        customerId: profile.customerId,
        isNew: !profile.createdAt || (Date.now() - profile.createdAt.getTime() < 60000),
        identifiers: profile.identifiers.length
      }
    });
  } catch (error) {
    logger.error('Identify error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/profiles/:customerId/segments
 * Add customer to segment
 */
app.post('/api/profiles/:customerId/segments', async (req: Request, res: Response) => {
  try {
    const { segmentId, segmentName, score } = req.body;

    const profile = await CustomerProfile.findOne({ customerId: req.params.customerId });

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    // Add segment if not already present
    const existing = profile.segments.find(s => s.segmentId === segmentId);
    if (!existing) {
      profile.segments.push({
        segmentId,
        segmentName,
        score: score || 1,
        addedAt: new Date()
      });
    } else {
      existing.score = score || existing.score;
    }

    profile.updatedAt = new Date();
    await profile.save();

    res.json({ success: true, data: profile.segments });
  } catch (error) {
    logger.error('Add segment error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// ACTIVITY API
// ============================================================================

/**
 * POST /api/activities
 * Track customer activity
 */
app.post('/api/activities', async (req: Request, res: Response) => {
  try {
    const { customerId, type, properties, source, channel, device } = req.body;

    if (!customerId || !type) {
      res.status(400).json({ success: false, error: 'customerId and type required' });
      return;
    }

    const activityId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const activity = new CustomerActivity({
      activityId,
      customerId,
      type,
      properties,
      source,
      channel,
      device,
      timestamp: new Date()
    });

    await activity.save();

    // Update customer profile
    await CustomerProfile.findOneAndUpdate(
      { customerId },
      {
        $inc: { 'engagement.totalVisits': 1 },
        $set: {
          'engagement.lastVisit': new Date(),
          updatedAt: new Date()
        }
      }
    );

    // If purchase, update commerce data
    if (type === 'purchase' && properties?.orderValue) {
      await CustomerProfile.findOneAndUpdate(
        { customerId },
        {
          $inc: {
            'commerce.totalOrders': 1,
            'commerce.totalSpent': properties.orderValue
          },
          $set: {
            'commerce.lastOrderDate': new Date(),
            'commerce.avgOrderValue': properties.orderValue,
            updatedAt: new Date()
          }
        }
      );
    }

    res.json({ success: true, data: { activityId } });
  } catch (error) {
    logger.error('Activity error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/activities/:customerId
 * Get customer activities
 */
app.get('/api/activities/:customerId', async (req: Request, res: Response) => {
  try {
    const { type, limit = 50 } = req.query;

    const query: any = { customerId: req.params.customerId };
    if (type) query.type = type;

    const activities = await CustomerActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
  } catch (error) {
    logger.error('Get activities error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// SEGMENTS API
// ============================================================================

/**
 * POST /api/segments
 * Create segment
 */
app.post('/api/segments', async (req: Request, res: Response) => {
  try {
    const { name, description, type, criteria } = req.body;

    if (!name || !criteria) {
      res.status(400).json({ success: false, error: 'name and criteria required' });
      return;
    }

    const segmentId = `seg_${Date.now()}`;

    const segment = new SegmentDefinition({
      segmentId,
      name,
      description,
      type: type || 'behavioral',
      criteria,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await segment.save();

    res.status(201).json({ success: true, data: segment });
  } catch (error) {
    logger.error('Create segment error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/segments
 * List segments
 */
app.get('/api/segments', async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;

    const query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const segments = await SegmentDefinition.find(query).sort({ createdAt: -1 });

    res.json({ success: true, data: segments });
  } catch (error) {
    logger.error('List segments error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/segments/:segmentId/evaluate
 * Evaluate segment and update customer counts
 */
app.post('/api/segments/:segmentId/evaluate', async (req: Request, res: Response) => {
  try {
    const segment = await SegmentDefinition.findOne({ segmentId: req.params.segmentId });

    if (!segment) {
      res.status(404).json({ success: false, error: 'Segment not found' });
      return;
    }

    // Build MongoDB query from criteria
    const query = buildSegmentQuery(segment.criteria);
    const count = await CustomerProfile.countDocuments(query);

    segment.size = count;
    segment.updatedAt = new Date();
    await segment.save();

    res.json({ success: true, data: { segmentId: segment.segmentId, size: count } });
  } catch (error) {
    logger.error('Evaluate segment error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/segments/:segmentId/customers
 * Get customers in segment
 */
app.get('/api/segments/:segmentId/customers', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;

    const segment = await SegmentDefinition.findOne({ segmentId: req.params.segmentId });

    if (!segment) {
      res.status(404).json({ success: false, error: 'Segment not found' });
      return;
    }

    const query = buildSegmentQuery(segment.criteria);
    const customers = await CustomerProfile.find(query)
      .select('customerId demographics commerce intent segments')
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        customers,
        count: customers.length,
        segmentSize: segment.size
      }
    });
  } catch (error) {
    logger.error('Get segment customers error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// AUDIENCE SYNC API
// ============================================================================

/**
 * POST /api/audiences/sync
 * Sync segment to ad channels
 */
app.post('/api/audiences/sync', async (req: Request, res: Response) => {
  try {
    const { segmentId, channels = ['meta', 'google', 'tiktok'] } = req.body;

    const segment = await SegmentDefinition.findOne({ segmentId });

    if (!segment) {
      res.status(404).json({ success: false, error: 'Segment not found' });
      return;
    }

    // Get segment customers
    const query = buildSegmentQuery(segment.criteria);
    const customers = await CustomerProfile.find(query)
      .select('identifiers')
      .limit(10000);

    // Prepare audience data
    const audience = customers.map(c => ({
      fbp: c.identifiers.find(i => i.type === 'fbp')?.value,
      fbc: c.identifiers.find(i => i.type === 'fbc')?.value,
      email: c.identifiers.find(i => i.type === 'email')?.value,
      phone: c.identifiers.find(i => i.type === 'phone')?.value,
      externalId: c.identifiers.find(i => i.type === 'externalId')?.value
    })).filter(a => a.fbp || a.email || a.phone);

    // Sync to Audience Intelligence
    if (channels.includes('audience_intelligence')) {
      try {
        await axios.post(`${AUDIENCE_INTELLIGENCE_URL}/api/segments/create`, {
          name: segment.name,
          criteria: segment.criteria
        }, {
          headers: { 'X-Internal-Service': 'adbazaar-cdp', 'X-Internal-Token': INTERNAL_TOKEN }
        });
      } catch (error) {
        logger.warn('Failed to sync to audience intelligence', { error });
      }
    }

    // Sync to Pixel Service
    if (channels.includes('pixel')) {
      try {
        await axios.post(`${PIXEL_SERVICE_URL}/api/audiences`, {
          segmentId: segment.segmentId,
          merchantId: 'SYSTEM',
          name: segment.name,
          criteria: segment.criteria
        }, {
          headers: { 'X-Internal-Service': 'adbazaar-cdp', 'X-Internal-Token': INTERNAL_TOKEN }
        });
      } catch (error) {
        logger.warn('Failed to sync to pixel service', { error });
      }
    }

    res.json({
      success: true,
      data: {
        segmentId,
        audienceSize: audience.length,
        synced: channels
      }
    });
  } catch (error) {
    logger.error('Sync audience error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/audiences/export
 * Export audience to file
 */
app.get('/api/audiences/export', async (req: Request, res: Response) => {
  try {
    const { segmentId, format = 'json' } = req.query;

    const segment = await SegmentDefinition.findOne({ segmentId: segmentId as string });

    if (!segment) {
      res.status(404).json({ success: false, error: 'Segment not found' });
      return;
    }

    const query = buildSegmentQuery(segment.criteria);
    const customers = await CustomerProfile.find(query).limit(50000);

    if (format === 'csv') {
      const headers = ['customerId', 'email', 'phone'];
      const rows = customers.map(c => [
        c.customerId,
        c.identifiers.find(i => i.type === 'email')?.value || '',
        c.identifiers.find(i => i.type === 'phone')?.value || ''
      ].join(','));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${segmentId}.csv"`);
      res.send([headers.join(','), ...rows].join('\n'));
    } else {
      res.json({
        success: true,
        data: {
          segmentId,
          customers: customers.map(c => ({
            customerId: c.customerId,
            identifiers: c.identifiers,
            demographics: c.demographics,
            commerce: c.commerce,
            intent: c.intent
          })),
          count: customers.length
        }
      });
    }
  } catch (error) {
    logger.error('Export audience error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// EVENTS API (for Pixel integration)
// ============================================================================

/**
 * POST /api/events
 * Receive events from pixel
 */
app.post('/api/events', async (req: Request, res: Response) => {
  try {
    const { eventId, pixelId, merchantId, eventName, eventData, user, context, revenue, timestamp } = req.body;

    // Find or create customer
    let profile = await CustomerProfile.findOne({
      $or: [
        { 'identifiers.value': user?.fbp },
        { 'identifiers.value': user?.email },
        { 'identifiers.value': user?.externalId }
      ]
    });

    if (!profile) {
      const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      profile = new CustomerProfile({
        customerId,
        identifiers: [],
        segments: []
      });
    }

    // Add identifiers
    if (user?.fbp && !profile.identifiers.find(i => i.type === 'fbp')) {
      profile.identifiers.push({ type: 'fbp', value: user.fbp, verified: true, firstSeen: new Date(), lastSeen: new Date() });
    }
    if (user?.email && !profile.identifiers.find(i => i.type === 'email')) {
      profile.identifiers.push({ type: 'email', value: user.email.toLowerCase(), verified: true, firstSeen: new Date(), lastSeen: new Date() });
    }

    // Track activity
    const activityId = `act_${Date.now()}`;
    const activity = new CustomerActivity({
      activityId,
      customerId: profile.customerId,
      type: eventName.toLowerCase().replace(/\s/g, ''),
      properties: eventData,
      source: pixelId,
      channel: 'pixel',
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    await activity.save();

    // Update engagement
    profile.engagement.totalVisits = (profile.engagement.totalVisits || 0) + 1;
    profile.engagement.lastVisit = new Date();
    profile.updatedAt = new Date();

    // Update commerce if purchase
    if (eventName === 'Purchase' && revenue?.value) {
      profile.commerce.totalOrders = (profile.commerce.totalOrders || 0) + 1;
      profile.commerce.totalSpent = (profile.commerce.totalSpent || 0) + revenue.value;
      profile.commerce.avgOrderValue = revenue.value;
      profile.commerce.lastOrderDate = new Date();
    }

    await profile.save();

    // Update intent signals
    if (['Search', 'ViewContent', 'AddToCart'].includes(eventName)) {
      // Will be processed by Intent Service
    }

    res.json({ success: true, data: { customerId: profile.customerId } });
  } catch (error) {
    logger.error('Event error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/audiences/match
 * Match user to audience graph
 */
app.post('/api/audiences/match', async (req: Request, res: Response) => {
  try {
    const { merchantId, user, timestamp } = req.body;

    // Find profile
    let profile = await CustomerProfile.findOne({
      $or: [
        { 'identifiers.value': user?.email },
        { 'identifiers.value': user?.phone },
        { 'identifiers.value': user?.externalId }
      ]
    });

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    // Update identifiers
    if (user?.email) {
      const existing = profile.identifiers.find(i => i.type === 'email');
      if (existing) {
        existing.lastSeen = new Date();
      }
    }

    profile.updatedAt = new Date();
    await profile.save();

    res.json({
      success: true,
      data: {
        customerId: profile.customerId,
        segments: profile.segments
      }
    });
  } catch (error) {
    logger.error('Audience match error', { error });
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildSegmentQuery(criteria: any): any {
  const query: any = {};

  if (!criteria) return query;

  // Demographics
  if (criteria.ageMin) {
    query['demographics.age'] = { ...query['demographics.age'], $gte: criteria.ageMin };
  }
  if (criteria.ageMax) {
    query['demographics.age'] = { ...query['demographics.age'], $lte: criteria.ageMax };
  }
  if (criteria.gender) {
    query['demographics.gender'] = criteria.gender;
  }
  if (criteria.city) {
    query['demographics.location.city'] = criteria.city;
  }

  // Commerce
  if (criteria.minTotalSpent) {
    query['commerce.totalSpent'] = { $gte: criteria.minTotalSpent };
  }
  if (criteria.minOrders) {
    query['commerce.totalOrders'] = { $gte: criteria.minOrders };
  }

  // Intent
  if (criteria.primaryIntent) {
    query['intent.primaryIntent'] = criteria.primaryIntent;
  }
  if (criteria.intentCategories?.length) {
    query['intent.signals.category'] = { $in: criteria.intentCategories };
  }

  // Engagement
  if (criteria.minVisits) {
    query['engagement.totalVisits'] = { $gte: criteria.minVisits };
  }

  // Segments
  if (criteria.segmentIds?.length) {
    query['segments.segmentId'] = { $in: criteria.segmentIds };
  }

  // Consent
  if (criteria.consentRequired) {
    query['consent.marketing'] = true;
  }

  return query;
}

// ============================================================================
// SERVER START
// ============================================================================

async function start() {
  try {
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI });
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB connected');

    app.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║     AdBazaar CDP v1.0.0                          ║
║  Port: ${PORT}                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Features:                                          ║
║  • Unified Customer Profiles                      ║
║  • Identity Resolution                           ║
║  • Customer Segmentation                        ║
║  • Audience Sync                                ║
║  • Privacy Compliance                           ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

start();

export default app;
