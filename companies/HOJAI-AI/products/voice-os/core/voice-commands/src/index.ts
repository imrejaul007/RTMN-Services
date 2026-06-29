/**
 * Voice Commands Service — v1.0.0
 * =================================
 * Parses voice commands like Wispr Flow.
 *
 * Port: 4885
 */

import express from 'express';
import { z } from 'zod';
import { VoiceCommandParser } from './services/commandParser.js';

const app = express();
app.use(express.json());

const parser = new VoiceCommandParser();

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /parse
 * Parse transcript and extract commands
 */
app.post('/parse', (req, res) => {
  const { transcript, cursorPosition } = req.body;

  if (!transcript) {
    return res.status(400).json({
      success: false,
      error: 'transcript required',
    });
  }

  const result = parser.parse(transcript);

  res.json({
    success: true,
    ...result,
    cursorPosition: cursorPosition || 0,
  });
});

/**
 * POST /execute
 * Execute a parsed command
 */
app.post('/execute', (req, res) => {
  const { command, currentText, cursorPosition } = req.body;

  if (!command) {
    return res.status(400).json({
      success: false,
      error: 'command required',
    });
  }

  const result = parser.executeCommand(
    command,
    currentText || '',
    cursorPosition || 0
  );

  res.json({
    success: true,
    ...result,
  });
});

/**
 * POST /detect-ai
 * Detect AI command in text
 */
app.post('/detect-ai', (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'text required',
    });
  }

  const command = parser.detectAICommand(text);

  res.json({
    success: true,
    detected: !!command,
    command,
  });
});

/**
 * GET /commands
 * Get all supported commands
 */
app.get('/commands', (_req, res) => {
  const commands = parser.getSupportedCommands();
  const aiCommands = parser.getAICCommands();

  res.json({
    success: true,
    commands,
    aiCommands,
    totalCommands: commands.reduce((sum, c) => sum + c.commands.length, 0) + aiCommands.length,
  });
});

/**
 * GET /health
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'voice-commands',
    port: process.env.PORT || 4885,
    version: '1.0.0',
    commands: parser.getSupportedCommands().reduce((sum, c) => sum + c.commands.length, 0),
    timestamp: new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4885;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              VOICE COMMANDS SERVICE v1.0.0             ║
║  🎤 Wispr Flow-style voice commands                  ║
║  Port: ${PORT}                                                  ║
║  Commands: new line, period, delete that, etc.      ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
