/**
 * HOJAI Intelligence Layer - Main Entry Point
 * Multi-agent AI orchestration service for RTMN ecosystem
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { z } from 'zod';

// Types
import {
  AnalyzeResponse,
  GenerateBriefResponse,
  PolicyEvaluateResponse,
  IntelligenceMetrics,
} from './types';

// Agents
import { intentAgent } from './agents/intent';
import { sentimentAgent } from './agents/sentiment';
import { retrievalAgent } from './agents/retrieval';
import { predictionAgent } from './agents/prediction';
import { recommendationAgent } from './agents/recommendation';

// Memory
import { conversationMemory } from './memory/conversationMemory';
import { customerMemory } from './memory/customerMemory';
import { organizationMemory } from './memory/organizationMemory';

// Policy
import { policyEngine } from './policy/engine';

// Load environment
dotenv.config();

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Validation schemas
const analyzeRequestSchema = z.object({
  text: z.string().min(1),
  customerId: z.string().optional(),
  orgId: z.string().optional(),
  sessionId: z.string().optional(),
  context: z.object({
    channel: z.string().optional(),
    previousMessages: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
});

const generateBriefRequestSchema = z.object({
  customerId: z.string().min(1),
  topic: z.string().optional(),
  includeHistory: z.boolean().optional(),
});

const policyEvaluateRequestSchema = z.object({
  context: z.object({
    customerId: z.string().optional(),
    orgId: z.string().optional(),
    situation: z.string().min(1),
    customerAttributes: z.record(z.unknown()).optional(),
    transactionAmount: z.number().optional(),
  }),
});

// Metrics tracking
const metrics: IntelligenceMetrics = {
  totalRequests: 0,
  avgProcessingTimeMs: 0,
  intentAccuracy: 0,
  sentimentAccuracy: 0,
  predictionAccuracy: 0,
  cacheHitRate: 0,
  activeSessions: 0,
};

/**
 * POST /api/analyze
 * Main analysis endpoint - runs all agents
 */
app.post('/api/analyze', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    // Validate request
    const validatedData = analyzeRequestSchema.parse(req.body);
    const { text, customerId, orgId, sessionId, context } = validatedData;

    logger.info(`Analysis request ${requestId}`, { customerId, textLength: text.length });

    // Run intent detection
    const intentResult = await intentAgent.detect(text, context);

    // Run sentiment analysis
    const sentimentResult = await sentimentAgent.analyze(text);

    // Run knowledge retrieval
    const retrievalResult = await retrievalAgent.retrieve(text, {
      category: intentResult.primaryIntent,
      previousIssues: context?.previousMessages,
    });

    // Get customer history if available
    let customerHistory;
    if (customerId) {
      const profile = await customerMemory.getProfile(customerId);
      if (profile) {
        customerHistory = {
          previousCsatScores: profile.sentimentTrend,
          previousEscalations: profile.interactionHistory.filter(i =>
            i.type === 'escalation'
          ).length,
          accountAge: Math.floor((Date.now() - profile.lastUpdated) / (1000 * 60 * 60 * 24)),
          lifetimeValue: profile.lifetimeValue,
          tier: profile.tier,
        };
      }

      // Update sentiment trend
      await customerMemory.updateSentimentTrend(customerId, sentimentResult.score);
    }

    // Run prediction
    const predictionResult = await predictionAgent.predict(
      sentimentResult,
      intentResult,
      customerHistory
    );

    // Run recommendation
    const recommendationResult = await recommendationAgent.recommend(
      sentimentResult,
      intentResult,
      predictionResult,
      { channel: context?.channel }
    );

    // Add conversation turn if session exists
    if (sessionId) {
      try {
        await conversationMemory.addTurn(sessionId, 'user', text, {
          intent: intentResult.primaryIntent,
          sentiment: sentimentResult.score,
        });
      } catch (e) {
        // Session might not exist, create it
        if (customerId) {
          const session = await conversationMemory.createSession(customerId, {
            channel: context?.channel,
          });
          await conversationMemory.addTurn(session.sessionId, 'user', text, {
            intent: intentResult.primaryIntent,
            sentiment: sentimentResult.score,
          });
        }
      }
    }

    // Update metrics
    metrics.totalRequests++;
    const processingTime = Date.now() - startTime;
    metrics.avgProcessingTimeMs =
      (metrics.avgProcessingTimeMs * (metrics.totalRequests - 1) + processingTime) /
      metrics.totalRequests;

    const response: AnalyzeResponse = {
      requestId,
      timestamp: Date.now(),
      intent: intentResult,
      sentiment: sentimentResult,
      retrieval: retrievalResult,
      prediction: predictionResult,
      recommendations: recommendationResult,
      processingTimeMs: processingTime,
    };

    logger.info(`Analysis complete ${requestId}`, {
      processingTimeMs: processingTime,
      primaryIntent: intentResult.primaryIntent,
      sentiment: sentimentResult.sentiment,
    });

    res.json(response);
  } catch (error) {
    logger.error(`Analysis error ${requestId}`, { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
    } else {
      res.status(500).json({ error: 'Analysis failed', requestId });
    }
  }
});

