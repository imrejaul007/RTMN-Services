// ============================================================================
// SUTAR Intent Bus - Main Entry Point
// Expanded Implementation with ML-based Intent Processing
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Import services
import {
  IntentClassifier,
  intentClassifier,
  ContextEnricher,
  contextEnricher,
  IntentRouter,
  intentRouter,
  IntentHistory,
  intentHistory,
  IntentAnalytics,
  intentAnalytics,
  ConversationContextService,
  conversationContextService,
  EntityExtractor,
  entityExtractor,
  SentimentAnalyzer,
  sentimentAnalyzer,
  PriorityQueue,
  priorityQueue,
  AgentNetworkIntegration,
  agentNetworkIntegration
} from './services';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4154;
const START_TIME = Date.now();

// ============================================================================
// Type Definitions
// ============================================================================

export type IntentCategory = 'browse' | 'search' | 'compare' | 'cart' | 'purchase' | 'support' | 'negotiation' | 'contract';
export type IntentStatus = 'captured' | 'processing' | 'routed' | 'completed' | 'failed';

export interface Intent {
  id: string;
  userId?: string;
  sessionId?: string;
  category: IntentCategory;
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  context: Record<string, any>;
  status: IntentStatus;
  routedTo?: string;
  createdAt: string;
  updatedAt: string;
  enrichedContext?: Record<string, any>;
  sentiment?: Record<string, any>;
  extractedEntities?: Record<string, any>;
  priority?: string;
  routedAt?: string;
  completedAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// ============================================================================
// Data Stores
// ============================================================================

const intents = new Map<string, Intent>();
const intentPatterns = new Map<string, RegExp>();

// ============================================================================
// Middleware Setup
// ============================================================================

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'] }));
app.use(express.json({ limit: '1mb' }));

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
// Utility Functions
// ============================================================================

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId
});

function calculateConfidence(intent: string): number {
  const patterns = intent.toLowerCase().split(' ');
  if (patterns.length > 5) return 0.9;
  if (patterns.length > 3) return 0.8;
  if (patterns.length > 1) return 0.7;
  return 0.5;
}

function generateIntentId(): string {
  return `intent-${uuidv4()}`;
}

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    status: 'healthy',
    service: 'sutar-intent-bus',
    version: '2.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    features: [
      'intent-classification',
      'context-enrichment',
      'intent-routing',
      'intent-history',
      'intent-analytics',
      'conversation-context',
      'entity-extraction',
      'sentiment-analysis',
      'priority-queue',
      'agent-network-integration'
    ]
  }));
});

app.get('/health/ready', (_req: Request, res: Response) => res.json(apiResponse(true, { ready: true })));
app.get('/health/live', (_req: Request, res: Response) => res.json(apiResponse(true, { alive: true })));

app.get('/health/detailed', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    memory: process.memoryUsage(),
    services: {
      classifier: 'operational',
      enricher: 'operational',
      router: 'operational',
      history: 'operational',
      analytics: 'operational',
      conversation: 'operational',
      entityExtractor: 'operational',
      sentimentAnalyzer: 'operational',
      priorityQueue: 'operational',
      agentNetwork: 'operational'
    },
    agentNetworkHealth: agentNetworkIntegration.getNetworkHealth(),
    queueStats: priorityQueue.getStats(),
    routingAnalytics: intentRouter.getAnalytics()
  }));
});

// ============================================================================
// Intent Capture Endpoints
// ============================================================================

