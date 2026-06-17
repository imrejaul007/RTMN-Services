/**
 * Live Chat Server - Main Entry Point
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes and handlers
import restRoutes from './routes/rest';
import { chatHandler } from './ws/chatHandler';

const PORT = parseInt(process.env.PORT || '4892', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Create Express app
const app: Application = express();

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/ws',
  clientTracking: true,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, WebSocket)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.some(allowed => {
      if (allowed === '*') return true;
      // Handle wildcard subdomains
      if (allowed.includes('*')) {
        const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return origin === allowed;
    })) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();

    // Skip logging for health checks
    if (req.path === '/health') return;

    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Initialize WebSocket handler
chatHandler.initialize(wss);

// REST API routes
app.use('/api', restRoutes);

// Root health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'live-chat-server',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: chatHandler.getClientCount(),
  });
});

// WebSocket info endpoint
app.get('/ws-info', (req: Request, res: Response) => {
  res.json({
    success: true,
    websocket: {
      path: '/ws',
      protocol: 'ws',
      secured: false,
    },
    connectedClients: chatHandler.getClientCount(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    LIVE CHAT SERVER                          ║
╠══════════════════════════════════════════════════════════════╣
║  REST API:    http://localhost:${PORT}                            ║
║  WebSocket:   ws://localhost:${PORT}/ws                          ║
║  Health:      http://localhost:${PORT}/health                      ║
║                                                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                                ║
║  Port:        ${PORT}                                           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');

  chatHandler.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  chatHandler.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export { app, server, wss };
