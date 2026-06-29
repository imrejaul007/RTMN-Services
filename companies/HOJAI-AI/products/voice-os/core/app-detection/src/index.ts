/**
 * App Detection Service — v1.0.0
 * ==============================
 * Detects active app and provides context-aware voice commands
 *
 * Port: 4899
 */

import express from 'express';
import { z } from 'zod';
import { AppDetector } from './services/appDetector.js';

const app = express();
app.use(express.json());

const appDetector = new AppDetector();

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/app/detect
 * Detect app from window title or URL
 */
app.post('/api/app/detect', async (req, res) => {
  try {
    const validation = z.object({
      windowTitle: z.string().optional(),
      url: z.string().optional(),
      selectedText: z.string().optional(),
    }).safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.error.errors });
    }

    const { windowTitle, url, selectedText } = validation.data;

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
    const validation = z.object({
      appId: z.string().min(1),
      windowTitle: z.string().optional(),
      focusedElement: z.string().optional(),
    }).safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.error.errors });
    }

    const { appId, windowTitle, focusedElement } = validation.data;
    const context = appDetector.getAppContext(appId, { windowTitle, focusedElement });
    const inlineCommands = appDetector.getInlineCommands(context.appCategory);

    res.json({
      success: true,
      context,
      inlineCommands,
    });
  } catch (error) {
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
    const validation = z.object({
      input: z.string().min(1),
      appId: z.string().min(1),
      selectedText: z.string().optional(),
    }).safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.error.errors });
    }

    const { input, appId, selectedText } = validation.data;
    const result = appDetector.processVoiceInput(input, appId, selectedText);
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
    console.error('[app-detection]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/app/inline-commands
 * Get all inline commands
 */
app.get('/api/app/inline-commands', (_req, res) => {
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
    const { commandId, text } = req.body;

    if (!commandId || !text) {
      return res.status(400).json({
        success: false,
        error: 'commandId and text required',
      });
    }

    const transformed = transformText(commandId, text);

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
app.get('/health', (_req, res) => {
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
app.get('/ready', (_req, res) => {
  res.json({
    ready: true,
    services: { appDetector: true },
    supportedApps: appDetector.getSupportedApps().length,
    timestamp: new Date().toISOString(),
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSuggestion(
  result: ReturnType<typeof appDetector.processVoiceInput>,
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

function transformText(commandId: string, text: string): string {
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
      return text.replace(/\bi\b/g, 'I').replace(/\bid\b/gi, "I'd");
    case 'emoji':
      return text + ' 😊';
    case 'summarize':
      return text.split('.').slice(0, 2).join('.') + '.';
    default:
      return text;
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4899;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              APP DETECTION SERVICE v1.0.0              ║
║  📱  App Context & Voice Commands                       ║
║  Port: ${PORT}                                                  ║
║  Supported Apps: ${appDetector.getSupportedApps().length}                                    ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

export default app;
