// ── ReZ Mind ───────────────────────────────────────────────────────────────────
// AI-powered commerce intelligence platform
// RTMN Commerce Memory + ReZ Agent OS combined

// Core types (from types file, avoiding conflicts with Mongoose models)
export type { IntentStatus, AppType, Category, EventType, IntentSignalWeight } from './types/intent.js';
export { SIGNAL_WEIGHTS, BASE_CONFIDENCE, DORMANCY_THRESHOLD_DAYS, CONFIDENCE_DORMANT_THRESHOLD } from './types/intent.js';

// ── MongoDB Models ────────────────────────────────────────────────────────────
export * from './models/index.js';

// Services
export { IntentCaptureService, intentCaptureService } from './services/IntentCaptureService.js';
export { DormantIntentService, dormantIntentService } from './services/DormantIntentService.js';
export { CrossAppAggregationService, crossAppAggregationService } from './services/CrossAppAggregationService.js';
export { MerchantKnowledgeService, merchantKnowledgeService } from './services/MerchantKnowledgeService.js';
export { AutonomousChatService, autonomousChatService } from './chat/autonomousChat.js';

// Types from merchant knowledge service
export type { KnowledgeType, KnowledgeEntry, ChatContext } from './services/MerchantKnowledgeService.js';

// API Routes
export { default as intentRouter } from './api/intent.routes.js';
export { default as commerceMemoryRouter } from './api/commerce-memory.routes.js';

// Middleware
export { intentCaptureMiddleware } from './middleware/intentMiddleware.js';


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rez-intent-graph',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
