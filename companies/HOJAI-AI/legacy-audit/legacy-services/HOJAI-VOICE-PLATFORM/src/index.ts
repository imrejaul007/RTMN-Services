// ============================================================================
// HOJAI VOICE PLATFORM - Main Entry Point
// ============================================================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';

// Configuration
import { serverConfig } from './config';

// Database
import { connectDatabase, initializeIndexes, disconnectDatabase } from './models';

// Routes
import routes from './routes';

// Middleware
import { authMiddleware, optionalAuthMiddleware } from './middleware';
import {
  rateLimitMiddleware,
  callsRateLimitMiddleware,
  sessionsRateLimitMiddleware,
  analyticsRateLimitMiddleware,
} from './middleware';

// Logger
import { createLogger, format, transports } from 'winston';

// ============================================================================
// Application Setup
// ============================================================================

const app: Express = express();

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/ws',
});

// ============================================================================
// Logger Configuration
// ============================================================================

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    serverConfig.nodeEnv === 'production'
      ? format.json()
      : format.combine(format.colorize(), format.simple())
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

// ============================================================================
// Middleware Stack
// ============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

// CORS
app.use(cors({
  origin: serverConfig.cors.origin,
  credentials: serverConfig.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ type: 'audio/*', limit: '10mb' }));

// Rate limiting (general)
app.use(rateLimitMiddleware);

// ============================================================================
// WebSocket Handling
// ============================================================================

interface WSClient {
  ws: WebSocket;
  sessionId?: string;
  userId?: string;
  organizationId?: string;
  lastHeartbeat: number;
}

const wsClients = new Map<WebSocket, WSClient>();

wss.on('connection', (ws: WebSocket, req: Request) => {
  const clientId = Math.random().toString(36).substring(7);
  const client: WSClient = {
    ws,
    lastHeartbeat: Date.now(),
  };

  wsClients.set(ws, client);

  logger.info(`WebSocket client connected: ${clientId}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString(),
  }));

  // Handle messages
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      await handleWSMessage(ws, message);
    } catch (error) {
      logger.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    const client = wsClients.get(ws);
    if (client?.sessionId) {
      logger.info(`WebSocket client disconnected: ${clientId}, session: ${client.sessionId}`);
    }
    wsClients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    logger.error(`WebSocket error for client ${clientId}:`, error);
    wsClients.delete(ws);
  });

  // Heartbeat
  ws.on('pong', () => {
    const client = wsClients.get(ws);
    if (client) {
      client.lastHeartbeat = Date.now();
    }
  });
});

/**
 * Handle incoming WebSocket messages
 */
async function handleWSMessage(ws: WebSocket, message: any): Promise<void> {
  const client = wsClients.get(ws);
  if (!client) return;

  switch (message.type) {
    case 'auth':
      // Authenticate WebSocket connection
      client.userId = message.userId;
      client.organizationId = message.organizationId;
      ws.send(JSON.stringify({
        type: 'authenticated',
        userId: client.userId,
      }));
      break;

    case 'session:start':
      // Start a new voice session
      try {
        const sessionService = (await import('./services/session.service')).getSessionService();
        const { session, agent } = await sessionService.start({
          agentId: message.agentId,
          callId: message.callId,
          customerId: message.customerId,
          language: message.language,
        }, client.organizationId || '');

        client.sessionId = session.id;

        ws.send(JSON.stringify({
          type: 'session:started',
          sessionId: session.id,
          greeting: agent['agent']?.greeting || 'Hello!',
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Failed to start session: ${(error as Error).message}`,
        }));
      }
      break;

    case 'audio':
      // Process audio
      if (client.sessionId) {
        try {
          const sessionService = (await import('./services/session.service')).getSessionService();
          const result = await sessionService.processAudio(
            client.sessionId,
            client.organizationId || '',
            message.audio,
            message.mimeType || 'audio/webm'
          );

          ws.send(JSON.stringify({
            type: 'transcript',
            text: result.text,
            intent: result.intent,
            confidence: result.confidence,
          }));

          ws.send(JSON.stringify({
            type: 'synthesis',
            text: result.response,
            audio: result.responseAudio,
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Audio processing failed: ${(error as Error).message}`,
          }));
        }
      }
      break;

    case 'text':
      // Process text message
      if (client.sessionId) {
        try {
          const sessionService = (await import('./services/session.service')).getSessionService();
          const result = await sessionService.sendMessage(
            client.sessionId,
            client.organizationId || '',
            message.content
          );

          ws.send(JSON.stringify({
            type: 'response',
            text: result.response,
            intent: result.intent,
            sentiment: result.sentiment,
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Message processing failed: ${(error as Error).message}`,
          }));
        }
      }
      break;

    case 'session:end':
      // End session
      if (client.sessionId) {
        const sessionService = (await import('./services/session.service')).getSessionService();
        await sessionService.end(client.sessionId, client.organizationId || '');
        client.sessionId = undefined;
        ws.send(JSON.stringify({ type: 'session:ended' }));
      }
      break;

    case 'heartbeat':
      client.lastHeartbeat = Date.now();
      ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`,
      }));
  }
}

/**
 * Heartbeat interval to detect stale connections
 */
const heartbeatInterval = setInterval(() => {
  const now = Date.now();
  const timeout = serverConfig.ws.heartbeatInterval * 2;

  wsClients.forEach((client, ws) => {
    if (now - client.lastHeartbeat > timeout) {
      ws.terminate();
      wsClients.delete(ws);
    } else {
      ws.ping();
    }
  });
}, serverConfig.ws.heartbeatInterval);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// ============================================================================
// API Routes
// ============================================================================

// Health check (public)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'HOJAI Voice Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes (public info endpoints)
app.use('/api', routes);

// API routes with authentication (protected)
app.use('/api/agents', authMiddleware, rateLimitMiddleware, routes);
app.use('/api/calls', authMiddleware, callsRateLimitMiddleware, routes);
app.use('/api/sessions', authMiddleware, sessionsRateLimitMiddleware, routes);
app.use('/api/analytics', authMiddleware, analyticsRateLimitMiddleware, routes);

// Webhook routes (typically don't need auth, but can add signature verification)
app.use('/api/webhooks', routes);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);

  // Don't leak error details in production
  const message = serverConfig.nodeEnv === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(serverConfig.nodeEnv !== 'production' && { stack: err.stack }),
    },
  });
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  // Close WebSocket connections
  wsClients.forEach((client) => {
    client.ws.close(1001, 'Server shutting down');
  });

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Disconnect from database
  await disconnectDatabase();

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ============================================================================
// Start Server
// ============================================================================

async function start(): Promise<void> {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await connectDatabase();
    await initializeIndexes();
    logger.info('Database connected');

    // Start HTTP server
    server.listen(serverConfig.port, serverConfig.host, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║           HOJAI VOICE PLATFORM - STARTED                  ║
╠════════════════════════════════════════════════════════════╣
║  Server:     http://${serverConfig.host}:${serverConfig.port}                    ║
║  WebSocket:   ws://${serverConfig.host}:${serverConfig.port}/ws                 ║
║  Environment: ${serverConfig.nodeEnv.padEnd(40)}║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, server, wss };
