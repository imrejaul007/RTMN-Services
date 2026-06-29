/**
 * Voice Hotkey Service — v1.0.0
 * ============================
 * Global hotkey listener and voice overlay control.
 *
 * Provides:
 * - Hotkey configuration for desktop/mobile
 * - Overlay state management
 * - Voice session tracking
 * - Quick commands
 *
 * Port: 4890
 */

import express from 'express';
import { z } from 'zod';
import { VoiceHotkeyManager } from './services/hotkeyManager.js';

const app = express();
app.use(express.json());

const hotkeyManager = new VoiceHotkeyManager();

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/overlay
 * Get current overlay state
 */
app.get('/api/overlay', (_req, res) => {
  const state = hotkeyManager.getOverlayState();
  res.json({
    success: true,
    ...state,
  });
});

/**
 * POST /api/overlay/toggle
 * Toggle voice overlay
 */
app.post('/api/overlay/toggle', (_req, res) => {
  const state = hotkeyManager.toggleOverlay();
  res.json({
    success: true,
    ...state,
  });
});

/**
 * POST /api/overlay/show
 * Show voice overlay
 */
app.post('/api/overlay/show', (_req, res) => {
  const state = hotkeyManager.showOverlay();
  res.json({
    success: true,
    ...state,
  });
});

/**
 * POST /api/overlay/hide
 * Hide voice overlay
 */
app.post('/api/overlay/hide', (_req, res) => {
  const state = hotkeyManager.hideOverlay();
  res.json({
    success: true,
    ...state,
  });
});

/**
 * POST /api/overlay/listening
 * Start listening mode
 */
app.post('/api/overlay/listening', (req, res) => {
  const { appId, appName, windowTitle } = req.body;
  const state = hotkeyManager.startListening(
    appId ? { appId, appName, windowTitle } : undefined
  );
  res.json({
    success: true,
    ...state,
  });
});

/**
 * POST /api/overlay/transcript
 * Update transcript
 */
app.post('/api/overlay/transcript', (req, res) => {
  const { text, isPartial } = req.body;
  const state = hotkeyManager.updateTranscript(text || '', isPartial);
  res.json({
    success: true,
    ...state,
  });
});

/**
 * POST /api/overlay/processing
 * Start processing mode
 */
app.post('/api/overlay/processing', (_req, res) => {
  const state = hotkeyManager.startProcessing();
  res.json({
    success: true,
    ...state,
  });
});

/**
 * POST /api/overlay/response
 * Show response
 */
app.post('/api/overlay/response', (req, res) => {
  const { response } = req.body;
  const state = hotkeyManager.showResponse(response || '');
  res.json({
    success: true,
    ...state,
  });
});

/**
 * POST /api/session/start
 * Start voice session
 */
app.post('/api/session/start', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }
  const session = hotkeyManager.createSession(userId);
  res.json({
    success: true,
    session,
  });
});

/**
 * POST /api/session/:sessionId/transcript
 * Add to transcript
 */
app.post('/api/session/:sessionId/transcript', (req, res) => {
  const { sessionId } = req.params;
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, error: 'text required' });
  }
  const session = hotkeyManager.addToSession(sessionId, text);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  res.json({
    success: true,
    session,
  });
});

/**
 * POST /api/session/:sessionId/response
 * Add response
 */
app.post('/api/session/:sessionId/response', (req, res) => {
  const { sessionId } = req.params;
  const { response } = req.body;
  if (!response) {
    return res.status(400).json({ success: false, error: 'response required' });
  }
  const session = hotkeyManager.addResponseToSession(sessionId, response);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  res.json({
    success: true,
    session,
  });
});

/**
 * POST /api/session/:sessionId/end
 * End voice session
 */
app.post('/api/session/:sessionId/end', (req, res) => {
  const { sessionId } = req.params;
  const session = hotkeyManager.endSession(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  res.json({
    success: true,
    session,
  });
});

/**
 * GET /api/session/:sessionId
 * Get session
 */
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = hotkeyManager.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  res.json({
    success: true,
    session,
  });
});

/**
 * GET /api/sessions/:userId
 * Get all sessions for user
 */
app.get('/api/sessions/:userId', (req, res) => {
  const { userId } = req.params;
  const sessions = hotkeyManager.getUserSessions(userId);
  res.json({
    success: true,
    sessions,
    count: sessions.length,
  });
});

/**
 * GET /api/quick-commands
 * Get quick commands
 */
app.get('/api/quick-commands', (_req, res) => {
  const commands = hotkeyManager.getQuickCommands();
  res.json({
    success: true,
    commands,
    count: commands.length,
  });
});

/**
 * POST /api/quick-commands
 * Add quick command
 */
app.post('/api/quick-commands', (req, res) => {
  const { name, phrase, action, icon } = req.body;
  if (!name || !phrase || !action) {
    return res.status(400).json({
      success: false,
      error: 'name, phrase, and action required',
    });
  }
  const cmd = hotkeyManager.addQuickCommand({ name, phrase, action, icon });
  res.json({
    success: true,
    command: cmd,
  });
});

/**
 * DELETE /api/quick-commands/:id
 * Remove quick command
 */
app.delete('/api/quick-commands/:id', (req, res) => {
  const { id } = req.params;
  const removed = hotkeyManager.removeQuickCommand(id);
  res.json({
    success: removed,
    message: removed ? 'Command removed' : 'Command not found',
  });
});

/**
 * POST /api/quick-commands/detect
 * Detect quick command from phrase
 */
app.post('/api/quick-commands/detect', (req, res) => {
  const { phrase } = req.body;
  if (!phrase) {
    return res.status(400).json({ success: false, error: 'phrase required' });
  }
  const cmd = hotkeyManager.detectQuickCommand(phrase);
  res.json({
    success: true,
    detected: !!cmd,
    command: cmd,
  });
});

/**
 * GET /api/hotkeys/:platform
 * Get hotkey configuration for platform
 */
app.get('/api/hotkeys/:platform', (req, res) => {
  const { platform } = req.params;
  if (!['mac', 'windows', 'linux'].includes(platform)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid platform. Use: mac, windows, or linux',
    });
  }
  const hotkeys = hotkeyManager.getHotkeyConfig(platform as 'mac' | 'windows' | 'linux');
  res.json({
    success: true,
    platform,
    hotkeys,
  });
});

/**
 * GET /health
 */
app.get('/health', (_req, res) => {
  const overlay = hotkeyManager.getOverlayState();
  res.json({
    status: 'healthy',
    service: 'voice-hotkey',
    port: process.env.PORT || 4890,
    version: '1.0.0',
    overlayVisible: overlay.visible,
    overlayMode: overlay.mode,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready
 */
app.get('/ready', (_req, res) => {
  res.json({
    ready: true,
    services: {
      hotkeyManager: true,
      overlayState: true,
      sessions: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4890;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              VOICE HOTKEY SERVICE v1.0.0             ║
║  🎹  Global Hotkey & Overlay Control             ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                       ║
║  Hotkeys: ⌥Space (toggle), ⌘⇧D (show)              ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

export default app;
