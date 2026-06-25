/**
 * WebSocket Streaming — Voice Gateway v1.1
 * ========================================
 * Real-time audio streaming with interim results.
 *
 * Protocol:
 *   Client → Server: { type: 'audio', data: base64 }  (chunks)
 *   Client → Server: { type: 'config', engine: 'whisper', language: 'en' }
 *   Client → Server: { type: 'end' }  (flush and finalize)
 *
 *   Server → Client: { type: 'interim', text: '...', language: 'en', confidence: 0.85 }
 *   Server → Client: { type: 'final', text: '...', language: 'en', confidence: 0.92, words: [...] }
 *   Server → Client: { type: 'error', message: '...' }
 *   Server → Client: { type: 'stats', samples: 123, hojaiReady: false }
 */

import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import express from 'express';
import { sttAdapters } from '../adapters/stt/index.js';
import { routeSTT } from '../services/routing.js';
import { detectLanguageFromAudio } from '../services/language-detector.js';
import { detectVoiceActivity } from '../services/audio-preprocessor.js';
import type { STTEngine } from '../types/index.js';

interface StreamSession {
  id: string;
  ws: WebSocket;
  engine: STTEngine;
  language?: string;
  domain?: string;
  userId?: string;
  sessionId?: string;
  audioBuffer: Buffer;
  config: {
    interimResults: boolean;
    vadEnabled: boolean;
    languageDetection: boolean;
    wordTimings: boolean;
  };
  createdAt: number;
  chunks: number;
}

const sessions = new Map<string, StreamSession>();
let sessionCounter = 0;

// ── Session management ───────────────────────────────────────────────────────────

function createSession(ws: WebSocket, params: URLSearchParams): StreamSession {
  const id = `stream-${++sessionCounter}-${Date.now().toString(36)}`;
  const engine = (params.get('engine') || 'auto') as STTEngine | 'auto';
  const session: StreamSession = {
    id,
    ws,
    engine: engine === 'auto' ? routeSTT({}).engine : engine as STTEngine,
    language: params.get('language') ?? undefined,
    domain: params.get('domain') ?? undefined,
    userId: params.get('userId') ?? undefined,
    sessionId: params.get('sessionId') ?? undefined,
    audioBuffer: Buffer.alloc(0),
    config: {
      interimResults: params.get('interim') !== 'false',
      vadEnabled: params.get('vad') !== 'false',
      languageDetection: params.get('langDetect') !== 'false',
      wordTimings: params.get('words') === 'true',
    },
    createdAt: Date.now(),
    chunks: 0,
  };
  sessions.set(id, session);
  console.log(`[stream] New session ${id}: engine=${session.engine}, lang=${session.language}`);
  return session;
}

function closeSession(id: string): void {
  sessions.delete(id);
}

// ── WebSocket message handler ─────────────────────────────────────────────────────

