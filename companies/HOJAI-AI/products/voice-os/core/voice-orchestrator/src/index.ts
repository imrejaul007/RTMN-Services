/**
 * Voice Orchestrator — v1.0.0
 * ========================
 * Wires RAZO → Genie → VoiceOS pipeline:
 * - Intent detection (RAZO)
 * - Presence detection (Human Presence)
 * - Relationship context (Relationship OS)
 * - Conversation physics (Conversation Physics)
 * - Response generation (Genie)
 * - Voice directives (Voice Director)
 * - TTS audio generation
 *
 * Port: 4898
 */

import express from 'express';
import { z } from 'zod';

import { VoiceOrchestrator } from './services/voiceOrchestrator.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Service ─────────────────────────────────────────────────────────────────

const orchestrator = new VoiceOrchestrator();

// ── Request Schemas ───────────────────────────────────────────────────────────

const OrchestrateSchema = z.object({
  userId: z.string().min(1),
  input: z.union([
    z.string(),
    z.object({
      audio: z.string(),
      mimeType: z.string().optional(),
    }),
  ]),
  context: z.object({
    relationship: z.string().optional(),
    presence: z.enum(['alone', 'with-others', 'meeting', 'commuting']).optional(),
    emotion: z.string().optional(),
    energy: z.enum(['high', 'medium', 'low']).optional(),
  }).optional(),
});

const VoiceCommandSchema = z.object({
  userId: z.string().min(1),
  text: z.string().optional(),
  audio: z.string().optional(),
  mimeType: z.string().default('audio/webm'),
  targetRelationship: z.string().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/voice/orchestrate
 * Full voice pipeline orchestration
 */
app.post('/api/voice/orchestrate', async (req, res) => {
  try {
    const data = OrchestrateSchema.parse(req.body);

    const result = await orchestrator.orchestrate({
      userId: data.userId,
      input: data.input,
      context: data.context,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors,
      });
    }
    console.error('[voice-orchestrator]', error);
    res.status(500).json({
      success: false,
      error: 'Orchestration failed',
    });
  }
});

/**
 * POST /api/voice/command
 * Voice command (text or audio)
 */
app.post('/api/voice/command', async (req, res) => {
  try {
    const data = VoiceCommandSchema.parse(req.body);

    const input = data.audio
      ? { audio: data.audio, mimeType: data.mimeType }
      : data.text || 'command';

    const result = await orchestrator.orchestrate({
      userId: data.userId,
      input,
      context: {
        relationship: data.targetRelationship,
      },
    });

    res.json({
      success: true,
      response: result.response,
      audio: result.audioBase64,
      emotion: result.emotion,
      actions: result.actions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors,
      });
    }
    console.error('[voice-orchestrator]', error);
    res.status(500).json({
      success: false,
      error: 'Voice command failed',
    });
  }
});

/**
 * POST /api/voice/text
 * Text input with voice response
 */
app.post('/api/voice/text', async (req, res) => {
  try {
    const { userId, text, relationship } = req.body;

    if (!userId || !text) {
      return res.status(400).json({
        success: false,
        error: 'userId and text are required',
      });
    }

    const result = await orchestrator.orchestrate({
      userId,
      input: text,
      context: { relationship },
    });

    res.json({
      success: true,
      response: result.response,
      audio: result.audioBase64,
      emotion: result.emotion,
      directives: result.directives,
      actions: result.actions,
    });
  } catch (error) {
    console.error('[voice-orchestrator]', error);
    res.status(500).json({
      success: false,
      error: 'Text processing failed',
    });
  }
});

/**
 * GET /api/voice/presences/:userId
 * Get presence adaptation
 */
app.get('/api/voice/presence/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await orchestrator.orchestrate({
      userId,
      input: 'check presence',
      context: {},
    });

    res.json({
      success: true,
      presence: result.conversationState,
    });
  } catch (error) {
    console.error('[voice-orchestrator]', error);
    res.status(500).json({
      success: false,
      error: 'Presence check failed',
    });
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-orchestrator',
    port: process.env.PORT || 4898,
    version: '1.0.0',
    pipeline: [
      'RAZO (intent detection)',
      'Human Presence (adaptation)',
      'Relationship OS (context)',
      'Conversation Physics (turn analysis)',
      'Genie (response generation)',
      'Voice Director (directives)',
      'Voice Gateway (TTS)',
    ],
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready
 */
app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      orchestrator: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4898;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              VOICE ORCHESTRATOR v1.0.0                 ║
║                                                                ║
║  🔊  RAZO → Genie → VoiceOS Pipeline                  ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Pipeline:                                                    ║
║  ├── RAZO (intent detection)                               ║
║  ├── Human Presence (adaptation)                            ║
║  ├── Relationship OS (context)                               ║
║  ├── Conversation Physics (turn analysis)                    ║
║  ├── Genie (response generation)                           ║
║  ├── Voice Director (directives)                            ║
║  └── Voice Gateway (TTS)                                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[voice-orchestrator] Shutting down...');
  server.close(() => process.exit(0));
});

export default app;
