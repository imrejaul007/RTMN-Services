// ============================================================================
// SUTAR Network Learning - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Import all services
import {
  Pattern,
  LearningData,
  ApiResponse,
  PatternType,
  SuccessAnalysis,
  Strategy,
  Recommendation,
  Trend,
  Anomaly,
  Experiment,
  KnowledgeGraph,
  LearningModel,
  SimulationRequest,
  PolicyRequest
} from './services/types';

import patternRecognitionService from './services/patternRecognition';
import successAnalysisService from './services/successAnalysis';
import strategyLearningService from './services/strategyLearning';
import recommendationEngineService from './services/recommendationEngine';
import trendDetectionService from './services/trendDetection';
import anomalyDetectionService from './services/anomalyDetection';
import learningModelsService from './services/learningModels';
import abTestingService from './services/abTesting';
import knowledgeGraphService from './services/knowledgeGraph';
import externalIntegrationsService from './services/externalIntegrations';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4243;
const START_TIME = Date.now();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'] }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests' }
});
app.use('/api/', limiter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const apiResponse = <T = unknown>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId
});

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    status: 'healthy',
    service: 'sutar-network-learning',
    version: '2.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    features: [
      'pattern-recognition',
      'success-analysis',
      'strategy-learning',
      'recommendation-engine',
      'trend-detection',
      'anomaly-detection',
      'learning-models',
      'ab-testing',
      'knowledge-graph',
      'external-integrations'
    ]
  }));
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { ready: true }));
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { alive: true }));
});

app.get('/health/integrations', (_req: Request, res: Response) => {
  const health = externalIntegrationsService.getHealthStatus();
  res.json(apiResponse(true, health));
});

// ============================================================================
// LEARNING DATA ENDPOINTS
// ============================================================================

