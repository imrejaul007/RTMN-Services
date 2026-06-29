/**
 * Human Presence Engine — v1.0.0
 * =================================
 * Detects and adapts to human presence, attention, energy, and context:
 * - Presence state detection
 * - Energy analysis
 * - Attention tracking
 * - Context awareness
 * - Humor and curiosity detection
 * - Presence-based adaptations
 *
 * Port: 4896
 */

import express from 'express';
import { z } from 'zod';

// Services
import { PresenceDetector } from './services/presenceDetector.js';
import { MultiPersonDetector, type MultiPersonSession, type GroupAdaptation } from './services/multiPersonDetector.js';

// Types
import type {
  PresenceState,
  HumanPresence,
  PresenceAdaptation,
  PresenceContext,
  PresenceInsight
} from './types/index.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Storage ─────────────────────────────────────────────────────────────────

// In-memory presence storage (would use Redis in production)
const presenceStates = new Map<string, HumanPresence>();
const presenceHistory = new Map<string, HumanPresence[]>();

// Multi-person session storage
const multiPersonDetector = new MultiPersonDetector();

// ── Request Schemas ───────────────────────────────────────────────────────────

const UpdatePresenceSchema = z.object({
  userId: z.string().min(1),
  state: z.enum(['active', 'distracted', 'tired', 'focused', 'multi-tasking', 'stressed', 'relaxed']).optional(),
  energy: z.object({
    mental: z.enum(['high', 'medium', 'low', 'critical']).optional(),
    physical: z.enum(['high', 'medium', 'low', 'critical']).optional(),
    emotional: z.enum(['high', 'medium', 'low', 'critical']).optional(),
    social: z.enum(['high', 'medium', 'low', 'critical']).optional()
  }).optional(),
  attention: z.object({
    level: z.number().min(0).max(100).optional(),
    focus: z.number().min(0).max(100).optional(),
    distractions: z.number().optional()
  }).optional(),
  context: z.object({
    location: z.enum(['home', 'office', 'commuting', 'traveling', 'outdoors', 'gym', 'restaurant', 'meeting']).optional(),
    activity: z.enum(['working', 'resting', 'exercising', 'eating', 'socializing', 'commuting', 'sleeping']).optional(),
    socialContext: z.enum(['alone', 'family', 'friends', 'colleagues', 'strangers']).optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
    calendarStatus: z.enum(['free', 'busy', 'in-meeting', 'blocked']).optional()
  }).optional()
});

