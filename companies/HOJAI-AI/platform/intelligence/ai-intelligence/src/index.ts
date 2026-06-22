import { requireAuth } from '@rtmn/shared/auth';
/**
 * HOJAI Intelligence Layer - Main Entry Point
 * Multi-agent AI orchestration service for RTMN ecosystem
 */

import express, { Request, Response, NextFunction } from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
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


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
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
app.post('/api/analyze',requireAuth,  async (req: Request, res: Response) => {
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
app.post('/api/generate-brief',requireAuth,  async (req: Request, res: Response) => {
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
app.post('/api/policy/evaluate',requireAuth,  async (req: Request, res: Response) => {
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
    activeSessions: 0, // Would need actual tracking
  });
});

/**
 * GET /api/route
 * Routing table for intelligence sub-services (predictive, risk, decision, micro)
 * AND training/platform sub-services (inference, prompts, cache, registry, safety, eval).
 * Lets callers discover the correct port for each capability.
 */
app.get('/api/route', (_req: Request, res: Response) => {
  res.json({
    central: 'http://localhost:4881',
    services: {
      predictive: 'http://localhost:4754',
      risk: 'http://localhost:4755',
      decision: 'http://localhost:4756',
      micro: 'http://localhost:4753',
      customer: 'http://localhost:4885',
      memory: 'http://localhost:4703',
      memoryContext: 'http://localhost:4790',
      twin: 'http://localhost:4705',
      skill: 'http://localhost:4743',
      inference: 'http://localhost:4770',
      prompts: 'http://localhost:4771',
      semanticCache: 'http://localhost:4772',
      modelRegistry: 'http://localhost:4773',
      aiSafety: 'http://localhost:4774',
      evaluation: 'http://localhost:4775',
      vectorDb: 'http://localhost:4780',
      rag: 'http://localhost:4781',
      documentIntelligence: 'http://localhost:4782',
      graph: 'http://localhost:4783',
      knowledge: 'http://localhost:4784',
      fineTuning: 'http://localhost:4776',
      syntheticData: 'http://localhost:4777',
      gpuCluster: 'http://localhost:4778',
      sutarIntentBus: 'http://localhost:4154',
      sutarUsageTracker: 'http://localhost:4252',
      sutarSimulation: 'http://localhost:4241',
      sutarDiscovery: 'http://localhost:4256',
      sutarRoi: 'http://localhost:4259',
      sutarMonitoring: 'http://localhost:3100',
      // Architecture v2 — new orchestration, reasoning, twin-memory, dev platform, marketplace
      flowOrchestrator: 'http://localhost:4244',
      reasoningRuntime: 'http://localhost:4253',
      twinMemoryBridge: 'http://localhost:4704',
      connectorHub: 'http://localhost:4785',
      sandbox: 'http://localhost:4100',
      webhookBus: 'http://localhost:4110',
      skillMarketplace: 'http://localhost:4120',
      promptMarketplace: 'http://localhost:4130',
      // SUTAR OS Division 12 — 11 new services (June 20, 2026)
      sutarGateway: 'http://localhost:4140',
      sutarTwinOs: 'http://localhost:4142',
      sutarMemoryBridge: 'http://localhost:4143',
      sutarIdentity: 'http://localhost:4144',
      sutarAgentId: 'http://localhost:4145',
      sutarAgentNetwork: 'http://localhost:4155',
      sutarContracts: 'http://localhost:4185',
      sutarExploration: 'http://localhost:4255',
      sutarMultiAgentEvaluator: 'http://localhost:4257',
      sutarReputationAggregator: 'http://localhost:4258',
      sutarFounderOs: 'http://localhost:4260',
      // Communication Cloud Division 5 — 5 new comms services (June 20, 2026)
      whatsappOs: 'http://localhost:4860',
      emailOs: 'http://localhost:4862',
      meetingOs: 'http://localhost:4864',
      translationOs: 'http://localhost:4866',
      liveSupportOs: 'http://localhost:4868',
      // Marketplace Network Division 11 — 4 new marketplace services (June 20, 2026)
      twinMarketplace: 'http://localhost:4146',
      connectorMarketplace: 'http://localhost:4147',
      industryPacks: 'http://localhost:4148',
      trustNetwork: 'http://localhost:4149',
      // Twin Discovery — capability profile (June 20, 2026)
      twinCapabilityProfile: 'http://localhost:4150',
      // Goal Conflict Engine (June 20, 2026)
      goalConflictEngine: 'http://localhost:4151',
      // Memory Confidence & Decay (June 20, 2026)
      memoryConfidence: 'http://localhost:4152',
      // Phase 1 - Cross-cutting services (June 20, 2026)
      billingApis: 'http://localhost:4280',
      mtlsJwtBridge: 'http://localhost:4281',
      pluginFramework: 'http://localhost:4282',
      experimentTracking: 'http://localhost:4283',
      federatedLearning: 'http://localhost:4284',
      // Phase 2 - Agent Cloud (June 20, 2026)
      agentSecurity: 'http://localhost:4290',
      agentSdk: 'http://localhost:4291',
      agentBuilder: 'http://localhost:4292',
      agentStudio: 'http://localhost:4293',
      multiAgentRuntime: 'http://localhost:4294',
      // Phase 3 - Communication (June 20, 2026)
      phoneAi: 'http://localhost:4869',
      speechIntelligence: 'http://localhost:4870',
      // Phase 4 - Products (June 20, 2026)
      bizora: 'http://localhost:4261',
      hib: 'http://localhost:4262',
      aiWorkspace: 'http://localhost:4263',
      boardIntelligence: 'http://localhost:4264',
      investorCopilot: 'http://localhost:4265',
      founderOsProduct: 'http://localhost:4266',
      startupStudio: 'http://localhost:4267',
      companyBuilderSuite: 'http://localhost:4268',
      // Phase 5 - Industry OS products (June 20, 2026)
      salonOs: 'http://localhost:5271',
      logisticsOs: 'http://localhost:5272',
      aviationOs: 'http://localhost:5273',
      ngoOs: 'http://localhost:5274',
      governmentOs: 'http://localhost:5275',
      realestateOsProduct: 'http://localhost:5276',
      // Phase 6 - Foundational governance + trust (June 20, 2026) — wired into intelligence route
      policyOs: 'http://localhost:4254',
      trustIntelligence: 'http://localhost:4882',
      eventBus: 'http://localhost:4510',
      decisionEngine: 'http://localhost:4756',
      goalOs: 'http://localhost:4151',
      corpidService: 'http://localhost:4702',
      memoryOs: 'http://localhost:4703',
      twinOs: 'http://localhost:4705',
    },
    capabilities: {
      forecast: 'http://localhost:4754/api/forecast',
      anomaly: 'http://localhost:4754/api/anomaly/detect',
      fraudScore: 'http://localhost:4755/api/fraud/score',
      churnScore: 'http://localhost:4755/api/churn/score',
      creditScore: 'http://localhost:4755/api/credit/score',
      recommendItems: 'http://localhost:4756/api/recommend/items',
      nextBestAction: 'http://localhost:4756/api/nba',
      multiCriteriaDecision: 'http://localhost:4756/api/decision/wsm',
      circuitBreaker: 'http://localhost:4753/api/execute',
      llmComplete: 'http://localhost:4770/api/complete',
      llmRoute: 'http://localhost:4770/api/route',
      promptRender: 'http://localhost:4771/api/templates/{slug}/render',
      promptSearch: 'http://localhost:4771/api/search',
      cacheLookup: 'http://localhost:4772/api/lookup',
      cacheStore: 'http://localhost:4772/api/cache',
      modelCatalog: 'http://localhost:4773/api/models',
      inputCheck: 'http://localhost:4774/api/check/input',
      outputCheck: 'http://localhost:4774/api/check/output',
      runBenchmark: 'http://localhost:4775/api/run',
      embed: 'http://localhost:4780/api/embed',
      vectorSearch: 'http://localhost:4780/api/collections/{name}/search',
      vectorUpsert: 'http://localhost:4780/api/collections/{name}/vectors',
      ragQuery: 'http://localhost:4781/api/rag/query',
      ragRetrieve: 'http://localhost:4781/api/retrieve',
      ragIngest: 'http://localhost:4781/api/documents',
      docExtract: 'http://localhost:4782/api/extract',
      docExtractBatch: 'http://localhost:4782/api/extract/batch',
      docExtractAndRag: 'http://localhost:4782/api/extract-and-rag',
      docFormats: 'http://localhost:4782/api/formats',
      graphQuery: 'http://localhost:4783/api/match',
      graphTraverse: 'http://localhost:4783/api/traverse',
      graphShortestPath: 'http://localhost:4783/api/shortest-path',
      graphComponents: 'http://localhost:4783/api/components',
      graphPageRank: 'http://localhost:4783/api/pagerank',
      graphNodeCreate: 'http://localhost:4783/api/nodes',
      graphEdgeCreate: 'http://localhost:4783/api/edges',
      nerExtract: 'http://localhost:4784/api/ner/extract',
      entityLink: 'http://localhost:4784/api/link',
      factExtract: 'http://localhost:4784/api/facts/extract',
      knowledgeExtractAll: 'http://localhost:4784/api/extract-all',
      datasetGenerate: 'http://localhost:4777/api/generate',
      datasetList: 'http://localhost:4777/api/datasets',
      fineTuneJobCreate: 'http://localhost:4776/api/jobs',
      fineTuneJobGet: 'http://localhost:4776/api/jobs/{id}',
      fineTuneJobCancel: 'http://localhost:4776/api/jobs/{id}/cancel',
      fineTuneCheckpoints: 'http://localhost:4776/api/checkpoints',
      fineTuneMethods: 'http://localhost:4776/api/methods',
      fineTuneBaseModels: 'http://localhost:4776/api/base-models',
      gpuAllocate: 'http://localhost:4778/api/allocate',
      gpuRelease: 'http://localhost:4778/api/release/{allocationId}',
      gpuClusterStats: 'http://localhost:4778/api/cluster/stats',
      gpuModels: 'http://localhost:4778/api/gpu-models',
      gpuNodes: 'http://localhost:4778/api/nodes',
      intentPublish: 'http://localhost:4154/api/intents/publish',
      intentList: 'http://localhost:4154/api/intents',
      intentClaim: 'http://localhost:4154/api/intents/{id}/claim',
      intentResolve: 'http://localhost:4154/api/intents/{id}/resolve',
      intentSubscribe: 'http://localhost:4154/api/subscriptions',
      usageRecord: 'http://localhost:4252/api/usage/record',
      usageList: 'http://localhost:4252/api/usage',
      usageAggregate: 'http://localhost:4252/api/usage/aggregate/{key}',
      billingGenerate: 'http://localhost:4252/api/billing/generate',
      revenueShare: 'http://localhost:4252/api/revenue/share/{providerId}',
      simulationRun: 'http://localhost:4241/api/scenarios',
      simulationList: 'http://localhost:4241/api/scenarios',
      simulationTemplates: 'http://localhost:4241/api/templates',
      simulationCompare: 'http://localhost:4241/api/scenarios/compare',
      discoverySearch: 'http://localhost:4256/api/search',
      discoveryIndex: 'http://localhost:4256/api/index',
      discoveryIndexes: 'http://localhost:4256/api/indexes',
      roiCalculate: 'http://localhost:4259/api/calculations',
      roiQuick: 'http://localhost:4259/api/quick-roi',
      monitoringServices: 'http://localhost:3100/api/services',
      monitoringProbe: 'http://localhost:3100/api/probe/all',
      monitoringAlerts: 'http://localhost:3100/api/alerts/active',
      // Architecture v2 — orchestration + reasoning + dev platform + marketplace
      flowOrchestratorRun: 'http://localhost:4244/api/executions',
      flowOrchestratorRunSync: 'http://localhost:4244/api/executions/sync',
      flowTemplates: 'http://localhost:4244/api/templates',
      flowStepRegistry: 'http://localhost:4244/api/step-registry',
      reasoningTrace: 'http://localhost:4253/api/traces',
      reasoningTemplates: 'http://localhost:4253/api/templates',
      twinMemoryBind: 'http://localhost:4704/api/twins/{twinId}/bind',
      twinMemoryResolve: 'http://localhost:4704/api/twins/{twinId}/binding',
      connectorList: 'http://localhost:4785/api/connectors',
      connectorResource: 'http://localhost:4785/api/connectors/{name}/{kind}',
      sandboxCreate: 'http://localhost:4100/api/sandboxes',
      sandboxList: 'http://localhost:4100/api/sandboxes',
      webhookSubscribe: 'http://localhost:4110/api/subscribers',
      webhookDispatch: 'http://localhost:4110/api/dispatch',
      skillMarketplaceList: 'http://localhost:4120/api/listings',
      promptMarketplaceList: 'http://localhost:4130/api/prompts',
      // SUTAR OS Division 12 — capabilities
      sutarGatewayStatus: 'http://localhost:4140/api/sutar/status',
      sutarGatewayServices: 'http://localhost:4140/api/sutar/services',
      sutarTwinResolveForIntent: 'http://localhost:4142/api/twins/resolve-for-intent',
      sutarMemoryRemember: 'http://localhost:4143/api/memory/remember',
      sutarMemoryRecall: 'http://localhost:4143/api/memory/recall',
      sutarIdentityIssue: 'http://localhost:4144/api/identities',
      sutarIdentityAttest: 'http://localhost:4144/api/identities/{sutarId}/attest',
      sutarAgentIdCreate: 'http://localhost:4145/api/agents',
      sutarAgentIdManifest: 'http://localhost:4145/api/manifest/agents-for-intent',
      sutarNetworkRoute: 'http://localhost:4155/api/route',
      sutarNetworkMessage: 'http://localhost:4155/api/messages',
      sutarContractTemplates: 'http://localhost:4185/api/templates',
      sutarContractSign: 'http://localhost:4185/api/contracts/{id}/sign',
      sutarExplorationJourney: 'http://localhost:4255/api/journeys',
      sutarMultiAgentEval: 'http://localhost:4257/api/evaluations',
      sutarMultiAgentCompare: 'http://localhost:4257/api/evaluations/compare',
      sutarReputationLeaderboard: 'http://localhost:4258/api/leaderboard',
      sutarFounderPlaybooks: 'http://localhost:4260/api/playbooks',
      sutarFounderRunPlaybook: 'http://localhost:4260/api/founders/{id}/playbooks/{pid}/run',
      // Communication Cloud Division 5 — capabilities
      whatsappSend: 'http://localhost:4860/api/messages/send',
      whatsappTemplates: 'http://localhost:4860/api/templates',
      whatsappWebhookSimulate: 'http://localhost:4860/api/webhook/simulate',
      emailTriage: 'http://localhost:4862/api/inbox/receive',
      emailDraftReply: 'http://localhost:4862/api/inbox/{id}/draft-reply',
      emailSend: 'http://localhost:4862/api/emails/send',
      meetingSchedule: 'http://localhost:4864/api/meetings/schedule',
      meetingCheckConflicts: 'http://localhost:4864/api/meetings/check-conflicts',
      meetingExtract: 'http://localhost:4864/api/meetings/{id}/extract',
      translateText: 'http://localhost:4866/api/translate',
      translateBatch: 'http://localhost:4866/api/translate/batch',
      liveSupportSession: 'http://localhost:4868/api/sessions',
      liveSupportHandoff: 'http://localhost:4868/api/handoffs/{id}',
      liveSupportAgents: 'http://localhost:4868/api/agents/available',
      // Marketplace Network Division 11 — capabilities
      twinMarketplaceList: 'http://localhost:4146/api/listings',
      twinMarketplaceInstall: 'http://localhost:4146/api/installs',
      connectorMarketplaceList: 'http://localhost:4147/api/listings',
      connectorMarketplaceInstall: 'http://localhost:4147/api/installs',
      industryPacksList: 'http://localhost:4148/api/listings',
      industryPacksInstall: 'http://localhost:4148/api/installs',
      trustNetworkEntities: 'http://localhost:4149/api/entities',
      trustNetworkEndorse: 'http://localhost:4149/api/endorsements',
      trustNetworkTopTrusted: 'http://localhost:4149/api/top-trusted',
      // Twin Discovery — capability profile
      twinCapabilityProfileList: 'http://localhost:4150/api/profiles',
      twinCapabilityProfileGet: 'http://localhost:4150/api/profiles/{twinId}',
      twinCapabilityDiscover: 'http://localhost:4150/api/discover/by-capability/{capability}',
      twinCapabilitySearch: 'http://localhost:4150/api/search',
      // Goal Conflict Engine
      goalConflictDetect: 'http://localhost:4151/api/conflicts/detect',
      goalConflictList: 'http://localhost:4151/api/conflicts',
      goalConflictGet: 'http://localhost:4151/api/conflicts/{id}',
      goalConflictResolve: 'http://localhost:4151/api/conflicts/{id}/resolve',
      goalConflictOppositions: 'http://localhost:4151/api/oppositions',
      // Memory Confidence & Decay
      memoryConfidenceList: 'http://localhost:4152/api/facts',
      memoryConfidenceGet: 'http://localhost:4152/api/facts/{id}',
      memoryConfidenceRecall: 'http://localhost:4152/api/recall/{twinId}',
      memoryConfidenceReinforce: 'http://localhost:4152/api/facts/{id}/reinforce',
      memoryConfidenceContradict: 'http://localhost:4152/api/facts/{id}/contradict',
      // Phase 1 - Cross-cutting (June 20, 2026)
      billingCreate: 'http://localhost:4280/api/subscriptions',
      billingList: 'http://localhost:4280/api/subscriptions',
      billingInvoice: 'http://localhost:4280/api/invoices',
      mtlsHandshake: 'http://localhost:4281/api/handshake',
      mtlsVerify: 'http://localhost:4281/api/verify',
      pluginRegister: 'http://localhost:4282/api/plugins',
      pluginList: 'http://localhost:4282/api/plugins',
      pluginInvoke: 'http://localhost:4282/api/plugins/{id}/invoke',
      experimentCreate: 'http://localhost:4283/api/experiments',
      experimentList: 'http://localhost:4283/api/experiments',
      experimentCompare: 'http://localhost:4283/api/experiments/compare',
      flJobCreate: 'http://localhost:4284/api/jobs',
      flJobList: 'http://localhost:4284/api/jobs',
      flRoundSubmit: 'http://localhost:4284/api/jobs/{id}/rounds',
      // Phase 2 - Agent Cloud (June 20, 2026)
      agentSecCreate: 'http://localhost:4290/api/agents',
      agentSecIssueToken: 'http://localhost:4290/api/tokens',
      agentSecListTokens: 'http://localhost:4290/api/tokens',
      agentSecQuarantine: 'http://localhost:4290/api/agents/{id}/quarantine',
      sdkPackage: 'http://localhost:4291/api/packages',
      sdkDownload: 'http://localhost:4291/api/packages/{name}',
      sdkLanguages: 'http://localhost:4291/api/languages',
      builderAgentCreate: 'http://localhost:4292/api/agents',
      builderBlueprint: 'http://localhost:4292/api/blueprints',
      builderBlueprintPublish: 'http://localhost:4292/api/blueprints/{id}/publish',
      studioProjectCreate: 'http://localhost:4293/api/projects',
      studioProjectPublish: 'http://localhost:4293/api/projects/{id}/publish',
      studioReview: 'http://localhost:4293/api/projects/{id}/reviews',
      marSpawn: 'http://localhost:4294/api/instances',
      marDispatch: 'http://localhost:4294/api/dispatch',
      marStatus: 'http://localhost:4294/api/instances/{id}',
      // Phase 3 - Communication (June 20, 2026)
      phoneCall: 'http://localhost:4869/api/calls',
      phoneIvrs: 'http://localhost:4869/api/ivrs',
      phoneTranscripts: 'http://localhost:4869/api/transcripts',
      phoneRecordings: 'http://localhost:4869/api/recordings',
      speechTranscribe: 'http://localhost:4870/api/transcriptions',
      speechTts: 'http://localhost:4870/api/tts',
      speechSentiment: 'http://localhost:4870/api/sentiment',
      speechDiarize: 'http://localhost:4870/api/diarizations',
      // Phase 4 - Products (June 20, 2026)
      bizOrgs: 'http://localhost:4261/api/orgs',
      bizKpis: 'http://localhost:4261/api/kpis',
      bizAlerts: 'http://localhost:4261/api/alerts',
      bizReports: 'http://localhost:4261/api/reports',
      bizExecSummary: 'http://localhost:4261/api/ai/exec-summary',
      hibTasks: 'http://localhost:4262/api/tasks',
      hibApprove: 'http://localhost:4262/api/tasks/{id}/approve',
      hibReject: 'http://localhost:4262/api/tasks/{id}/reject',
      hibEscalate: 'http://localhost:4262/api/tasks/{id}/escalate',
      awsDocs: 'http://localhost:4263/api/documents',
      awsThreads: 'http://localhost:4263/api/threads',
      awsComments: 'http://localhost:4263/api/comments',
      boardMeetings: 'http://localhost:4264/api/meetings',
      boardAgendas: 'http://localhost:4264/api/meetings/{id}/agenda',
      boardResolutions: 'http://localhost:4264/api/resolutions',
      invRounds: 'http://localhost:4265/api/rounds',
      invAllocations: 'http://localhost:4265/api/allocations',
      invCapTable: 'http://localhost:4265/api/cap-table/{entityId}',
      fopFounders: 'http://localhost:4266/api/founders',
      fopOkrs: 'http://localhost:4266/api/okrs',
      fopDecisions: 'http://localhost:4266/api/decisions',
      ssCohorts: 'http://localhost:4267/api/cohorts',
      ssCompanies: 'http://localhost:4267/api/companies',
      ssMentors: 'http://localhost:4267/api/mentors',
      cbsEntities: 'http://localhost:4268/api/entities',
      cbsRegistrations: 'http://localhost:4268/api/registrations',
      cbsEins: 'http://localhost:4268/api/eins',
      cbsBuildSummary: 'http://localhost:4268/api/build-summary/{entityId}',
      // Phase 5 - Industry OS products (June 20, 2026)
      salonAppointments: 'http://localhost:5271/api/appointments',
      salonServices: 'http://localhost:5271/api/services',
      salonMemberships: 'http://localhost:5271/api/memberships',
      logisticsShipments: 'http://localhost:5272/api/shipments',
      logisticsTracking: 'http://localhost:5272/api/shipments/{id}/track',
      logisticsDeliveries: 'http://localhost:5272/api/deliveries',
      aviationFlights: 'http://localhost:5273/api/flights',
      aviationBookings: 'http://localhost:5273/api/bookings',
      aviationMaintenance: 'http://localhost:5273/api/maintenance',
      ngoDonations: 'http://localhost:5274/api/donations',
      ngoCampaigns: 'http://localhost:5274/api/campaigns',
      ngoImpact: 'http://localhost:5274/api/impact',
      govApplications: 'http://localhost:5275/api/applications',
      govPermits: 'http://localhost:5275/api/permits',
      govCases: 'http://localhost:5275/api/cases',
      reListings: 'http://localhost:5276/api/listings',
      reOffers: 'http://localhost:5276/api/offers',
      reClosings: 'http://localhost:5276/api/closings',
      // Phase 6 - Foundational governance + trust capabilities (June 20, 2026)
      policyEvaluate: 'http://localhost:4254/api/policies/evaluate',
      policyList: 'http://localhost:4254/api/policies',
      policyCreate: 'http://localhost:4254/api/policies',
      policySimulate: 'http://localhost:4254/api/policies/simulate',
      policyExplain: 'http://localhost:4254/api/policies/{id}/explain',
      policyAudit: 'http://localhost:4254/api/audit',
      trustScore: 'http://localhost:4882/api/agents/{agentId}/trust/score',
      trustReputation: 'http://localhost:4882/api/agents/{agentId}/reputation',
      trustRisk: 'http://localhost:4882/api/agents/{agentId}/risk',
      trustConfidence: 'http://localhost:4882/api/agents/{agentId}/confidence',
      trustLevels: 'http://localhost:4882/api/trust/levels',
      trustTransitive: 'http://localhost:4882/api/agents/{agentId}/trust-transitive/{targetId}',
      trustGraph: 'http://localhost:4882/api/agents/{agentId}/trust-graph',
      trustTopTrusted: 'http://localhost:4882/api/agents/top-trusted',
      eventPublish: 'http://localhost:4510/api/events/publish',
      eventSubscribe: 'http://localhost:4510/api/subscriptions',
      eventReplay: 'http://localhost:4510/api/events/replay',
      corpidTrust: 'http://localhost:4702/api/trust/score/{corpId}',
      corpidNamespaces: 'http://localhost:4702/api/namespaces',
      corpidApiKeys: 'http://localhost:4702/api/api-keys',
      twinResolve: 'http://localhost:4705/api/twins/{twinId}',
      twinSearch: 'http://localhost:4705/api/twins/search',
      twinVersion: 'http://localhost:4705/api/twins/{twinId}/versions',
      memoryRemember: 'http://localhost:4703/api/memories',
      memoryRecall: 'http://localhost:4703/api/memories/recall',
      memoryForget: 'http://localhost:4703/api/memories/{id}/forget',
      memoryContextBuild: 'http://localhost:4790/api/context',
      memoryContextPreview: 'http://localhost:4790/api/context/preview',
      skillCreate: 'http://localhost:4743/api/skills',
      skillExecute: 'http://localhost:4743/api/skills/{id}/execute'
    }
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
      {
        name: 'predictive',
        description: 'Predictive Intelligence — time-series forecasting, anomaly detection, demand prediction',
        capabilities: ['forecast', 'anomaly-detect', 'trend', 'decompose', 'demand', 'evaluate'],
        endpoint: 'http://localhost:4754',
      },
      {
        name: 'risk',
        description: 'Risk Intelligence — fraud, churn, credit scoring',
        capabilities: ['fraud-score', 'churn-score', 'credit-score', 'composite'],
        endpoint: 'http://localhost:4755',
      },
      {
        name: 'decision',
        description: 'Decision Intelligence — recommendations, next-best-action, multi-criteria decisions',
        capabilities: ['recommend-items', 'nba', 'wsm', 'topsis'],
        endpoint: 'http://localhost:4756',
      },
      {
        name: 'micro',
        description: 'Micro Intelligence — circuit-breaker fallback layer so this very service is always reachable',
        capabilities: ['execute-via-breaker', 'fallback', 'state-control'],
        endpoint: 'http://localhost:4753',
      },
      {
        name: 'inference',
        description: 'Inference Gateway — single API for all LLM calls (OpenAI, Anthropic, Google, Mistral, local) with cost + latency routing',
        capabilities: ['complete', 'route', 'models', 'stats'],
        endpoint: 'http://localhost:4770',
      },
      {
        name: 'prompts',
        description: 'Prompt Manager — versioned prompt templates with A/B experiments',
        capabilities: ['render', 'list', 'version', 'experiment'],
        endpoint: 'http://localhost:4771',
      },
      {
        name: 'cache',
        description: 'Semantic Cache — embedding-based LLM response cache (50%+ cost reduction)',
        capabilities: ['lookup', 'store', 'embed', 'similarity'],
        endpoint: 'http://localhost:4772',
      },
      {
        name: 'registry',
        description: 'Model Registry — catalog of all available models with versioning + deployment status',
        capabilities: ['list', 'search', 'recommend', 'compare'],
        endpoint: 'http://localhost:4773',
      },
      {
        name: 'safety',
        description: 'AI Safety — PII redaction, prompt-injection defense, content filtering, hallucination detection',
        capabilities: ['check-input', 'check-output', 'redact', 'sanitize'],
        endpoint: 'http://localhost:4774',
      },
      {
        name: 'eval',
        description: 'Evaluation Harness — run benchmarks against any model, compare results',
        capabilities: ['run-benchmark', 'compare', 'scorers'],
        endpoint: 'http://localhost:4775',
      },
      {
        name: 'vector',
        description: 'Vector Database — in-memory vector store with cosine/dot/euclidean similarity, metadata filtering, shared FNV-1a 128-dim vectorizer',
        capabilities: ['embed', 'vector-search', 'upsert', 'batch', 'collections', 'filter'],
        endpoint: 'http://localhost:4780',
      },
      {
        name: 'rag',
        description: 'RAG Platform — chunking + embedding + retrieval + LLM augmentation. End-to-end retrieval-augmented generation framework',
        capabilities: ['rag-query', 'retrieve', 'ingest-document', 'config', 'stats'],
        endpoint: 'http://localhost:4781',
      },
      {
        name: 'docIntel',
        description: 'Document Intelligence — PDF/DOCX/XLSX/CSV/TXT/MD/HTML parser. Extracts text + metadata + structure from uploaded documents, plus one-shot extract-and-RAG ingest endpoint',
        capabilities: ['extract', 'batch-extract', 'extract-and-rag', 'formats', 'stats'],
        endpoint: 'http://localhost:4782',
      },
      {
        name: 'graph',
        description: 'Graph Database — in-memory property graph with nodes/edges/labels, Cypher-lite pattern matching, BFS traversal, shortest path, connected components, PageRank',
        capabilities: ['graph-query', 'traverse', 'shortest-path', 'components', 'pagerank', 'node-crud', 'edge-crud'],
      },
      {
        name: 'knowledge',
        description: 'Knowledge Extraction — NER (15 entity types), entity linking with Levenshtein fuzzy match, fact extraction (8+ pattern types), built-in catalogs (202 TECH, 34 persons, 38 orgs, 69 locations)',
        capabilities: ['ner', 'entity-link', 'fact-extract', 'extract-all', 'catalog-lookup', 'kb-management'],
      },
      {
        name: 'fineTuning',
        description: 'Fine-Tuning Pipeline — LoRA/QLoRA/Prefix/IA³/Full fine-tune orchestration, dataset lifecycle, GPU queue, checkpoint management',
        capabilities: ['dataset-crud', 'job-submit', 'job-status', 'job-cancel', 'checkpoint-list', 'lora', 'qlora', 'prefix', 'ia3', 'full'],
      },
      {
        name: 'syntheticData',
        description: 'Synthetic Data Generation — generate labeled training data from 5 domain banks (customer_support, ecommerce, healthcare, finance, general), schema-driven rows, or seed-set variations',
        capabilities: ['generate-from-domain', 'generate-from-schema', 'generate-from-seeds', 'dataset-list'],
      },
      {
        name: 'gpuCluster',
        description: 'GPU Cluster Manager — register GPU nodes (H100, A100, L40S, RTX-4090, T4, V100), allocate to training jobs, monitor utilization, schedule queue',
        capabilities: ['node-register', 'node-list', 'allocate', 'release', 'heartbeat', 'cluster-stats', 'gpu-catalog'],
      },
      {
        name: 'sutarIntentBus',
        description: 'SUTAR Intent Bus — pub/sub broadcast of agent intents across SUTAR; agents publish intents (book, negotiate, request), subscribers match by capability/type, first-claim wins',
        capabilities: ['intent-publish', 'intent-list', 'intent-claim', 'intent-resolve', 'intent-cancel', 'subscribe', 'poll', 'topics', 'stats'],
      },
      {
        name: 'sutarUsageTracker',
        description: 'SUTAR Usage Tracker — meters marketplace usage (LLM tokens, API calls, GPU seconds, twin updates, storage), enforces quotas, generates invoices, computes provider revenue share',
        capabilities: ['usage-record', 'usage-list', 'usage-aggregate', 'billing-generate', 'plan-crud', 'quota-crud', 'revenue-share'],
      },
      {
        name: 'sutarSimulation',
        description: 'SUTAR Simulation OS — what-if scenario analysis for pricing changes, market entry, policy rollouts, and agent decisions with Monte Carlo + parameter sweep',
        capabilities: ['run-scenario', 'rerun-scenario', 'cancel-scenario', 'compare-scenarios', 'list-templates', 'list-presets'],
      },
      {
        name: 'sutarDiscovery',
        description: 'SUTAR Discovery Engine — universal search across services, agents, twins, and intents across the RTMN ecosystem with token-based ranking',
        capabilities: ['universal-search', 'service-search', 'agent-search', 'twin-search', 'intent-search', 'index-doc', 'list-indexes'],
      },
      {
        name: 'sutarRoi',
        description: 'SUTAR ROI Calculator — compute ROI, payback period, NPV, and IRR for AI agent / service investments with templates for agent purchases, training, and rollouts',
        capabilities: ['run-calculation', 'list-calculations', 'compare-calculations', 'quick-roi', 'list-templates'],
      },
      {
        name: 'sutarMonitoring',
        description: 'SUTAR Monitoring — base observability: health probes (every 30s), metric samples, alert rules with auto-fire/auto-resolve, log aggregation across SUTAR services',
        capabilities: ['probe-service', 'probe-all', 'push-metric', 'list-services', 'list-alerts', 'create-rule', 'resolve-alert', 'push-log', 'list-logs', 'stats'],
      },
      // Architecture v2 (2026-06-20) — orchestration, reasoning, twin-memory, dev platform, marketplace
      {
        name: 'flowOrchestrator',
        description: 'Flow Orchestrator — central orchestration layer. Genie / CoPilot / SUTAR / Products connect here, NOT directly to TwinOS/MemoryOS/Intelligence/SkillOS/PolicyOS. Composes plans from a step library (twin.resolve, memory.read/write, intelligence.call, policy.check, skill.execute, hook.pre/post) and ships 5 templates (answer-question, decide-and-act, simulate-then-recommend, negotiate-and-execute, personal-assistant).',
        capabilities: ['plan-create', 'plan-list', 'plan-get', 'plan-delete', 'execution-run', 'execution-run-sync', 'execution-list', 'execution-get', 'template-list', 'template-get', 'template-instantiate', 'step-registry', 'foundation-get', 'foundation-set'],
        endpoint: 'http://localhost:4244',
      },
      {
        name: 'reasoningRuntime',
        description: 'Reasoning Runtime — implements Chain-of-Thought, ReAct, and Tree-of-Thought reasoning frameworks. Step traces are first-class records so consumers (FlowOS, agents, Intelligence) can audit how a decision was derived.',
        capabilities: ['trace-run', 'trace-get', 'trace-list', 'template-list', 'template-get'],
        endpoint: 'http://localhost:4253',
      },
      {
        name: 'twinMemoryBridge',
        description: 'Twin Memory Bridge — implements "Everything has a Twin / Each Twin owns its own Memory." Maps twin IDs to their memory partitions (episodic, semantic, procedural, working, long-term). Used by FlowOS memory steps and TwinOS to resolve memory ownership before calling MemoryOS.',
        capabilities: ['bind', 'unbind', 'bulk-bind', 'bulk-resolve', 'get-binding', 'get-partition', 'memory-list', 'memory-stat', 'partition-record', 'audit'],
        endpoint: 'http://localhost:4704',
      },
      {
        name: 'connectorHub',
        description: 'Connector Hub — pre-built integrations for 8 external SaaS systems (Salesforce, HubSpot, Stripe, Shopify, Slack, Notion, Google Sheets, Twilio) with a unified resource contract (list / get / create / update / delete / search / sync) plus a connection registry.',
        capabilities: ['list-connectors', 'get-connector', 'list-resources', 'get-resource', 'create-resource', 'update-resource', 'delete-resource', 'search', 'sync', 'connection-create', 'connection-list'],
        endpoint: 'http://localhost:4785',
      },
      {
        name: 'sandbox',
        description: 'Sandbox — free, isolated, time-limited test environment for developers. Each sandbox has its own API key, scoped TwinOS/MemoryOS namespaces, per-sandbox request log, reset + extend lifecycle, and auto-expiry.',
        capabilities: ['create-sandbox', 'list-sandboxes', 'get-sandbox', 'delete-sandbox', 'reset-sandbox', 'extend-sandbox', 'log-call', 'get-log'],
        endpoint: 'http://localhost:4100',
      },
      {
        name: 'webhookBus',
        description: 'Webhook Bus — event subscriptions and delivery for partners. Register an event type + URL + secret; dispatch records what would be sent, deliveries can be marked delivered/failed, manual retry supported, exponential backoff schedule tracked.',
        capabilities: ['event-types', 'subscribe', 'unsubscribe', 'list-subscribers', 'get-subscriber', 'dispatch', 'mark-delivered', 'mark-failed', 'retry', 'list-deliveries'],
        endpoint: 'http://localhost:4110',
      },
      {
        name: 'skillMarketplace',
        description: 'Skill Marketplace — buy/sell skills separately from agents. Publishers list skills (one-time, subscription, or usage pricing), consumers browse, search, purchase; ratings + reviews; featured + trending rollups.',
        capabilities: ['categories', 'listings-create', 'listings-list', 'listings-get', 'listings-search', 'listings-update', 'listings-delete', 'reviews-create', 'reviews-list', 'purchase', 'purchases-list', 'featured', 'trending'],
        endpoint: 'http://localhost:4120',
      },
      {
        name: 'promptMarketplace',
        description: 'Prompt Marketplace — buy/sell prompt templates. Versioned, tagged, reviewed, with model-target filter. Pairs with Prompt Manager (4771) which is the runtime.',
        capabilities: ['prompts-create', 'prompts-list', 'prompts-get', 'prompts-update', 'prompts-delete', 'version-add', 'version-list', 'version-get', 'version-render', 'review-create', 'review-list', 'featured', 'trending'],
        endpoint: 'http://localhost:4130',
      },
      // ── SUTAR OS Division 12 — 11 new agents (June 20, 2026) ──
      {
        name: 'sutarGateway',
        description: 'SUTAR Gateway (4140) — single HTTP entry point for all 25 SUTAR services. Registry + status + routing.',
        capabilities: ['sutar-services-list', 'sutar-services-get', 'sutar-layers', 'sutar-status', 'sutar-route'],
        endpoint: 'http://localhost:4140',
      },
      {
        name: 'sutarTwinOs',
        description: 'SUTAR Twin OS (4142) — SUTAR-scoped twin view with intent-aware resolution and capability tagging.',
        capabilities: ['twins-list', 'twins-get', 'twins-create', 'twins-tag', 'twins-untag', 'twins-resolve-for-intent', 'twinos-proxy'],
        endpoint: 'http://localhost:4142',
      },
      {
        name: 'sutarMemoryBridge',
        description: 'SUTAR Memory Bridge (4143) — intent-tagged memory layer over MemoryOS.',
        capabilities: ['memory-remember', 'memory-recall', 'memory-recall-by-intent', 'memory-forget', 'memory-intent-types', 'memoryos-proxy'],
        endpoint: 'http://localhost:4143',
      },
      {
        name: 'sutarIdentity',
        description: 'SUTAR Identity OS (4144) — SUTAR-scoped identity with role + claims + reputation + cross-attestation.',
        capabilities: ['identity-issue', 'identity-list', 'identity-get', 'identity-add-claim', 'identity-revoke', 'identity-attest', 'corpid-proxy'],
        endpoint: 'http://localhost:4144',
      },
      {
        name: 'sutarAgentId',
        description: 'SUTAR Agent ID (4145) — persistent ID + capability manifest + intent-handler lookup.',
        capabilities: ['agents-list', 'agents-get', 'agents-create', 'agents-add-cap', 'agents-remove-cap', 'manifest-agents-for-intent'],
        endpoint: 'http://localhost:4145',
      },
      {
        name: 'sutarAgentNetwork',
        description: 'SUTAR Agent Network (4155) — mesh topology + BFS routing + message bus between agents.',
        capabilities: ['nodes-list', 'nodes-register', 'nodes-heartbeat', 'edges-add', 'edges-list', 'route', 'messages-send', 'messages-list'],
        endpoint: 'http://localhost:4155',
      },
      {
        name: 'sutarContracts',
        description: 'SUTAR Contracts OS (4185) — SUTAR-specific contract templates with draft→sign→fulfill→settle lifecycle.',
        capabilities: ['templates-list', 'contracts-create', 'contracts-list', 'contracts-get', 'contracts-sign', 'contracts-fulfill', 'contracts-settle', 'contracts-cancel'],
        endpoint: 'http://localhost:4185',
      },
      {
        name: 'sutarExploration',
        description: 'SUTAR Exploration (4255) — guided exploration journeys on top of discovery-engine.',
        capabilities: ['journeys-list', 'journeys-get', 'journeys-start', 'sessions-step', 'sessions-get'],
        endpoint: 'http://localhost:4255',
      },
      {
        name: 'sutarMultiAgentEvaluator',
        description: 'SUTAR Multi-Agent Evaluator (4257) — score multi-agent plans across 5 dimensions + head-to-head comparison.',
        capabilities: ['evaluations-create', 'evaluations-list', 'evaluations-get', 'evaluations-compare'],
        endpoint: 'http://localhost:4257',
      },
      {
        name: 'sutarReputationAggregator',
        description: 'SUTAR Reputation Aggregator (4258) — multi-source reputation aggregation with leaderboard.',
        capabilities: ['entities-register', 'entities-list', 'entities-get', 'entities-add-score', 'entities-rank', 'entities-sync', 'leaderboard'],
        endpoint: 'http://localhost:4258',
      },
      {
        name: 'sutarFounderOs',
        description: 'SUTAR Founder OS (4260) — founder twin + KPI tracking + 4 playbooks (board update, investor outreach, hiring, runway).',
        capabilities: ['founders-list', 'founders-get', 'founders-create', 'kpis-record', 'kpis-latest', 'kpis-trend', 'playbooks-list', 'playbooks-run'],
        endpoint: 'http://localhost:4260',
      },
      // Communication Cloud Division 5 — 5 new comms agents
      {
        name: 'whatsappOrchestrator',
        description: 'WhatsApp OS (4860) — orchestrator for WhatsApp Business API across 360dialog/Twilio/Meta providers; manages templates, conversations, contacts.',
        capabilities: ['send-text', 'send-template', 'send-media', 'template-list', 'template-create', 'webhook-inbound', 'conversation-thread'],
        endpoint: 'http://localhost:4860',
      },
      {
        name: 'emailTriager',
        description: 'Email OS (4862) — inbox triage (category/priority/sentiment) + smart compose + auto-reply drafts across SendGrid/SES/nodemailer providers.',
        capabilities: ['receive', 'triage', 'draft-reply', 'send', 'template-list', 'thread-list'],
        endpoint: 'http://localhost:4862',
      },
      {
        name: 'meetingAssistant',
        description: 'Meeting OS (4864) — scheduler with conflict detection, transcription (Whisper/Deepgram/Otter), action item + decision extraction.',
        capabilities: ['schedule', 'check-conflicts', 'cancel', 'ingest-transcript', 'extract-actions', 'extract-decisions', 'summarize'],
        endpoint: 'http://localhost:4864',
      },
      {
        name: 'translator',
        description: 'Translation OS (4866) — real-time translation across Hindi/English/Spanish/Arabic with built-in dictionary + glossary support for Google/DeepL/Azure.',
        capabilities: ['translate', 'translate-batch', 'dictionary-lookup', 'glossary-list', 'glossary-create'],
        endpoint: 'http://localhost:4866',
      },
      {
        name: 'liveSupportRouter',
        description: 'Live Support OS (4868) — human-in-the-loop escalation router. Decides when to escalate, which queue, which agent (skill + language matched), builds handoff package.',
        capabilities: ['create-session', 'decide-escalation', 'pick-agent', 'build-handoff', 'list-agents', 'list-queues', 'update-agent-status'],
        endpoint: 'http://localhost:4868',
      },
      // Marketplace Network Division 11 — 4 new marketplace agents (June 20, 2026)
      {
        name: 'twinMarketplace',
        description: 'Twin Marketplace (4146) — buy/sell pre-built digital twins. Search twin templates (Restaurant, Hotel, Customer, Patient, Personal, CorpID) and install into workspace.',
        capabilities: ['list-twin-listings', 'search-twins', 'create-twin-listing', 'install-twin', 'review-twin'],
        endpoint: 'http://localhost:4146',
      },
      {
        name: 'connectorMarketplace',
        description: 'Connector Marketplace (4147) — buy/sell pre-built SaaS connectors (Salesforce, HubSpot, Stripe, Shopify, Slack, Notion, Twilio, Google Sheets).',
        capabilities: ['list-connector-listings', 'search-connectors', 'create-connector-listing', 'install-connector', 'review-connector'],
        endpoint: 'http://localhost:4147',
      },
      {
        name: 'industryPacks',
        description: 'Industry Packs (4148) — vertical bundles combining Industry OS + AI Agents + Workflows + Twins + Integrations into one purchasable bundle.',
        capabilities: ['list-industry-packs', 'search-packs', 'create-pack', 'install-pack', 'review-pack'],
        endpoint: 'http://localhost:4148',
      },
      {
        name: 'trustNetwork',
        description: 'Trust Network (4149) — cross-platform reputation for humans, organizations, and content. Endorse peers, verify identity, flag risk, get top-trusted rollups.',
        capabilities: ['list-entities', 'get-entity', 'create-entity', 'endorse', 'verify', 'flag-risk', 'top-trusted'],
        endpoint: 'http://localhost:4149',
      },
      // Twin Discovery — capability profile (June 20, 2026)
      {
        name: 'twinCapabilityProfile',
        description: 'Twin Capability Profile (4150) — discovery layer for the entire ecosystem. Every Twin advertises what it CAN DO (acceptOrder, checkAvailability, holdRoom, bookMassage, etc.) with input/output schemas, SLA, and supported skills. Agents discover twins by capability without hard-coding endpoints.',
        capabilities: ['list-profiles', 'get-profile', 'discover-by-capability', 'discover-by-twin-type', 'search', 'capability-graph', 'create-profile', 'update-profile', 'delete-profile'],
        endpoint: 'http://localhost:4150',
      },
      // Goal Conflict Engine (June 20, 2026)
      {
        name: 'goalConflictEngine',
        description: 'Goal Conflict Engine (4151) — detects 4 types of conflicts between active goals (resource, metric, temporal, strategic), quantifies severity 0-1, proposes 4 resolution strategies per conflict (prioritize, sequence, compromise, kill) with confidence scores and tradeoffs. Pairs with GoalOS (4242).',
        capabilities: ['detect-conflicts', 'detect-resource', 'detect-metric', 'detect-temporal', 'detect-strategic', 'list-conflicts', 'get-conflict', 'resolve-conflict', 'list-resolutions', 'manage-oppositions', 'sync-from-goalos'],
        endpoint: 'http://localhost:4151',
      },
      // Memory Confidence & Decay (June 20, 2026)
      {
        name: 'memoryConfidence',
        description: 'Memory Confidence & Decay Engine (4152) — tracks reliability of facts with 3 signals: base confidence from source, exponential time decay (90-day default half-life), reinforcement (each reinforce call extends half-life by 50%), and contradiction (each contradict halves effective confidence). Computes effectiveConfidence per fact. Pairs with MemoryOS (4703).',
        capabilities: ['create-fact', 'get-fact', 'list-facts', 'update-fact', 'delete-fact', 'reinforce', 'contradict', 'recall', 'confidence-recall', 'confidence-report', 'staleness-report', 'sync-from-memoryos'],
        endpoint: 'http://localhost:4152',
      },
      // Phase 6 - Foundational governance + trust agents (June 20, 2026)
      {
        name: 'policyOs',
        description: 'PolicyOS (4254) — Universal governance, trust, authorization, compliance, decision policy platform. RBAC roles + ABAC attributes + multi-strategy approval (single/multi/sequential/parallel/emergency) + audit + explainability + simulation. Fail-closed by default: unknown policies return allowed=false with explicit reasons. Used by flow-orchestrator as the gate for every step.',
        capabilities: ['policy-list', 'policy-create', 'policy-update', 'policy-delete', 'policy-publish', 'policy-archive', 'policy-evaluate', 'policy-simulate', 'policy-explain', 'policy-audit', 'role-list', 'role-create', 'user-role-assign', 'approval-list', 'approval-create', 'approval-approve', 'approval-reject', 'approval-cancel'],
        endpoint: 'http://localhost:4254',
      },
      {
        name: 'trustIntelligence',
        description: 'Trust Intelligence (4882) — AI agent trust scoring, reputation, risk propagation, and confidence analytics. PageRank-style transitive trust, 6 trust levels (Platinum/Gold/Silver/Bronze/Iron/Restricted), time-decay (exp(-ageDays/30)), reputation contributions, risk flags, model trust registry. Syncs from CorpID and Trust Network.',
        capabilities: ['trust-score', 'trust-history', 'trust-decay', 'trust-bulk-score', 'trust-levels', 'reputation-add', 'reputation-get', 'risk-flag', 'risk-clear', 'risk-get', 'confidence-record', 'confidence-get', 'trust-edges', 'trust-graph', 'trust-transitive', 'analytics-distribution', 'analytics-reliability', 'analytics-leaderboard', 'top-trusted', 'model-trust', 'sync-from-corpid', 'sync-from-trust-network'],
        endpoint: 'http://localhost:4882',
      },
      {
        name: 'eventBus',
        description: 'Event Bus (4510) — Real pub/sub for the RTMN ecosystem. Topics, schema-versioned events, persistent subscriptions, webhook delivery with HMAC-SHA256 signing, exponential retry + backoff, dead-letter queue, replay, filter, audit.',
        capabilities: ['topic-create', 'topic-list', 'publish', 'subscribe', 'unsubscribe', 'list-subscriptions', 'delivery-list', 'delivery-retry', 'replay', 'dlq-list', 'dlq-replay', 'schema-version'],
        endpoint: 'http://localhost:4510',
      },
      {
        name: 'corpidService',
        description: 'CorpID (4702) — Universal identity, trust scores, namespaces, API keys. The single source of truth for who/what is calling across the entire RTMN ecosystem.',
        capabilities: ['corp-list', 'corp-create', 'corp-get', 'trust-score-get', 'trust-score-set', 'trust-levels', 'namespace-create', 'namespace-list', 'namespace-get', 'namespace-delete', 'api-key-create', 'api-key-list', 'api-key-get', 'api-key-delete'],
        endpoint: 'http://localhost:4702',
      },
      {
        name: 'memoryOs',
        description: 'MemoryOS (4703) — Personal AI memory with 15-type vocabulary (fact, preference, episode, rule, skill, context, question, answer, observation, reflection, intent, commitment, entity, event, document), importance scoring, smart-forgetting, analytics, lifecycle, versioning, confidence writeback. Twin-scoped memory partition bridge.',
        capabilities: ['memory-create', 'memory-get', 'memory-list', 'memory-recall', 'memory-forget', 'memory-reinforce', 'memory-contradict', 'memory-version-list', 'memory-rollback', 'memory-analytics', 'memory-types', 'memory-importance'],
        endpoint: 'http://localhost:4703',
      },
      {
        name: 'memoryContextEngine',
        description: 'Memory Context Engine (4790) — composes a relevant context window for any AI agent by combining MemoryOS search, Memory Confidence scoring, and Twin Memory Bridge bindings. Ranks by relevance × confidence × recency. Cache-aware. Optional writeback. The bridge between MemoryOS storage and LLM context windows.',
        capabilities: ['build-context-window', 'preview-context', 'multi-mode-search', 'confidence-weighted', 'recency-weighted', 'binding-aware', 'optional-writeback'],
        endpoint: 'http://localhost:4790',
      },
      {
        name: 'twinOs',
        description: 'TwinOS Hub (4705) — Canonical digital twin registry with 86+ twins across Foundation/Commerce/People/AI/Hospitality/Healthcare/Finance/Marketing/Ops/RealEstate/HR/Event/Travel/Business/Personal. Templates, semantic search, versioning with rollback, digital shadow event publishing.',
        capabilities: ['twin-list', 'twin-get', 'twin-create', 'twin-update', 'twin-delete', 'twin-search', 'twin-templates', 'twin-versions', 'twin-rollback', 'twin-shadow-publish'],
        endpoint: 'http://localhost:4705',
      },
      {
        name: 'skillOs',
        description: 'SkillOS (4743) — Reusable capabilities registered and versioned as skills. Real sandboxed code execution via vm.runInNewContext with 2s timeout, JSON I/O contract, validate/test modes, telemetry.',
        capabilities: ['skill-list', 'skill-get', 'skill-create', 'skill-update', 'skill-delete', 'skill-execute', 'skill-validate', 'skill-test', 'skill-versions', 'skill-search'],
        endpoint: 'http://localhost:4743',
      },
      {
        name: 'goalOs',
        description: 'GoalOS (4151) — Goal decomposition, hierarchy, categories, planning, dependency tracking, prediction, optimization, recommendation. Pairs with MemoryOS for persistence and TwinOS for entity binding.',
        capabilities: ['goal-list', 'goal-get', 'goal-create', 'goal-update', 'goal-decompose', 'goal-hierarchy', 'goal-categories', 'goal-plan', 'goal-predict', 'goal-optimize', 'goal-recommend'],
        endpoint: 'http://localhost:4151',
      },
      {
        name: 'decisionEngine',
        description: 'Decision Engine (4756) — AI-powered policy evaluation, multi-factor scoring, approval routing. Bridges to PolicyOS for governance gates.',
        capabilities: ['decision-evaluate', 'decision-multi-factor', 'decision-routes', 'policies-evaluate'],
        endpoint: 'http://localhost:4756',
      },
    ],
  });
});

/**
 * POST /api/conversation/session
 * Create new conversation session
 */
app.post('/api/conversation/session',requireAuth,  async (req: Request, res: Response) => {
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
app.post('/api/customer/profile',requireAuth,  async (req: Request, res: Response) => {
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
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  logger.info(`HOJAI Intelligence Layer started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
  logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
});
installGracefulShutdown(server);

export default app;