// Learn from data
app.post('/api/v1/learn', (req: Request, res: Response) => {
  try {
    const { context, action, outcome, reward, metadata } = req.body;
    if (!action) {
      res.status(400).json(apiResponse(false, undefined, 'action required'));
      return;
    }

    const id = `learn-${uuidv4()}`;
    const data: LearningData = {
      id,
      context: context || {},
      action,
      outcome: outcome || 'neutral',
      reward,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    // Update all services with learning data
    patternRecognitionService.updatePatternFromData(data);
    successAnalysisService.addData(data);
    trendDetectionService.addLearningData(data);
    anomalyDetectionService.analyzeDataPoint(data);

    console.log(`[LEARN] ${action} -> ${outcome}`);
    res.status(201).json(apiResponse(true, data, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Learn new pattern
app.post('/api/v1/learn/pattern', (req: Request, res: Response) => {
  try {
    const { context, action, outcome, reward, metadata } = req.body;
    if (!action) {
      res.status(400).json(apiResponse(false, undefined, 'action required'));
      return;
    }

    const data: LearningData = {
      id: `learn-${uuidv4()}`,
      context: context || {},
      action,
      outcome: outcome || 'neutral',
      reward,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    const pattern = patternRecognitionService.learnPattern(data);
    res.status(201).json(apiResponse(true, pattern, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// PATTERN ENDPOINTS
// ============================================================================

// Get all patterns
app.get('/api/v1/patterns', (req: Request, res: Response) => {
  const { type, minConfidence, clusterId } = req.query;
  const patterns = patternRecognitionService.getPatterns({
    type: type as PatternType,
    minConfidence: minConfidence ? Number(minConfidence) : undefined,
    clusterId: clusterId as string
  });
  res.json(apiResponse(true, { patterns, count: patterns.length }));
});

// Get pattern by ID
app.get('/api/v1/patterns/:id', (req: Request, res: Response) => {
  const pattern = patternRecognitionService.getPattern(req.params.id);
  if (!pattern) {
    res.status(404).json(apiResponse(false, undefined, 'Pattern not found'));
    return;
  }
  res.json(apiResponse(true, pattern));
});

// Get pattern insights
app.get('/api/v1/patterns/:id/insights', (req: Request, res: Response) => {
  const insights = patternRecognitionService.getPatternInsights(req.params.id);
  if (!insights) {
    res.status(404).json(apiResponse(false, undefined, 'Pattern not found'));
    return;
  }
  res.json(apiResponse(true, insights));
});

// Get clusters
app.get('/api/v1/clusters', (_req: Request, res: Response) => {
  const clusters = patternRecognitionService.getClusters();
  res.json(apiResponse(true, { clusters, count: clusters.length }));
});

// Get sequences
app.get('/api/v1/sequences', (_req: Request, res: Response) => {
  const sequences = patternRecognitionService.getSequences();
  res.json(apiResponse(true, { sequences, count: sequences.length }));
});

// Detect emerging patterns
app.get('/api/v1/patterns/emerging', (req: Request, res: Response) => {
  const timeWindow = req.query.window ? Number(req.query.window) : 7;
  const patterns = patternRecognitionService.detectEmergingPatterns(timeWindow);
  res.json(apiResponse(true, { patterns, count: patterns.length }));
});

// ============================================================================
// SUCCESS ANALYSIS ENDPOINTS
// ============================================================================

// Analyze success factors
app.post('/api/v1/analyze/success', (req: Request, res: Response) => {
  try {
    const { patternId } = req.body;
    if (!patternId) {
      res.status(400).json(apiResponse(false, undefined, 'patternId required'));
      return;
    }

    const patterns = patternRecognitionService.getPatterns();
    const analysis = successAnalysisService.analyzeSuccessFactors(patternId, patterns);
    res.json(apiResponse(true, analysis));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get all analyses
app.get('/api/v1/analyses', (_req: Request, res: Response) => {
  const analyses = successAnalysisService.getAllAnalyses();
  res.json(apiResponse(true, { analyses, count: analyses.length }));
});

// Get analysis by ID
app.get('/api/v1/analyses/:id', (req: Request, res: Response) => {
  const analysis = successAnalysisService.getAnalysis(req.params.id);
  if (!analysis) {
    res.status(404).json(apiResponse(false, undefined, 'Analysis not found'));
    return;
  }
  res.json(apiResponse(true, analysis));
});

// ============================================================================
// STRATEGY ENDPOINTS
// ============================================================================

// Create strategy
app.post('/api/v1/strategies', (req: Request, res: Response) => {
  try {
    const { name, description, patternIds, context, tags } = req.body;
    if (!name) {
      res.status(400).json(apiResponse(false, undefined, 'name required'));
      return;
    }

    const patterns = patternIds
      ? patternIds.map((id: string) => patternRecognitionService.getPattern(id)).filter(Boolean)
      : patternRecognitionService.getPatterns({ minConfidence: 0.5 });

    const strategy = strategyLearningService.createStrategy({
      name,
      description,
      patterns: patterns as Pattern[],
      context,
      tags
    });

    res.status(201).json(apiResponse(true, strategy));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get all strategies
app.get('/api/v1/strategies', (req: Request, res: Response) => {
  const { status, minSuccessRate, tags } = req.query;
  const strategies = strategyLearningService.getStrategies({
    status: status as Strategy['status'],
    minSuccessRate: minSuccessRate ? Number(minSuccessRate) : undefined,
    tags: tags ? (tags as string).split(',') : undefined
  });
  res.json(apiResponse(true, { strategies, count: strategies.length }));
});

// Get strategy by ID
app.get('/api/v1/strategies/:id', (req: Request, res: Response) => {
  const strategy = strategyLearningService.getStrategy(req.params.id);
  if (!strategy) {
    res.status(404).json(apiResponse(false, undefined, 'Strategy not found'));
    return;
  }
  res.json(apiResponse(true, strategy));
});

// Apply strategy
app.post('/api/v1/strategies/:id/apply', (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    const result = strategyLearningService.applyStrategy(req.params.id, context || {});
    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get strategy performance
app.get('/api/v1/strategies/:id/performance', (req: Request, res: Response) => {
  const performance = strategyLearningService.getStrategyPerformance(req.params.id);
  if (!performance) {
    res.status(404).json(apiResponse(false, undefined, 'Strategy not found or no data'));
    return;
  }
  res.json(apiResponse(true, performance));
});

// Record strategy outcome
app.post('/api/v1/strategies/:id/outcomes', (req: Request, res: Response) => {
  try {
    const { success, reward, duration, context } = req.body;
    strategyLearningService.recordOutcome(req.params.id, {
      timestamp: new Date().toISOString(),
      context: context || {},
      success: success ?? false,
      reward: reward ?? 0,
      duration: duration ?? 0
    });
    res.json(apiResponse(true, { recorded: true }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get strategy templates
app.get('/api/v1/strategies/templates', (_req: Request, res: Response) => {
  const templates = strategyLearningService.getTemplates();
  res.json(apiResponse(true, { templates }));
});

// Create strategy from template
app.post('/api/v1/strategies/from-template', (req: Request, res: Response) => {
  try {
    const { templateName, context } = req.body;
    if (!templateName) {
      res.status(400).json(apiResponse(false, undefined, 'templateName required'));
      return;
    }
    const strategy = strategyLearningService.createFromTemplate(templateName, context || {});
    res.status(201).json(apiResponse(true, strategy));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// RECOMMENDATION ENDPOINTS
// ============================================================================

// Get recommendations
app.get('/api/v1/recommendations', (req: Request, res: Response) => {
  const { type, minScore, userId } = req.query;
  const patterns = patternRecognitionService.getPatterns();
  const strategies = strategyLearningService.getStrategies();
  const trends = trendDetectionService.getTrends();

  const context = {
    userId: userId as string,
    currentState: req.query.context ? JSON.parse(req.query.context as string) : {}
  };

  const recommendations = recommendationEngineService.generateRecommendations(
    context,
    patterns,
    strategies,
    trends
  );

  const filtered = recommendationEngineService.getAllRecommendations({
    type: type as Recommendation['type'],
    minScore: minScore ? Number(minScore) : undefined
  });

  res.json(apiResponse(true, { recommendations: filtered, count: filtered.length }));
});

// Get recommendation by ID
app.get('/api/v1/recommendations/:id', (req: Request, res: Response) => {
  const recommendation = recommendationEngineService.getRecommendation(req.params.id);
  if (!recommendation) {
    res.status(404).json(apiResponse(false, undefined, 'Recommendation not found'));
    return;
  }
  res.json(apiResponse(true, recommendation));
});

// Feedback on recommendation
app.post('/api/v1/recommendations/feedback', (req: Request, res: Response) => {
  try {
    const { recommendationId, helpful, applied, rating, comment, userId } = req.body;
    if (!recommendationId) {
      res.status(400).json(apiResponse(false, undefined, 'recommendationId required'));
      return;
    }

    recommendationEngineService.recordFeedback(recommendationId, {
      userId,
      helpful: helpful ?? false,
      applied: applied ?? false,
      rating,
      comment,
      timestamp: new Date().toISOString()
    });

    res.json(apiResponse(true, { recorded: true }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get recommendation metrics
app.get('/api/v1/recommendations/metrics', (_req: Request, res: Response) => {
  const metrics = recommendationEngineService.getMetrics();
  res.json(apiResponse(true, metrics));
});

// ============================================================================
// TREND ENDPOINTS
// ============================================================================

// Get all trends
app.get('/api/v1/trends', (req: Request, res: Response) => {
  const { direction, minStrength, metric } = req.query;
  const trends = trendDetectionService.getTrends({
    direction: direction as Trend['direction'],
    minStrength: minStrength ? Number(minStrength) : undefined,
    metric: metric as string
  });
  res.json(apiResponse(true, { trends, count: trends.length }));
});

// Get trend by ID or name
app.get('/api/v1/trends/:id', (req: Request, res: Response) => {
  const trend = trendDetectionService.getTrend(req.params.id);
  if (!trend) {
    res.status(404).json(apiResponse(false, undefined, 'Trend not found'));
    return;
  }
  res.json(apiResponse(true, trend));
});

// Get time series data
app.get('/api/v1/trends/:id/timeseries', (req: Request, res: Response) => {
  const { from, to } = req.query;
  const data = trendDetectionService.getTimeSeriesData(
    req.params.id,
    from as string,
    to as string
  );
  res.json(apiResponse(true, { data, count: data.length }));
});

// Get trend forecast
app.get('/api/v1/trends/:id/forecast', (req: Request, res: Response) => {
  const horizon = req.query.horizon ? Number(req.query.horizon) : 7;
  const forecast = trendDetectionService.forecastTrend(req.params.id, horizon);
  if (!forecast) {
    res.status(404).json(apiResponse(false, undefined, 'Trend not found or insufficient data'));
    return;
  }
  res.json(apiResponse(true, forecast));
});

// Detect emerging trends
app.get('/api/v1/trends/emerging', (_req: Request, res: Response) => {
  const trends = trendDetectionService.detectEmergingTrends();
  res.json(apiResponse(true, { trends, count: trends.length }));
});

// Detect trend changes
app.get('/api/v1/trends/changes', (_req: Request, res: Response) => {
  const changes = trendDetectionService.detectTrendChanges();
  res.json(apiResponse(true, { changes, count: changes.length }));
});

// Add trend data point
app.post('/api/v1/trends/data', (req: Request, res: Response) => {
  try {
    const { metric, value, timestamp, metadata } = req.body;
    if (!metric || value === undefined) {
      res.status(400).json(apiResponse(false, undefined, 'metric and value required'));
      return;
    }
    trendDetectionService.addDataPoint(metric, value, timestamp, metadata);
    res.json(apiResponse(true, { recorded: true }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// ANOMALY ENDPOINTS
// ============================================================================

// Get all anomalies
app.get('/api/v1/anomalies', (req: Request, res: Response) => {
  const { severity, resolved, type, from, to } = req.query;
  const anomalies = anomalyDetectionService.getAnomalies({
    severity: severity as Anomaly['severity'],
    resolved: resolved !== undefined ? resolved === 'true' : undefined,
    type: type as string,
    from: from as string,
    to: to as string
  });
  res.json(apiResponse(true, { anomalies, count: anomalies.length }));
});

// Get anomaly by ID
app.get('/api/v1/anomalies/:id', (req: Request, res: Response) => {
  const anomalies = anomalyDetectionService.getAnomalies();
  const anomaly = anomalies.find(a => a.id === req.params.id);
  if (!anomaly) {
    res.status(404).json(apiResponse(false, undefined, 'Anomaly not found'));
    return;
  }
  res.json(apiResponse(true, anomaly));
});

// Resolve anomaly
app.post('/api/v1/anomalies/:id/resolve', (req: Request, res: Response) => {
  try {
    const { resolution } = req.body;
    anomalyDetectionService.resolveAnomaly(req.params.id, resolution);
    res.json(apiResponse(true, { resolved: true }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get unresolved anomaly counts
app.get('/api/v1/anomalies/counts', (_req: Request, res: Response) => {
  const counts = anomalyDetectionService.getUnresolvedCount();
  res.json(apiResponse(true, counts));
});

// Get anomaly rules
app.get('/api/v1/anomalies/rules', (_req: Request, res: Response) => {
  const rules = anomalyDetectionService.getRules();
  res.json(apiResponse(true, { rules }));
});

// ============================================================================
// LEARNING MODELS ENDPOINTS
// ============================================================================

// Create model
app.post('/api/v1/models', (req: Request, res: Response) => {
  try {
    const { type, hyperparameters, features, targetVariable } = req.body;
    if (!type) {
      res.status(400).json(apiResponse(false, undefined, 'type required'));
      return;
    }

    const model = learningModelsService.createModel({
      type,
      hyperparameters: hyperparameters || {},
      features: features || [],
      targetVariable: targetVariable || 'outcome'
    });

    res.status(201).json(apiResponse(true, model));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Train model
app.post('/api/v1/models/:id/train', (req: Request, res: Response) => {
  try {
    const { features, labels } = req.body;
    if (!features || !labels) {
      res.status(400).json(apiResponse(false, undefined, 'features and labels required'));
      return;
    }

    const model = learningModelsService.trainModel(req.params.id, { features, labels });
    res.json(apiResponse(true, model));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get all models
app.get('/api/v1/models', (req: Request, res: Response) => {
  const { type, status, minAccuracy } = req.query;
  const models = learningModelsService.getModels({
    type: type as LearningModel['type'],
    status: status as LearningModel['status'],
    minAccuracy: minAccuracy ? Number(minAccuracy) : undefined
  });
  res.json(apiResponse(true, { models, count: models.length }));
});

// Get model by ID
app.get('/api/v1/models/:id', (req: Request, res: Response) => {
  const model = learningModelsService.getModel(req.params.id);
  if (!model) {
    res.status(404).json(apiResponse(false, undefined, 'Model not found'));
    return;
  }
  res.json(apiResponse(true, model));
});

// Predict with model
app.post('/api/v1/models/:id/predict', (req: Request, res: Response) => {
  try {
    const { features } = req.body;
    if (!features) {
      res.status(400).json(apiResponse(false, undefined, 'features required'));
      return;
    }

    const prediction = learningModelsService.predict(req.params.id, features);
    res.json(apiResponse(true, prediction));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get model performance history
app.get('/api/v1/models/:id/history', (req: Request, res: Response) => {
  const history = learningModelsService.getPerformanceHistory(req.params.id);
  res.json(apiResponse(true, { history, count: history.length }));
});

// Compare models
app.post('/api/v1/models/compare', (req: Request, res: Response) => {
  try {
    const { modelIds } = req.body;
    if (!modelIds || !Array.isArray(modelIds)) {
      res.status(400).json(apiResponse(false, undefined, 'modelIds array required'));
      return;
    }

    const comparison = learningModelsService.compareModels(modelIds);
    res.json(apiResponse(true, { comparison }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// A/B TESTING ENDPOINTS
// ============================================================================

// Create experiment
app.post('/api/v1/experiments', (req: Request, res: Response) => {
  try {
    const { name, description, hypothesis, variants, metrics, targetSampleSize, significanceLevel } = req.body;
    if (!name || !variants || variants.length < 2) {
      res.status(400).json(apiResponse(false, undefined, 'name and at least 2 variants required'));
      return;
    }

    const experiment = abTestingService.createExperiment({
      name,
      description: description || '',
      hypothesis: hypothesis || '',
      variants,
      metrics: metrics || [],
      targetSampleSize,
      significanceLevel
    });

    res.status(201).json(apiResponse(true, experiment));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get all experiments
app.get('/api/v1/experiments', (req: Request, res: Response) => {
  const { status, from, to } = req.query;
  const experiments = abTestingService.getExperiments({
    status: status as Experiment['status'],
    from: from as string,
    to: to as string
  });
  res.json(apiResponse(true, { experiments, count: experiments.length }));
});

// Get experiment by ID
app.get('/api/v1/experiments/:id', (req: Request, res: Response) => {
  const experiment = abTestingService.getExperiment(req.params.id);
  if (!experiment) {
    res.status(404).json(apiResponse(false, undefined, 'Experiment not found'));
    return;
  }
  res.json(apiResponse(true, experiment));
});

// Get experiment results
app.get('/api/v1/experiments/:id/results', (req: Request, res: Response) => {
  const results = abTestingService.getExperimentResults(req.params.id);
  if (!results) {
    res.status(404).json(apiResponse(false, undefined, 'Experiment not found'));
    return;
  }
  res.json(apiResponse(true, results));
});

// Assign user to experiment
app.post('/api/v1/experiments/:id/assign', (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json(apiResponse(false, undefined, 'userId required'));
      return;
    }

    const variant = abTestingService.assignUser(req.params.id, userId);
    if (!variant) {
      res.status(404).json(apiResponse(false, undefined, 'Experiment not found or not running'));
      return;
    }

    res.json(apiResponse(true, { variant }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Record conversion
app.post('/api/v1/experiments/:id/conversion', (req: Request, res: Response) => {
  try {
    const { userId, value } = req.body;
    if (!userId) {
      res.status(400).json(apiResponse(false, undefined, 'userId required'));
      return;
    }

    const recorded = abTestingService.recordConversion(req.params.id, userId, value);
    res.json(apiResponse(true, { recorded }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Pause experiment
app.post('/api/v1/experiments/:id/pause', (req: Request, res: Response) => {
  abTestingService.pauseExperiment(req.params.id);
  res.json(apiResponse(true, { paused: true }));
});

// Resume experiment
app.post('/api/v1/experiments/:id/resume', (req: Request, res: Response) => {
  abTestingService.resumeExperiment(req.params.id);
  res.json(apiResponse(true, { resumed: true }));
});

// Cancel experiment
app.post('/api/v1/experiments/:id/cancel', (req: Request, res: Response) => {
  abTestingService.cancelExperiment(req.params.id);
  res.json(apiResponse(true, { cancelled: true }));
});

// ============================================================================
// KNOWLEDGE GRAPH ENDPOINTS
// ============================================================================

// Get knowledge graph
app.get('/api/v1/knowledge', (_req: Request, res: Response) => {
  const graph = knowledgeGraphService.getKnowledgeGraph();
  res.json(apiResponse(true, graph));
});

// Create node
app.post('/api/v1/knowledge/nodes', (req: Request, res: Response) => {
  try {
    const { type, name, description, properties, embedding } = req.body;
    if (!type || !name) {
      res.status(400).json(apiResponse(false, undefined, 'type and name required'));
      return;
    }

    const node = knowledgeGraphService.createNode({
      type,
      name,
      description,
      properties,
      embedding
    });

    res.status(201).json(apiResponse(true, node));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get all nodes
app.get('/api/v1/knowledge/nodes', (req: Request, res: Response) => {
  const { type, search } = req.query;
  const nodes = knowledgeGraphService.getNodes({
    type: type as any,
    search: search as string
  });
  res.json(apiResponse(true, { nodes, count: nodes.length }));
});

// Get node by ID
app.get('/api/v1/knowledge/nodes/:id', (req: Request, res: Response) => {
  const node = knowledgeGraphService.getNode(req.params.id);
  if (!node) {
    res.status(404).json(apiResponse(false, undefined, 'Node not found'));
    return;
  }
  res.json(apiResponse(true, node));
});

// Connect knowledge nodes
app.post('/api/v1/knowledge/connect', (req: Request, res: Response) => {
  try {
    const { sourceId, targetId, relationship, weight } = req.body;
    if (!sourceId || !targetId || !relationship) {
      res.status(400).json(apiResponse(false, undefined, 'sourceId, targetId, and relationship required'));
      return;
    }

    const edge = knowledgeGraphService.connectNodes(sourceId, targetId, relationship, weight);
    res.status(201).json(apiResponse(true, edge));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get edges
app.get('/api/v1/knowledge/edges', (req: Request, res: Response) => {
  const { relationship, sourceId, targetId } = req.query;
  const edges = knowledgeGraphService.getEdges({
    relationship: relationship as string,
    sourceId: sourceId as string,
    targetId: targetId as string
  });
  res.json(apiResponse(true, { edges, count: edges.length }));
});

// Query graph
app.post('/api/v1/knowledge/query', (req: Request, res: Response) => {
  try {
    const { nodeTypes, relationshipTypes, depth, startNodeId, maxNodes } = req.body;
    const result = knowledgeGraphService.queryGraph({
      nodeTypes,
      relationshipTypes,
      depth,
      startNodeId,
      maxNodes
    });
    res.json(apiResponse(true, result));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Find path between nodes
app.get('/api/v1/knowledge/path/:startId/:endId', (req: Request, res: Response) => {
  const path = knowledgeGraphService.findPath(req.params.startId, req.params.endId);
  if (!path) {
    res.status(404).json(apiResponse(false, undefined, 'No path found'));
    return;
  }
  res.json(apiResponse(true, path));
});

// Find similar nodes
app.get('/api/v1/knowledge/similar/:nodeId', (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const similar = knowledgeGraphService.findSimilarNodes(req.params.nodeId, limit);
  res.json(apiResponse(true, { similar }));
});

// Add pattern to graph
app.post('/api/v1/knowledge/from-pattern', (req: Request, res: Response) => {
  try {
    const { patternId } = req.body;
    if (!patternId) {
      res.status(400).json(apiResponse(false, undefined, 'patternId required'));
      return;
    }

    const pattern = patternRecognitionService.getPattern(patternId);
    if (!pattern) {
      res.status(404).json(apiResponse(false, undefined, 'Pattern not found'));
      return;
    }

    const node = knowledgeGraphService.addPattern(pattern);
    res.status(201).json(apiResponse(true, node));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Add strategy to graph
app.post('/api/v1/knowledge/from-strategy', (req: Request, res: Response) => {
  try {
    const { strategyId } = req.body;
    if (!strategyId) {
      res.status(400).json(apiResponse(false, undefined, 'strategyId required'));
      return;
    }

    const strategy = strategyLearningService.getStrategy(strategyId);
    if (!strategy) {
      res.status(404).json(apiResponse(false, undefined, 'Strategy not found'));
      return;
    }

    const node = knowledgeGraphService.addStrategy(strategy);
    res.status(201).json(apiResponse(true, node));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// EXTERNAL INTEGRATION ENDPOINTS
// ============================================================================

// Simulate strategy
app.post('/api/v1/simulate', (req: Request, res: Response) => {
  try {
    const { strategyId, context, duration, iterations, parameters } = req.body;
    if (!strategyId) {
      res.status(400).json(apiResponse(false, undefined, 'strategyId required'));
      return;
    }

    const request: SimulationRequest = {
      strategyId,
      context: context || {},
      duration: duration || 1000,
      iterations: iterations || 100,
      parameters: parameters || {}
    };

    externalIntegrationsService.simulateStrategy(request).then(result => {
      res.json(apiResponse(true, result));
    }).catch(error => {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    });
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Apply policy
app.post('/api/v1/policy/apply', (req: Request, res: Response) => {
  try {
    const { strategyId, context, priority, applyImmediately } = req.body;
    if (!strategyId) {
      res.status(400).json(apiResponse(false, undefined, 'strategyId required'));
      return;
    }

    const request: PolicyRequest = {
      strategyId,
      context: context || {},
      priority: priority || 'normal',
      applyImmediately: applyImmediately ?? true
    };

    externalIntegrationsService.applyPolicy(request).then(response => {
      res.json(apiResponse(true, response));
    }).catch(error => {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    });
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get queued policy status
app.get('/api/v1/policy/:policyId/status', (req: Request, res: Response) => {
  const status = externalIntegrationsService.getQueuedPolicyStatus(req.params.policyId);
  if (!status) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found'));
    return;
  }
  res.json(apiResponse(true, status));
});

// Get integration logs
app.get('/api/v1/integrations/logs', (req: Request, res: Response) => {
  const { service, action, success, from, to, limit } = req.query;
  const logs = externalIntegrationsService.getIntegrationLogs({
    service: service as string,
    action: action as string,
    success: success !== undefined ? success === 'true' : undefined,
    from: from as string,
    to: to as string,
    limit: limit ? Number(limit) : undefined
  });
  res.json(apiResponse(true, { logs, count: logs.length }));
});

// Get integration statistics
app.get('/api/v1/integrations/stats', (_req: Request, res: Response) => {
  const stats = externalIntegrationsService.getIntegrationStatistics();
  res.json(apiResponse(true, stats));
});

// ============================================================================
// ANALYSIS ENDPOINTS
// ============================================================================

// General analyze endpoint
app.post('/api/v1/analyze', (req: Request, res: Response) => {
  const { context } = req.body;
  const patterns = patternRecognitionService.getPatterns({ minConfidence: 0.7 });
  const strategies = strategyLearningService.getStrategies({ status: 'active' });
  const trends = trendDetectionService.getTrends({ minStrength: 0.5 });

  const recommendations = patterns.slice(0, 5).map(p => ({
    pattern: p.description,
    confidence: p.confidence,
    suggestedAction: p.triggers[0],
    type: p.type
  }));

  res.json(apiResponse(true, {
    recommendations,
    analyzedPatterns: patterns.length,
    activeStrategies: strategies.length,
    detectedTrends: trends.length
  }));
});

// Insights endpoint
app.get('/api/v1/insights', (_req: Request, res: Response) => {
  const patternStats = patternRecognitionService.getStatistics();
  const trendStats = trendDetectionService.getStatistics();
  const anomalyStats = anomalyDetectionService.getStatistics();
  const modelStats = learningModelsService.getStatistics();
  const experimentStats = abTestingService.getStatistics();
  const kgStats = knowledgeGraphService.getStatistics();

  const insights = {
    patterns: {
      total: patternStats.totalPatterns,
      avgConfidence: patternStats.avgConfidence,
      avgSuccessRate: patternStats.avgSuccessRate
    },
    trends: {
      total: trendStats.totalTrends,
      increasing: trendStats.increasingTrends,
      decreasing: trendStats.decreasingTrends
    },
    anomalies: {
      total: anomalyStats.totalAnomalies,
      unresolved: anomalyStats.unresolvedAnomalies,
      bySeverity: anomalyStats.bySeverity
    },
    models: {
      total: modelStats.totalModels,
      ready: modelStats.readyModels,
      avgAccuracy: modelStats.avgAccuracy
    },
    experiments: {
      total: experimentStats.totalExperiments,
      running: experimentStats.runningExperiments,
      avgLift: experimentStats.avgLift
    },
    knowledgeGraph: {
      nodes: kgStats.totalNodes,
      edges: kgStats.totalEdges,
      avgConnections: kgStats.avgConnectionsPerNode
    }
  };

  res.json(apiResponse(true, insights));
});

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

// Get all statistics
app.get('/api/v1/statistics', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    patterns: patternRecognitionService.getStatistics(),
    trends: trendDetectionService.getStatistics(),
    anomalies: anomalyDetectionService.getStatistics(),
    models: learningModelsService.getStatistics(),
    experiments: abTestingService.getStatistics(),
    knowledgeGraph: knowledgeGraphService.getStatistics(),
    recommendations: recommendationEngineService.getMetrics(),
    integrations: externalIntegrationsService.getIntegrationStatistics()
  }));
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error('[ERROR]', err.message);
  res.status(500).json(apiResponse(false, undefined, err.message));
});

// ============================================================================
// SHUTDOWN HANDLERS
// ============================================================================

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, exiting...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received, exiting...');
  process.exit(0);
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   SUTAR NETWORK LEARNING SERVICE                              ║
║   Version: 2.0.0                                              ║
║   Port: ${PORT}                                                  ║
║                                                               ║
║   Features:                                                    ║
║   - Pattern Recognition & ML-based Detection                  ║
║   - Success Analysis & Factor Identification                  ║
║   - Strategy Learning & Evolution                             ║
║   - AI-powered Recommendation Engine                          ║
║   - Trend Detection & Forecasting                             ║
║   - Anomaly Detection & Alerts                                ║
║   - Multiple Learning Models                                   ║
║   - A/B Testing & Experiment Tracking                         ║
║   - Knowledge Graph & Network Analysis                        ║
║   - SimulationOS Integration (port 4241)                     ║
║   - Decision Engine Integration (port 4240)                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
