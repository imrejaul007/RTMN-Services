/**
 * LeadOS Gateway - Unified Lead Intelligence API
 *
 * A unified API gateway that connects all lead intelligence services
 * in the RTMN ecosystem.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import logger from './utils/logger.js';

// Import routes
import discoveryRoutes from './routes/discovery.js';
import enrichmentRoutes from './routes/enrichment.js';
import scoringRoutes from './routes/scoring.js';
import qualificationRoutes from './routes/qualification.js';
import outreachRoutes from './routes/outreach.js';
import intelligenceRoutes from './routes/intelligence.js';
import leadsRoutes from './routes/leads.js';
import analyticsRoutes from './routes/analytics.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5175;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'lead-os-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'LeadOS Gateway',
    version: '1.0.0',
    description: 'Unified Lead Intelligence API for RTMN Ecosystem',
    documentation: '/api/docs',
    endpoints: {
      discovery: {
        'GET /api/discover/google': 'Discover companies from Google Places',
        'GET /api/discover/search': 'Search leads across sources',
        'POST /api/discover/batch': 'Batch discover companies'
      },
      enrichment: {
        'POST /api/enrich/company': 'Enrich company data',
        'POST /api/enrich/contact': 'Enrich contact data',
        'POST /api/enrich/bulk': 'Bulk enrichment',
        'GET /api/enrich/status/:jobId': 'Get enrichment job status'
      },
      scoring: {
        'POST /api/score/lead': 'Score single lead',
        'POST /api/score/bulk': 'Bulk score leads',
        'GET /api/score/:leadId': 'Get lead score'
      },
      qualification: {
        'POST /api/qualify/lead': 'Qualify single lead',
        'POST /api/qualify/classify': 'Classify multiple leads',
        'GET /api/qualify/types': 'Get lead type definitions'
      },
      outreach: {
        'POST /api/outreach/sequence': 'Create outreach sequence',
        'POST /api/outreach/execute': 'Execute outreach',
        'GET /api/outreach/status/:campaignId': 'Get campaign status',
        'POST /api/outreach/pause': 'Pause campaign',
        'POST /api/outreach/resume': 'Resume campaign'
      },
      intelligence: {
        'POST /api/intelligence/company': 'Generate company report',
        'POST /api/intelligence/research': 'AI research on company',
        'GET /api/intelligence/signals/:companyId': 'Get company signals',
        'GET /api/intelligence/competitors/:companyId': 'Get competitor analysis'
      },
      leads: {
        'GET /api/leads': 'List leads',
        'GET /api/leads/:id': 'Get lead',
        'POST /api/leads': 'Create lead',
        'PATCH /api/leads/:id': 'Update lead',
        'DELETE /api/leads/:id': 'Delete lead',
        'POST /api/leads/:id/enrich': 'Enrich lead',
        'POST /api/leads/:id/score': 'Score lead',
        'POST /api/leads/:id/qualify': 'Qualify lead',
        'POST /api/leads/:id/outreach': 'Start outreach',
        'POST /api/leads/:id/sync': 'Sync to CRM'
      },
      analytics: {
        'GET /api/analytics/overview': 'Dashboard overview',
        'GET /api/analytics/pipeline': 'Pipeline analytics',
        'GET /api/analytics/outreach': 'Outreach metrics',
        'GET /api/analytics/conversion': 'Conversion funnel',
        'GET /api/analytics/sources': 'Source analytics',
        'GET /api/analytics/team': 'Team performance',
        'GET /api/analytics/trends': 'Time-based trends',
        'POST /api/analytics/report': 'Generate report'
      }
    },
    connectedServices: [
      { name: 'REZ-SalesMind', port: 5170 },
      { name: 'Atlas Discover', port: 4001 },
      { name: 'Atlas GTM', port: 4004 },
      { name: 'Atlas Signals', port: 4003 },
      { name: 'HOJAI Lead', port: 4752 },
      { name: 'HOJAI Knowledge Graph', port: 4786 },
      { name: 'Lead Twin', port: 4894 },
      { name: 'CRM Engine', port: 4888 },
      { name: 'REZ CRM Hub', port: 4056 },
      { name: 'Journey Intelligence', port: 4954 }
    ]
  });
});

// Mount routes
app.use('/api/discover', discoveryRoutes);
app.use('/api/enrich', enrichmentRoutes);
app.use('/api/score', scoringRoutes);
app.use('/api/qualify', qualificationRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Also mount discovery routes at root
app.use('/discover', discoveryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    suggestion: 'Visit /api for available endpoints'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`LeadOS Gateway started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API info: http://localhost:${PORT}/api`);
});

export default app;
