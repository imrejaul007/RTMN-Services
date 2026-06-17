import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import callsRouter from './routes/calls.js';
import sessionsRouter from './routes/sessions.js';

// Services
import { voiceSessionService } from './services/voiceSession.js';
import { voiceWebSocketHandler } from './ws/voiceHandler.js';
import { sttService } from './services/stt.js';
import { ttsService } from './services/tts.js';
import { llmService } from './services/llm.js';
import { transferService } from './services/transfer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Environment validation
const REQUIRED_ENV_VARS: string[] = [];
const OPTIONAL_ENV_VARS: string[] = [
  'PORT',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'OPENAI_API_KEY',
  'VOICE_MODEL',
  'TICKET_ENGINE_URL',
  'CUSTOMER_TWIN_URL',
  'AGENT_COPILOT_URL',
  'MEMORY_OS_URL',
];

function validateEnvironment(): void {
  logger.info('Validating environment variables...');

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      logger.error(`Required environment variable ${envVar} is not set`);
      process.exit(1);
    }
  }

  for (const envVar of OPTIONAL_ENV_VARS) {
    if (process.env[envVar]) {
      logger.debug(`Environment variable ${envVar} is set`);
    } else {
      logger.debug(`Environment variable ${envVar} is not set (optional)`);
    }
  }

  // Log service availability
  logger.info('Service availability:', {
    stt: sttService.isAvailable() ? 'available' : 'unavailable',
    tts: ttsService.isAvailable() ? 'available' : 'unavailable',
    llm: llmService.isAvailable() ? 'available' : 'unavailable',
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
      ? 'available'
      : 'unavailable',
  });
}

// Express app setup
const app: Express = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const stats = voiceSessionService.getSessionStats();
  const wsClients = voiceWebSocketHandler.getConnectedClients();

  const health = {
    status: 'healthy',
    service: 'voice-ai-runtime',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      stt: sttService.isAvailable(),
      tts: ttsService.isAvailable(),
      llm: llmService.isAvailable(),
      twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    },
    stats: {
      ...stats,
      wsClients,
    },
  };

  const isHealthy = health.services.stt || health.services.tts || health.services.llm;

  res.status(isHealthy ? 200 : 503).json(health);
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'Voice AI Runtime',
    version: '1.0.0',
    description: 'Voice AI Runtime - Handles voice calls, IVR, speech recognition, and responses',
    endpoints: {
      health: 'GET /health',
      calls: {
        initiate: 'POST /api/calls',
        get: 'GET /api/calls/:sessionId',
        transfer: 'POST /api/calls/:sessionId/transfer',
        stats: 'GET /api/calls/stats',
        twiml: 'POST /api/calls/twiml/:sessionId',
      },
      sessions: {
        list: 'GET /api/sessions',
        get: 'GET /api/sessions/:sessionId',
        transcript: 'GET /api/sessions/:sessionId/transcript',
        end: 'POST /api/sessions/:sessionId/end',
        active: 'GET /api/sessions/active',
      },
      websocket: {
        voice: 'WS /ws/voice?sessionId=<sessionId>',
      },
    },
    documentation: '/docs',
  });
});

// API routes
app.use('/api/calls', callsRouter);
app.use('/api/sessions', sessionsRouter);

// Documentation endpoint
app.get('/docs', (req: Request, res: Response) => {
  res.json({
    title: 'Voice AI Runtime API Documentation',
    version: '1.0.0',
    description: `
Voice AI Runtime handles all voice interactions in the RTMN ecosystem.

## Features
- Real-time voice conversations via WebSocket
- IVR (Interactive Voice Response) flows
- Speech-to-text (STT) using OpenAI Whisper
- Text-to-speech (TTS) using OpenAI
- Voice LLM responses
- Transfer to human agents
- Integration with ticket-engine, customer-twin, agent-copilot

## Quick Start

1. Connect to WebSocket: ws://localhost:4876/ws/voice?sessionId=<sessionId>
2. Send audio data or text messages
3. Receive AI responses as audio or text

## Example WebSocket Messages

### Send audio:
{
  "type": "audio",
  "sessionId": "...",
  "data": { "audio": "<base64>" }
}

### Send text:
{
  "type": "text",
  "sessionId": "...",
  "data": { "text": "Hello" }
}

### Transfer to agent:
{
  "type": "action",
  "sessionId": "...",
  "data": { "action": "transfer", "params": { "queue": "support" } }
}
    `,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '4876');

async function startServer(): Promise<void> {
  try {
    // Validate environment
    validateEnvironment();

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket handler
    voiceWebSocketHandler.initialize(server);

    // Start listening
    server.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║                    VOICE AI RUNTIME                            ║
║                    Version 1.0.0                               ║
╠══════════════════════════════════════════════════════════════╣
║  HTTP Server:  http://localhost:${PORT}                         ║
║  WebSocket:    ws://localhost:${PORT}/ws/voice                   ║
║  Health:       http://localhost:${PORT}/health                   ║
║  API Docs:     http://localhost:${PORT}/docs                     ║
╠══════════════════════════════════════════════════════════════╣
║  STT Service:  ${sttService.isAvailable() ? '✓ Available (OpenAI Whisper)' : '✗ Not configured'}   ║
║  TTS Service:  ${ttsService.isAvailable() ? '✓ Available (OpenAI TTS)' : '✗ Not configured'}     ║
║  LLM Service:  ${llmService.isAvailable() ? '✓ Available (OpenAI GPT)' : '✗ Not configured'}      ║
║  Twilio:       ${!!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? '✓ Configured' : '✗ Not configured'}                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);

      // Cleanup old sessions periodically (every 30 minutes)
      setInterval(() => {
        voiceSessionService.cleanupOldSessions(3600000); // 1 hour
      }, 1800000);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      voiceWebSocketHandler.close();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      voiceWebSocketHandler.close();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
