/**
 * Axom Integration Service
 * BuzzLocal & Community Intelligence - Customer Operations Bridge
 *
 * Port: 4973
 * Connects: Journey Twin, Customer Twin, Industry Twin (Community)
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import buzzlocalRoutes from './routes/buzzlocal';
import communityRoutes from './routes/community';
import intelligenceRoutes from './routes/intelligence';

// Services
import customerOpsBridge from './services/customerOpsBridge';
import engagementSync from './services/engagementSync';

// Load environment variables
dotenv.config();

// Winston logger setup
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      requestId,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  const syncStatus = engagementSync.getSyncStatus();

  res.json({
    status: 'healthy',
    service: 'axom-integration',
    version: '1.0.0',
    port: process.env.PORT || 4973,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    twins: {
      journeyTwin: process.env.JOURNEY_TWIN_URL || 'http://localhost:3012',
      customerTwin: process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017',
      industryTwin: process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705'
    },
    sync: {
      lastSync: syncStatus.lastSync,
      profilesPending: syncStatus.profilesPending
    }
  });
});

// API Routes
app.use('/api/buzzlocal', buzzlocalRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/intelligence', intelligenceRoutes);

// Twin sync routes
app.post('/api/sync/profile/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { axomProfileStore } = require('./models/AxomProfile');
    const profile = axomProfileStore.get(profileId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const result = await engagementSync.syncProfileEngagement(profile);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.post('/api/sync/all', async (req: Request, res: Response) => {
  try {
    const results = await engagementSync.syncAllEngagements();
    res.json({
      success: true,
      synced: Array.from(results.values()).filter((r) => r.success).length,
      failed: Array.from(results.values()).filter((r) => !r.success).length
    });
  } catch (error) {
    logger.error('Batch sync error:', error);
    res.status(500).json({ error: 'Batch sync failed' });
  }
});

// Customer Ops Bridge routes
app.post('/api/customer-ops/sync', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body;
    const result = await customerOpsBridge.syncProfile(profile);
    res.json(result);
  } catch (error) {
    logger.error('Customer ops sync error:', error);
    res.status(500).json({ error: 'Customer ops sync failed' });
  }
});

app.post('/api/customer-ops/engagement', async (req: Request, res: Response) => {
  try {
    const { profileId, eventType, metadata } = req.body;
    const result = await customerOpsBridge.recordEngagement(profileId, eventType, metadata);
    res.json(result);
  } catch (error) {
    logger.error('Engagement record error:', error);
    res.status(500).json({ error: 'Failed to record engagement' });
  }
});

// Profile CRUD routes
app.post('/api/profiles', async (req: Request, res: Response) => {
  try {
    const { axomProfileStore } = require('./models/AxomProfile');
    const profileData = req.body;

    const profile = {
      ...profileData,
      profileId: profileData.profileId || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: profileData.stats || {
        followers: 0,
        following: 0,
        postsCount: 0,
        eventsHosted: 0,
        eventsAttended: 0,
        influenceScore: 0,
        engagementRate: 0,
        reachScore: 0
      },
      buzzContent: profileData.buzzContent || [],
      localEvents: profileData.localEvents || [],
      connectedBusinesses: profileData.connectedBusinesses || [],
      interests: profileData.interests || [],
      journeyTwinSynced: false,
      customerTwinSynced: false,
      industryTwinSynced: false
    };

    axomProfileStore.set(profile.profileId, profile);
    logger.info(`Profile created: ${profile.profileId}`);

    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    logger.error('Profile creation error:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

app.get('/api/profiles', async (req: Request, res: Response) => {
  try {
    const { axomProfileStore } = require('./models/AxomProfile');
    const { areaId, segment, limit = 100 } = req.query;

    let profiles = Array.from(axomProfileStore.values());

    if (areaId) {
      profiles = profiles.filter((p) => p.primaryLocation.areaId === areaId);
    }
    if (segment) {
      profiles = profiles.filter((p) => p.customerSegment === segment);
    }

    res.json({
      success: true,
      data: profiles.slice(0, Number(limit)),
      total: axomProfileStore.size
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

app.get('/api/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { axomProfileStore } = require('./models/AxomProfile');
    const profile = axomProfileStore.get(profileId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const updates = req.body;
    const { axomProfileStore } = require('./models/AxomProfile');
    const profile = axomProfileStore.get(profileId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const updatedProfile = {
      ...profile,
      ...updates,
      profileId, // Prevent ID change
      updatedAt: new Date()
    };

    axomProfileStore.set(profileId, updatedProfile);
    logger.info(`Profile updated: ${profileId}`);

    res.json({ success: true, data: updatedProfile });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 4973;

app.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════════════════════════╗
║           AXOM INTEGRATION SERVICE STARTED                 ║
║  BuzzLocal & Community Intelligence - Customer Ops Bridge  ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                             ║
║  Health: http://localhost:${PORT}/health                      ║
║                                                            ║
║  Connected Twins:                                          ║
║  - Journey Twin: ${process.env.JOURNEY_TWIN_URL || 'http://localhost:3012'}   ║
║  - Customer Twin: ${process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017'} ║
║  - Industry Twin: ${process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705'} ║
║                                                            ║
║  Routes:                                                   ║
║  - /api/buzzlocal    - Local discovery & buzz             ║
║  - /api/community    - Community events & members          ║
║  - /api/intelligence - AI insights & predictions           ║
║  - /api/profiles     - Profile management                  ║
║  - /api/sync         - Twin synchronization                ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Start engagement sync
  engagementSync.startPeriodicSync(5 * 60 * 1000); // Every 5 minutes
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  engagementSync.stopPeriodicSync();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  engagementSync.stopPeriodicSync();
  process.exit(0);
});

export default app;
