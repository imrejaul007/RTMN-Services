/**
 * REZ Intelligence Integration Service
 *
 * Wires HOJAI AI's existing intelligence services into SUTAR agents so every
 * AI employee in every HOJAI-generated company has access to real-time
 * business intelligence (merchant insights, customer insights, revenue
 * predictions, intent signals, competitive benchmarks).
 *
 * Port: 5370
 *
 * Aggregates:
 * - REZ-Intelligence-Bridge (5369): Merchant + media intelligence
 * - Intent Engine (4800): Intent classification + routing
 * - Reasoning Engine: Multi-step AI reasoning
 * - RAG Platform: Retrieval-augmented generation
 * - Prediction Engine: Revenue + churn + LTV predictions
 * - Recommendation Engine: Product + content recommendations
 * - Graph Database: Knowledge graph queries
 * - MemoryOS: Persistent context per agent
 *
 * Used by: All SUTAR agents (Sales, Support, Procurement, Finance, etc.)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import dotenv from 'dotenv';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { agentContextMiddleware, AgentContextRequest } from './middleware/agentContext.js';
import { insightsRouter } from './routes/insights.js';
import { predictionsRouter } from './routes/predictions.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { intentRouter } from './routes/intent.js';
import { healthRouter } from './routes/health.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5370');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Logger
const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
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

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(agentContextMiddleware(logger));

// Request ID middleware
app.use((req: AgentContextRequest, res: Response, next) => {
  req.context = req.context || {
    requestId: uuidv4(),
    startTime: Date.now(),
    logger
  };
  res.setHeader('X-Request-ID', req.context.requestId);
  next();
});

// Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/insights', insightsRouter);
app.use('/api/v1/predictions', predictionsRouter);
app.use('/api/v1/recommendations', recommendationsRouter);
app.use('/api/v1/intent', intentRouter);

// Unified agent context endpoint (the killer feature)
app.post('/api/v1/agent/enrich', async (req: AgentContextRequest, res: Response) => {
  try {
    const { agentRole, userId, companyId, query, context } = req.body;

    if (!agentRole || !query) {
      return res.status(400).json({
        success: false,
        error: 'agentRole and query are required'
      });
    }

    // 1. Get merchant intelligence (if applicable)
    // 2. Get customer intelligence
    // 3. Get revenue predictions
    // 4. Get product recommendations
    // 5. Get intent classification
    // 6. Return enriched context

    const enrichedContext = await enrichAgentContext({
      agentRole,
      userId,
      companyId,
      query,
      context
    });

    res.json({
      success: true,
      data: enrichedContext,
      requestId: req.context?.requestId
    });
  } catch (error: any) {
    logger.error('Error enriching agent context', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, _next: any) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

/**
 * Enrich agent context with REZ Intelligence
 * This is the killer function — every SUTAR agent calls this
 */
async function enrichAgentContext(params: {
  agentRole: string;
  userId?: string;
  companyId?: string;
  query: string;
  context?: any;
}) {
  const { agentRole, query, context } = params;

  // Parallel calls to all intelligence services
  const [merchantIntel, customerIntel, predictions, recommendations, intent] =
    await Promise.allSettled([
      callMerchantIntel({ query, context }),
      callCustomerIntel({ query, context }),
      callPredictions({ query, context, agentRole }),
      callRecommendations({ query, context, agentRole }),
      callIntentClassification({ query })
    ]);

  return {
    merchant_intelligence: merchantIntel.status === 'fulfilled' ? merchantIntel.value : null,
    customer_intelligence: customerIntel.status === 'fulfilled' ? customerIntel.value : null,
    predictions: predictions.status === 'fulfilled' ? predictions.value : null,
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : null,
    intent: intent.status === 'fulfilled' ? intent.value : null,
    enriched_at: new Date().toISOString()
  };
}

async function callMerchantIntel(params: any) {
  const REZ_INTEL_BRIDGE = process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369';
  const response = await axios.post(
    `${REZ_INTEL_BRIDGE}/api/v1/merchant/insights`,
    params,
    { timeout: 5000 }
  );
  return response.data;
}

async function callCustomerIntel(params: any) {
  const REZ_INTEL_BRIDGE = process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369';
  const response = await axios.post(
    `${REZ_INTEL_BRIDGE}/api/v1/customer/insights`,
    params,
    { timeout: 5000 }
  );
  return response.data;
}

async function callPredictions(params: any) {
  const REZ_INTEL_BRIDGE = process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369';
  const response = await axios.post(
    `${REZ_INTEL_BRIDGE}/api/v1/predictions`,
    params,
    { timeout: 5000 }
  );
  return response.data;
}

async function callRecommendations(params: any) {
  const REZ_INTEL_BRIDGE = process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369';
  const response = await axios.post(
    `${REZ_INTEL_BRIDGE}/api/v1/recommendations`,
    params,
    { timeout: 5000 }
  );
  return response.data;
}

async function callIntentClassification(params: any) {
  const INTENT_ENGINE = process.env.INTENT_ENGINE_URL || 'http://localhost:4800';
  const response = await axios.post(
    `${INTENT_ENGINE}/api/v1/classify`,
    params,
    { timeout: 5000 }
  );
  return response.data;
}

// Start server
app.listen(PORT, () => {
  logger.info(`🧠 REZ Intelligence Integration Service started on port ${PORT}`);
  logger.info(`   Environment: ${NODE_ENV}`);
  logger.info(`   REZ Intel Bridge: ${process.env.REZ_INTEL_BRIDGE_URL || 'http://localhost:5369'}`);
  logger.info(`   Intent Engine: ${process.env.INTENT_ENGINE_URL || 'http://localhost:4800'}`);
  logger.info(`   Ready to power SUTAR agents with real-time business intelligence.`);
});