/**
 * POST /api/generate-brief
 * Generate customer brief with context
 */
app.post('/api/generate-brief', async (req: Request, res: Response) => {
  const briefId = uuidv4();

  try {
    const validatedData = generateBriefRequestSchema.parse(req.body);
    const { customerId, topic, includeHistory = true } = validatedData;

    logger.info(`Generate brief ${briefId}`, { customerId, topic });

    // Get customer profile
    const customerProfile = await customerMemory.getOrCreateProfile(customerId);

    // Get recent interactions
    let recentInteractions;
    if (includeHistory) {
      const sessions = await conversationMemory.getCustomerSessions(customerId);
      const recentSessions = sessions.slice(0, 3);
      recentInteractions = recentSessions
        .flatMap(s => s.turns)
        .slice(-20)
        .map(turn => ({
          id: turn.id,
          role: turn.role,
          content: turn.content,
          timestamp: turn.timestamp,
          metadata: turn.metadata,
        }));
    }

    // Get customer insights
    const insights = await customerMemory.getInsights(customerId);

    // Generate key insights
    const keyInsights: string[] = [];
    if (insights) {
      if (insights.sentimentTrend === 'declining') {
        keyInsights.push('Customer sentiment is declining - consider proactive outreach');
      }
      if (insights.atRisk) {
        keyInsights.push('Customer is at-risk - prioritize retention');
      }
      if (insights.currentTier === 'vip') {
        keyInsights.push('VIP customer - ensure premium service experience');
      }
      keyInsights.push(`Average sentiment score: ${insights.avgSentiment}`);
      keyInsights.push(`Total interactions: ${insights.totalInteractions}`);
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (topic) {
      const retrieval = await retrievalAgent.retrieve(topic);
      recommendations.push(
        ...retrieval.relevantDocuments.slice(0, 3).map(d => d.title)
      );
    }
    if (customerProfile.tier === 'vip') {
      recommendations.push('Offer dedicated support channel');
    }
    if (customerProfile.lifetimeValue > 5000) {
      recommendations.push('Consider exclusive loyalty rewards');
    }

    const response: GenerateBriefResponse = {
      briefId,
      timestamp: Date.now(),
      customerProfile,
      recentInteractions,
      sentimentTrend: customerProfile.sentimentTrend,
      keyInsights,
      recommendations,
    };

    logger.info(`Brief generated ${briefId}`, {
      insightsCount: keyInsights.length,
      recommendationsCount: recommendations.length,
    });

    res.json(response);
  } catch (error) {
    logger.error(`Generate brief error ${briefId}`, { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
    } else {
      res.status(500).json({ error: 'Brief generation failed', briefId });
    }
  }
});

/**
 * POST /api/policy/evaluate
 * Evaluate policies for given context
 */
app.post('/api/policy/evaluate', async (req: Request, res: Response) => {
  const evaluationId = uuidv4();

  try {
    const validatedData = policyEvaluateRequestSchema.parse(req.body);
    const { context } = validatedData;

    const orgId = context.orgId || 'default';

    logger.info(`Policy evaluation ${evaluationId}`, {
      orgId,
      situation: context.situation,
    });

    // Evaluate policies
    const result = await policyEngine.evaluate(orgId, context);

    // Generate reasoning
    const reasoning = result.applicablePolicies.length > 0
      ? `Matched ${result.applicablePolicies.length} policy(ies): ${result.applicablePolicies.map(p => p.name).join(', ')}`
      : 'No policies matched the current context';

    const response: PolicyEvaluateResponse = {
      evaluationId,
      timestamp: Date.now(),
      result,
      reasoning,
    };

    logger.info(`Policy evaluation complete ${evaluationId}`, {
      matchedPolicies: result.applicablePolicies.length,
      actions: result.recommendedActions.length,
    });

    res.json(response);
  } catch (error) {
    logger.error(`Policy evaluation error ${evaluationId}`, { error });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
    } else {
      res.status(500).json({ error: 'Policy evaluation failed', evaluationId });
    }
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-intelligence',
    version: '1.0.0',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

/**
 * GET /api/metrics
 * Service metrics
 */
app.get('/api/metrics', (_req: Request, res: Response) => {
  res.json({
    ...metrics,
    activeSessions: conversationMemory.getSession
      ? 0 // Would need actual tracking
      : 0,
  });
});

/**
 * GET /api/agents
 * List available agents
 */
app.get('/api/agents', (_req: Request, res: Response) => {
  res.json({
    agents: [
      {
        name: 'intent',
        description: 'Intent detection agent',
        capabilities: ['classify', 'extract-entities', 'suggest-actions'],
      },
      {
        name: 'sentiment',
        description: 'Sentiment analysis agent',
        capabilities: ['analyze', 'detect-emotions', 'extract-phrases'],
      },
      {
        name: 'retrieval',
        description: 'Knowledge retrieval agent',
        capabilities: ['search', 'find-similar', 'summarize'],
      },
      {
        name: 'prediction',
        description: 'Outcome prediction agent',
        capabilities: ['csat', 'escalation', 'churn-risk'],
      },
      {
        name: 'recommendation',
        description: 'Action recommendation agent',
        capabilities: ['recommend', 'suggest-templates', 'automation-check'],
      },
    ],
  });
});

/**
 * POST /api/conversation/session
 * Create new conversation session
 */
app.post('/api/conversation/session', async (req: Request, res: Response) => {
  try {
    const { customerId, channel, agentId } = req.body;

    if (!customerId) {
      res.status(400).json({ error: 'customerId is required' });
      return;
    }

    const session = await conversationMemory.createSession(customerId, {
      channel,
      agentId,
    });

    res.json(session);
  } catch (error) {
    logger.error('Session creation error', { error });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/conversation/session/:sessionId
 * Get conversation session
 */
app.get('/api/conversation/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await conversationMemory.getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error) {
    logger.error('Get session error', { error });
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * POST /api/customer/profile
 * Get or create customer profile
 */
app.post('/api/customer/profile', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      res.status(400).json({ error: 'customerId is required' });
      return;
    }

    const profile = await customerMemory.getOrCreateProfile(customerId);
    res.json(profile);
  } catch (error) {
    logger.error('Get/create profile error', { error });
    res.status(500).json({ error: 'Failed to get/create profile' });
  }
});

/**
 * GET /api/customer/:customerId/insights
 * Get customer insights
 */
app.get('/api/customer/:customerId/insights', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const insights = await customerMemory.getInsights(customerId);

    if (!insights) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json(insights);
  } catch (error) {
    logger.error('Get insights error', { error });
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

/**
 * POST /api/organization/:orgId/policies
 * Get organization policies
 */
app.get('/api/organization/:orgId/policies', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const policies = await organizationMemory.getPolicies(orgId);
    res.json({ policies });
  } catch (error) {
    logger.error('Get policies error', { error });
    res.status(500).json({ error: 'Failed to get policies' });
  }
});

/**
 * Error handling middleware
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = parseInt(process.env.PORT || '4881', 10);

app.listen(PORT, () => {
  logger.info(`HOJAI Intelligence Layer started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
  logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
});

export default app;
