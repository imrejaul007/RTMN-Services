/**
 * App Detection Service — v1.0.0
 * ==============================
 * Detects active app and provides context-aware voice commands:
 * - App detection and registry
 * - Context-aware actions
 * - Inline text commands (make shorter, formal, etc.)
 * - Cross-app voice commands
 *
 * Port: 4899
 */

import express from 'express';
import { z } from 'zod';

import { AppDetector } from './services/appDetector.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Service ─────────────────────────────────────────────────────────────────

const appDetector = new AppDetector();

// ── Request Schemas ───────────────────────────────────────────────────────────

const DetectAppSchema = z.object({
  windowTitle: z.string().optional(),
  url: z.string().optional(),
  selectedText: z.string().optional(),
});

const ProcessVoiceSchema = z.object({
  input: z.string().min(1),
  appId: z.string().min(1),
  selectedText: z.string().optional(),
});

const GetContextSchema = z.object({
  appId: z.string().min(1),
  windowTitle: z.string().optional(),
  focusedElement: z.string().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/app/detect
 * Detect app from window title or URL
 */
app.post('/api/app/detect', async (req, res) => {
  try {
    const { windowTitle, url, selectedText } = DetectAppSchema.parse(req.body);

    let detectedAppId = 'browser';

    if (windowTitle) {
      detectedAppId = appDetector.detectAppFromTitle(windowTitle);
    } else if (url) {
      detectedAppId = appDetector.detectAppFromTitle(url);
    }

    const context = appDetector.getAppContext(detectedAppId, {
      windowTitle,
      url,
      selectedText,
    });

    res.json({
      success: true,
      detected: detectedAppId !== 'browser',
      appId: detectedAppId,
      context,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[app-detection]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/app/context
 * Get full context for an app
 */
app.post('/api/app/context', async (req, res) => {
  try {
    const { appId, windowTitle, focusedElement } = GetContextSchema.parse(req.body);

    const context = appDetector.getAppContext(appId, {
      windowTitle,
      focusedElement,
    });

    // Get inline commands for this app category
    const inlineCommands = appDetector.getInlineCommands(context.appCategory);

    res.json({
      success: true,
      context,
      inlineCommands,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[app-detection]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/app/voice
 * Process voice input with app context
 */
app.post('/api/app/voice', async (req, res) => {
  try {
    const { input, appId, selectedText } = ProcessVoiceSchema.parse(req.body);

    const result = appDetector.processVoiceInput(input, appId, selectedText);

    // Get context for response
    const context = appDetector.getAppContext(appId);

    res.json({
      success: true,
      ...result,
      context: {
        appId: context.appId,
        appName: context.appName,
        appCategory: context.appCategory,
      },
      suggestion: getSuggestion(result, selectedText),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[app-detection]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/app/inline-commands/:category
 * Get all inline commands for a category
 */
app.get('/api/app/inline-commands/:category', (req, res) => {
  const { category } = req.params;

  const validCategories = ['communication', 'productivity', 'social', 'development', 'commerce', 'health', 'finance', 'travel', 'food', 'unknown'];

  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      error: `Invalid category. Valid: ${validCategories.join(', ')}`,
    });
  }

  const commands = appDetector.getInlineCommands(category as any);

  res.json({
    success: true,
    category,
    commands,
  });
});

/**
 * GET /api/app/inline-commands
 * Get all inline commands
 */
app.get('/api/app/inline-commands', (_req, res) => {
  const categories = ['communication', 'productivity', 'social', 'development', 'commerce'] as const;

  const allCommands: Record<string, typeof categories[number]> = {};
  for (const cat of categories) {
    allCommands[cat] = cat;
  }

  res.json({
    success: true,
    commands: {
      communication: appDetector.getInlineCommands('communication'),
      productivity: appDetector.getInlineCommands('productivity'),
      social: appDetector.getInlineCommands('social'),
      development: appDetector.getInlineCommands('development'),
    },
  });
});

/**
 * GET /api/app/apps
 * Get all supported apps
 */
app.get('/api/app/apps', (_req, res) => {
  const apps = appDetector.getSupportedApps();

  res.json({
    success: true,
    apps,
    count: apps.length,
  });
});

/**
 * GET /api/app/recommendations
 * Get app recommendations based on context
 */
app.get('/api/app/recommendations', (req, res) => {
  const { context } = req.query;

  if (!context || typeof context !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'context query parameter required',
    });
  }

  const recommendations = appDetector.getRecommendations(context);

  res.json({
    success: true,
    recommendations,
  });
});

/**
 * POST /api/app/execute-inline
 * Execute an inline command (transform text)
 */
app.post('/api/app/execute-inline', async (req, res) => {
  try {
    const { commandId, text, language } = req.body;

    if (!commandId || !text) {
      return res.status(400).json({
        success: false,
        error: 'commandId and text required',
      });
    }

    // In production, this would call Genie or a transformation service
    // For now, return mock transformation
    const transformed = transformText(commandId, text, language);

    res.json({
      success: true,
      original: text,
      transformed,
      command: commandId,
    });
  } catch (error) {
    console.error('[app-detection]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'app-detection',
    port: process.env.PORT || 4899,
    version: '1.0.0',
    capabilities: [
      'app-detection',
      'context-aware-commands',
      'inline-commands',
      'cross-app-voice',
    ],
    supportedApps: appDetector.getSupportedApps().length,
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
      appDetector: true,
    },
    supportedApps: appDetector.getSupportedApps().length,
    timestamp: new Date().toISOString(),
  });
});

// ── Helper Functions ──────────────────────────────────────────────────────────

function getSuggestion(
  result: ReturnType<AppDetector['processVoiceInput']>,
  selectedText?: string
): string {
  if (result.type === 'inline_command') {
    if (!selectedText && result.inlineCommand?.requiresSelection) {
      return `Select some text first, then say "${result.inlineCommand.name}"`;
    }
    return `Say "${result.inlineCommand?.aliases[0]}" to transform selected text`;
  }

  if (result.type === 'app_action') {
    return `Say "${result.action?.voiceCommands[0]}" to ${result.action?.name}`;
  }

  return 'Try saying "make this shorter" or "send message"';
}

function transformText(commandId: string, text: string, language?: string): string {
  // Mock transformations - in production would use Genie/AI
  switch (commandId) {
    case 'shorter':
      return text.split(' ').slice(0, Math.ceil(text.split(' ').length / 2)).join(' ') + '...';
    case 'longer':
      return text + ' ' + text;
    case 'formal':
      return text.replace(/hey/gi, 'Hello').replace(/gonna/gi, 'going to').replace(/wanna/gi, 'want to');
    case 'casual':
      return text.replace(/Hello/gi, 'Hey').replace(/going to/gi, 'gonna').replace(/want to/gi, 'wanna');
    case 'grammar':
      return text // Would use grammar API
        .replace(/\bi\b/g, 'I')
        .replace(/\bi'm\b/gi, "I'm")
        .replace(/\bdont\b/gi, "don't");
    case 'emoji':
      return text + ' 😊';
    case 'summarize':
      return text.split('.').slice(0, 2).join('.') + '.';
    default:
      return text;
  }
}

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4899;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              APP DETECTION SERVICE v1.0.0              ║
║                                                                ║
║  📱  App Context & Voice Commands                       ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Supported Apps: ${appDetector.getSupportedApps().length}                                   ║
║                                                                ║
║  Features:                                                    ║
║  • App detection from window title                         ║
║  • Context-aware voice commands                             ║
║  • Inline text transformations                            ║
║  • Cross-app voice commands                                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[app-detection] Shutting down...');
  server.close(() => process.exit(0));
});

export default app;
