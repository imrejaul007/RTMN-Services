import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app: Express = express();
const PORT = process.env.PORT || 4018;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intent-graph';

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

// Intent Types
type IntentType = 'PROCUREMENT' | 'SALES' | 'SERVICE' | 'PARTNERSHIP' | 'SUPPORT' | 'FEEDBACK';
type IntentStatus = 'captured' | 'processing' | 'enriched' | 'routed' | 'completed' | 'failed';

// ============================================
// INTENT MODEL
// ============================================

const intentSchema = new mongoose.Schema({
  intentId: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['PROCUREMENT', 'SALES', 'SERVICE', 'PARTNERSHIP', 'SUPPORT', 'FEEDBACK'], required: true },
  status: { type: String, enum: ['captured', 'processing', 'enriched', 'routed', 'completed', 'failed'], default: 'captured' },

  // Content
  rawText: String,
  entities: [{
    type: String,
    value: String,
    confidence: Number
  }],

  // Analysis
  urgency: { type: Number, min: 0, max: 100, default: 50 },
  budget: {
    min: Number,
    max: Number,
    currency: String
  },
  quantity: Number,
  unit: String,

  // Context
  context: {
    industry: String,
    location: String,
    agent: String,
    previousIntents: [String]
  },

  // Routing
  routedTo: String,
  routedAt: Date,

  // Enrichment
  enriched: {
    patterns: [String],
    similarIntents: [String],
    recommendations: [String]
  },

  // Metadata
  tenantId: { type: String, required: true, index: true },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

intentSchema.index({ tenantId: 1, type: 1 });
intentSchema.index({ tenantId: 1, status: 1 });
intentSchema.index({ 'context.industry': 1 });

const Intent = mongoose.model('Intent', intentSchema);

// ============================================
// PATTERN MODEL
// ============================================

const patternSchema = new mongoose.Schema({
  patternId: { type: String, required: true, unique: true },
  name: String,
  type: String,
  regex: String,
  industry: String,
  occurrences: { type: Number, default: 1 },
  lastSeen: Date,
  entities: [String]
});

const Pattern = mongoose.model('Pattern', patternSchema);

// ============================================
// ROUTES
// ============================================

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'intent-graph', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const status = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(status === 'connected' ? 200 : 503).json({ status, mongodb: status });
});

// Service info
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    service: 'intent-graph',
    version: '1.0.0',
    description: 'Intent Graph - Capture, analyze, and route intents',
    types: ['PROCUREMENT', 'SALES', 'SERVICE', 'PARTNERSHIP', 'SUPPORT', 'FEEDBACK']
  });
});

// ============================================
// INTENT ROUTES
// ============================================

/**
 * Capture new intent
 */
app.post('/api/intents', async (req: Request, res: Response) => {
  try {
    const { type, rawText, entities, urgency, budget, quantity, unit, context, tenantId } = req.body;

    const intentId = `INT-${uuidv4().substring(0, 8).toUpperCase()}`;

    const intent = new Intent({
      intentId,
      type,
      rawText,
      status: 'captured',
      entities: entities || [],
      urgency: urgency || 50,
      budget: budget || {},
      quantity,
      unit,
      context: context || {},
      tenantId
    });

    await intent.save();

    // Pattern recognition - learn from intent
    if (rawText) {
      await learnPatterns(rawText, type);
    }

    res.status(201).json({ success: true, data: intent });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * List intents
 */
app.get('/api/intents', async (req: Request, res: Response) => {
  try {
    const { tenantId, type, status, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = { tenantId };

    if (type) filter.type = type;
    if (status) filter.status = status;

    const intents = await Intent.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Intent.countDocuments(filter);

    res.json({
      success: true,
      data: intents,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Get intent
 */
app.get('/api/intents/:id', async (req: Request, res: Response) => {
  try {
    const intent = await Intent.findOne({ intentId: req.params.id });
    if (!intent) {
      return res.status(404).json({ success: false, error: 'Intent not found' });
    }
    res.json({ success: true, data: intent });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Enrich intent
 */
app.post('/api/intents/:id/enrich', async (req: Request, res: Response) => {
  try {
    const intent = await Intent.findOne({ intentId: req.params.id });
    if (!intent) {
      return res.status(404).json({ success: false, error: 'Intent not found' });
    }

    // Find similar intents
    const similar = await Intent.find({
      tenantId: intent.tenantId,
      type: intent.type,
      intentId: { $ne: intent.intentId }
    }).limit(5);

    // Pattern analysis
    const patterns = await Pattern.find({ type: intent.type });

    intent.enriched = {
      patterns: patterns.map(p => p.name),
      similarIntents: similar.map(s => s.intentId),
      recommendations: generateRecommendations(intent)
    };
    intent.status = 'enriched';
    intent.updatedAt = new Date();

    await intent.save();

    res.json({ success: true, data: intent });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Route intent to agent/service
 */
app.post('/api/intents/:id/route', async (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    const intent = await Intent.findOne({ intentId: req.params.id });

    if (!intent) {
      return res.status(404).json({ success: false, error: 'Intent not found' });
    }

    intent.routedTo = target;
    intent.routedAt = new Date();
    intent.status = 'routed';
    intent.updatedAt = new Date();

    await intent.save();

    res.json({ success: true, data: intent });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// PATTERN ROUTES
// ============================================

/**
 * List patterns
 */
app.get('/api/patterns', async (req: Request, res: Response) => {
  try {
    const { type, industry } = req.query;
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (industry) filter.industry = industry;

    const patterns = await Pattern.find(filter).sort({ occurrences: -1 });
    res.json({ success: true, data: patterns });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// HELPERS
// ============================================

async function learnPatterns(text: string, type: string) {
  // Simple pattern learning - extract keywords
  const words = text.toLowerCase().split(/\s+/);
  const significantWords = words.filter(w => w.length > 4);

  for (const word of significantWords.slice(0, 10)) {
    await Pattern.findOneAndUpdate(
      { name: word, type },
      {
        $inc: { occurrences: 1 },
        $set: { lastSeen: new Date() }
      },
      { upsert: true, new: true }
    );
  }
}

function generateRecommendations(intent: any): string[] {
  const recs: string[] = [];

  if (intent.urgency > 80) {
    recs.push('High urgency - prioritize immediately');
  }

  if (intent.budget?.min) {
    recs.push(`Budget range: ${intent.budget.currency || 'INR'} ${intent.budget.min} - ${intent.budget.max || 'flexible'}`);
  }

  if (intent.quantity) {
    recs.push(`Quantity: ${intent.quantity} ${intent.unit || 'units'}`);
  }

  return recs;
}

// ============================================
// ERROR HANDLING
// ============================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// ============================================
// START
// ============================================

mongoose.connect(MONGODB_URI).then(() => {
  app.listen(PORT, () => {
    console.log(`Intent Graph Service running on port ${PORT}`);
    console.log(`Type: ${['PROCUREMENT', 'SALES', 'SERVICE', 'PARTNERSHIP', 'SUPPORT', 'FEEDBACK'].join(', ')}`);
  });
}).catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});

export default app;
