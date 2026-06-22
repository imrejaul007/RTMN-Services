/**
 * Fitness AI Service
 *
 * Industry AI Vertical - Fitness & Gym Management
 *
 * Features:
 * - Member Management
 * - Class Scheduling
 * - Workout Plans
 * - Progress Tracking
 * - Attendance Tracking
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import mongoose from 'mongoose';

// Import routes
import membersRoutes from './routes/members';
import classesRoutes from './routes/classes';
import workoutsRoutes from './routes/workouts';
import progressRoutes from './routes/progress';
import attendanceRoutes from './routes/attendance';

// Import services for direct access
import { memberService } from './services/member.service';
import { classService } from './services/class.service';
import { workoutService } from './services/workout.service';
import { progressService } from './services/progress.service';
import { attendanceService } from './services/attendance.service';
import {
  MEMBERSHIP_PRICING,
  MembershipTier,
  MemberStatus,
  ClassType,
  ClassStatus,
  WorkoutDifficulty,
} from './models';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-ai';

// ============================================
// MIDDLEWARE
// ============================================

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-User-Id'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Request ID
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  res.setHeader('X-Request-Id', (req as any).requestId);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      requestId: (req as any).requestId,
    });
  });
  next();
});

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', async (req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: mongoState === 'connected' ? 'healthy' : 'degraded',
    service: 'fitness-ai',
    version: '1.0.0',
    mongodb: mongoState,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  if (mongoState !== 'connected') {
    res.status(503).json({
      status: 'not_ready',
      mongodb: mongoState,
    });
    return;
  }

  res.json({
    status: 'ready',
    mongodb: mongoState,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API INFO
// ============================================

app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'fitness-ai',
    category: 'fitness',
    status: 'production',
    version: '1.0.0',
    description: 'Fitness & Gym Management System',
    features: [
      'Member Management',
      'Class Scheduling',
      'Workout Plans',
      'Progress Tracking',
      'Attendance System',
      'Membership Tiers',
    ],
    membershipTiers: Object.keys(MEMBERSHIP_PRICING).map(tier => ({
      tier,
      monthly: MEMBERSHIP_PRICING[tier as keyof typeof MEMBERSHIP_PRICING].monthly,
      features: MEMBERSHIP_PRICING[tier as keyof typeof MEMBERSHIP_PRICING].features,
    })),
    endpoints: {
      members: '/api/members',
      classes: '/api/classes',
      stats: '/api/stats',
    },
  });
});

// ============================================
// ROUTES
// ============================================

app.use('/api/members', membersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/attendance', attendanceRoutes);

// ============================================
// ANALYTICS & STATS
// ============================================

app.get('/api/stats/overview', async (req: Request, res: Response) => {
  try {
    const [memberStats, classStats] = await Promise.all([
      memberService.getStatistics(),
      classService.getStatistics({}),
    ]);

    res.json({
      members: memberStats,
      classes: classStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get overview stats');
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

app.get('/api/stats/dashboard', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      memberStats,
      todayClasses,
      activeMembers,
      expiredMembers,
    ] = await Promise.all([
      memberService.getStatistics(),
      classService.getClassesByDate(now),
      memberService.getMembers({ status: MemberStatus.ACTIVE, limit: 5 }),
      memberService.getMembers({ status: MemberStatus.EXPIRED, limit: 5 }),
    ]);

    res.json({
      overview: {
        totalMembers: memberStats.totalMembers,
        activeMembers: memberStats.activeMembers,
        todayClasses: todayClasses.length,
        avgOccupancy: todayClasses.length > 0
          ? todayClasses.reduce((sum, c) => sum + (c.enrolled / c.capacity * 100), 0) / todayClasses.length
          : 0,
      },
      todayClasses: todayClasses.slice(0, 5),
      recentMembers: activeMembers.members.slice(0, 5),
      expiringSoon: expiredMembers.members.slice(0, 5),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get dashboard');
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ============================================
// ENUMS REFERENCE
// ============================================

app.get('/api/enums', (req: Request, res: Response) => {
  res.json({
    membershipTiers: Object.values(MembershipTier),
    memberStatuses: Object.values(MemberStatus),
    classTypes: Object.values(ClassType),
    classStatuses: Object.values(ClassStatus),
    workoutDifficulties: Object.values(WorkoutDifficulty),
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    requestId: (req as any).requestId,
  }, 'Unhandled error');

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info({ uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') }, 'Connected to MongoDB');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    // Continue without database for health check purposes
  }
}

// ============================================
// SERVER STARTUP
// ============================================

async function start() {
  // Connect to database
  await connectDatabase();

  // Check for expired memberships daily
  setInterval(async () => {
    try {
      const count = await memberService.checkAndUpdateExpiredMemberships();
      if (count > 0) {
        logger.info({ count }, 'Updated expired memberships');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to check expired memberships');
    }
  }, 24 * 60 * 60 * 1000); // Daily

  // Start server
  app.listen(PORT, () => {
    logger.info({
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    }, `Fitness AI service started on port ${PORT}`);

    logger.info({
      endpoints: [
        'GET  /health',
        'GET  /health/live',
        'GET  /health/ready',
        'GET  /api/info',
        'GET  /api/members',
        'POST /api/members',
        'GET  /api/classes',
        'POST /api/classes',
        'GET  /api/stats/overview',
        'GET  /api/stats/dashboard',
      ],
    }, 'Available endpoints');
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
start();

export default app;