/**
 * Conversation Physics Engine — v1.0.0
 * ====================================
 * Makes AI conversations feel human:
 * - Turn Manager: when to speak, wait, interrupt
 * - Silence Intelligence: understanding pause meanings
 * - Backchannel Generator: "mm-hmm", "right..."
 * - Repair Engine: self-correction handling
 * - Emotion Trajectory: emotional flow tracking
 *
 * Port: 4881
 */

import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config/index.js';

// Services
import { TurnManager } from './services/turnManager.js';
import { SilenceIntelligence } from './services/silenceIntelligence.js';
import { RepairEngine } from './services/repairEngine.js';
import { EmotionTrajectory } from './services/emotionTrajectory.js';

// Types
import type {
  ConversationSession,
  ConversationState,
  ConversationContext,
  ConversationMetrics,
  TurnState,
  TurnDecision,
  VoiceDirective,
  UserSpeechRequest,
  AISpeechRequest,
  SilenceAnalysis
} from './types/index.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Storage ─────────────────────────────────────────────────────────────────

// In-memory session store (in production: Redis)
const sessions = new Map<string, ConversationSession>();
const emotionTracker = new EmotionTrajectory();

// ── Request Schemas ───────────────────────────────────────────────────────────

const StartConversationSchema = z.object({
  userId: z.string().min(1),
  context: z.object({
    relationship: z.enum(['mother', 'friend', 'investor', 'employee', 'customer', 'partner', 'stranger']).optional(),
    mode: z.enum(['work', 'casual', 'emergency', 'social', 'prayer']).optional(),
    energy: z.enum(['high', 'medium', 'low']).optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
    location: z.enum(['driving', 'meeting', 'home', 'office', 'travel']).optional()
  }).optional()
});

const UserSpeechSchema = z.object({
  sessionId: z.string().min(1),
  transcript: z.string().min(1),
  emotion: z.string().optional(),
  intensity: z.number().min(1).max(10).optional(),
  silenceDurationMs: z.number().min(0).optional(),
  corrections: z.array(z.object({
    type: z.enum(['replacement', 'addition', 'deletion', 'reordering']),
    originalText: z.string(),
    correctedText: z.string(),
    position: z.object({ start: z.number(), end: z.number() })
  })).optional()
});

const AISpeechSchema = z.object({
  sessionId: z.string().min(1),
  plannedResponse: z.string().min(1),
  targetEmotion: z.string().optional(),
  relationship: z.string().optional()
});

const EndConversationSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.enum(['completed', 'user-ended', 'timeout', 'error']).optional(),
  summary: z.boolean().optional()
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/conversation/start
 * Start a new conversation session
 */