// Create Intent with full processing pipeline
app.post('/api/v1/intents', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, category, intent: intentText, entities, context } = req.body;

    if (!intentText) {
      res.status(400).json(apiResponse(false, undefined, 'intent text is required', (req as any).requestId));
      return;
    }

    const id = generateIntentId();
    const now = new Date().toISOString();

    // Step 1: Classify intent
    const classification = intentClassifier.classify(intentText, { userId, sessionId });

    // Step 2: Extract entities
    const entityResult = entityExtractor.extract(intentText);

    // Step 3: Analyze sentiment
    const sentiment = sentimentAnalyzer.analyze(intentText);

    // Step 4: Determine priority
    const priority = priorityQueue.determinePriority
      ? await Promise.resolve(priorityQueue.determinePriority({ id, intent: intentText, confidence: classification.confidence, category: classification.category, context: context || {}, createdAt: now, updatedAt: now } as Intent))
      : 'normal';

    const intentObj: Intent = {
      id,
      userId,
      sessionId,
      category: category || classification.category,
      intent: intentText,
      confidence: classification.confidence,
      entities: {
        ...entities,
        ...entityResult.entities.reduce((acc, e) => ({ ...acc, [e.type]: e.value }), {}),
        extractedEntities: entityResult
      },
      context: context || {},
      status: 'captured',
      createdAt: now,
      updatedAt: now,
      sentiment: sentiment,
      extractedEntities: entityResult,
      priority
    };

    intents.set(id, intentObj);

    // Track in analytics
    intentAnalytics.trackIntent(intentObj);

    // Add to history
    intentHistory.addEntry(intentObj, 'captured');

    // Add to conversation context
    if (sessionId) {
      conversationContextService.updateContext(sessionId, {
        addIntent: intentObj,
        updateState: {
          recentIntents: [id]
        }
      });
    }

    // Enqueue for processing
    priorityQueue.enqueue(intentObj);

    console.log(`[INTENT] Captured: ${id} - ${intentText.substring(0, 50)}... (${classification.category}, conf: ${classification.confidence.toFixed(2)})`);

    res.status(201).json(apiResponse(true, {
      intent: intentObj,
      classification,
      entities: entityResult,
      sentiment,
      priority
    }, undefined, (req as any).requestId));
  } catch (error) {
    console.error('[INTENT] Capture error:', error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Intent Classification Endpoints
// ============================================================================

// Classify an existing intent
app.post('/api/v1/intents/:id/classify', (req: Request, res: Response) => {
  try {
    const intent = intents.get(req.params.id);
    if (!intent) {
      res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
      return;
    }

    const { reclassify } = req.body;
    let classification;

    if (reclassify) {
      // Re-classify with new text if provided
      const newText = req.body.text || intent.intent;
      classification = intentClassifier.classify(newText, { userId: intent.userId, sessionId: intent.sessionId });

      // Update intent with new classification
      intent.category = classification.category;
      intent.confidence = classification.confidence;
      intent.updatedAt = new Date().toISOString();
      intents.set(intent.id, intent);
    } else {
      // Classify based on existing intent
      classification = intentClassifier.classify(intent.intent, { userId: intent.userId, sessionId: intent.sessionId });
    }

    // Get classification with embeddings for ML
    const classificationWithEmbeddings = intentClassifier.classifyWithEmbeddings(intent.intent, { userId: intent.userId });

    // Add to history
    intentHistory.addEntry(intent, 'classified', { classification });

    res.json(apiResponse(true, {
      intentId: intent.id,
      originalCategory: intent.category,
      classification: classificationWithEmbeddings,
      alternativeCategories: classificationWithEmbeddings.alternativeCategories
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Batch classify intents
app.post('/api/v1/intents/classify/batch', (req: Request, res: Response) => {
  try {
    const { texts } = req.body;

    if (!texts || !Array.isArray(texts)) {
      res.status(400).json(apiResponse(false, undefined, 'texts array is required', (req as any).requestId));
      return;
    }

    const results = intentClassifier.batchClassify(texts);

    res.json(apiResponse(true, {
      results,
      totalProcessed: results.length
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Context Enrichment Endpoints
// ============================================================================

// Enrich intent with context
app.post('/api/v1/intents/:id/enrich', (req: Request, res: Response) => {
  try {
    const intent = intents.get(req.params.id);
    if (!intent) {
      res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
      return;
    }

    const { includeWeather, includeBusiness, includeHistorical, depth } = req.body;

    const enrichedContext = contextEnricher.enrich(intent, {
      includeWeather,
      includeBusiness,
      includeHistorical,
      depth: depth || 'standard'
    });

    // Update intent with enriched context
    intent.enrichedContext = enrichedContext;
    intent.updatedAt = new Date().toISOString();
    intents.set(intent.id, intent);

    // Add to history
    intentHistory.addEntry(intent, 'enriched', { enrichedContext });

    res.json(apiResponse(true, {
      intentId: intent.id,
      enrichedContext
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Get user context
app.get('/api/v1/context/user/:userId', (req: Request, res: Response) => {
  const userContext = contextEnricher.getUserContext(req.params.userId);
  if (!userContext) {
    res.status(404).json(apiResponse(false, undefined, 'User context not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, userContext, undefined, (req as any).requestId));
});

// Get session context
app.get('/api/v1/context/session/:sessionId', (req: Request, res: Response) => {
  const sessionContext = contextEnricher.getSessionContext(req.params.sessionId);
  if (!sessionContext) {
    res.status(404).json(apiResponse(false, undefined, 'Session context not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, sessionContext, undefined, (req as any).requestId));
});

// ============================================================================
// Intent Routing Endpoints
// ============================================================================

// Route an intent to appropriate service
app.post('/api/v1/intents/:id/route', async (req: Request, res: Response) => {
  try {
    const intent = intents.get(req.params.id);
    if (!intent) {
      res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
      return;
    }

    // Ensure we have enriched context
    if (!intent.enrichedContext) {
      intent.enrichedContext = contextEnricher.enrich(intent);
    }

    // Get routing decision
    const routingDecision = intentRouter.route(intent, intent.enrichedContext);

    // Update intent with routing
    intent.status = 'routed';
    intent.routedTo = routingDecision.targetService;
    intent.routedAt = new Date().toISOString();
    intent.updatedAt = new Date().toISOString();
    intents.set(intent.id, intent);

    // Add to history
    intentHistory.addEntry(intent, 'routed', { routingDecision });

    // If agent network is the target, send to agent network
    if (routingDecision.targetService === 'agent-network') {
      const agentResponse = await agentNetworkIntegration.sendToAgent({
        intent,
        context: intent.enrichedContext,
        userId: intent.userId,
        sessionId: intent.sessionId
      });

      res.json(apiResponse(true, {
        intent: JSON.parse(JSON.stringify(intent)),
        routingDecision,
        agentResponse
      }, undefined, (req as any).requestId));
      return;
    }

    res.json(apiResponse(true, {
      intent: JSON.parse(JSON.stringify(intent)),
      routingDecision
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Add routing rule
app.post('/api/v1/routing/rules', (req: Request, res: Response) => {
  try {
    const { name, priority, conditions, actions, isActive } = req.body;

    if (!name || !conditions || !actions) {
      res.status(400).json(apiResponse(false, undefined, 'name, conditions, and actions are required', (req as any).requestId));
      return;
    }

    const rule = intentRouter.addRule({
      name,
      priority: priority || 50,
      conditions,
      actions,
      isActive: isActive !== false
    });

    res.status(201).json(apiResponse(true, rule, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Get all routing rules
app.get('/api/v1/routing/rules', (req: Request, res: Response) => {
  const { activeOnly } = req.query;
  const rules = activeOnly === 'true'
    ? intentRouter.getActiveRules()
    : intentRouter.getRules();

  res.json(apiResponse(true, { rules, total: rules.length }, undefined, (req as any).requestId));
});

// Update routing rule
app.put('/api/v1/routing/rules/:ruleId', (req: Request, res: Response) => {
  const updatedRule = intentRouter.updateRule(req.params.ruleId, req.body);
  if (!updatedRule) {
    res.status(404).json(apiResponse(false, undefined, 'Rule not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, updatedRule, undefined, (req as any).requestId));
});

// Delete routing rule
app.delete('/api/v1/routing/rules/:ruleId', (req: Request, res: Response) => {
  const deleted = intentRouter.deleteRule(req.params.ruleId);
  if (!deleted) {
    res.status(404).json(apiResponse(false, undefined, 'Rule not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, { deleted: true }, undefined, (req as any).requestId));
});

// Get routing analytics
app.get('/api/v1/routing/analytics', (req: Request, res: Response) => {
  const analytics = intentRouter.getAnalytics();
  const services = intentRouter.getServices();

  res.json(apiResponse(true, {
    ...analytics,
    services: services.map(s => ({
      name: s.name,
      status: s.healthStatus,
      load: `${s.currentLoad}/${s.capacity}`,
      capabilities: s.capabilities
    }))
  }, undefined, (req as any).requestId));
});

// ============================================================================
// Intent History Endpoints
// ============================================================================

// Get intent history
app.get('/api/v1/intents/:id/history', (req: Request, res: Response) => {
  const history = intentHistory.getHistory(req.params.id);
  const timeline = intentHistory.getIntentTimeline(req.params.id);

  res.json(apiResponse(true, {
    intentId: req.params.id,
    history,
    timeline,
    totalEntries: history.length
  }, undefined, (req as any).requestId));
});

// Query history
app.get('/api/v1/history', (req: Request, res: Response) => {
  const { userId, sessionId, category, startDate, endDate, limit, offset } = req.query;

  const history = intentHistory.queryHistory({
    userId: userId as string,
    sessionId: sessionId as string,
    category: category as string,
    startDate: startDate as string,
    endDate: endDate as string,
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0
  });

  res.json(apiResponse(true, {
    entries: history,
    total: history.length
  }, undefined, (req as any).requestId));
});

// Search history
app.get('/api/v1/history/search', (req: Request, res: Response) => {
  const { q, limit } = req.query;

  if (!q) {
    res.status(400).json(apiResponse(false, undefined, 'Search query (q) is required', (req as any).requestId));
    return;
  }

  const results = intentHistory.searchHistory(q as string, limit ? parseInt(limit as string) : 50);

  res.json(apiResponse(true, {
    results,
    total: results.length,
    query: q
  }, undefined, (req as any).requestId));
});

// Get history statistics
app.get('/api/v1/history/stats', (req: Request, res: Response) => {
  const stats = intentHistory.getStats();
  res.json(apiResponse(true, stats, undefined, (req as any).requestId));
});

// Get session summary
app.get('/api/v1/history/session/:sessionId/summary', (req: Request, res: Response) => {
  const summary = intentHistory.getSessionSummary(req.params.sessionId);
  if (!summary) {
    res.status(404).json(apiResponse(false, undefined, 'Session not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, summary, undefined, (req as any).requestId));
});

// ============================================================================
// Entity Extraction Endpoints
// ============================================================================

// Extract entities from intent
app.get('/api/v1/intents/:id/entities', (req: Request, res: Response) => {
  try {
    const intent = intents.get(req.params.id);
    if (!intent) {
      res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
      return;
    }

    // Use cached entities if available
    let entityResult = intent.extractedEntities as any;

    if (!entityResult || req.query.reExtract === 'true') {
      entityResult = entityExtractor.extract(intent.intent, intent);
      intent.extractedEntities = entityResult;
      intents.set(intent.id, intent);
    }

    res.json(apiResponse(true, {
      intentId: intent.id,
      entities: entityResult.entities,
      primaryEntity: entityResult.primaryEntity,
      relatedEntities: entityResult.relatedEntities,
      missingEntities: entityResult.missingEntities,
      entityCount: entityResult.entityCount,
      confidence: entityResult.confidence
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Extract entities from text
app.post('/api/v1/entities/extract', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json(apiResponse(false, undefined, 'text is required', (req as any).requestId));
      return;
    }

    const result = entityExtractor.extract(text);

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Get supported entity types
app.get('/api/v1/entities/types', (req: Request, res: Response) => {
  const types = entityExtractor.getSupportedTypes();
  res.json(apiResponse(true, { types }, undefined, (req as any).requestId));
});

// ============================================================================
// Sentiment Analysis Endpoints
// ============================================================================

// Analyze sentiment of intent
app.get('/api/v1/intents/:id/sentiment', (req: Request, res: Response) => {
  try {
    const intent = intents.get(req.params.id);
    if (!intent) {
      res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
      return;
    }

    // Use cached sentiment if available
    let sentimentResult = intent.sentiment;

    if (!sentimentResult || req.query.reAnalyze === 'true') {
      sentimentResult = sentimentAnalyzer.analyzeIntent(intent);
      intent.sentiment = sentimentResult;
      intents.set(intent.id, intent);
    }

    res.json(apiResponse(true, {
      intentId: intent.id,
      sentiment: sentimentResult.sentiment,
      score: sentimentResult.score,
      confidence: sentimentResult.confidence,
      intensity: sentimentResult.intensity,
      subjectivity: sentimentResult.subjectivity,
      aspects: sentimentResult.aspects,
      emotions: sentimentResult.emotions,
      keyPhrases: sentimentResult.keyPhrases
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Analyze sentiment of text
app.post('/api/v1/sentiment/analyze', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json(apiResponse(false, undefined, 'text is required', (req as any).requestId));
      return;
    }

    const result = sentimentAnalyzer.analyze(text);

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Batch analyze sentiment
app.post('/api/v1/sentiment/batch', (req: Request, res: Response) => {
  try {
    const { texts } = req.body;

    if (!texts || !Array.isArray(texts)) {
      res.status(400).json(apiResponse(false, undefined, 'texts array is required', (req as any).requestId));
      return;
    }

    const results = sentimentAnalyzer.batchAnalyze(texts);
    const trend = sentimentAnalyzer.getSentimentTrend(results);

    res.json(apiResponse(true, {
      results,
      trend,
      totalAnalyzed: results.length
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Conversation Context Endpoints
// ============================================================================

// Get conversation by session ID
app.get('/api/v1/conversations/:sessionId', (req: Request, res: Response) => {
  const conversation = conversationContextService.getConversation(req.params.sessionId);
  if (!conversation) {
    res.status(404).json(apiResponse(false, undefined, 'Conversation not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, conversation, undefined, (req as any).requestId));
});

// Create or update conversation
app.post('/api/v1/conversations/:sessionId/messages', (req: Request, res: Response) => {
  try {
    const { userId, role, content, intentId, metadata } = req.body;

    if (!content) {
      res.status(400).json(apiResponse(false, undefined, 'content is required', (req as any).requestId));
      return;
    }

    const message = conversationContextService.addMessage(req.params.sessionId, {
      role: role || 'user',
      content,
      intentId,
      metadata
    });

    const conversation = conversationContextService.getConversation(req.params.sessionId);

    res.json(apiResponse(true, {
      message,
      conversation
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Get context for LLM
app.get('/api/v1/conversations/:sessionId/context', (req: Request, res: Response) => {
  const context = conversationContextService.getContextForLLM(req.params.sessionId);
  res.json(apiResponse(true, context, undefined, (req as any).requestId));
});

// Update conversation state
app.patch('/api/v1/conversations/:sessionId/state', (req: Request, res: Response) => {
  try {
    const conversation = conversationContextService.updateContext(req.params.sessionId, {
      updateState: req.body
    });

    if (!conversation) {
      res.status(404).json(apiResponse(false, undefined, 'Conversation not found', (req as any).requestId));
      return;
    }

    res.json(apiResponse(true, conversation, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Trigger escalation
app.post('/api/v1/conversations/:sessionId/escalate', (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    conversationContextService.triggerEscalation(req.params.sessionId, reason || 'Manual escalation');
    const conversation = conversationContextService.getConversation(req.params.sessionId);
    res.json(apiResponse(true, { conversation }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// End conversation
app.post('/api/v1/conversations/:sessionId/end', (req: Request, res: Response) => {
  conversationContextService.endConversation(req.params.sessionId);
  const conversation = conversationContextService.getConversation(req.params.sessionId);
  res.json(apiResponse(true, { conversation }, undefined, (req as any).requestId));
});

// Search conversations
app.get('/api/v1/conversations', (req: Request, res: Response) => {
  const { userId, activeOnly, limit, offset } = req.query;

  const conversations = conversationContextService.searchConversations({
    userId: userId as string,
    activeOnly: activeOnly === 'true',
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0
  });

  res.json(apiResponse(true, {
    conversations,
    total: conversations.length,
    activeCount: conversationContextService.getActiveCount()
  }, undefined, (req as any).requestId));
});

// ============================================================================
// Analytics Endpoints
// ============================================================================

// Get intent analytics
app.get('/api/v1/analytics/intents', (req: Request, res: Response) => {
  const { startDate, endDate, granularity } = req.query;

  const timeRange = startDate && endDate ? {
    startDate: startDate as string,
    endDate: endDate as string,
    granularity: (granularity as any) || 'day'
  } : undefined;

  const metrics = intentAnalytics.getMetrics(timeRange);
  const categoryMetrics = intentAnalytics.getCategoryMetrics(timeRange);

  res.json(apiResponse(true, {
    metrics,
    categories: categoryMetrics,
    timeRange
  }, undefined, (req as any).requestId));
});

// Get user analytics
app.get('/api/v1/analytics/users/:userId', (req: Request, res: Response) => {
  const metrics = intentAnalytics.getUserMetrics(req.params.userId);
  if (!metrics) {
    res.status(404).json(apiResponse(false, undefined, 'User not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, metrics, undefined, (req as any).requestId));
});

// Get session analytics
app.get('/api/v1/analytics/sessions/:sessionId', (req: Request, res: Response) => {
  const metrics = intentAnalytics.getSessionMetrics(req.params.sessionId);
  if (!metrics) {
    res.status(404).json(apiResponse(false, undefined, 'Session not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, metrics, undefined, (req as any).requestId));
});

// Get trend data
app.get('/api/v1/analytics/trends', (req: Request, res: Response) => {
  const { metric, startDate, endDate, granularity } = req.query;

  if (!metric || !startDate || !endDate) {
    res.status(400).json(apiResponse(false, undefined, 'metric, startDate, and endDate are required', (req as any).requestId));
    return;
  }

  const trendData = intentAnalytics.getTrendData(metric as any, {
    startDate: startDate as string,
    endDate: endDate as string,
    granularity: (granularity as any) || 'day'
  });

  res.json(apiResponse(true, {
    metric,
    data: trendData,
    granularity: granularity || 'day'
  }, undefined, (req as any).requestId));
});

// Get funnel analysis
app.get('/api/v1/analytics/funnel', (req: Request, res: Response) => {
  const funnel = intentAnalytics.getFunnelAnalysis();
  res.json(apiResponse(true, { funnel }, undefined, (req as any).requestId));
});

// Get heatmap data
app.get('/api/v1/analytics/heatmap', (req: Request, res: Response) => {
  const heatmap = intentAnalytics.getHeatmapData();
  res.json(apiResponse(true, { heatmap }, undefined, (req as any).requestId));
});

// Get prediction
app.get('/api/v1/analytics/predict', (req: Request, res: Response) => {
  const { daysAhead } = req.query;
  const prediction = intentAnalytics.predictVolume(daysAhead ? parseInt(daysAhead as string) : 7);
  res.json(apiResponse(true, prediction, undefined, (req as any).requestId));
});

// Get anomalies
app.get('/api/v1/analytics/anomalies', (req: Request, res: Response) => {
  const anomalies = intentAnalytics.getAnomalies();
  res.json(apiResponse(true, { anomalies, count: anomalies.length }, undefined, (req as any).requestId));
});

// ============================================================================
// Priority Queue Endpoints
// ============================================================================

// Get queue status
app.get('/api/v1/queue/status', (req: Request, res: Response) => {
  const stats = priorityQueue.getStats();
  const health = priorityQueue.getHealth();
  res.json(apiResponse(true, { ...stats, health }, undefined, (req as any).requestId));
});

// Get queue items
app.get('/api/v1/queue/items', (req: Request, res: Response) => {
  const { priority, limit } = req.query;
  let items = priority
    ? priorityQueue.getAll(priority as string)
    : priorityQueue.getAll();

  if (limit) {
    items = items.slice(0, parseInt(limit as string));
  }

  res.json(apiResponse(true, {
    items,
    total: items.length,
    stats: priorityQueue.getStats()
  }, undefined, (req as any).requestId));
});

// Update intent priority
app.patch('/api/v1/intents/:id/priority', (req: Request, res: Response) => {
  try {
    const { priority } = req.body;

    if (!priority) {
      res.status(400).json(apiResponse(false, undefined, 'priority is required', (req as any).requestId));
      return;
    }

    const updated = priorityQueue.updatePriority(req.params.id, priority);
    if (!updated) {
      res.status(404).json(apiResponse(false, undefined, 'Intent not found in queue', (req as any).requestId));
      return;
    }

    res.json(apiResponse(true, { updated: true, newPriority: priority }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Clear queue
app.delete('/api/v1/queue', (req: Request, res: Response) => {
  const { priority } = req.query;
  const clearedCount = priorityQueue.clear(priority as string);
  res.json(apiResponse(true, { clearedCount }, undefined, (req as any).requestId));
});

// ============================================================================
// Agent Network Endpoints
// ============================================================================

// Get agent network health
app.get('/api/v1/agents/health', (req: Request, res: Response) => {
  const health = agentNetworkIntegration.getNetworkHealth();
  res.json(apiResponse(true, health, undefined, (req as any).requestId));
});

// Get all agents
app.get('/api/v1/agents', (req: Request, res: Response) => {
  const agents = agentNetworkIntegration.getAllAgents();
  const available = agentNetworkIntegration.getAvailableAgents();
  res.json(apiResponse(true, {
    agents,
    availableAgents: available.length,
    totalAgents: agents.length
  }, undefined, (req as any).requestId));
});

// Get agent capabilities
app.get('/api/v1/agents/capabilities', (req: Request, res: Response) => {
  const capabilities = agentNetworkIntegration.getCapabilities();
  res.json(apiResponse(true, { capabilities }, undefined, (req as any).requestId));
});

// Send to agent network
app.post('/api/v1/agents/send', async (req: Request, res: Response) => {
  try {
    const { intentId, callbackUrl } = req.body;

    if (!intentId) {
      res.status(400).json(apiResponse(false, undefined, 'intentId is required', (req as any).requestId));
      return;
    }

    const intent = intents.get(intentId);
    if (!intent) {
      res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
      return;
    }

    const agentResponse = await agentNetworkIntegration.sendToAgent({
      intent,
      context: intent.enrichedContext || {},
      userId: intent.userId,
      sessionId: intent.sessionId,
      callbackUrl
    });

    res.json(apiResponse(true, {
      intentId,
      agentResponse
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Find best agent for intent
app.get('/api/v1/agents/best/:intentId', (req: Request, res: Response) => {
  const intent = intents.get(req.params.intentId);
  if (!intent) {
    res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
    return;
  }

  const agent = agentNetworkIntegration.findBestAgent(intent);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'No available agent found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, { agent, intentId: intent.id }, undefined, (req as any).requestId));
});

// ============================================================================
// Legacy/Existing Endpoints (Enhanced)
// ============================================================================

// Get Intents (List)
app.get('/api/v1/intents', (req: Request, res: Response) => {
  const { userId, sessionId, category, status, limit = 50, offset = 0 } = req.query;
  let result = Array.from(intents.values());

  if (userId) result = result.filter(i => i.userId === userId);
  if (sessionId) result = result.filter(i => i.sessionId === sessionId);
  if (category) result = result.filter(i => i.category === category);
  if (status) result = result.filter(i => i.status === status);

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json(apiResponse(true, {
    intents: result,
    total,
    limit: Number(limit),
    offset: Number(offset)
  }, undefined, (req as any).requestId));
});

// Get Single Intent
app.get('/api/v1/intents/:id', (req: Request, res: Response) => {
  const intent = intents.get(req.params.id);
  if (!intent) {
    res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
    return;
  }
  res.json(apiResponse(true, intent, undefined, (req as any).requestId));
});

// Update Intent
app.patch('/api/v1/intents/:id', (req: Request, res: Response) => {
  const intent = intents.get(req.params.id);
  if (!intent) {
    res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
    return;
  }

  const { status, context, priority } = req.body;

  if (status) intent.status = status;
  if (context) intent.context = { ...intent.context, ...context };
  if (priority) intent.priority = priority;
  intent.updatedAt = new Date().toISOString();

  if (status === 'completed') {
    intent.completedAt = new Date().toISOString();
    intentHistory.addEntry(intent, 'completed');
  } else if (status === 'failed') {
    intentHistory.addEntry(intent, 'failed');
  }

  intents.set(intent.id, intent);
  res.json(apiResponse(true, intent, undefined, (req as any).requestId));
});

// Delete Intent
app.delete('/api/v1/intents/:id', (req: Request, res: Response) => {
  const intent = intents.get(req.params.id);
  if (!intent) {
    res.status(404).json(apiResponse(false, undefined, 'Intent not found', (req as any).requestId));
    return;
  }

  intents.delete(req.params.id);
  priorityQueue.remove(req.params.id);
  res.json(apiResponse(true, { deleted: true }, undefined, (req as any).requestId));
});

// Pattern Learning
app.post('/api/v1/patterns', (req: Request, res: Response) => {
  const { name, pattern } = req.body;
  if (!name || !pattern) {
    res.status(400).json(apiResponse(false, undefined, 'name and pattern required', (req as any).requestId));
    return;
  }
  try {
    intentPatterns.set(name, new RegExp(pattern, 'i'));

    // Also add to classifier
    intentClassifier.addPattern({
      keywords: pattern.split('|').map((p: string) => p.trim().toLowerCase()),
      category: 'search',
      weight: 1.0,
      examples: []
    });

    res.status(201).json(apiResponse(true, { name, pattern }, undefined, (req as any).requestId));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid regex pattern', (req as any).requestId));
  }
});

app.get('/api/v1/patterns', (_req: Request, res: Response) => {
  const patterns = Array.from(intentPatterns.entries()).map(([name, _]) => name);
  res.json(apiResponse(true, { patterns }, undefined, _req.headers['x-request-id'] as string));
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error('[ERROR]', err);
  res.status(500).json(apiResponse(false, undefined, err.message));
});

// ============================================================================
// Process Management
// ============================================================================

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   SUTAR INTENT BUS v2.0.0                                        ║
║   ────────────────────────────                                   ║
║   Port: ${PORT}                                                      ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                  ║
║                                                                  ║
║   Features Enabled:                                              ║
║   ✓ Intent Classification (ML-based)                             ║
║   ✓ Context Enrichment                                           ║
║   ✓ Smart Intent Routing                                         ║
║   ✓ Intent History Tracking                                      ║
║   ✓ Analytics & Usage Patterns                                   ║
║   ✓ Multi-turn Conversation Context                              ║
║   ✓ Entity Extraction                                            ║
║   ✓ Sentiment Analysis                                           ║
║   ✓ Priority Queue                                                ║
║   ✓ Agent Network Integration (port 4155)                          ║
║                                                                  ║
║   Endpoints:                                                     ║
║   • POST /api/v1/intents         - Create intent                  ║
║   • POST /api/v1/intents/:id/classify - Classify intent           ║
║   • POST /api/v1/intents/:id/enrich - Enrich context             ║
║   • GET  /api/v1/intents/:id/history - Intent history            ║
║   • GET  /api/v1/intents/:id/entities - Extract entities         ║
║   • GET  /api/v1/intents/:id/sentiment - Sentiment analysis      ║
║   • POST /api/v1/routing/rules - Add routing rules               ║
║   • GET  /api/v1/routing/analytics - Routing analytics            ║
║   • GET  /api/v1/conversations/:sessionId - Get conversation     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
