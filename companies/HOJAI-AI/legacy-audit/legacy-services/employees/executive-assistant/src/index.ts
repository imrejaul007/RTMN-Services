/**
 * Executive Assistant Service
 *
 * Personal assistant that helps with:
 * - Calendar management (schedule, reschedule, cancel)
 * - Email drafting and management
 * - Note taking and organization
 * - Reminder setting and tracking
 * - Task management
 *
 * Port: 4755
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuid } from 'uuid';

// Modules
import calendarRoutes from './modules/calendar.js';
import emailRoutes from './modules/email.js';
import notesRoutes from './modules/notes.js';
import remindersRoutes from './modules/reminders.js';
import tasksRoutes from './modules/tasks.js';
import aiAssistantRoutes from './ai-assistant.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4755', 10);

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-User-ID',
    'X-Tenant-ID',
    'X-User-Email',
    'X-User-Name',
    'X-Request-ID'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

// ============================================================================
// HEALTH & INFO ENDPOINTS
// ============================================================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (_: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'executive-assistant',
    version: '1.0.0',
    port: PORT,
    capabilities: [
      'calendar',
      'email',
      'notes',
      'reminders',
      'tasks',
      'ai-assistant'
    ],
    modules: {
      calendar: {
        features: ['schedule', 'reschedule', 'cancel', 'availability', 'freebusy']
      },
      email: {
        features: ['draft', 'send', 'reply', 'forward', 'templates']
      },
      notes: {
        features: ['create', 'organize', 'search', 'collaborate']
      },
      reminders: {
        features: ['set', 'track', 'snooze', 'recurring']
      },
      tasks: {
        features: ['create', 'subtasks', 'checklist', 'assign', 'priority']
      },
      aiAssistant: {
        features: ['conversational', 'real-llm', 'tool-use', 'memory'],
        endpoints: [
          'POST /api/ai/chat',
          'POST /api/ai/clear',
          'POST /api/ai/remember',
          'GET /api/ai/recall',
          'GET /api/ai/tools',
          'GET /api/ai/memory-context'
        ]
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /ready
 * Readiness check
 */
app.get('/ready', (_: Request, res: Response) => {
  // In production, check database connections
  res.json({
    status: 'ready',
    service: 'executive-assistant',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /
 * Service info
 */
app.get('/', (_: Request, res: Response) => {
  res.json({
    service: 'Executive Assistant',
    tagline: 'Your personal AI-powered executive assistant',
    description: 'Helps with calendar, email, notes, reminders, and tasks',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      health: '/health',
      calendar: '/api/calendar',
      email: '/api/emails',
      notes: '/api/notes',
      reminders: '/api/reminders',
      tasks: '/api/tasks'
    },
    documentation: {
      calendar: [
        'POST /api/calendar/events - Create event',
        'GET /api/calendar/events - List events',
        'GET /api/calendar/events/:id - Get event',
        'PATCH /api/calendar/events/:id - Update event',
        'DELETE /api/calendar/events/:id - Cancel event',
        'GET /api/calendar/availability - Check availability',
        'GET /api/calendar/freebusy - Get free/busy'
      ],
      email: [
        'POST /api/emails/draft - Create draft',
        'POST /api/emails/send - Send email',
        'GET /api/emails - List emails',
        'GET /api/emails/:id - Get email',
        'POST /api/emails/:id/reply - Reply',
        'POST /api/emails/:id/forward - Forward'
      ],
      notes: [
        'POST /api/notes - Create note',
        'GET /api/notes - List notes',
        'GET /api/notes/:id - Get note',
        'PATCH /api/notes/:id - Update note',
        'DELETE /api/notes/:id - Delete note',
        'POST /api/notes/:id/pin - Pin note'
      ],
      reminders: [
        'POST /api/reminders - Create reminder',
        'GET /api/reminders - List reminders',
        'GET /api/reminders/:id - Get reminder',
        'POST /api/reminders/:id/complete - Complete',
        'POST /api/reminders/:id/snooze - Snooze'
      ],
      tasks: [
        'POST /api/tasks - Create task',
        'GET /api/tasks - List tasks',
        'GET /api/tasks/:id - Get task',
        'PATCH /api/tasks/:id - Update task',
        'DELETE /api/tasks/:id - Delete task',
        'POST /api/tasks/:id/complete - Complete',
        'POST /api/tasks/:id/subtasks - Add subtask'
      ]
    }
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Calendar routes
app.use('/api/calendar', calendarRoutes);

// Email routes
app.use('/api/emails', emailRoutes);

// Notes routes
app.use('/api/notes', notesRoutes);

// Reminders routes
app.use('/api/reminders', remindersRoutes);

// Tasks routes
app.use('/api/tasks', tasksRoutes);

// AI Assistant routes (Real LLM-powered conversational assistant)
app.use('/api/ai', aiAssistantRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] ${req.path}:`, err);

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
    requestId: (req as any).requestId
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer(): Promise<void> {
  console.log('='.repeat(60));
  console.log('EXECUTIVE ASSISTANT SERVICE');
  console.log('='.repeat(60));
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Request ID Header: X-Request-ID`);
  console.log('');
  console.log('Capabilities:');
  console.log('  - Calendar Management');
  console.log('  - Email Drafting & Management');
  console.log('  - Note Taking & Organization');
  console.log('  - Reminder Setting & Tracking');
  console.log('  - Task Management');
  console.log('');
  console.log('Endpoints:');
  console.log(`  Health:  GET  http://localhost:${PORT}/health`);
  console.log(`  Info:    GET  http://localhost:${PORT}/`);
  console.log(`  Calendar:     /api/calendar/*`);
  console.log(`  Email:        /api/emails/*`);
  console.log(`  Notes:        /api/notes/*`);
  console.log(`  Reminders:    /api/reminders/*`);
  console.log(`  Tasks:        /api/tasks/*`);
  console.log('='.repeat(60));

  app.listen(PORT, () => {
    console.log(`[Ready] Executive Assistant running on port ${PORT}`);
    console.log(`[Ready] Health check: http://localhost:${PORT}/health`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Shutdown] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Shutdown] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('[Fatal] Failed to start server:', error);
  process.exit(1);
});

export default app;
