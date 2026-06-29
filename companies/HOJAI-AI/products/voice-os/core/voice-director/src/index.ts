/**
 * Voice Director — v1.0.0
 * ======================
 * Generates emotionally authentic voice directives for TTS:
 * - Emotion-based pace, volume, pauses
 * - Personality modes (founder, friend, mother, professional, etc.)
 * - SSML and JSON markup generation
 * - TTS-ready speech blueprints
 *
 * Port: 4882
 */

import express from 'express';
import { z } from 'zod';

// Services
import { DirectiveGenerator } from './services/directiveGenerator.js';
import { SpeechMarkup } from './services/speechMarkup.js';

// Types
import type { VoiceDirective, VoiceBlueprint } from './types/index.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Request Schemas ───────────────────────────────────────────────────────────

const GenerateDirectiveSchema = z.object({
  text: z.string().min(1).max(10000),
  emotion: z.string().min(1),
  relationship: z.string().optional(),
  personalityMode: z.string().optional(),
  context: z.object({
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
    location: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high']).optional(),
    formality: z.number().min(0).max(1).optional(),
    warmth: z.number().min(0).max(1).optional()
  }).optional()
});

const BatchDirectiveSchema = z.object({
  utterances: z.array(z.object({
    text: z.string().min(1),
    emotion: z.string().min(1),
    relationship: z.string().optional()
  })).min(1).max(100),
  personalityMode: z.string().optional()
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/directive
 * Generate a voice directive for text
 */
app.post('/api/directive', async (req, res) => {
  try {
    const { text, emotion, relationship, personalityMode, context } =
      GenerateDirectiveSchema.parse(req.body);

    // Generate directive
    const directive = DirectiveGenerator.generate(emotion, relationship, personalityMode, context);

    // Generate blueprint
    const blueprint = SpeechMarkup.generateBlueprint(text, directive, {
      relationship,
      originalEmotion: emotion
    });

    res.json({
      success: true,
      directive,
      blueprint,
      formats: {
        ssml: SpeechMarkup.toSSML(blueprint),
        timedText: SpeechMarkup.toTimedText(blueprint),
        json: SpeechMarkup.toJsonDirective(blueprint)
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[voice-director]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/directive/batch
 * Generate multiple directives at once
 */
app.post('/api/directive/batch', async (req, res) => {
  try {
    const { utterances, personalityMode } = BatchDirectiveSchema.parse(req.body);

    const blueprints = utterances.map(utterance => {
      const directive = DirectiveGenerator.generate(
        utterance.emotion,
        utterance.relationship,
        personalityMode
      );
      return SpeechMarkup.generateBlueprint(utterance.text, directive, {
        relationship: utterance.relationship,
        originalEmotion: utterance.emotion
      });
    });

    res.json({
      success: true,
      count: blueprints.length,
      blueprints
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[voice-director]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/directive/ssml
 * Generate SSML directly
 */
app.post('/api/directive/ssml', async (req, res) => {
  try {
    const { text, emotion, relationship, personalityMode, context } =
      GenerateDirectiveSchema.parse(req.body);

    const directive = DirectiveGenerator.generate(emotion, relationship, personalityMode, context);
    const blueprint = SpeechMarkup.generateBlueprint(text, directive, {
      relationship,
      originalEmotion: emotion
    });

    res.json({
      success: true,
      ssml: SpeechMarkup.toSSML(blueprint)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[voice-director]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/personality-modes
 * List available personality modes
 */
app.get('/api/personality-modes', (req, res) => {
  const { VOICE_EMOTIONS, PERSONALITY_MODES } = require('./types/index.js');

  res.json({
    success: true,
    personalityModes: Object.values(PERSONALITY_MODES).map(mode => ({
      id: mode.id,
      name: mode.name,
      relationshipTypes: mode.relationshipTypes,
      defaultPace: mode.defaultPace,
      defaultEmotion: mode.defaultEmotion
    })),
    emotions: Object.keys(VOICE_EMOTIONS)
  });
});

/**
 * GET /api/blueprint/:id
 * Get a previously generated blueprint (would use cache in production)
 */
app.get('/api/blueprint/:id', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Blueprint caching not implemented - generate fresh each time'
  });
});

/**
 * POST /api/blueprint/convert
 * Convert between formats
 */
app.post('/api/blueprint/convert', async (req, res) => {
  try {
    const { blueprint, targetFormat } = req.body;

    if (!blueprint) {
      return res.status(400).json({ success: false, error: 'Blueprint required' });
    }

    const parsedBlueprint: VoiceBlueprint = blueprint;
    let converted: string | object;

    switch (targetFormat) {
      case 'ssml':
        converted = SpeechMarkup.toSSML(parsedBlueprint);
        break;
      case 'timedText':
        converted = SpeechMarkup.toTimedText(parsedBlueprint);
        break;
      case 'json':
        converted = SpeechMarkup.toJsonDirective(parsedBlueprint);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Use: ssml, timedText, or json'
        });
    }

    res.json({
      success: true,
      format: targetFormat,
      output: converted
    });
  } catch (error) {
    console.error('[voice-director]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-director',
    port: process.env.PORT || 4882,
    version: '1.0.0',
    capabilities: [
      'directive-generation',
      'ssml-markup',
      'timed-text',
      'batch-processing',
      'personality-modes'
    ],
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
      directiveGenerator: true,
      speechMarkup: true
    },
    timestamp: new Date().toISOString()
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4882;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              VOICE DIRECTOR v1.0.0                          ║
║                                                                ║
║  🎭  Emotionally Authentic Speech Synthesis                  ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Capabilities:                                                 ║
║  • Emotion-based voice directives                            ║
║  • Personality modes (Founder, Friend, Mother, etc.)         ║
║  • SSML markup generation                                     ║
║  • Timed text markers                                         ║
║  • Batch processing                                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[voice-director] Shutting down...');
  server.close(() => {
    console.log('[voice-director] Shutdown complete');
    process.exit(0);
  });
});

export default app;
