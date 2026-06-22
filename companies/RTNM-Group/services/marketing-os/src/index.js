/**
 * RTMN Marketing OS
 *
 * Multi-industry marketing orchestration engine.
 * Manages campaigns, content, channels, and analytics across all 24 industries.
 *
 * Port: 3020
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import campaignsRoutes from './routes/campaigns.js';
import channelsRoutes from './routes/channels.js';
import contentRoutes from './routes/content.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = process.env.PORT || 3020;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Campaign Types
export const CAMPAIGN_TYPES = {
  AWARENESS: 'awareness',
  CONVERSION: 'conversion',
  RETENTION: 'retention',
  LAUNCH: 'launch',
  SEASONAL: 'seasonal'
};

// Campaign Status
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Channel Types
export const CHANNEL_TYPES = {
  SOCIAL: 'social',
  EMAIL: 'email',
  SEO: 'seo',
  PPC: 'ppc',
  CONTENT: 'content',
  AFFILIATE: 'affiliate',
  INFLUENCER: 'influencer'
};

// Industries (all 24)
export const INDUSTRIES = [
  'fitness', 'gaming', 'government', 'homeServices', 'manufacturing',
  'nonprofit', 'professional', 'sports', 'travel', 'construction',
  'entertainment', 'financial', 'healthcare', 'education', 'retail',
  'technology', 'food', 'automotive', 'realestate', 'media',
  'legal', 'agriculture', 'energy', 'logistics'
];

// Campaign Registry
export const campaignRegistry = new Map();

// Content Library
export const contentLibrary = new Map();

// Channel Registry
export const channelRegistry = new Map();

export { logger };

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'marketing-os',
    version: '1.0.0',
    port: PORT,
    campaigns: campaignRegistry.size,
    content: contentLibrary.size,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN Marketing OS',
    version: '1.0.0',
    description: 'Multi-industry marketing orchestration engine',
    port: PORT,
    capabilities: [
      'Campaign management across 24 industries',
      'Multi-channel orchestration',
      'Content library and management',
      'Marketing analytics'
    ],
    endpoints: [
      'GET /api/campaigns',
      'POST /api/campaigns',
      'GET /api/channels',
      'GET /api/content',
      'GET /api/analytics'
    ]
  });
});

// Routes
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  logger.info(`Marketing OS running on port ${PORT}`);
  logger.info(`Supported industries: ${INDUSTRIES.length}`);
});

export { app };
