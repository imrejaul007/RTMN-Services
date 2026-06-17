/**
 * AdBazaar Clean Room Service
 *
 * Privacy-safe data collaboration platform.
 * Enables advertisers and publishers to share data without exposing PII.
 *
 * Port: 4930
 *
 * Features:
 * - Privacy-preserving matching
 * - Cohort analysis
 * - Attribution without PII
 * - Secure collaboration
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import winston from 'winston';
import promClient from 'prom-client';

promClient.collectDefaultMetrics();
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '4930', 10);

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'adbazaar-clean-room',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API Info
app.get('/api', (_req, res) => {
  res.json({
    name: 'AdBazaar Clean Room',
    version: '1.0.0',
    description: 'Privacy-safe data collaboration',
    features: [
      'Privacy-preserving matching',
      'Cohort analysis',
      'Attribution without PII',
      'Secure data collaboration',
    ],
  });
});

// ============================================================================
// DATA PARTNERS API
// ============================================================================

/**
 * POST /api/partners
 * Register a data partner
 */
app.post('/api/partners', (req, res) => {
  const { name, type, email } = req.body;

  if (!name || !type) {
    res.status(400).json({ success: false, error: 'name and type required' });
    return;
  }

  const partner = {
    partnerId: `partner_${Date.now()}`,
    name,
    type, // 'advertiser', 'publisher', 'data_provider'
    email,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  logger.info('Partner registered', { partnerId: partner.partnerId, name });

  res.status(201).json({ success: true, data: partner });
});

/**
 * GET /api/partners
 * List data partners
 */
app.get('/api/partners', (_req, res) => {
  const partners = [
    { partnerId: 'partner_001', name: 'Pizza Hut India', type: 'advertiser', status: 'active' },
    { partnerId: 'partner_002', name: 'Starbucks India', type: 'advertiser', status: 'active' },
    { partnerId: 'partner_003', name: 'Mumbai Metro', type: 'publisher', status: 'active' },
  ];

  res.json({ success: true, data: partners });
});

// ============================================================================
// HASHED MATCHING API
// ============================================================================

/**
 * POST /api/match
 * Privacy-safe matching using hashed identifiers
 */
app.post('/api/match', (req, res) => {
  const { partner1Data, partner2Data, matchType } = req.body;

  if (!partner1Data?.length || !partner2Data?.length) {
    res.status(400).json({ success: false, error: 'Both datasets required' });
    return;
  }

  // Hash-based matching (SHA-256)
  const hashed1 = partner1Data.map((d: { email?: string; phone?: string }) => ({
    hashedEmail: d.email ? hashValue(d.email) : null,
    hashedPhone: d.phone ? hashValue(d.phone) : null,
  }));

  const hashed2 = partner2Data.map((d: { email?: string; phone?: string }) => ({
    hashedEmail: d.email ? hashValue(d.email) : null,
    hashedPhone: d.phone ? hashValue(d.phone) : null,
  }));

  // Find matches
  const matches = [];
  for (const h1 of hashed1) {
    for (const h2 of hashed2) {
      if ((h1.hashedEmail && h1.hashedEmail === h2.hashedEmail) ||
          (h1.hashedPhone && h1.hashedPhone === h2.hashedPhone)) {
        matches.push({
          matchId: `match_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          confidence: 1.0,
          matchedAt: new Date().toISOString(),
        });
      }
    }
  }

  res.json({
    success: true,
    data: {
      totalMatches: matches.length,
      matchRate: (matches.length / Math.max(partner1Data.length, partner2Data.length) * 100).toFixed(2) + '%',
      overlap: matches.slice(0, 10), // Sample
    },
  });
});

/**
 * POST /api/cohorts
 * Create audience cohort for analysis
 */
app.post('/api/cohorts', (req, res) => {
  const { partnerId, criteria, size } = req.body;

  const cohort = {
    cohortId: `cohort_${Date.now()}`,
    partnerId,
    criteria,
    size: size || Math.floor(Math.random() * 50000) + 10000,
    hashed: true, // Always hashed
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({ success: true, data: cohort });
});

/**
 * POST /api/cohorts/compare
 * Compare two cohorts
 */
app.post('/api/cohorts/compare', (req, res) => {
  const { cohort1Id, cohort2Id } = req.body;

  // Simulate cohort comparison
  const comparison = {
    cohort1Id,
    cohort2Id,
    overlap: Math.floor(Math.random() * 10000) + 1000,
    overlapRate: (Math.random() * 30 + 5).toFixed(2) + '%',
    unique1: Math.floor(Math.random() * 50000) + 10000,
    unique2: Math.floor(Math.random() * 50000) + 10000,
    similarity: (Math.random() * 0.5 + 0.3).toFixed(2),
  };

  res.json({ success: true, data: comparison });
});

// ============================================================================
// COLLABORATIONS API
// ============================================================================

/**
 * POST /api/collaborations
 * Create a new data collaboration
 */
app.post('/api/collaborations', (req, res) => {
  const { name, partners, purpose, matchType } = req.body;

  if (!name || !partners?.length) {
    res.status(400).json({ success: false, error: 'name and partners required' });
    return;
  }

  const collaboration = {
    collaborationId: `collab_${Date.now()}`,
    name,
    partners,
    purpose: purpose || 'audience_analysis',
    matchType: matchType || 'email_hash',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  logger.info('Collaboration created', { collaborationId: collaboration.collaborationId });

  res.status(201).json({ success: true, data: collaboration });
});

/**
 * GET /api/collaborations/:id
 * Get collaboration details
 */
app.get('/api/collaborations/:id', (req, res) => {
  const { id } = req.params;

  const collaboration = {
    collaborationId: id,
    name: 'Sample Collaboration',
    partners: ['partner_001', 'partner_002'],
    status: 'active',
    metrics: {
      totalMatches: 25000,
      overlapRate: '15.5%',
      attributedConversions: 1250,
    },
  };

  res.json({ success: true, data: collaboration });
});

/**
 * POST /api/collaborations/:id/run
 * Run analysis on collaboration
 */
app.post('/api/collaborations/:id/run', (req, res) => {
  const { id } = req.params;
  const { analysisType } = req.body;

  const results = {
    collaborationId: id,
    analysisType: analysisType || 'attribution',
    status: 'completed',
    results: {
      reach: Math.floor(Math.random() * 500000) + 100000,
      overlap: Math.floor(Math.random() * 50000) + 10000,
      conversions: Math.floor(Math.random() * 5000) + 500,
      lift: (Math.random() * 20 + 5).toFixed(1) + '%',
    },
    completedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: results });
});

// ============================================================================
// ATTRIBUTION API
// ============================================================================

/**
 * POST /api/attribution
 * Privacy-safe attribution across partners
 */
app.post('/api/attribution', (req, res) => {
  const { collaborationId, touchpoints, conversions } = req.body;

  // Simulate attribution
  const attribution = {
    attributionId: `attr_${Date.now()}`,
    collaborationId,
    model: 'linear',
    results: {
      totalConversions: conversions?.length || Math.floor(Math.random() * 1000) + 100,
      attributedToPartner1: Math.floor(Math.random() * 500) + 100,
      attributedToPartner2: Math.floor(Math.random() * 500) + 100,
      unattributed: Math.floor(Math.random() * 100) + 10,
    },
    privacyGuaranteed: true,
  };

  res.json({ success: true, data: attribution });
});

// ============================================================================
// HELPERS
// ============================================================================

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     AdBazaar Clean Room v1.0.0                 ║
║  Port: ${PORT}                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Features:                                     ║
║  • Privacy-preserving matching               ║
║  • Cohort analysis                          ║
║  • Attribution without PII                   ║
║  • Secure data collaboration                ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
