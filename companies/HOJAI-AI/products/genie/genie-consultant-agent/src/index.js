/**
 * Genie Consultant Agent - Domain Expertise Router
 *
 * This service powers Genie's Consultant OS pillar.
 * It routes user queries to domain-specific expertise:
 * - Restaurant
 * - Hotel
 * - Startup
 * - Healthcare
 * - Legal
 * - HR
 * - Marketing
 * - Finance
 * - Real Estate
 * - Career
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import { installReadinessRoutes, autoSeed, normalizeSeedData } from '@rtmn/shared/lib/genie-readiness';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import consultantRoutes from './routes/consultant.js';
import domainRoutes from './routes/domain.js';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4739;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


app.use(requireAuth);// Storage
const storage = {
  consultations: new PersistentMap('collection-1', { serviceName: 'genie-consultant-agent' })
};

app.locals.storage = storage;

// Seed demo data (idempotent — only fills empty stores)
const seedPlans = [
  {
    store: storage.consultations,
    items: normalizeSeedData([
      { id: 'consult-cn-1', userId: 'user-001', domain: 'restaurant', query: 'How do I reduce food costs 15%?', advice: 'Renegotiate supplier contracts and track portion sizes weekly.', createdAt: '2026-06-19T09:00:00Z' },
      { id: 'consult-cn-2', userId: 'user-002', domain: 'startup', query: 'When should I raise seed funding?', advice: 'After 6 months of revenue traction and clear product-market fit signals.', createdAt: '2026-06-19T14:30:00Z' },
      { id: 'consult-cn-3', userId: 'user-001', domain: 'marketing', query: 'Best channel for B2B SaaS in India?', advice: 'LinkedIn outbound + SEO-led content marketing on LinkedIn Pulse.', createdAt: '2026-06-20T10:15:00Z' },
      { id: 'consult-cn-4', userId: 'user-003', domain: 'healthcare', query: 'How to start a tele-health practice?', advice: 'Partner with existing clinics for licensing; focus on follow-up visits first.', createdAt: '2026-06-21T11:00:00Z' },
      { id: 'consult-cn-5', userId: 'user-002', domain: 'finance', query: 'Should I lease or buy equipment?', advice: 'Lease for fast-depreciating tech; buy real estate and heavy machinery.', createdAt: '2026-06-22T13:45:00Z' },
      { id: 'consult-cn-6', userId: 'user-004', domain: 'legal', query: 'NDAs vs non-compete clauses?', advice: 'NDAs protect information; non-competes restrict future work — use sparingly.', createdAt: '2026-06-23T08:30:00Z' },
      { id: 'consult-cn-7', userId: 'user-001', domain: 'career', query: 'Senior IC vs engineering manager?', advice: 'IC if deep technical ownership energizes you; manager if mentoring multiplies your impact.', createdAt: '2026-06-23T15:20:00Z' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-consultant-agent' });
if (seeded) console.log('[genie-consultant-agent] demo data seeded');

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-consultant-agent',
    port: PORT,
    version: '1.0.0',
    domains: [
      'restaurant', 'hotel', 'startup', 'healthcare',
      'legal', 'hr', 'marketing', 'finance',
      'realestate', 'career', 'retail', 'beauty',
      'fitness', 'travel', 'education', 'manufacturing',
      'construction', 'agriculture', 'sports', 'entertainment'
    ],
    capabilities: [
      'domain-routing',
      'expertise-matching',
      'advice-generation',
      'resource-recommendation'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'genie-consultant-agent' });
});

// Routes
app.use('/', consultantRoutes);
app.use('/', domainRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Readiness routes — /api/llm-health, /api/db-health, /api/readiness
installReadinessRoutes(app, { serviceName: 'genie-consultant-agent' });

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE CONSULTANT AGENT v1.0.0                    ║
║                                                                ║
║  💼 Domain Expertise Router                                ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Domains:                                                     ║
║  • Restaurant  • Hotel     • Startup   • Healthcare          ║
║  • Legal      • HR        • Marketing • Finance              ║
║  • Real Estate • Career    • + 12 more                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
