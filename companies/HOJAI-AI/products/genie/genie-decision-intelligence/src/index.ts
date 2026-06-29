/**
 * Decision Intelligence API — Express server
 * Spec Part 21: Decision Intelligence
 * Port: 4740
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { DecisionStorage } from './services/decisionStorage.js';
import { extractDecisions, extractDecisionsPattern } from './services/decisionExtractor.js';
import { answerWhyQuery, findRelated } from './services/queryEngine.js';
import { Decision } from './types/decision.js';

const PORT = parseInt(process.env.PORT || '4740', 10);
const SERVICE_NAME = 'genie-decision-intelligence';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// Schemas
const ExtractSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1),
  source: z.enum(['meeting', 'chat', 'email', 'voice', 'manual']).default('manual'),
  context: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  timestamp: z.string().optional(),
});

// POST /api/decisions/extract — Extract decisions from text
app.post('/api/decisions/extract', async (req, res, next) => {
  try {
    const data = ExtractSchema.parse(req.body);
    const now = new Date();

    // Try LLM-based extraction first
    let extracted = await extractDecisions(data.text, data.context, data.attendees);

    // Fallback to pattern matching if LLM fails
    if (extracted.decisions.length === 0) {
      const patternResults = extractDecisionsPattern(data.text);
      extracted = {
        decisions: patternResults.map(p => ({
          what: p.what,
          why: p.why,
          who: data.attendees || [],
          alternatives: [],
          confidence: p.confidence,
          impact: 'low' as const,
          tags: [],
        })),
        rawResponse: null
      };
    }

    // Save each decision
    const savedDecisions: Decision[] = [];
    for (const ext of extracted.decisions) {
      const decision: Decision = {
        id: `dec_${uuidv4()}`,
        userId: data.userId,
        what: ext.what,
        why: ext.why,
        who: ext.who || (data.attendees || []),
        when: data.timestamp ? new Date(data.timestamp) : now,
        alternatives: ext.alternatives || [],
        confidence: ext.confidence,
        impact: ext.impact,
        context: data.context || '',
        source: data.source,
        tags: ext.tags || [],
        createdAt: now,
        updatedAt: now,
      };
      await DecisionStorage.save(decision);
      savedDecisions.push(decision);
    }

    res.json({
      success: true,
      data: {
        extracted: extracted.decisions.length,
        saved: savedDecisions,
        confidence: savedDecisions.reduce((sum, d) => sum + d.confidence, 0) / Math.max(savedDecisions.length, 1),
        rawExtraction: extracted.rawResponse,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/decisions/:userId — List user's decisions
app.get('/api/decisions/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const impact = req.query.impact as 'low' | 'medium' | 'high' | undefined;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;

    const decisions = await DecisionStorage.getForUser(userId, {
      limit,
      offset,
      impact,
      since,
    });

    res.json({
      success: true,
      data: decisions,
      meta: {
        count: decisions.length,
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/decisions/:userId/:id — Get single decision
app.get('/api/decisions/:userId/:id', async (req, res, next) => {
  try {
    const decision = await DecisionStorage.get(req.params.id);
    if (!decision || decision.userId !== req.params.userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Decision not found' },
      });
    }
    res.json({
      success: true,
      data: decision,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/decisions/why — "Why did we choose X?"
app.get('/api/decisions/why', async (req, res, next) => {
  try {
    const userId = req.query.userId as string;
    const topic = req.query.topic as string;
    const context = req.query.context as string | undefined;

    if (!userId || !topic) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'userId and topic required' },
      });
    }

    const result = await answerWhyQuery({ userId, topic, context });

    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/decisions/:id/revisit — Set revisit date
app.post('/api/decisions/:id/revisit', async (req, res, next) => {
  try {
    const revisitDate = req.body.revisitDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const updated = await DecisionStorage.update(req.params.id, {
      revisitDate: new Date(revisitDate),
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Decision not found' },
      });
    }

    res.json({
      success: true,
      data: updated,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/decisions/:id/alternatives — Add alternative
app.post('/api/decisions/:id/alternatives', async (req, res, next) => {
  try {
    const { addAlternative } = await import('./services/alternativesTracker.js');
    const alt = req.body;
    const updated = await addAlternative(req.params.id, alt);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Decision not found' },
      });
    }

    res.json({
      success: true,
      data: updated,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/decisions/:userId/memory — Get memory summary
app.get('/api/decisions/:userId/memory', async (req, res, next) => {
  try {
    const summary = await DecisionStorage.getMemorySummary(req.params.userId);
    res.json({
      success: true,
      data: summary,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/decisions/search/:tag — Search by tag
app.get('/api/decisions/search/:tag', async (req, res, next) => {
  try {
    const decisions = await DecisionStorage.searchByTag(req.params.tag);
    res.json({
      success: true,
      data: decisions,
      meta: { count: decisions.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: err.message },
    meta: { timestamp: new Date().toISOString() },
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║      ${SERVICE_NAME.toUpperCase()} v1.0.0                  ║
║      Decision Intelligence — Store WHY/WHO/WHAT/WHEN       ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Extract decisions from text/chat/meetings           ║
║    ✓ Store WHY/WHO/WHAT/WHEN                              ║
║    ✓ Track rejected alternatives with reasons             ║
║    ✓ Query "Why did we choose X?"                          ║
║    ✓ Search by tag                                         ║
║    ✓ Memory summary per user                              ║
║    ✓ Set revisit dates                                     ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;