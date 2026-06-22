/**
 * HR Recruiter Agent - Main Application Entry Point
 * AI-powered candidate screening, interview scheduling, and onboarding
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

// Routes
import resumeRoutes from './routes/resumeRoutes';
import candidateRoutes from './routes/candidateRoutes';
import interviewRoutes from './routes/interviewRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import jobRoutes from './routes/jobRoutes';
import skillsRoutes from './routes/skillsRoutes';

// Types
import type { ApiResponse } from './types';

// ============================================
// APP CONFIGURATION
// ============================================

const app = express();
const PORT = process.env.PORT || 4762;

// ============================================
// MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Tenant-ID', 'X-Internal-Token'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Request logging
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

// Rate limiting (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '100');
const RATE_WINDOW = 60 * 1000; // 1 minute

app.use((req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip || 'unknown';
  const now = Date.now();

  let clientData = requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    clientData = { count: 0, resetTime: now + RATE_WINDOW };
    requestCounts.set(clientId, clientData);
  }

  clientData.count++;

  if (clientData.count > RATE_LIMIT) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${Math.ceil((clientData.resetTime - now) / 1000)} seconds.`,
      },
    };
    return res.status(429).json(response);
  }

  next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse<{
    status: string;
    version: string;
    uptime: number;
    timestamp: string;
    services: {
      resumeScreener: boolean;
      candidateQualifier: boolean;
      interviewScheduler: boolean;
      onboardingManager: boolean;
      skillsMatcher: boolean;
    };
  }> = {
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        resumeScreener: true,
        candidateQualifier: true,
        interviewScheduler: true,
        onboardingManager: true,
        skillsMatcher: true,
      },
    },
  };

  res.status(200).json(response);
});

app.get('/ready', (_req: Request, res: Response) => {
  res.status(200).json({ ready: true });
});

// ============================================
// API ROUTES
// ============================================

// Resume routes
app.use('/api/resumes', resumeRoutes);

// Candidate routes
app.use('/api/candidates', candidateRoutes);

// Interview routes
app.use('/api/interviews', interviewRoutes);

// Onboarding routes
app.use('/api/onboarding', onboardingRoutes);

// Job routes
app.use('/api/jobs', jobRoutes);

// Skills routes
app.use('/api/skills', skillsRoutes);

// ============================================
// METRICS ENDPOINT
// ============================================

app.get('/metrics', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  const response: ApiResponse<{
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
    requests: {
      total: number;
      active: number;
    };
  }> = {
    success: true,
    data: {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      requests: {
        total: Array.from(requestCounts.values()).reduce((sum, c) => sum + c.count, 0),
        active: Array.from(requestCounts.values()).filter(c => Date.now() < c.resetTime).length,
      },
    },
  };

  res.status(200).json(response);
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  };
  res.status(404).json(response);
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : err.message,
    },
  };

  res.status(500).json(response);
});

// ============================================
// SERVER START
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   HR RECRUITER AGENT                                          ║
║   AI-Powered Candidate Screening & Onboarding                 ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   Port:        ${PORT}                                          ║
║   Status:      RUNNING                                        ║
║   Version:     1.0.0                                         ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   Endpoints:                                                  ║
║   - POST   /api/resumes/screen     Screen resumes            ║
║   - POST   /api/candidates/qualify Qualify candidates        ║
║   - POST   /api/interviews/schedule Schedule interviews       ║
║   - POST   /api/onboarding/start    Start onboarding          ║
║   - GET    /api/candidates         List candidates            ║
║   - POST   /api/jobs/match         Match candidates to jobs   ║
║                                                               ║
║   Health:   GET /health                                     ║
║   Metrics:  GET /metrics                                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

export default app;
