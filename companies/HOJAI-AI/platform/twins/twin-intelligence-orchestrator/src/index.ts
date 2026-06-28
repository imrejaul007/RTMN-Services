/**
 * TwinOS Intelligence Orchestrator v1.0
 * Port: 4715
 *
 * Unified orchestration layer connecting all intelligence services to TwinOS Hub.
 *
 * Responsibilities:
 * - Unified analysis across all twin data
 * - Cross-twin reasoning coordination
 * - Prediction orchestration
 * - Learning loop management
 * - Behavior model coordination
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                Intelligence Orchestrator (4715)                   │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                  │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
 * │  │Reasoning│  │Prediction│  │ Behavior │  │ Learning │     │
 * │  │ Engine  │  │  Engine  │  │  Model   │  │   Loop   │     │
 * │  │ :4716   │  │  :4719   │  │  :4718   │  │  :4735   │     │
 * │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │
 * │       │             │             │             │             │
 * │       └────────────┴──────┬────┴────────────┘             │
 * │                            │                                │
 * │                            ▼                                │
 * │                   ┌────────────────┐                        │
 * │                   │  Orchestrator   │                        │
 * │                   │   Core Logic   │                        │
 * │                   └────────┬───────┘                        │
 * │                            │                                │
 * │       ┌────────────────────┼────────────────────┐          │
 * │       │                    │                    │          │
 * │       ▼                    ▼                    ▼          │
 * │  ┌─────────┐      ┌───────────┐      ┌──────────┐     │
 * │  │TwinOS   │      │  Memory   │      │  Twin    │     │
 * │  │  Hub    │      │    OS     │      │ Observer │     │
 * │  │ :4705   │      │  :4703    │      │  :4747   │     │
 * │  └─────────┘      └───────────┘      └──────────┘     │
 * └─────────────────────────────────────────────────────────────────┘
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface TwinAnalysis {
  twinId: string;
  timestamp: string;
  summary: string;
  intelligence: {
    behavior: BehaviorSummary;
    predictions: PredictionSummary;
    reasoning: ReasoningSummary;
    learning: LearningSummary;
  };
  recommendations: Recommendation[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface BehaviorSummary {
  patterns: string[];
  preferences: Record<string, any>;
  personality?: PersonalityProfile;
  communicationStyle?: string;
  riskTolerance?: number;
  strengths: string[];
  weaknesses: string[];
  lastUpdated: string;
}

export interface PersonalityProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  decisionStyle: 'analytical' | 'intuitive' | 'structured' | 'spontaneous';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
}

export interface PredictionSummary {
  churnRisk: number;
  ltvScore: number;
  nextAction: string;
  confidence: number;
  predictions: {
    type: string;
    value: any;
    horizon: string;
    confidence: number;
  }[];
  lastUpdated: string;
}

export interface ReasoningSummary {
  recentDecisions: ReasoningChain[];
  relationshipInsights: string[];
  contextUnderstanding: string;
  recommendations: string[];
  lastUpdated: string;
}

export interface ReasoningChain {
  id: string;
  query: string;
  conclusion: string;
  confidence: number;
  twinsInvolved: string[];
  timestamp: string;
}

export interface LearningSummary {
  skills: string[];
  knowledgeGaps: string[];
  recentLearnings: string[];
  suggestedLearnings: string[];
  progressScore: number;
  lastUpdated: string;
}

export interface Recommendation {
  id: string;
  type: 'action' | 'suggestion' | 'warning' | 'opportunity';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  actions: RecommendedAction[];
}

export interface RecommendedAction {
  action: string;
  target: string;
  expectedOutcome: string;
  risk: 'low' | 'medium' | 'high';
}

export interface IntelligenceConfig {
  twinId: string;
  services: {
    reasoning: string;
    prediction: string;
    behavior: string;
    learning: string;
  };
  analysisDepth: 'basic' | 'standard' | 'comprehensive';
  includePredictions: boolean;
  includeRecommendations: boolean;
}

// ============================================================
// SERVICE CONNECTIONS
// ============================================================

const SERVICES = {
  twinHub: process.env.TWIN_HUB_URL || 'http://localhost:4705',
  memoryOS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  twinLearning: process.env.TWIN_LEARNING_URL || 'http://localhost:4735',
  twinObserver: process.env.TWIN_OBSERVER_URL || 'http://localhost:4747',
  twinExecution: process.env.TWIN_EXECUTION_URL || 'http://localhost:4737',
  reasoningEngine: process.env.REASONING_ENGINE_URL || 'http://localhost:4716',
  predictionEngine: process.env.PREDICTION_ENGINE_URL || 'http://localhost:4719',
  behaviorModel: process.env.BEHAVIOR_MODEL_URL || 'http://localhost:4718',
  simulationOS: process.env.SIMULATION_OS_URL || 'http://localhost:4241',
  consentEngine: process.env.CONSENT_ENGINE_URL || 'http://localhost:4760',
};

// ============================================================
// IN-MEMORY STORES
// ============================================================

interface AnalysisCache {
  twinId: string;
  analysis: TwinAnalysis;
  expiresAt: number;
}

const analysisCache = new Map<string, AnalysisCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const analysisRequests = new Map<string, Promise<TwinAnalysis>>();

// ============================================================
// EXPRESS APP
// ============================================================

const app = express();
const PORT = parseInt(process.env.PORT || '4715', 10);
const REQUEST_ID_HEADER = 'x-request-id';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Request ID
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers[REQUEST_ID_HEADER] as string || uuidv4();
  next();
});

// Morgan logging
morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function callService(serviceUrl: string, path: string, options: RequestInit = {}): Promise<any> {
  try {
    const url = `${serviceUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.warn(`[Orchestrator] Service ${serviceUrl}${path} returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    console.warn(`[Orchestrator] Failed to call ${serviceUrl}${path}: ${error.message}`);
    return null;
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

function getCachedAnalysis(twinId: string): TwinAnalysis | null {
  const cached = analysisCache.get(twinId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.analysis;
  }
  analysisCache.delete(twinId);
  return null;
}

function setCachedAnalysis(twinId: string, analysis: TwinAnalysis): void {
  analysisCache.set(twinId, {
    twinId,
    analysis,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

// ============================================================
// INTELLIGENCE SERVICES CLIENTS
// ============================================================

async function getBehaviorAnalysis(twinId: string): Promise<BehaviorSummary> {
  const result = await callService(SERVICES.behaviorModel, `/api/behavior/profile/${twinId}`);

  if (result) {
    return {
      patterns: result.patterns || [],
      preferences: result.preferences || {},
      personality: result.personality,
      communicationStyle: result.communicationStyle,
      riskTolerance: result.riskTolerance,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      lastUpdated: result.updatedAt || new Date().toISOString(),
    };
  }

  // Fallback: generate basic behavior summary
  return {
    patterns: ['Pattern analysis pending'],
    preferences: {},
    strengths: [],
    weaknesses: [],
    lastUpdated: new Date().toISOString(),
  };
}

async function getPredictionAnalysis(twinId: string): Promise<PredictionSummary> {
  const result = await callService(SERVICES.predictionEngine, `/api/prediction/${twinId}`);

  if (result) {
    return {
      churnRisk: result.churnRisk || 0,
      ltvScore: result.ltvScore || 0,
      nextAction: result.nextAction || 'No prediction available',
      confidence: result.confidence || 0,
      predictions: result.predictions || [],
      lastUpdated: result.updatedAt || new Date().toISOString(),
    };
  }

  return {
    churnRisk: 0,
    ltvScore: 0,
    nextAction: 'Prediction service unavailable',
    confidence: 0,
    predictions: [],
    lastUpdated: new Date().toISOString(),
  };
}

async function getReasoningAnalysis(twinId: string): Promise<ReasoningSummary> {
  const result = await callService(SERVICES.reasoningEngine, `/api/reasoning/history/${twinId}`);

  if (result) {
    return {
      recentDecisions: result.chains || [],
      relationshipInsights: result.insights || [],
      contextUnderstanding: result.context || 'Context analysis pending',
      recommendations: result.recommendations || [],
      lastUpdated: result.updatedAt || new Date().toISOString(),
    };
  }

  return {
    recentDecisions: [],
    relationshipInsights: [],
    contextUnderstanding: 'Reasoning service unavailable',
    recommendations: [],
    lastUpdated: new Date().toISOString(),
  };
}

async function getLearningAnalysis(twinId: string): Promise<LearningSummary> {
  const result = await callService(SERVICES.twinLearning, `/api/learning/${twinId}`);

  if (result) {
    return {
      skills: result.skills || [],
      knowledgeGaps: result.gaps || [],
      recentLearnings: result.recent || [],
      suggestedLearnings: result.suggestions || [],
      progressScore: result.progress || 0,
      lastUpdated: result.updatedAt || new Date().toISOString(),
    };
  }

  return {
    skills: [],
    knowledgeGaps: [],
    recentLearnings: [],
    suggestedLearnings: [],
    progressScore: 0,
    lastUpdated: new Date().toISOString(),
  };
}

async function generateRecommendations(
  twinId: string,
  behavior: BehaviorSummary,
  predictions: PredictionSummary,
  reasoning: ReasoningSummary,
  learning: LearningSummary
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // Churn risk recommendation
  if (predictions.churnRisk > 0.7) {
    recommendations.push({
      id: generateId('rec'),
      type: 'warning',
      priority: 'critical',
      title: 'High Churn Risk Detected',
      description: `Customer shows ${Math.round(predictions.churnRisk * 100)}% churn probability`,
      reasoning: 'Based on behavior patterns and prediction model',
      confidence: predictions.confidence,
      actions: [
        { action: 'Send retention offer', target: twinId, expectedOutcome: 'Reduce churn by 30%', risk: 'low' },
        { action: 'Schedule check-in call', target: twinId, expectedOutcome: 'Improve engagement', risk: 'low' },
      ],
    });
  }

  // Learning gap recommendation
  if (learning.knowledgeGaps.length > 0) {
    recommendations.push({
      id: generateId('rec'),
      type: 'suggestion',
      priority: 'medium',
      title: 'Learning Opportunity',
      description: `Recommended: ${learning.knowledgeGaps[0]}`,
      reasoning: 'Based on skill assessment and role requirements',
      confidence: 0.8,
      actions: [
        { action: 'Enroll in training', target: twinId, expectedOutcome: 'Fill knowledge gap', risk: 'low' },
      ],
    });
  }

  // High-value customer recommendation
  if (predictions.ltvScore > 10000) {
    recommendations.push({
      id: generateId('rec'),
      type: 'opportunity',
      priority: 'high',
      title: 'High-Value Customer',
      description: 'LTV score indicates premium customer treatment',
      reasoning: 'LTV > $10,000 threshold',
      confidence: 0.9,
      actions: [
        { action: 'Upgrade to VIP program', target: twinId, expectedOutcome: 'Increase retention', risk: 'low' },
        { action: 'Assign dedicated account manager', target: twinId, expectedOutcome: 'Improve satisfaction', risk: 'low' },
      ],
    });
  }

  return recommendations;
}

// ============================================================
// MAIN ORCHESTRATION LOGIC
// ============================================================

async function analyzeTwin(twinId: string, config?: Partial<IntelligenceConfig>): Promise<TwinAnalysis> {
  const requestId = generateId('analysis');
  console.log(`[${requestId}] Starting analysis for twin: ${twinId}`);

  const startTime = Date.now();

  // Fetch all intelligence data in parallel
  const [behavior, predictions, reasoning, learning] = await Promise.all([
    getBehaviorAnalysis(twinId),
    getPredictionAnalysis(twinId),
    getReasoningAnalysis(twinId),
    getLearningAnalysis(twinId),
  ]);

  // Generate recommendations based on combined intelligence
  const recommendations = await generateRecommendations(
    twinId,
    behavior,
    predictions,
    reasoning,
    learning
  );

  // Calculate overall confidence
  const confidences = [
    behavior.lastUpdated ? 0.7 : 0,
    predictions.confidence,
    reasoning.lastUpdated ? 0.6 : 0,
    learning.progressScore > 0 ? 0.7 : 0,
  ].filter(c => c > 0);

  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  const analysis: TwinAnalysis = {
    twinId,
    timestamp: new Date().toISOString(),
    summary: generateSummary(behavior, predictions, recommendations),
    intelligence: {
      behavior,
      predictions,
      reasoning,
      learning,
    },
    recommendations,
    confidence: avgConfidence,
    metadata: {
      requestId,
      duration: Date.now() - startTime,
      servicesAvailable: {
        behavior: !!behavior.lastUpdated,
        prediction: predictions.confidence > 0,
        reasoning: !!reasoning.lastUpdated,
        learning: learning.progressScore > 0,
      },
    },
  };

  // Cache the analysis
  setCachedAnalysis(twinId, analysis);

  console.log(`[${requestId}] Analysis complete in ${analysis.metadata.duration}ms`);

  return analysis;
}

function generateSummary(
  behavior: BehaviorSummary,
  predictions: PredictionSummary,
  recommendations: Recommendation[]
): string {
  const parts: string[] = [];

  if (predictions.churnRisk > 0.7) {
    parts.push(`High churn risk (${Math.round(predictions.churnRisk * 100)}%)`);
  } else if (predictions.churnRisk < 0.3) {
    parts.push(`Low churn risk (${Math.round(predictions.churnRisk * 100)}%)`);
  }

  if (predictions.ltvScore > 10000) {
    parts.push('High-value customer');
  }

  if (recommendations.length > 0) {
    parts.push(`${recommendations.length} actionable recommendations`);
  }

  if (behavior.patterns.length > 0) {
    parts.push(`${behavior.patterns.length} behavior patterns identified`);
  }

  return parts.length > 0
    ? parts.join('. ') + '.'
    : 'Standard twin profile';
}

// ============================================================
// ROUTES
// ============================================================

// Health & Status
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'twin-intelligence-orchestrator',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      cachedAnalyses: analysisCache.size,
      pendingRequests: analysisRequests.size,
    },
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({
    ready: true,
    service: 'twin-intelligence-orchestrator',
    timestamp: new Date().toISOString(),
  });
});

// Main analysis endpoint
app.post('/api/orchestrator/analyze', async (req: Request, res: Response) => {
  try {
    const { twinId, config, forceRefresh } = req.body;

    if (!twinId) {
      return res.status(400).json({
        success: false,
        error: 'twinId is required',
      });
    }

    // Check cache unless force refresh
    if (!forceRefresh) {
      const cached = getCachedAnalysis(twinId);
      if (cached) {
        return res.json({
          success: true,
          analysis: cached,
          cached: true,
        });
      }
    }

    // Prevent duplicate requests
    if (analysisRequests.has(twinId)) {
      const existing = await analysisRequests.get(twinId);
      return res.json({
        success: true,
        analysis: existing,
        pending: true,
      });
    }

    // Start analysis
    const analysisPromise = analyzeTwin(twinId, config);
    analysisRequests.set(twinId, analysisPromise);

    try {
      const analysis = await analysisPromise;
      analysisRequests.delete(twinId);

      return res.json({
        success: true,
        analysis,
        cached: false,
      });
    } catch (error: any) {
      analysisRequests.delete(twinId);
      throw error;
    }
  } catch (error: any) {
    console.error('[Orchestrator] Analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
    });
  }
});

// Get cached analysis
app.get('/api/orchestrator/analysis/:twinId', (req: Request, res: Response) => {
  const { twinId } = req.params;
  const cached = getCachedAnalysis(twinId);

  if (cached) {
    return res.json({
      success: true,
      analysis: cached,
      cached: true,
    });
  }

  return res.status(404).json({
    success: false,
    error: 'Analysis not found in cache',
  });
});

// Reason across twins
app.post('/api/orchestrator/reason', async (req: Request, res: Response) => {
  try {
    const { twins, query } = req.body;

    if (!twins || !Array.isArray(twins) || twins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'twins array is required',
      });
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required',
      });
    }

    // Call reasoning engine
    const result = await callService(SERVICES.reasoningEngine, '/api/reasoning/chain', {
      method: 'POST',
      body: JSON.stringify({ twins, query }),
    });

    return res.json({
      success: true,
      reasoning: result || {
        twins,
        query,
        conclusion: 'Reasoning service unavailable',
        confidence: 0,
        twinsInvolved: twins,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Orchestrator] Reasoning failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Reasoning failed',
    });
  }
});

// Learn from outcome
app.post('/api/orchestrator/learn', async (req: Request, res: Response) => {
  try {
    const { twinId, outcome, event } = req.body;

    if (!twinId) {
      return res.status(400).json({
        success: false,
        error: 'twinId is required',
      });
    }

    // Record learning in twin learning service
    const result = await callService(SERVICES.twinLearning, '/api/learning/record', {
      method: 'POST',
      body: JSON.stringify({ twinId, outcome, event }),
    });

    // Also update behavior model
    await callService(SERVICES.behaviorModel, '/api/behavior/observe', {
      method: 'POST',
      body: JSON.stringify({ twinId, event, outcome }),
    });

    return res.json({
      success: true,
      learning: result || {
        twinId,
        recorded: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Orchestrator] Learning failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Learning failed',
    });
  }
});

// Predict
app.post('/api/orchestrator/predict', async (req: Request, res: Response) => {
  try {
    const { twinId, horizon, predictionType } = req.body;

    if (!twinId) {
      return res.status(400).json({
        success: false,
        error: 'twinId is required',
      });
    }

    const result = await callService(SERVICES.predictionEngine, '/api/prediction/generate', {
      method: 'POST',
      body: JSON.stringify({ twinId, horizon, type: predictionType }),
    });

    return res.json({
      success: true,
      prediction: result || {
        twinId,
        error: 'Prediction service unavailable',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Orchestrator] Prediction failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Prediction failed',
    });
  }
});

// Get services status
app.get('/api/orchestrator/services', async (_req: Request, res: Response) => {
  const serviceStatus: Record<string, { status: string; url: string }> = {};

  const checks = [
    { name: 'twinHub', url: SERVICES.twinHub },
    { name: 'memoryOS', url: SERVICES.memoryOS },
    { name: 'twinLearning', url: SERVICES.twinLearning },
    { name: 'reasoningEngine', url: SERVICES.reasoningEngine },
    { name: 'predictionEngine', url: SERVICES.predictionEngine },
    { name: 'behaviorModel', url: SERVICES.behaviorModel },
  ];

  await Promise.all(checks.map(async ({ name, url }) => {
    try {
      const response = await fetch(`${url}/health`);
      serviceStatus[name] = {
        status: response.ok ? 'healthy' : 'degraded',
        url,
      };
    } catch {
      serviceStatus[name] = {
        status: 'unavailable',
        url,
      };
    }
  }));

  res.json({
    success: true,
    services: serviceStatus,
    timestamp: new Date().toISOString(),
  });
});

// Clear cache
app.delete('/api/orchestrator/cache/:twinId', (req: Request, res: Response) => {
  const { twinId } = req.params;
  analysisCache.delete(twinId);

  res.json({
    success: true,
    message: `Cache cleared for ${twinId}`,
  });
});

app.delete('/api/orchestrator/cache', (_req: Request, res: Response) => {
  const count = analysisCache.size;
  analysisCache.clear();

  res.json({
    success: true,
    message: `Cleared ${count} cached analyses`,
  });
});

// Error handling
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Orchestrator] Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ============================================================
// START SERVER
// ============================================================

const server = app.listen(PORT, () => {
  console.log(`🧠 Twin Intelligence Orchestrator v1.0.0 running on port ${PORT}`);
  console.log(`   Services:`);
  console.log(`   - Twin Hub: ${SERVICES.twinHub}`);
  console.log(`   - Memory OS: ${SERVICES.memoryOS}`);
  console.log(`   - Reasoning Engine: ${SERVICES.reasoningEngine}`);
  console.log(`   - Prediction Engine: ${SERVICES.predictionEngine}`);
  console.log(`   - Behavior Model: ${SERVICES.behaviorModel}`);
  console.log(`   - Twin Learning: ${SERVICES.twinLearning}`);
});

export default server;
export { app, analyzeTwin };