const AnalyzeConversationSchema = z.object({
  userId: z.string().min(1),
  transcript: z.string().optional(),
  emotionalSignals: z.array(z.string()).optional(),
  speakingPace: z.number().optional(),
  pausePatterns: z.array(z.number()).optional(),
  questionsAsked: z.number().optional(),
  topicChanges: z.number().optional()
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/presence
 * Update presence state
 */
app.post('/api/presence', async (req, res) => {
  try {
    const data = UpdatePresenceSchema.parse(req.body);

    let presence = presenceStates.get(data.userId);

    if (!presence) {
      // Initialize with defaults
      presence = createDefaultPresence(data.userId);
    }

    // Update fields
    if (data.state) presence.state = data.state;
    if (data.energy) {
      presence.energy = { ...presence.energy, ...data.energy, lastUpdated: new Date().toISOString() };
    }
    if (data.attention) {
      presence.attention = { ...presence.attention, ...data.attention };
    }
    if (data.context) {
      presence.context = { ...presence.context, ...data.context };
    }

    presence.lastUpdated = new Date().toISOString();
    presence.confidence = calculateConfidence(presence);

    presenceStates.set(data.userId, presence);

    // Add to history
    const history = presenceHistory.get(data.userId) || [];
    history.push({ ...presence });
    if (history.length > 100) history.shift();
    presenceHistory.set(data.userId, history);

    // Generate adaptation
    const adaptation = PresenceDetector.generateAdaptation(presence);

    res.json({
      success: true,
      presence,
      adaptation
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[human-presence]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/presence/:userId
 * Get current presence state
 */
app.get('/api/presence/:userId', (req, res) => {
  const { userId } = req.params;
  const { adaptation } = req.query;

  let presence = presenceStates.get(userId);

  if (!presence) {
    presence = createDefaultPresence(userId);
    presenceStates.set(userId, presence);
  }

  const adaptationResult = adaptation === 'true'
    ? PresenceDetector.generateAdaptation(presence)
    : undefined;

  res.json({
    success: true,
    presence,
    adaptation: adaptationResult
  });
});

/**
 * GET /api/presence/:userId/history
 * Get presence history
 */
app.get('/api/presence/:userId/history', (req, res) => {
  const { userId } = req.params;
  const { limit } = req.query;

  const history = presenceHistory.get(userId) || [];
  const limited = history.slice(-(parseInt(limit as string) || 50));

  res.json({
    success: true,
    history: limited,
    count: limited.length
  });
});

/**
 * POST /api/presence/analyze
 * Analyze conversation and update presence
 */
app.post('/api/presence/analyze', async (req, res) => {
  try {
    const { userId, transcript, emotionalSignals, speakingPace, pausePatterns, questionsAsked, topicChanges } =
      AnalyzeConversationSchema.parse(req.body);

    let presence = presenceStates.get(userId) || createDefaultPresence(userId);

    // Calculate energy from speaking signals
    if (speakingPace || (pausePatterns && pausePatterns.length > 0)) {
      const energy = PresenceDetector.calculateEnergy({
        speakingPace,
        pauseFrequency: pausePatterns ? pausePatterns.length : undefined
      });
      presence.energy = energy;
    }

    // Update attention if signals provided
    if (pausePatterns || topicChanges !== undefined) {
      presence.attention.pattern = PresenceDetector.detectAttentionPattern(
        pausePatterns?.length || 0,
        questionsAsked || 0,
        topicChanges || 0
      );
    }

    presence.lastUpdated = new Date().toISOString();
    presence.confidence = calculateConfidence(presence);

    presenceStates.set(userId, presence);

    // Generate adaptation
    const adaptation = PresenceDetector.generateAdaptation(presence);

    // Generate insights
    const insights = generateInsights(presence, { questionsAsked, emotionalSignals });

    res.json({
      success: true,
      presence,
      adaptation,
      insights
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[human-presence]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/presence/detect-mode
 * Detect conversation mode based on signals
 */
app.post('/api/presence/detect-mode', async (req, res) => {
  try {
    const { userId, signals } = req.body;

    let presence = presenceStates.get(userId) || createDefaultPresence(userId);

    // Analyze signals
    const energy = PresenceDetector.calculateEnergy(signals);
    presence.energy = energy;

    const state = PresenceDetector.detectState(
      presence.context,
      energy.score,
      presence.attention.level
    );
    presence.state = state;
    presence.lastUpdated = new Date().toISOString();

    presenceStates.set(userId, presence);

    const adaptation = PresenceDetector.generateAdaptation(presence);

    res.json({
      success: true,
      detectedState: state,
      adaptation,
      suggestions: generateSuggestions(state, energy)
    });
  } catch (error) {
    console.error('[human-presence]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/presence/:userId/adaptation
 * Get presence adaptation for voice responses
 */
app.get('/api/presence/:userId/adaptation', (req, res) => {
  const { userId } = req.params;

  let presence = presenceStates.get(userId);

  if (!presence) {
    presence = createDefaultPresence(userId);
    presenceStates.set(userId, presence);
  }

  const adaptation = PresenceDetector.generateAdaptation(presence);

  res.json({
    success: true,
    adaptation,
    state: presence.state,
    energy: presence.energy
  });
});

/**
 * POST /api/presence/session/create
 * Create a multi-person session
 */
app.post('/api/presence/session/create', async (req, res) => {
  try {
    const { sessionId, participantIds } = req.body;

    if (!sessionId || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and participantIds[] are required'
      });
    }

    const session = multiPersonDetector.createSession(sessionId, participantIds);

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('[human-presence]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/presence/session/:sessionId/speak
 * Record that a participant is speaking
 */
app.post('/api/presence/session/:sessionId/speak', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { speakerId } = req.body;

    multiPersonDetector.startSpeaking(sessionId, speakerId);

    res.json({
      success: true,
      message: 'Speaking recorded'
    });
  } catch (error) {
    console.error('[human-presence]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/presence/session/:sessionId/turn
 * Record a conversation turn
 */
app.post('/api/presence/session/:sessionId/turn', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { speakerId, startTime, endTime } = req.body;

    const turn = multiPersonDetector.recordTurn(sessionId, speakerId, startTime, endTime);

    if (!turn) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({
      success: true,
      turn
    });
  } catch (error) {
    console.error('[human-presence]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/presence/session/:sessionId
 * Get session state
 */
app.get('/api/presence/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const session = multiPersonDetector.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  const adaptation = multiPersonDetector.generateGroupAdaptation(sessionId);

  res.json({
    success: true,
    session,
    adaptation
  });
});

/**
 * GET /api/presence/session/:sessionId/adaptation
 * Get group adaptation
 */
app.get('/api/presence/session/:sessionId/adaptation', (req, res) => {
  const { sessionId } = req.params;

  const adaptation = multiPersonDetector.generateGroupAdaptation(sessionId);

  res.json({
    success: true,
    adaptation
  });
});

/**
 * POST /api/presence/session/:sessionId/end
 * End session and get summary
 */
app.post('/api/presence/session/:sessionId/end', (req, res) => {
  const { sessionId } = req.params;

  const summary = multiPersonDetector.endSession(sessionId);

  if (!summary) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  res.json({
    success: true,
    summary
  });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'human-presence-engine',
    port: process.env.PORT || 4896,
    version: '1.0.0',
    capabilities: [
      'presence-detection',
      'energy-analysis',
      'attention-tracking',
      'context-awareness',
      'adaptation-generation',
      'conversation-analysis',
      'multi-person-detection',
      'group-dynamics',
      'conversation-mode-detection'
    ],
    activeUsers: presenceStates.size,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /ready
 */
app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      presenceStorage: true,
      presenceDetector: true
    },
    timestamp: new Date().toISOString()
  });
});

// ── Helper Functions ──────────────────────────────────────────────────────────

function createDefaultPresence(userId: string): HumanPresence {
  const now = new Date();
  const hour = now.getHours();

  return {
    userId,
    state: 'active',
    energy: {
      mental: 'medium',
      physical: 'medium',
      emotional: 'medium',
      social: 'medium',
      overall: 'medium',
      score: 50,
      trend: 'stable',
      lastUpdated: now.toISOString()
    },
    attention: {
      level: 70,
      focus: 70,
      distractions: 2,
      lastFocused: now.toISOString(),
      focusDuration: 0,
      pattern: 'engaged'
    },
    curiosity: {
      level: 50,
      topics: [],
      questionsAsked: 0,
      deepDives: 0,
      pattern: 'engaged'
    },
    humor: {
      level: 50,
      jokesMade: 0,
      laughterDetected: 0,
      appropriateTopics: [],
      inappropriateTopics: [],
      pattern: 'neutral'
    },
    conflict: {
      level: 0,
      disagreementDetected: false,
      topicsOfDisagreement: [],
      responseStyle: 'collaborating',
      openness: 80
    },
    context: {
      timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'
    },
    lastUpdated: now.toISOString(),
    confidence: 30
  };
}

function calculateConfidence(presence: HumanPresence): number {
  let confidence = 30; // Base

  // More signals = higher confidence
  if (presence.context.location) confidence += 15;
  if (presence.context.activity) confidence += 15;
  if (presence.context.socialContext) confidence += 15;
  if (presence.context.calendarStatus) confidence += 10;

  // Energy assessment quality
  if (presence.energy.lastUpdated) {
    const minutesSince = (Date.now() - new Date(presence.energy.lastUpdated).getTime()) / 60000;
    if (minutesSince < 5) confidence += 10;
    else if (minutesSince < 30) confidence += 5;
  }

  return Math.min(100, confidence);
}

function generateInsights(
  presence: HumanPresence,
  signals?: { questionsAsked?: number; emotionalSignals?: string[] }
): PresenceInsight[] {
  const insights: PresenceInsight[] = [];

  // Energy insight
  if (presence.energy.overall === 'low' || presence.energy.overall === 'critical') {
    insights.push({
      type: 'energy',
      insight: 'User energy appears low. Consider shorter responses and patient tone.',
      confidence: presence.confidence,
      suggestion: 'Use gentle, supportive language'
    });
  }

  // Attention insight
  if (presence.attention.level < 50) {
    insights.push({
      type: 'attention',
      insight: 'User attention may be divided. Keep responses concise.',
      confidence: presence.confidence,
      suggestion: 'Break information into smaller chunks'
    });
  }

  // Curiosity insight
  if (signals?.questionsAsked && signals.questionsAsked > 3) {
    insights.push({
      type: 'curiosity',
      insight: 'User is highly curious. Offer deeper information.',
      confidence: 70,
      suggestion: 'Provide additional context and related topics'
    });
  }

  return insights;
}

function generateSuggestions(
  state: PresenceState,
  energy: { score: number; mental: string }
): string[] {
  const suggestions: string[] = [];

  switch (state) {
    case 'focused':
      suggestions.push('Keep responses professional and to the point');
      suggestions.push('Avoid interruptions unless critical');
      break;
    case 'tired':
      suggestions.push('Use a calm, patient tone');
      suggestions.push('Keep responses shorter and simpler');
      suggestions.push('Offer to continue later if needed');
      break;
    case 'stressed':
      suggestions.push('Be empathetic and supportive');
      suggestions.push('Avoid adding pressure');
      suggestions.push('Offer simple, actionable steps');
      break;
    case 'relaxed':
      suggestions.push('A warmer, more conversational tone works well');
      suggestions.push('Light humor is appropriate');
      break;
    default:
      suggestions.push('Maintain friendly professionalism');
  }

  if (energy.mental === 'low') {
    suggestions.push('Consider simplifying complex topics');
  }

  return suggestions;
}

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4896;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          HUMAN PRESENCE ENGINE v1.0.0                    ║
║                                                                ║
║  👤  Presence Detection & Adaptation                     ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Capabilities:                                                 ║
║  • Presence state detection                                 ║
║  • Energy analysis                                          ║
║  • Attention tracking                                       ║
║  • Context awareness                                         ║
║  • Adaptation generation                                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[human-presence] Shutting down...');
  server.close(() => process.exit(0));
});

export default app;
