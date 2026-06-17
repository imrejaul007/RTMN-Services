/**
 * Media OS - Complete AI-Native Media Operating System
 *
 * Version: 2.0.0
 * Port: 5600
 * Industry: Media & Entertainment
 *
 * Features:
 * - Content OS: Channels, Programs, Episodes, Content
 * - Creator OS: Profiles, Brand Deals, Payments
 * - Audience OS: Viewers, Subscriptions, Recommendations
 * - Advertising OS: Campaigns, Bookings, Attribution
 * - Revenue OS: Subscriptions, PPV, Invoicing
 * - Rights OS: Licenses, Territories, Royalties
 * - Production OS: Studios, Equipment, Crew
 * - Digital Twins: Viewer, Creator, Content, Campaign
 * - RTMN Integration: HOJAI AI, CorpID, TwinOS, Event Bus
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Configuration
const config = require('./config');
const logger = require('./config/database');

// Database & Models
const { connectDB, seedData, ...models } = require('./models');

// Middleware
const { authenticate, optionalAuth, authorize, generateToken } = require('./middleware');
const { validate, paginationSchema, mongoIdSchema } = require('./middleware/validation');

// Services
const { rtmnService, eventBus, EVENTS } = require('./services');
const { twinService, TWIN_TYPES } = require('./twins');

// ============================================
// APP INITIALIZATION
// ============================================

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.RTMN_SERVICES.HOJAI_AI],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// ============================================
// RATE LIMITING
// ============================================

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.AUTH_WINDOW_MS,
  max: config.RATE_LIMIT.AUTH_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limits
app.use('/api', apiLimiter);
app.use('/auth', authLimiter);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      code: 'INVALID_ID',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
});

// ============================================
// HEALTH ENDPOINTS
// ============================================

// Basic health check
app.get('/health', async (req, res) => {
  try {
    const dbState = models.Viewer.db.readyState;
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const twinStats = twinService.getStats();

    res.json({
      status: 'healthy',
      service: 'media-os',
      version: '2.0.0',
      port: config.PORT,
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStates[dbState] || 'unknown',
        connected: dbState === 1,
      },
      twins: twinStats,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    const dbState = models.Viewer.db.readyState;
    const rtmnHealth = await rtmnService.checkAllServicesHealth();
    const twinStats = twinService.getStats();
    const eventStats = eventBus.getStats();

    const allHealthy = dbState === 1 && rtmnHealth.every(s => s.status === 'healthy');

    res.json({
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'media-os',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components: {
        database: {
          status: dbState === 1 ? 'healthy' : 'unhealthy',
          state: dbState,
        },
        rtmServices: rtmnHealth,
        twins: twinStats,
        events: eventStats,
      },
      process: {
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    });
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Readiness check
app.get('/ready', async (req, res) => {
  const dbState = models.Viewer.db.readyState;

  if (dbState !== 1) {
    return res.status(503).json({
      ready: false,
      reason: 'Database not connected',
    });
  }

  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

// Liveness check
app.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// RTMN LAYERS ENDPOINT
// ============================================

app.get('/api/layers', (req, res) => {
  res.json({
    industry: 'media',
    service: 'Media OS',
    version: '2.0.0',
    layers: [
      { layer: 1, name: 'Intelligence', provider: 'HOJAI AI', port: 4560, status: 'available' },
      { layer: 2, name: 'Customer Growth', provider: 'AdBazaar', port: 4800, status: 'available' },
      { layer: 3, name: 'Commerce', provider: 'Nexha + REZ-Merchant', status: 'available' },
      { layer: 4, name: 'Financial', provider: 'RABTUL', port: 4004, status: 'available' },
      { layer: 5, name: 'Workforce', provider: 'CorpPerks', status: 'available' },
      { layer: 6, name: 'Legal & Trust', provider: 'LawGens', status: 'available' },
      { layer: 7, name: 'Property', provider: 'RisnaEstate + StayOwn', status: 'available' },
      { layer: 8, name: 'Health', provider: 'RisaCare', status: 'available' },
      { layer: 9, name: 'Mobility', provider: 'KHAIRMOVE', status: 'available' },
      { layer: 10, name: 'Identity', provider: 'CorpID', port: 4702, status: 'available' },
      { layer: 11, name: 'Memory', provider: 'MemoryOS', port: 4703, status: 'available' },
      { layer: 12, name: 'Twins', provider: 'TwinOS Hub', port: 4705, status: 'available' },
      { layer: 13, name: 'Automation', provider: 'FlowOS', status: 'available' },
      { layer: 14, name: 'Autonomous', provider: 'SUTAR OS', port: 4140, status: 'available' },
      { layer: 15, name: 'Network', provider: 'REZ Consumer + Axom', status: 'available' },
    ],
  });
});

app.get('/api/layer/:layer', async (req, res) => {
  const layerNum = parseInt(req.params.layer);

  const layerInfo = {
    1: { name: 'Intelligence', provider: 'HOJAI AI', capabilities: ['AI Script Writer', 'AI Editor', 'AI Translator', 'AI Moderator'] },
    2: { name: 'Customer Growth', provider: 'AdBazaar', capabilities: ['Audience Segments', 'Campaign Targeting', 'Attribution'] },
    3: { name: 'Commerce', provider: 'Nexha + REZ-Merchant', capabilities: ['Ad Sales', 'Content Licensing', 'PPV'] },
    4: { name: 'Financial', provider: 'RABTUL', capabilities: ['Ad Billing', 'Subscription Billing', 'Creator Payouts'] },
    5: { name: 'Workforce', provider: 'CorpPerks', capabilities: ['Staff Management', 'Payroll'] },
    6: { name: 'Legal & Trust', provider: 'LawGens', capabilities: ['Contracts', 'Compliance', 'Risk'] },
    7: { name: 'Property', provider: 'RisnaEstate + StayOwn', capabilities: ['Studios', 'Venues'] },
    8: { name: 'Health', provider: 'RisaCare', capabilities: ['Content Safety', 'Moderation'] },
    9: { name: 'Mobility', provider: 'KHAIRMOVE', capabilities: ['Delivery', 'Logistics'] },
    10: { name: 'Identity', provider: 'CorpID', capabilities: ['Universal Identity', 'Verification'] },
    11: { name: 'Memory', provider: 'MemoryOS', capabilities: ['Viewer Preferences', 'Watch History'] },
    12: { name: 'Twins', provider: 'TwinOS Hub', capabilities: ['Viewer Twin', 'Creator Twin', 'Content Twin'] },
    13: { name: 'Automation', provider: 'FlowOS', capabilities: ['Workflows', 'Approvals'] },
    14: { name: 'Autonomous', provider: 'SUTAR OS', capabilities: ['Goals', 'Decisions', 'Autonomy'] },
    15: { name: 'Network', provider: 'REZ Consumer + Axom', capabilities: ['Discovery', 'Referrals', 'Community'] },
  };

  if (!layerInfo[layerNum]) {
    return res.status(404).json({
      success: false,
      error: 'Layer not found',
      code: 'LAYER_NOT_FOUND',
    });
  }

  const info = layerInfo[layerNum];
  const health = await rtmnService.checkServiceHealth(info.provider.toUpperCase().replace(' ', '_'));

  res.json({
    layer: layerNum,
    ...info,
    health,
    status: health.status === 'healthy' ? 'available' : 'degraded',
  });
});

// ============================================
// AUTH ROUTES
// ============================================

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    // Check if user exists
    const existingUser = await models.Viewer.findOne({ 'profile.email': email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        code: 'USER_EXISTS',
      });
    }

    // Create user
    const user = new models.Viewer({
      profile: {
        displayName: name,
        email,
        phone,
      },
      corpid: null,
      status: 'active',
    });

    // Note: In production, hash the password properly
    await user.save();

    // Generate token
    const token = generateToken({
      sub: user._id,
      email: user.profile.email,
      role: role || 'viewer',
      industry: 'media',
    });

    logger.info('User registered', { userId: user._id, email });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.profile.email,
        name: user.profile.displayName,
        role: role || 'viewer',
      },
    });
  } catch (error) {
    logger.error('Registration failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_FAILED',
    });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await models.Viewer.findOne({ 'profile.email': email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Note: In production, verify password hash
    const token = generateToken({
      sub: user._id,
      email: user.profile.email,
      role: 'viewer',
      industry: 'media',
    });

    logger.info('User logged in', { userId: user._id, email });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.profile.email,
        name: user.profile.displayName,
        role: 'viewer',
      },
    });
  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_FAILED',
    });
  }
});

app.get('/auth/verify', authenticate, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: req.user,
  });
});

// ============================================
// VIEWER ROUTES
// ============================================

// Get all viewers
app.get('/api/viewers', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, subscription } = req.query;

    const query = {};
    if (status) query.status = status;
    if (subscription) query['subscription.plan'] = subscription;

    const total = await models.Viewer.countDocuments(query);
    const viewers = await models.Viewer.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      viewers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch viewers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch viewers',
    });
  }
});

// Get viewer by ID
app.get('/api/viewers/:id', authenticate, async (req, res) => {
  try {
    const viewer = await models.Viewer.findById(req.params.id).select('-__v');

    if (!viewer) {
      return res.status(404).json({
        success: false,
        error: 'Viewer not found',
        code: 'VIEWER_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      viewer,
    });
  } catch (error) {
    logger.error('Failed to fetch viewer', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch viewer',
    });
  }
});

// Create viewer
app.post('/api/viewers', validate(require('./middleware/validation').createViewerSchema), async (req, res) => {
  try {
    const viewer = new models.Viewer({
      profile: {
        displayName: req.body.displayName,
        email: req.body.email,
        phone: req.body.phone,
        avatar: req.body.avatar,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
      },
      location: req.body.location,
      preferences: req.body.preferences,
    });

    await viewer.save();

    // Create Viewer Twin
    const twin = twinService.createTwin(TWIN_TYPES.VIEWER, viewer._id.toString(), viewer.toObject());
    viewer.twinId = twin.twinId;
    await viewer.save();

    // Publish event
    eventBus.publish(EVENTS.VIEWER_CREATED, { viewerId: viewer._id });

    res.status(201).json({
      success: true,
      viewer,
      twin: twin.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to create viewer', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create viewer',
    });
  }
});

// Update viewer
app.patch('/api/viewers/:id', authenticate, async (req, res) => {
  try {
    const viewer = await models.Viewer.findById(req.params.id);

    if (!viewer) {
      return res.status(404).json({
        success: false,
        error: 'Viewer not found',
      });
    }

    // Check ownership or admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key === 'profile') {
        Object.assign(viewer.profile, req.body.profile);
      } else if (key === 'location') {
        Object.assign(viewer.location, req.body.location);
      } else if (key === 'preferences') {
        Object.assign(viewer.preferences, req.body.preferences);
      } else {
        viewer[key] = req.body[key];
      }
    });

    await viewer.save();

    // Update twin
    if (viewer.twinId) {
      twinService.updateTwin(viewer.twinId, viewer.toObject());
    }

    eventBus.publish(EVENTS.VIEWER_UPDATED, { viewerId: viewer._id, updatedBy: req.user.id });

    res.json({
      success: true,
      viewer,
    });
  } catch (error) {
    logger.error('Failed to update viewer', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update viewer',
    });
  }
});

// Watch history
app.post('/api/viewers/:id/watch', authenticate, async (req, res) => {
  try {
    const { contentId, progress, watchTime } = req.body;

    const viewer = await models.Viewer.findById(req.params.id);
    if (!viewer) {
      return res.status(404).json({
        success: false,
        error: 'Viewer not found',
      });
    }

    await viewer.updateWatchHistory(contentId, progress, watchTime);

    // Publish events
    eventBus.publish(EVENTS.VIEWER_WATCH_STARTED, { viewerId: viewer._id, contentId });

    if (progress >= 90) {
      eventBus.publish(EVENTS.VIEWER_WATCH_COMPLETED, { viewerId: viewer._id, contentId });
    }

    // Update twin
    if (viewer.twinId) {
      twinService.updateTwin(viewer.twinId, {
        ...viewer.toObject(),
        contentAffinity: { ...(viewer.contentAffinity || {}), [contentId]: progress / 100 },
      });
    }

    res.json({
      success: true,
      watchHistory: viewer.watchHistory,
    });
  } catch (error) {
    logger.error('Failed to update watch history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update watch history',
    });
  }
});

// ============================================
// CONTENT ROUTES
// ============================================

// Get all content
app.get('/api/content', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, genre, language, status, search } = req.query;

    const query = {};
    if (type) query.type = type;
    if (genre) query.genres = genre;
    if (language) query.language = language;
    if (status) query.status = status;
    if (search) {
      query.$text = { $search: search };
    }

    const total = await models.Content.countDocuments(query);
    const content = await models.Content.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch content', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content',
    });
  }
});

// Get content by ID
app.get('/api/content/:id', optionalAuth, async (req, res) => {
  try {
    const content = await models.Content.findById(req.params.id)
      .populate('broadcaster', 'name logo')
      .select('-__v');

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
        code: 'CONTENT_NOT_FOUND',
      });
    }

    // Get recommendations from HOJAI AI
    let recommendations = [];
    if (req.user) {
      try {
        const recs = await rtmnService.getRecommendations(req.user.id, {
          limit: 5,
          contentTypes: [content.type],
          genres: content.genres,
        });
        recommendations = recs.recommendations || [];
      } catch (e) {
        // Ignore recommendation errors
      }
    }

    res.json({
      success: true,
      content,
      recommendations,
    });
  } catch (error) {
    logger.error('Failed to fetch content', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content',
    });
  }
});

// Create content
app.post('/api/content', authenticate, authorize('admin', 'producer'), async (req, res) => {
  try {
    const content = new models.Content(req.body);
    await content.save();

    // Create Content Twin
    const twin = twinService.createTwin(TWIN_TYPES.CONTENT, content._id.toString(), content.toObject());
    content.twinId = twin.twinId;
    await content.save();

    // Publish event
    eventBus.publish(EVENTS.CONTENT_CREATED, { contentId: content._id, type: content.type });

    res.status(201).json({
      success: true,
      content,
      twin: twin.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to create content', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create content',
    });
  }
});

// Update content
app.patch('/api/content/:id', authenticate, authorize('admin', 'producer'), async (req, res) => {
  try {
    const content = await models.Content.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      });
    }

    // Update twin
    if (content.twinId) {
      twinService.updateTwin(content.twinId, content.toObject());
    }

    res.json({
      success: true,
      content,
    });
  } catch (error) {
    logger.error('Failed to update content', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update content',
    });
  }
});

// Publish content
app.post('/api/content/:id/publish', authenticate, authorize('admin', 'producer'), async (req, res) => {
  try {
    const content = await models.Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      });
    }

    content.status = 'published';
    content.publishedAt = new Date();
    await content.save();

    // Publish event
    eventBus.publish(EVENTS.CONTENT_PUBLISHED, {
      contentId: content._id,
      type: content.type,
      title: content.title,
    });

    res.json({
      success: true,
      content,
    });
  } catch (error) {
    logger.error('Failed to publish content', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to publish content',
    });
  }
});

// ============================================
// CHANNEL ROUTES
// ============================================

// Get all channels
app.get('/api/channels', optionalAuth, async (req, res) => {
  try {
    const { type, language, subscriptionType } = req.query;

    const query = {};
    if (type) query.type = type;
    if (language) query.language = language;
    if (subscriptionType) query.subscriptionType = subscriptionType;

    const channels = await models.Channel.find(query).sort('name');

    res.json({
      success: true,
      channels,
      count: channels.length,
    });
  } catch (error) {
    logger.error('Failed to fetch channels', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels',
    });
  }
});

// Get channel by ID
app.get('/api/channels/:id', optionalAuth, async (req, res) => {
  try {
    const channel = await models.Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found',
      });
    }

    // Get programs for this channel
    const programs = await models.Program.find({ channel: channel._id, status: 'active' });

    res.json({
      success: true,
      channel,
      programs,
    });
  } catch (error) {
    logger.error('Failed to fetch channel', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel',
    });
  }
});

// ============================================
// CREATOR ROUTES
// ============================================

// Get all creators
app.get('/api/creators', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, niche } = req.query;

    const query = {};
    if (status) query.status = status;
    if (niche) query.niche = niche;

    const total = await models.Creator.countDocuments(query);
    const creators = await models.Creator.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-audience.totalReach')
      .select('-__v');

    res.json({
      success: true,
      creators,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch creators', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch creators',
    });
  }
});

// Get creator by ID
app.get('/api/creators/:id', optionalAuth, async (req, res) => {
  try {
    const creator = await models.Creator.findById(req.params.id).select('-__v');

    if (!creator) {
      return res.status(404).json({
        success: false,
        error: 'Creator not found',
        code: 'CREATOR_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      creator,
    });
  } catch (error) {
    logger.error('Failed to fetch creator', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch creator',
    });
  }
});

// Create creator
app.post('/api/creators', authenticate, validate(require('./middleware/validation').createCreatorSchema), async (req, res) => {
  try {
    const creator = new models.Creator({
      profile: {
        displayName: req.body.displayName,
        handle: req.body.handle,
        bio: req.body.bio,
        email: req.body.email,
      },
      niche: req.body.niche,
      contentTypes: req.body.contentTypes,
      languages: req.body.languages,
    });

    await creator.save();

    // Create Creator Twin
    const twin = twinService.createTwin(TWIN_TYPES.CREATOR, creator._id.toString(), creator.toObject());
    creator.twinId = twin.twinId;
    await creator.save();

    eventBus.publish(EVENTS.CREATOR_CREATED, { creatorId: creator._id, handle: creator.profile.handle });

    res.status(201).json({
      success: true,
      creator,
      twin: twin.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to create creator', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create creator',
    });
  }
});

// ============================================
// CAMPAIGN ROUTES
// ============================================

// Get all campaigns
app.get('/api/campaigns', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, advertiserId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (advertiserId) query.advertiser = advertiserId;

    const total = await models.Campaign.countDocuments(query);
    const campaigns = await models.Campaign.find(query)
      .populate('advertiser', 'name industry')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch campaigns', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
    });
  }
});

// Get campaign by ID
app.get('/api/campaigns/:id', authenticate, async (req, res) => {
  try {
    const campaign = await models.Campaign.findById(req.params.id)
      .populate('advertiser', 'name industry logo')
      .select('-__v');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      campaign,
    });
  } catch (error) {
    logger.error('Failed to fetch campaign', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
    });
  }
});

// Create campaign
app.post('/api/campaigns', authenticate, authorize('admin', 'advertiser'), async (req, res) => {
  try {
    const campaign = new models.Campaign({
      ...req.body,
      createdBy: req.user.id,
    });

    await campaign.save();

    // Create Campaign Twin
    const twin = twinService.createTwin(TWIN_TYPES.CAMPAIGN, campaign._id.toString(), campaign.toObject());
    campaign.twinId = twin.twinId;
    await campaign.save();

    eventBus.publish(EVENTS.CAMPAIGN_CREATED, { campaignId: campaign._id, advertiser: campaign.advertiser });

    res.status(201).json({
      success: true,
      campaign,
      twin: twin.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to create campaign', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
    });
  }
});

// Update campaign performance
app.post('/api/campaigns/:id/performance', authenticate, async (req, res) => {
  try {
    const { impressions, clicks, conversions, views } = req.body;

    const campaign = await models.Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // Update performance
    if (impressions !== undefined) campaign.performance.impressions += impressions;
    if (clicks !== undefined) campaign.performance.clicks += clicks;
    if (conversions !== undefined) campaign.performance.conversions += conversions;
    if (views !== undefined) campaign.performance.views += views;

    // Recalculate KPIs
    await campaign.calculateKPIs();
    await campaign.save();

    // Update twin
    if (campaign.twinId) {
      twinService.updateTwin(campaign.twinId, campaign.toObject());
    }

    res.json({
      success: true,
      campaign,
    });
  } catch (error) {
    logger.error('Failed to update campaign performance', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign performance',
    });
  }
});

// ============================================
// ADVERTISER ROUTES
// ============================================

// Get all advertisers
app.get('/api/advertisers', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, industry, status } = req.query;

    const query = {};
    if (industry) query.industry = industry;
    if (status) query.status = status;

    const total = await models.Advertiser.countDocuments(query);
    const advertisers = await models.Advertiser.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-stats.totalSpent')
      .select('-__v');

    res.json({
      success: true,
      advertisers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch advertisers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch advertisers',
    });
  }
});

// ============================================
// SUBSCRIPTION ROUTES
// ============================================

// Get subscriptions for viewer
app.get('/api/subscriptions/my', authenticate, async (req, res) => {
  try {
    const subscription = await models.Subscription.findOne({
      viewerId: req.user.id,
      status: 'active',
    }).populate('viewerId', 'profile.email profile.displayName');

    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    logger.error('Failed to fetch subscription', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
    });
  }
});

// ============================================
// TWINS ROUTES
// ============================================

// Get viewer twin
app.get('/api/twins/viewer/:viewerId', authenticate, async (req, res) => {
  try {
    const viewer = await models.Viewer.findById(req.params.viewerId);

    if (!viewer) {
      return res.status(404).json({
        success: false,
        error: 'Viewer not found',
      });
    }

    let twin = twinService.getTwinByOwner(req.params.viewerId, TWIN_TYPES.VIEWER);

    if (!twin && viewer.twinId) {
      twin = twinService.getTwin(viewer.twinId);
    }

    if (!twin) {
      // Create twin if not exists
      twin = twinService.createTwin(TWIN_TYPES.VIEWER, viewer._id.toString(), viewer.toObject());
      viewer.twinId = twin.twinId;
      await viewer.save();
    }

    res.json({
      success: true,
      twin: twin.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to fetch viewer twin', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch viewer twin',
    });
  }
});

// Get content twin
app.get('/api/twins/content/:contentId', authenticate, async (req, res) => {
  try {
    const content = await models.Content.findById(req.params.contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      });
    }

    let twin = twinService.getTwinByOwner(req.params.contentId, TWIN_TYPES.CONTENT);

    if (!twin && content.twinId) {
      twin = twinService.getTwin(content.twinId);
    }

    if (!twin) {
      twin = twinService.createTwin(TWIN_TYPES.CONTENT, content._id.toString(), content.toObject());
      content.twinId = twin.twinId;
      await content.save();
    }

    res.json({
      success: true,
      twin: twin.toJSON(),
    });
  } catch (error) {
    logger.error('Failed to fetch content twin', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content twin',
    });
  }
});

// Get all twins stats
app.get('/api/twins/stats', authenticate, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    stats: twinService.getStats(),
  });
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// Overview analytics
app.get('/api/analytics/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [
      totalViewers,
      activeViewers,
      totalContent,
      activeCampaigns,
      totalCreators,
      totalChannels,
    ] = await Promise.all([
      models.Viewer.countDocuments(),
      models.Viewer.countDocuments({ status: 'active' }),
      models.Content.countDocuments({ status: 'published' }),
      models.Campaign.countDocuments({ status: 'active' }),
      models.Creator.countDocuments({ status: 'active' }),
      models.Channel.countDocuments({ status: 'active' }),
    ]);

    // Aggregate campaign stats
    const campaignStats = await models.Campaign.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: '$budget.spent' },
          totalImpressions: { $sum: '$performance.impressions' },
          totalClicks: { $sum: '$performance.clicks' },
          avgCTR: { $avg: '$performance.ctr' },
          avgCPM: { $avg: '$performance.cpm' },
        },
      },
    ]);

    res.json({
      success: true,
      overview: {
        viewers: {
          total: totalViewers,
          active: activeViewers,
        },
        content: {
          total: totalContent,
        },
        campaigns: {
          active: activeCampaigns,
          stats: campaignStats[0] || {},
        },
        creators: {
          total: totalCreators,
        },
        channels: {
          total: totalChannels,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

// Content analytics
app.get('/api/analytics/content', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { type, period = '7d' } = req.query;

    const query = { status: 'published' };
    if (type) query.type = type;

    const content = await models.Content.find(query)
      .select('title type genres performance releaseDate')
      .sort('-performance.views')
      .limit(20);

    res.json({
      success: true,
      content,
    });
  } catch (error) {
    logger.error('Failed to fetch content analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content analytics',
    });
  }
});

// ============================================
// RTMN INTEGRATION ROUTES
// ============================================

// Get AI recommendations
app.get('/api/ai/recommendations', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations = await rtmnService.getRecommendations(req.user.id, {
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      recommendations: recommendations.recommendations || [],
    });
  } catch (error) {
    logger.error('Failed to get recommendations', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
    });
  }
});

// Analyze content
app.post('/api/ai/analyze', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, synopsis, genres, language } = req.body;

    const analysis = await rtmnService.analyzeContent({
      title,
      synopsis,
      genres,
      language,
    });

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    logger.error('Failed to analyze content', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze content',
    });
  }
});

// ============================================
// EVENTS ROUTES
// ============================================

// Get event history
app.get('/api/events/history', authenticate, authorize('admin'), (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    const history = eventBus.getHistory(type, parseInt(limit));

    res.json({
      success: true,
      events: history,
      stats: eventBus.getStats(),
    });
  } catch (error) {
    logger.error('Failed to fetch event history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event history',
    });
  }
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected successfully');

    // Seed initial data in development
    if (config.NODE_ENV === 'development') {
      await seedData();
    }

    // Start HTTP server
    const server = app.listen(config.PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        MEDIA OS v2.0.0                                        ║
║              Complete AI-Native Media Operating System                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Port: ${config.PORT}                                                             ║
║  Environment: ${config.NODE_ENV}                                                       ║
║                                                                               ║
║  Features:                                                                    ║
║  • Content OS: Channels, Programs, Episodes, Content Management                ║
║  • Creator OS: Profiles, Brand Deals, Payments                                ║
║  • Audience OS: Viewers, Subscriptions, Personalization                       ║
║  • Advertising OS: Campaigns, Bookings, Attribution                           ║
║  • Revenue OS: Subscriptions, PPV, Invoicing                                 ║
║  • Rights OS: Licenses, Territories, Royalties                               ║
║  • Production OS: Studios, Equipment, Crew                                    ║
║  • Digital Twins: Viewer, Creator, Content, Campaign                          ║
║                                                                               ║
║  RTMN Integration:                                                          ║
║  • HOJAI AI (4560) - Intelligence                                           ║
║  • CorpID (4702) - Identity                                                ║
║  • MemoryOS (4703) - Preferences                                           ║
║  • TwinOS (4705) - Digital Twins                                          ║
║  • AdBazaar - Advertising                                                  ║
║  • RABTUL - Payments                                                       ║
║                                                                               ║
║  Health Check: http://localhost:${config.PORT}/health                                ║
║  API Docs: http://localhost:${config.PORT}/api/layers                                ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
      `);

      console.log(`
      📺 Media OS Ready!

      Endpoints:
      - Health:        GET  /health
      - RTMN Layers:  GET  /api/layers
      - Viewers:       GET  /api/viewers
      - Content:      GET  /api/content
      - Channels:     GET  /api/channels
      - Creators:     GET  /api/creators
      - Campaigns:    GET  /api/campaigns
      - Twins:        GET  /api/twins/viewer/:id
      - Analytics:    GET  /api/analytics/overview
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          const { disconnectDB } = require('./models');
          await disconnectDB();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error: error.message });
          process.exit(1);
        }
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
