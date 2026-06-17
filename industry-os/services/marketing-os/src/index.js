/**
 * Marketing OS - Main Server
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./config/logger');
const { connectDB, disconnectDB, Brand, Campaign, Journey, MarketingTwin } = require('./models');
const adBazaarService = require('./services/AdBazaarService');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'marketing-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (req, res) => {
  try {
    await require('mongoose').connection.db.admin().ping();
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
});

// RTMN Layers
app.get('/api/layers', (req, res) => {
  res.json({
    success: true,
    layers: [
      { id: 1, name: 'Intelligence', service: 'HOJAI AI', port: 4560 },
      { id: 2, name: 'Customer Growth', service: 'AdBazaar', port: 4805 },
      { id: 3, name: 'Commerce', service: 'REZ-Merchant', port: 4800 },
      { id: 4, name: 'Financial', service: 'RABTUL', port: 4004 },
      { id: 5, name: 'Workforce', service: 'CorpPerks', port: 4006 },
      { id: 6, name: 'Legal & Trust', service: 'LawGens', port: 5100 },
      { id: 7, name: 'Property', service: 'StayOwn', port: 3000 },
      { id: 8, name: 'Health', service: 'RisaCare', port: 7000 },
      { id: 9, name: 'Mobility', service: 'KHAIRMOVE', port: 4500 },
      { id: 10, name: 'Identity', service: 'CorpID', port: 4702 },
      { id: 11, name: 'Memory', service: 'MemoryOS', port: 4703 },
      { id: 12, name: 'Twins', service: 'TwinOS', port: 4705 },
      { id: 13, name: 'Automation', service: 'FlowOS', port: 4250 },
      { id: 14, name: 'Autonomous', service: 'SUTAR OS', port: 4242 },
      { id: 15, name: 'Network', service: 'REZ Consumer', port: 3000 },
    ],
  });
});

// ============================================
// BRAND ROUTES
// ============================================
app.get('/api/brand', async (req, res) => {
  try {
    const { orgId } = req.query;
    const brands = orgId ? await Brand.findByOrg(orgId) : await Brand.find();
    res.json({ success: true, brands, count: brands.length });
  } catch (error) {
    logger.error('Failed to fetch brands', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch brands' });
  }
});

app.get('/api/brand/:id', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });
    res.json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/brand', async (req, res) => {
  try {
    const brand = new Brand(req.body);
    await brand.save();
    res.status(201).json({ success: true, brand });
  } catch (error) {
    logger.error('Failed to create brand', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/brand/:id', async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });
    res.json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CAMPAIGN ROUTES
// ============================================
app.get('/api/campaigns', async (req, res) => {
  try {
    const { orgId, status, type } = req.query;
    const query = {};
    if (orgId) query.organizationId = orgId;
    if (status) query.status = status;
    if (type) query.type = type;

    const campaigns = await Campaign.find(query).sort('-createdAt');
    res.json({ success: true, campaigns, count: campaigns.length });
  } catch (error) {
    logger.error('Failed to fetch campaigns', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const campaign = new Campaign(req.body);
    await campaign.save();
    logger.info('Campaign created', { campaignId: campaign.campaignId });
    res.status(201).json({ success: true, campaign });
  } catch (error) {
    logger.error('Failed to create campaign', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/campaigns/:id/launch', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    // Create in AdBazaar
    const adResult = await adBazaarService.createCampaign(campaign);
    if (adResult.success) {
      campaign.integration = { ...campaign.integration, adBazaarCampaignId: adResult.adBazaarCampaignId };
    }

    await campaign.launch();
    res.json({ success: true, campaign, adBazaar: adResult });
  } catch (error) {
    logger.error('Failed to launch campaign', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// JOURNEY ROUTES
// ============================================
app.get('/api/journeys', async (req, res) => {
  try {
    const { orgId, status, type } = req.query;
    const query = {};
    if (orgId) query.organizationId = orgId;
    if (status) query.status = status;
    if (type) query.type = type;

    const journeys = await Journey.find(query).sort('-createdAt');
    res.json({ success: true, journeys, count: journeys.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/journeys/templates', (req, res) => {
  res.json({ success: true, templates: Journey.getTemplates() });
});

app.post('/api/journeys', async (req, res) => {
  try {
    const journey = new Journey(req.body);
    await journey.save();
    res.status(201).json({ success: true, journey });
  } catch (error) {
    logger.error('Failed to create journey', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/journeys/:id', async (req, res) => {
  try {
    const journey = await Journey.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!journey) return res.status(404).json({ success: false, error: 'Journey not found' });
    res.json({ success: true, journey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/journeys/:id/activate', async (req, res) => {
  try {
    const journey = await Journey.findById(req.params.id);
    if (!journey) return res.status(404).json({ success: false, error: 'Journey not found' });
    await journey.activate();
    res.json({ success: true, journey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADBAZAAR INTEGRATION
// ============================================
app.get('/api/adbazaar/segments', async (req, res) => {
  try {
    const { orgId } = req.query;
    const segments = await adBazaarService.getAudienceSegments(orgId);
    res.json({ success: true, ...segments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/adbazaar/campaigns/:id/performance', async (req, res) => {
  try {
    const result = await adBazaarService.syncCampaignPerformance(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/adbazaar/attribution/:campaignId', async (req, res) => {
  try {
    const { model } = req.query;
    const result = await adBazaarService.getAttributionData(req.params.campaignId, model);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/adbazaar/optimize/:campaignId', async (req, res) => {
  try {
    const { goal } = req.body;
    const result = await adBazaarService.optimizeCampaign(req.params.campaignId, goal);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TWINS
// ============================================
app.get('/api/twins', async (req, res) => {
  try {
    const { orgId, type } = req.query;
    const query = {};
    if (orgId) query.organizationId = orgId;
    if (type) query.type = type;

    const twins = await MarketingTwin.find(query).sort('-createdAt');
    res.json({ success: true, twins, count: twins.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/twins', async (req, res) => {
  try {
    const twin = new MarketingTwin(req.body);
    await twin.save();
    res.status(201).json({ success: true, twin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await connectDB();

    app.listen(config.PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║           MARKETING OS v1.0.0                               ║
║     The Autonomous Marketing Department                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Port: ${config.PORT}                                                     ║
║  Environment: ${config.NODE_ENV}                                             ║
║                                                              ║
║  Features:                                                   ║
║  • Brand OS - Guidelines, assets, health                    ║
║  • Campaign OS - Planning, budget, channels                 ║
║  • Journey OS - Automation, triggers                         ║
║  • AdBazaar Integration - DSP, SSP, Audiences                ║
║  • Marketing Twins - Intelligence layer                      ║
║                                                              ║
║  Endpoints:                                                  ║
║  • GET  /health           Health check                       ║
║  • GET  /api/layers     RTMN ecosystem                     ║
║  • GET  /api/brand       Brand management                  ║
║  • GET  /api/campaigns   Campaign planning                  ║
║  • GET  /api/journeys    Journey automation                 ║
║  • GET  /api/twins       Marketing twins                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);

      console.log(`
      📊 Marketing OS Ready!

      Try it:
      - curl http://localhost:${config.PORT}/health
      - curl http://localhost:${config.PORT}/api/layers
      - curl http://localhost:${config.PORT}/api/brand
      `);
    });
  } catch (error) {
    logger.error('Failed to start Marketing OS', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await disconnectDB();
  process.exit(0);
});

start();
