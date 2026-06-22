/**
 * HOJAI Unified Prospect Context Service
 * =======================================
 * One brain for ALL AI agents - every agent knows every prospect
 *
 * Port: 4550
 *
 * Architecture:
 * - Central context store with prospect profiles
 * - Enrichment from ALL ecosystem touchpoints
 * - Real-time context updates via event bus
 * - Agent hooks for instant context access
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import EventEmitter from 'events';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  port: process.env.PORT || 4550,
  mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-prospect-context',
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4090',
};

// ============================================
// MONGODB SCHEMAS
// ============================================

// Main prospect profile
const ProspectSchema = new mongoose.Schema({
  prospectId: { type: String, unique: true, required: true, index: true },
  name: String,
  email: String,
  phone: String,
  company: String,
  title: String,
  location: String,
  firstSeen: Date,
  lastSeen: Date,
  interactionCount: { type: Number, default: 0 },
  touchpoints: [{
    source: String,
    type: String,
    timestamp: Date,
    summary: String,
    sentiment: String,
    outcome: String,
    metadata: mongoose.Schema.Types.Mixed,
  }],
  context: {
    interests: [String],
    painPoints: [String],
    budget: String,
    timeline: String,
    decisionMakers: [String],
    competitors: [String],
    lastConversation: String,
    preferences: mongoose.Schema.Types.Mixed,
    history: [String],
  },
  agentMemory: {
    lastAgent: String,
    agentInteractions: [{
      agentId: String,
      agentType: String,
      lastInteraction: Date,
      interactionSummary: String,
      learnings: [String],
    }],
  },
  engagement: {
    score: { type: Number, default: 0 },
    lastEngaged: Date,
    nextAction: String,
    nextActionDate: Date,
  },
  tags: [String],
  segments: [String],
  customFields: mongoose.Schema.Types.Mixed,
  consentGiven: { type: Boolean, default: false },
  gdprCompliant: { type: Boolean, default: false },
}, { timestamps: true });

// Context event log
const ContextEventSchema = new mongoose.Schema({
  prospectId: { type: String, required: true, index: true },
  eventType: { type: String, required: true },
  source: String,
  agentId: String,
  data: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false },
});

// ============================================
// MODELS
// ============================================

const Prospect = mongoose.model('Prospect', ProspectSchema);
const ContextEvent = mongoose.model('ContextEvent', ContextEventSchema);

// ============================================
// REDIS CLIENT
// ============================================

let redis: ReturnType<typeof createClient>;

async function initRedis() {
  redis = createClient({ url: CONFIG.redis });
  redis.on('error', (err) => console.log('Redis Client Error', err));
  await redis.connect();
  console.log('✅ Redis connected for context caching');
}

// ============================================
// EVENT BUS
// ============================================

class ContextEventBus extends EventEmitter {}
const contextBus = new ContextEventBus();

// ============================================
// CONTEXT SERVICE
// ============================================

class ProspectContextService {

  async getProspectContext(prospectId: string, requestingAgent?: string): Promise<any> {
    const cached = await redis.get(`prospect:${prospectId}:context`);
    if (cached) {
      await this.logContextAccess(prospectId, requestingAgent, 'cache_hit');
      return JSON.parse(cached);
    }

    const prospect = await Prospect.findOne({ prospectId });
    if (!prospect) return null;

    const context = {
      identity: {
        prospectId: prospect.prospectId,
        name: prospect.name,
        email: prospect.email,
        phone: prospect.phone,
        company: prospect.company,
        title: prospect.title,
        location: prospect.location,
      },
      journey: {
        firstSeen: prospect.firstSeen,
        lastSeen: prospect.lastSeen,
        interactionCount: prospect.interactionCount,
        touchpoints: prospect.touchpoints.slice(-10),
        segments: prospect.segments,
        tags: prospect.tags,
      },
      context: prospect.context,
      agentMemory: prospect.agentMemory,
      engagement: prospect.engagement,
      enrichedAt: new Date().toISOString(),
    };

    await redis.setEx(`prospect:${prospectId}:context`, 300, JSON.stringify(context));
    await this.logContextAccess(prospectId, requestingAgent, 'database_fetch');

    return context;
  }

  async updateProspectContext(prospectId: string, updates: any, sourceAgent: string): Promise<void> {
    const updateData: any = {};

    if (updates.interaction) {
      updateData.$push = {
        touchpoints: {
          source: updates.interaction.source,
          type: updates.interaction.type,
          timestamp: new Date(),
          summary: updates.interaction.summary,
          sentiment: updates.interaction.sentiment,
          outcome: updates.interaction.outcome,
          metadata: updates.interaction.metadata,
        },
        'context.history': updates.interaction.summary,
      };
      updateData.$inc = { interactionCount: 1 };
      updateData.lastSeen = new Date();
    }

    if (updates.context) {
      Object.keys(updates.context).forEach(key => {
        updateData[`context.${key}`] = updates.context[key];
      });
    }

    if (updates.engagement) {
      Object.keys(updates.engagement).forEach(key => {
        updateData[`engagement.${key}`] = updates.engagement[key];
      });
    }

    await Prospect.findOneAndUpdate(
      { prospectId },
      { ...updateData, $setOnInsert: { firstSeen: new Date() } },
      { upsert: true, new: true }
    );

    await redis.del(`prospect:${prospectId}:context`);
    contextBus.emit('prospectUpdated', { prospectId, sourceAgent, updates });
    await this.logContextEvent(prospectId, 'update', sourceAgent, updates);
  }

  async getAgentContext(prospectId: string, agentType: string): Promise<any> {
    const context = await this.getProspectContext(prospectId);

    if (!context) {
      return { isNew: true, prospectId, message: 'New prospect - no history available' };
    }

    return {
      isNew: false,
      prospectId,
      identity: context.identity,
      recentHistory: context.journey.touchpoints.map((t: any) => `[${t.source}] ${t.type}: ${t.summary}`).join('\n'),
      keyInsights: context.context.history.slice(-3),
      agentMemory: context.agentMemory.agentInteractions.filter((i: any) => i.agentType === agentType).slice(-3),
      engagement: { score: context.engagement.score, nextAction: context.engagement.nextAction, lastEngaged: context.engagement.lastEngaged },
      preferences: context.context.preferences,
      contextSummary: this.generateContextSummary(context),
    };
  }

  async searchProspects(query: any): Promise<any[]> {
    const filter: any = {};
    if (query.name) filter.name = new RegExp(query.name, 'i');
    if (query.email) filter.email = new RegExp(query.email, 'i');
    if (query.company) filter.company = new RegExp(query.company, 'i');
    if (query.tags) filter.tags = { $in: query.tags };
    if (query.segments) filter.segments = { $in: query.segments };
    if (query.minEngagement) filter['engagement.score'] = { $gte: query.minEngagement };

    return Prospect.find(filter).select('prospectId name email company engagement.score lastSeen tags').limit(query.limit || 50).exec();
  }

  private generateContextSummary(context: any): string {
    return `Prospect ${context.identity.name} from ${context.identity.company}. Last seen ${context.journey.lastSeen}. Engagement: ${context.engagement.score}/100.`;
  }

  private async logContextAccess(prospectId: string, agentId: string, accessType: string): Promise<void> {
    await this.logContextEvent(prospectId, 'ai_query', agentId, { accessType });
  }

  private async logContextEvent(prospectId: string, eventType: string, agentId: string, data: any): Promise<void> {
    try {
      await ContextEvent.create({ prospectId, eventType, source: agentId, agentId, data });
    } catch (error) {
      console.error('Failed to log context event:', error);
    }
  }
}

// ============================================
// EXPRESS APP
// ============================================

const app = express();
const contextService = new ProspectContextService();

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hojai-prospect-context', port: CONFIG.port });
});

app.get('/api/prospect/:prospectId/context', async (req, res) => {
  try {
    const { prospectId } = req.params;
    const agentId = req.headers['x-agent-id'] as string;
    const context = await contextService.getProspectContext(prospectId, agentId);
    if (!context) return res.status(404).json({ error: 'Prospect not found' });
    res.json(context);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prospect/:prospectId/agent-context/:agentType', async (req, res) => {
  try {
    const { prospectId, agentType } = req.params;
    res.json(await contextService.getAgentContext(prospectId, agentType));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prospect/:prospectId/context', async (req, res) => {
  try {
    const { prospectId } = req.params;
    const updates = req.body;
    const sourceAgent = req.headers['x-agent-id'] as string || 'unknown';
    await contextService.updateProspectContext(prospectId, updates, sourceAgent);
    res.json({ success: true, prospectId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prospects/search', async (req, res) => {
  try {
    const query = {
      name: req.query.name,
      email: req.query.email,
      company: req.query.company,
      tags: req.query.tags ? req.query.tags.toString().split(',') : undefined,
      segments: req.query.segments ? req.query.segments.toString().split(',') : undefined,
      minEngagement: req.query.minEngagement ? parseInt(req.query.minEngagement as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };
    res.json(await contextService.searchProspects(query));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prospects/ids', async (req, res) => {
  try {
    const prospects = await Prospect.find({}, 'prospectId name email company').sort({ 'engagement.score': -1 }).limit(1000).exec();
    res.json(prospects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/prospect/:prospectId/events', (req, res) => {
  const { prospectId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const handler = (data: any) => {
    if (data.prospectId === prospectId) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  contextBus.on('prospectUpdated', handler);
  req.on('close', () => contextBus.off('prospectUpdated', handler));
});

// ============================================
// STARTUP
// ============================================

async function start() {
  try {
    await mongoose.connect(CONFIG.mongodb);
    console.log('✅ MongoDB connected');
    await initRedis();

    app.listen(CONFIG.port, () => {
      console.log(`🚀 HOJAI Prospect Context Service running on port ${CONFIG.port}`);
      console.log(`   MongoDB: ${CONFIG.mongodb}`);
      console.log(`   Redis: ${CONFIG.redis}`);
      console.log(`\n📡 API Endpoints:`);
      console.log(`   GET  /api/prospect/:id/context        - Get full context`);
      console.log(`   GET  /api/prospect/:id/agent-context - Get agent-formatted context`);
      console.log(`   POST /api/prospect/:id/context        - Update context`);
      console.log(`   GET  /api/prospects/search           - Search prospects`);
      console.log(`   GET  /api/prospects/ids             - Get all prospect IDs`);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();

export { app, contextService };