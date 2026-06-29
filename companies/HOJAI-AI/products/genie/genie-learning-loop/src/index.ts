/**
 * Continuous Learning Loop API — Express server
 * Spec Part 23: Continuous Learning
 * Port: 4742
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { PreferenceStorage } from './services/preferenceStorage.js';
import { learnFromFeedback, extractPreferencesPattern } from './services/preferenceLearner.js';
import { observeBehavior, getBehaviorPatterns, getHighConfidencePatterns } from './services/behaviorTracker.js';
import { adaptToPreferences } from './services/scheduleAdapter.js';
import { Feedback } from './types/preference.js';

const PORT = parseInt(process.env.PORT || '4742', 10);
const SERVICE_NAME = 'genie-learning-loop';

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
const FeedbackSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1),
  type: z.enum(['preference', 'correction', 'approval', 'rejection']).default('preference'),
  context: z.string().optional(),
});

const BehaviorSchema = z.object({
  userId: z.string().min(1),
  action: z.string().min(1),
  timestamp: z.string().optional(),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
  dayOfWeek: z.string().optional(),
  context: z.string().optional(),
});

// POST /api/feedback — Record user feedback
app.post('/api/feedback', async (req, res, next) => {
  try {
    const data = FeedbackSchema.parse(req.body);

    const feedback: Feedback = {
      id: `fb_${uuidv4()}`,
      userId: data.userId,
      text: data.text,
      type: data.type,
      context: data.context,
      timestamp: new Date(),
      processed: false,
    };

    // Learn from feedback
    const preferences = await learnFromFeedback(feedback);
    feedback.processed = true;
    feedback.extractedPreference = preferences[0]?.id;

    res.json({
      success: true,
      data: {
        feedback,
        learnedPreferences: preferences,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/preferences/:userId — Get user's preferences
app.get('/api/preferences/:userId', async (req, res, next) => {
  try {
    const preferences = await PreferenceStorage.getForUser(req.params.userId);
    res.json({
      success: true,
      data: preferences,
      meta: {
        count: preferences.length,
        userId: req.params.userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/preferences/adapt — Adapt calendar to preferences
app.post('/api/preferences/adapt', async (req, res, next) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_USERID', message: 'userId required' },
      });
    }

    const actions = await adaptToPreferences(userId);

    res.json({
      success: true,
      data: {
        actions,
        applied: actions.filter(a => a.applied).length,
        total: actions.length,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/behavior/observe — Record behavior observation
app.post('/api/behavior/observe', async (req, res, next) => {
  try {
    const data = BehaviorSchema.parse(req.body);
    await observeBehavior({
      userId: data.userId,
      action: data.action,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      timeOfDay: data.timeOfDay,
      dayOfWeek: data.dayOfWeek,
      context: data.context,
    });

    res.json({
      success: true,
      data: { observed: true },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/behavior/:userId — Get behavior patterns
app.get('/api/behavior/:userId', async (req, res, next) => {
  try {
    const minConfidence = parseFloat(req.query.minConfidence as string) || 0.5;
    const patterns = minConfidence > 0
      ? await getHighConfidencePatterns(req.params.userId, minConfidence)
      : await getBehaviorPatterns(req.params.userId);

    res.json({
      success: true,
      data: patterns,
      meta: {
        count: patterns.length,
        minConfidence,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/preferences/extract — Extract preferences from text (no save)
app.post('/api/preferences/extract', async (req, res, next) => {
  try {
    const text = req.body.text;
    if (!text) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TEXT', message: 'text required' },
      });
    }

    const extracted = extractPreferencesPattern(text);

    res.json({
      success: true,
      data: extracted,
      meta: { timestamp: new Date().toISOString() },
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
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║      ${SERVICE_NAME.toUpperCase()} v1.0.0                   ║
║      Continuous Learning — "I don't like meetings after 8PM"║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Status:      RUNNING                                       ║
║  Features:                                                 ║
║    ✓ Record user feedback                                 ║
║    ✓ Extract preferences (LLM + pattern)                ║
║    ✓ Track behavior patterns                              ║
║    ✓ Auto-adapt calendar to preferences                  ║
║    ✓ Confidence scoring                                   ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  server.close(() => process.exit(0));
});

export default app;