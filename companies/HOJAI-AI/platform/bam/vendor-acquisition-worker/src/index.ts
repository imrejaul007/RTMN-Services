/**
 * Vendor Acquisition Worker
 * Port: 5551
 *
 * AI Worker that finds, qualifies, and onboards vendors.
 *
 * Modules:
 * - Prospect Discovery (directories, web)
 * - Outreach (email, WhatsApp)
 * - Qualification (trust scoring, capability matching)
 * - Onboarding (contracts, documents)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import prospector from './modules/prospector.js';
import outreach from './modules/outreach.js';
import qualifier from './modules/qualifier.js';
import onboarder from './modules/onboarder.js';
import scoring from './modules/scoring.js';

const PORT = parseInt(process.env.PORT || '5551', 10);
const SERVICE_NAME = 'vendor-acquisition-worker';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main worker entry: POST /run
 * Body: { industry, criteria, target_count }
 */
app.post('/run', async (req, res) => {
  try {
    const { industry, criteria, target_count, use_skills } = req.body;

    const defaultSkills = ['vendor-discovery', 'vendor-qualify'];
    const skillsToRun = use_skills || defaultSkills;

    const results: any = {
      batchId: `BATCH-${Date.now()}`,
      industry,
      criteria,
      targetCount: target_count || 50,
      executedSkills: skillsToRun,
      steps: [],
    };

    // Step 1: Prospect Discovery
    if (skillsToRun.includes('vendor-discovery')) {
      const prospects = await prospector.discover({
        industry,
        criteria,
        limit: target_count || 50,
      });
      results.steps.push({
        step: 'discovery',
        status: 'completed',
        found: prospects.length,
        prospects,
      });
      (results as any).prospects = prospects;
    }

    // Step 2: Qualification
    if (skillsToRun.includes('vendor-qualify')) {
      const prospects = (results as any).prospects || [];
      const qualified = await qualifier.qualify(prospects);
      results.steps.push({
        step: 'qualification',
        status: 'completed',
        qualified: qualified.length,
        vendors: qualified,
      });
      (results as any).vendors = qualified;
    }

    // Step 3: Outreach (if requested)
    if (skillsToRun.includes('vendor-outreach')) {
      const vendors = (results as any).vendors || [];
      const outreachResult = await outreach.contact(vendors.slice(0, 25));
      results.steps.push({
        step: 'outreach',
        status: 'completed',
        contacted: outreachResult.sent,
        responses: outreachResult.responses,
      });
      (results as any).outreach = outreachResult;
    }

    // Step 4: Onboarding (if requested)
    if (skillsToRun.includes('vendor-onboard')) {
      const onboarded = (results as any).vendors?.slice(0, 5) || [];
      const onboardResults = await onboarder.onboard(onboarded);
      results.steps.push({
        step: 'onboarding',
        status: 'completed',
        onboarded: onboardResults.length,
        results: onboardResults,
      });
      (results as any).onboarded = onboardResults;
    }

    results.status = 'completed';
    results.completedAt = new Date().toISOString();

    res.json(results);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'WORKER_ERROR', message: error.message },
    });
  }
});

/**
 * Discover vendors
 * POST /discover
 */
app.post('/discover', async (req, res) => {
  const { industry, criteria, limit } = req.body;
  const prospects = await prospector.discover({ industry, criteria, limit });
  res.json({ prospects, count: prospects.length });
});

/**
 * Qualify vendors
 * POST /qualify
 */
app.post('/qualify', async (req, res) => {
  const { prospects } = req.body;
  const qualified = await qualifier.qualify(prospects);
  res.json({ qualified, count: qualified.length });
});

/**
 * Send outreach
 * POST /outreach
 */
app.post('/outreach', async (req, res) => {
  const { vendors, channel, template } = req.body;
  const result = await outreach.contact(vendors, { channel, template });
  res.json(result);
});

/**
 * Onboard vendor
 * POST /onboard
 */
app.post('/onboard', async (req, res) => {
  const { vendor, terms } = req.body;
  const result = await onboarder.onboardSingle(vendor, terms);
  res.json(result);
});

/**
 * Score vendor
 * POST /score
 */
app.post('/score', async (req, res) => {
  const { vendor } = req.body;
  const score = await scoring.score(vendor);
  res.json({ vendor, score });
});

app.listen(PORT, () => {
  console.log(`✅ Vendor Acquisition Worker running on port ${PORT}`);
  console.log('   Skills: vendor-discovery, vendor-outreach, vendor-qualify, vendor-onboard');
});

export default app;