async function handleMessage(session: StreamSession, message: string): Promise<void> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(message);
  } catch {
    sendError(session, 'Invalid JSON message');
    return;
  }

  const { type } = data;

  switch (type) {
    case 'audio': {
      if (typeof data.data !== 'string') {
        sendError(session, 'audio data must be base64 string');
        return;
      }
      const chunk = Buffer.from(data.data, 'base64');
      session.audioBuffer = Buffer.concat([session.audioBuffer, chunk]);
      session.chunks++;

      // VAD check on first chunk
      if (session.chunks === 1 && session.config.vadEnabled) {
        const meta = detectVoiceActivity(chunk, 'webm');
        if (!meta.hasSpeech) {
          // Suppress — don't transcribe silence
          return;
        }
      }

      // Language auto-detection on first chunk
      if (session.config.languageDetection && !session.language && chunk.length > 5000) {
        const lang = detectLanguageFromAudio(chunk, 'webm');
        if (lang.confidence > 0.6) {
          session.language = lang.detected;
          sendInterim(session, `[lang:${lang.detected}]`);
        }
      }

      // Interim: route if we have enough audio (every 5 chunks or > 30s)
      if (session.config.interimResults && session.chunks % 5 === 0 && session.audioBuffer.length > 10000) {
        const interimText = await transcribeInterim(session);
        if (interimText) {
          sendInterim(session, interimText);
        }
      }
      break;
    }

    case 'config': {
      if (data.engine && typeof data.engine === 'string') {
        session.engine = data.engine as STTEngine;
      }
      if (data.language) session.language = data.language as string;
      if (data.domain) session.domain = data.domain as string;
      sendInterim(session, `[config updated: engine=${session.engine}, lang=${session.language}]`);
      break;
    }

    case 'end': {
      if (session.audioBuffer.length < 100) {
        sendFinal(session, '', session.language ?? 'en', 0);
        return;
      }
      try {
        const adapter = sttAdapters[session.engine];
        const result = await adapter.transcribe(session.audioBuffer, 'stream.webm', session.language);
        sendFinal(session, result.text, result.language ?? session.language ?? 'en',
          result.confidence ?? 0.85, result.words);
      } catch (err) {
        sendError(session, `Transcription failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      // Keep session for stats, cleanup after 5s
      setTimeout(() => closeSession(session.id), 5000);
      break;
    }

    default:
      sendError(session, `Unknown message type: ${type}`);
  }
}

async function transcribeInterim(session: StreamSession): Promise<string | null> {
  try {
    const adapter = sttAdapters[session.engine];
    // Use a shorter timeout for interim results
    const result = await adapter.transcribe(session.audioBuffer.slice(0, Math.min(session.audioBuffer.length, 64000)), 'interim.webm', session.language);
    return result.text;
  } catch {
    return null; // Don't fail interim on error
  }
}

// ── Send helpers ────────────────────────────────────────────────────────────────

function send(session: StreamSession, data: unknown): void {
  if (session.ws.readyState === 1) { // OPEN
    session.ws.send(JSON.stringify(data));
  }
}

function sendInterim(session: StreamSession, text: string): void {
  send(session, { type: 'interim', text, sessionId: session.id, timestamp: Date.now() });
}

function sendFinal(session: StreamSession, text: string, language: string, confidence: number, words?: Array<{ word: string; startTime: number; endTime: number }>): void {
  send(session, {
    type: 'final',
    text,
    language,
    confidence,
    words,
    sessionId: session.id,
    chunks: session.chunks,
    durationMs: Date.now() - session.createdAt,
    timestamp: Date.now(),
  });
}

function sendError(session: StreamSession, message: string): void {
  send(session, { type: 'error', message, sessionId: session.id, timestamp: Date.now() });
}

// ── WebSocket server ────────────────────────────────────────────────────────────

export function attachWebSocketServer(httpServer: import('http').Server<typeof import('http').IncomingMessage, typeof import('http').ServerResponse>): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/stt',
    maxPayload: 10 * 1024 * 1024, // 10MB max per message
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const session = createSession(ws, url.searchParams);

    ws.on('message', async (data) => {
      try {
        const msg = data.toString();
        await handleMessage(session, msg);
      } catch (err) {
        sendError(session, `Processing error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    ws.on('close', () => {
      closeSession(session.id);
    });

    ws.on('error', (err) => {
      console.error(`[stream] Session ${session.id} error:`, err.message);
      closeSession(session.id);
    });

    // Send welcome
    send(session, {
      type: 'connected',
      sessionId: session.id,
      engine: session.engine,
      language: session.language,
      config: session.config,
      timestamp: Date.now(),
    });
  });

  console.log('[stream] WebSocket server attached at /ws/stt');
  return wss;
}

// ── Stats endpoint ─────────────────────────────────────────────────────────────

export function getStreamStats() {
  return {
    activeSessions: sessions.size,
    sessions: Array.from(sessions.values()).map(s => ({
      id: s.id,
      engine: s.engine,
      language: s.language,
      chunks: s.chunks,
      audioSizeKb: Math.round(s.audioBuffer.length / 1024),
      ageSeconds: Math.round((Date.now() - s.createdAt) / 1000),
    })),
  };
}

export default { attachWebSocketServer, getStreamStats };