app.post('/api/conversation/start', async (req, res) => {
  try {
    const { userId, context } = StartConversationSchema.parse(req.body);

    const sessionId = uuidv4();
    const now = Date.now();

    const greeting = generateGreeting(context?.relationship, context?.timeOfDay);

    const session: ConversationSession = {
      id: sessionId,
      userId,
      state: 'idle',
      turns: [],
      currentTurn: null,
      startedAt: now,
      lastActivityAt: now,
      totalUserSpeechMs: 0,
      totalAISpeechMs: 0,
      totalSilenceMs: 0,
      interruptions: 0,
      backchannels: 0,
      context: {
        relationship: context?.relationship,
        mode: context?.mode,
        energy: context?.energy,
        timeOfDay: context?.timeOfDay,
        location: context?.location
      },
      metrics: {
        avgUserTurnLength: 0,
        avgAITurnLength: 0,
        userSpeechRatio: 0,
        interruptionsPerMinute: 0,
        backchannelsPerMinute: 0,
        silenceRatio: 0,
        topicChanges: 0,
        corrections: 0,
        emotionalTrajectory: []
      }
    };

    sessions.set(sessionId, session);

    res.json({
      success: true,
      sessionId,
      state: session.state,
      greeting,
      voiceDirective: getGreetingVoiceDirective(context)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[conversation-physics]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/conversation/user-speech
 * Process user speech input
 */
app.post('/api/conversation/user-speech', async (req, res) => {
  try {
    const { sessionId, transcript, emotion, intensity, silenceDurationMs, corrections } =
      UserSpeechSchema.parse(req.body);

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const now = Date.now();

    // Process silence if present
    let silenceAnalysis: SilenceAnalysis | null = null;
    if (silenceDurationMs !== undefined && silenceDurationMs > 0) {
      silenceAnalysis = SilenceIntelligence.analyze(silenceDurationMs, session.context);
      session.totalSilenceMs += silenceDurationMs;
    }

    // Detect self-corrections
    let repairAcknowledgment: string | null = null;
    const detectedCorrections = corrections || [];
    if (detectedCorrections.length === 0) {
      const detected = RepairEngine.detectSelfCorrection(transcript);
      if (detected) {
        detectedCorrections.push(detected);
        repairAcknowledgment = RepairEngine.generateRepairAcknowledgment(
          detected,
          session.context.relationship
        );
      }
    }

    // Track emotion
    if (emotion) {
      emotionTracker.track(session.userId, emotion, intensity || 5);
    }

    // Create turn record
    const turn: TurnState = {
      id: uuidv4(),
      speaker: 'user',
      startTime: session.lastActivityAt,
      endTime: now,
      transcript,
      emotion,
      isComplete: true,
      wasInterrupted: false,
      hadSilence: silenceAnalysis !== null,
      silenceDurationMs,
      backchannels: []
    };

    session.turns.push(turn);
    session.lastActivityAt = now;
    session.state = 'listening';

    // Update metrics
    updateMetrics(session);

    // Decide AI response
    const turnDecision = TurnManager.decide(session, true, transcript);

    // Get emotion trajectory insight
    const trajectoryInsight = emotionTracker.generateTrajectoryResponse(session.userId, emotion || 'neutral');

    res.json({
      success: true,
      acknowledged: true,
      shouldAIRespond: turnDecision.action !== 'wait',
      turnDecision,
      silenceAnalysis,
      repairAcknowledgment,
      suggestedBackchannel: turnDecision.action === 'backchannel' ? turnDecision.suggestedBackchannel : undefined,
      trajectoryInsight,
      metrics: getSessionMetrics(session)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[conversation-physics]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/conversation/ai-speech
 * Generate voice directive for AI response
 */
app.post('/api/conversation/ai-speech', async (req, res) => {
  try {
    const { sessionId, plannedResponse, targetEmotion, relationship } = AISpeechSchema.parse(req.body);

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const now = Date.now();

    // Get emotion state
    const emotionState = emotionTracker.getCurrentState(session.userId);

    // Determine voice directive
    const voiceDirective = generateVoiceDirective(
      targetEmotion || emotionState.emotion,
      relationship || session.context.relationship,
      session.context.timeOfDay,
      emotionState
    );

    // Create AI turn record
    const turn: TurnState = {
      id: uuidv4(),
      speaker: 'ai',
      startTime: session.lastActivityAt,
      endTime: now,
      transcript: plannedResponse,
      emotion: targetEmotion || emotionState.emotion,
      isComplete: true,
      wasInterrupted: false,
      hadSilence: false,
      backchannels: []
    };

    session.turns.push(turn);
    session.lastActivityAt = now;
    session.state = 'speaking';
    session.totalAISpeechMs += plannedResponse.length * 50; // Approximate

    // Update metrics
    updateMetrics(session);

    // Calculate timing
    const estimatedDurationMs = plannedResponse.length * 50; // ~50ms per character
    const pausePoints = calculatePausePoints(plannedResponse, voiceDirective);

    res.json({
      success: true,
      voiceDirective,
      finalResponse: plannedResponse,
      timing: {
        estimatedDurationMs,
        pausePoints
      },
      emotionState
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[conversation-physics]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/conversation/end
 * End conversation session
 */
app.post('/api/conversation/end', async (req, res) => {
  try {
    const { sessionId, reason, summary } = EndConversationSchema.parse(req.body);

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const duration = Date.now() - session.startedAt;
    const metrics = getSessionMetrics(session);

    // Generate summary if requested
    let summaryText: string | undefined;
    let followUp: string[] | undefined;

    if (summary) {
      const emotionSummary = emotionTracker.getSummary(session.userId, duration);
      summaryText = generateConversationSummary(session, metrics, emotionSummary);
      followUp = generateFollowUpTopics(session);
    }

    session.state = 'ended';

    res.json({
      success: true,
      sessionId,
      duration,
      metrics,
      summary: summaryText,
      followUp
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[conversation-physics]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/conversation/:sessionId
 * Get conversation state
 */
app.get('/api/conversation/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  res.json({
    success: true,
    session: {
      id: session.id,
      state: session.state,
      context: session.context,
      metrics: getSessionMetrics(session),
      turnCount: session.turns.length,
      duration: Date.now() - session.startedAt
    }
  });
});

/**
 * GET /api/emotion/:userId
 * Get emotional state for user
 */
app.get('/api/emotion/:userId', async (req, res) => {
  const { userId } = req.params;
  const { period } = req.query;

  const periodMs = period === 'week' ? 7 * 86400000 :
    period === 'month' ? 30 * 86400000 : 86400000;

  const summary = emotionTracker.getSummary(userId, periodMs);

  res.json({
    success: true,
    userId,
    period,
    summary
  });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'conversation-physics-engine',
    port: config.port,
    version: '1.0.0',
    capabilities: [
      'turn-manager',
      'silence-intelligence',
      'backchannel-generation',
      'repair-engine',
      'emotion-trajectory'
    ],
    activeSessions: sessions.size,
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
      turnManager: true,
      silenceIntelligence: true,
      repairEngine: true,
      emotionTrajectory: true
    },
    timestamp: new Date().toISOString()
  });
});

// ── Helper Functions ──────────────────────────────────────────────────────────

function generateGreeting(relationship?: string, timeOfDay?: string): string {
  const timeGreetings: Record<string, string[]> = {
    morning: ['Good morning', 'Good morning! How are you today?'],
    afternoon: ['Good afternoon', 'Good afternoon! How\'s your day going?'],
    evening: ['Good evening', 'Good evening! How was your day?'],
    night: ['Hey there', 'Hey, late night conversation?']
  };

  const defaultGreetings = ['Hello', 'Hey', 'Hi there'];

  const baseGreeting = timeOfDay && timeGreetings[timeOfDay]
    ? timeGreetings[timeOfDay][0]
    : defaultGreetings[Math.floor(Math.random() * defaultGreetings.length)];

  // Add relationship-specific endings
  if (relationship === 'mother') {
    return `${baseGreeting}, beta. Kaise ho?`;
  }
  if (relationship === 'friend') {
    return `${baseGreeting} bro!`;
  }
  if (relationship === 'investor') {
    return `${baseGreeting}. How can I help you today?`;
  }

  return `${baseGreeting}! How can I help you?`;
}

function getGreetingVoiceDirective(context?: Partial<ConversationContext>): VoiceDirective {
  return {
    emotion: 'warm',
    pace: 0.95,
    volume: 'normal',
    pauseBeforeMs: 200,
    pauseAfterMs: 300,
    emphasis: [],
    expressions: [],
    smile: true,
    energy: 'medium'
  };
}

function generateVoiceDirective(
  emotion: string,
  relationship?: string,
  timeOfDay?: string,
  emotionState?: { intensity: number; trend: string }
): VoiceDirective {
  // Adjust pace based on emotion
  let pace = 1.0;
  let volume: 'soft' | 'normal' | 'loud' = 'normal';
  let energy: 'low' | 'medium' | 'high' = 'medium';
  let expressions: VoiceDirective['expressions'] = [];

  switch (emotion) {
    case 'joy':
    case 'excited':
      pace = 1.1;
      energy = 'high';
      expressions = ['EXCITED'];
      break;
    case 'sadness':
    case 'grieving':
      pace = 0.85;
      volume = 'soft';
      energy = 'low';
      expressions = ['THOUGHTFUL'];
      break;
    case 'anger':
    case 'frustrated':
      pace = 1.05;
      energy = 'high';
      volume = 'loud';
      break;
    case 'fear':
    case 'anxious':
      pace = 0.9;
      energy = 'low';
      expressions = ['CONCERNED'];
      break;
    case 'love':
      pace = 0.95;
      volume = 'soft';
      expressions = ['WARM', 'SMILE'];
      break;
    default:
      pace = timeOfDay === 'night' ? 0.9 : 1.0;
  }

  // Relationship adjustments
  if (relationship === 'mother' || relationship === 'friend') {
    expressions.push('SMILE');
  }

  return {
    emotion,
    pace,
    volume,
    pauseBeforeMs: emotion === 'sadness' ? 400 : 200,
    pauseAfterMs: emotion === 'joy' ? 150 : 250,
    emphasis: [],
    expressions,
    smile: expressions.includes('SMILE'),
    energy
  };
}

function calculatePausePoints(text: string, directive: VoiceDirective): number[] {
  const pausePoints: number[] = [];
  const pauseMs = directive.pauseAfterMs;

  // Add pause after commas, semicolons
  let pos = 0;
  for (const char of text) {
    if (char === ',' || char === ';') {
      pausePoints.push(pos);
    }
    pos++;
  }

  return pausePoints;
}

function updateMetrics(session: ConversationSession): void {
  const userTurns = session.turns.filter(t => t.speaker === 'user');
  const aiTurns = session.turns.filter(t => t.speaker === 'ai');

  if (userTurns.length > 0) {
    session.metrics.avgUserTurnLength =
      userTurns.reduce((a, t) => a + t.transcript.length, 0) / userTurns.length;
  }

  if (aiTurns.length > 0) {
    session.metrics.avgAITurnLength =
      aiTurns.reduce((a, t) => a + t.transcript.length, 0) / aiTurns.length;
  }

  const totalTurns = userTurns.length + aiTurns.length;
  if (totalTurns > 0) {
    session.metrics.userSpeechRatio = userTurns.length / totalTurns;
  }

  const durationMinutes = (Date.now() - session.startedAt) / 60000;
  if (durationMinutes > 0) {
    session.metrics.interruptionsPerMinute = session.interruptions / durationMinutes;
    session.metrics.backchannelsPerMinute = session.backchannels / durationMinutes;
  }

  const totalMs = session.totalUserSpeechMs + session.totalAISpeechMs + session.totalSilenceMs;
  if (totalMs > 0) {
    session.metrics.silenceRatio = session.totalSilenceMs / totalMs;
  }
}

function getSessionMetrics(session: ConversationSession): ConversationMetrics & { duration: number } {
  return {
    ...session.metrics,
    duration: Date.now() - session.startedAt
  };
}

function generateConversationSummary(
  session: ConversationSession,
  metrics: ConversationMetrics,
  emotionSummary: { dominantEmotion: string; averageIntensity: number }
): string {
  const turns = session.turns.length;
  const durationMinutes = Math.round((Date.now() - session.startedAt) / 60000);

  return `This ${durationMinutes}-minute conversation had ${turns} turns. ` +
    `The dominant emotional tone was ${emotionSummary.dominantEmotion} ` +
    `with an average intensity of ${emotionSummary.averageIntensity.toFixed(1)}/10. ` +
    `User spoke ${(metrics.userSpeechRatio * 100).toFixed(0)}% of the time.`;
}

function generateFollowUpTopics(session: ConversationSession): string[] {
  const topics: string[] = [];

  // Based on emotional state
  const recentTurns = session.turns.slice(-3);
  const emotions = recentTurns.map(t => t.emotion).filter(Boolean);

  if (emotions.includes('sadness') || emotions.includes('stress')) {
    topics.push('Check in on wellbeing later');
  }

  if (emotions.includes('joy') || emotions.includes('excitement')) {
    topics.push('Follow up on positive news');
  }

  // Based on topics discussed (would use MemoryOS in production)
  topics.push('Continue previous topic');

  return topics;
}

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4881;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║       CONVERSATION PHYSICS ENGINE v1.0.0                     ║
║                                                                ║
║  🗣️  Making AI Conversations Feel Human                       ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Capabilities:                                                 ║
║  • Turn Manager (when to speak, wait, interrupt)              ║
║  • Silence Intelligence (pause meaning detection)               ║
║  • Backchannel Generation ("mm-hmm", "right...")              ║
║  • Repair Engine (self-correction handling)                    ║
║  • Emotion Trajectory (emotional flow tracking)                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[conversation-physics] Shutting down...');
  server.close(() => {
    console.log('[conversation-physics] Shutdown complete');
    process.exit(0);
  });
});

export default app;
