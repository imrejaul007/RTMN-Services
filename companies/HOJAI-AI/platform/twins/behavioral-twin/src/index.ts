import { requireAuth } from '@rtmn/shared/auth';
/**
 * Behavioral Twin Service
 * Port: 4746
 *
 * Captures and learns behavioral patterns:
 * - Work style
 * - Productivity metrics
 * - Energy patterns
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4746', 10);
const VERSION = '1.0.0';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// Types
interface WorkStyle {
  employeeId: string;
  workPattern: {
    type: 'morning' | 'evening' | 'flexible';
    preferredStartTime: string;
    preferredEndTime: string;
  };
  communicationPreference: 'async' | 'sync' | 'mixed';
  collaborationPreference: 'solo' | 'team' | 'hybrid';
  decisionSpeed: 'fast' | 'deliberate' | 'data-driven';
  riskTolerance: number;
  autonomyPreference: number;
  feedbackPreference: 'frequent' | 'periodic' | 'minimal';
  focusDuration: number;
  meetingPreference: 'back-to-back' | 'spaced' | 'minimal';
  confidence: number;
  lastUpdated: string;
}

interface EnergyMap {
  employeeId: string;
  weeklyPattern: Record<string, { highEnergy: string[]; lowEnergy: string[]; tasks: string[] }>;
  taskEnergyMapping: Record<string, { required: number; generated: number }>;
  optimalTimes: string[];
  burnoutRisk: number;
  lastUpdated: string;
}

interface ProductivityMetric {
  employeeId: string;
  date: string;
  tasksCompleted: number;
  tasksInProgress: number;
  meetingsHours: number;
  deepWorkHours: number;
  focusScore: number;
  score: number;
}

interface BehaviorPattern {
  id: string;
  employeeId: string;
  name: string;
  category: string;
  frequency: number;
  consistency: number;
  confidence: number;
}

// Storage
const workStyles = new Map<string, WorkStyle>();
const energyMaps = new Map<string, EnergyMap>();
const productivity = new Map<string, ProductivityMetric[]>();
const patterns = new Map<string, BehaviorPattern[]>();

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'behavioral-twin', version: VERSION, timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'behavioral-twin', timestamp: new Date().toISOString() });
});

/**
 * Get work style
 */
app.get('/api/twin/:employeeId/behavior/work-style', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const style = workStyles.get(employeeId);

  if (!style) {
    return res.json({
      success: true,
      data: {
        employeeId,
        exists: false,
        message: 'No work style profile yet. Set preferences to create one.'
      }
    });
  }

  res.json({ success: true, data: style });
});

/**
 * Set work style preferences
 */
app.post('/api/twin/:employeeId/behavior/work-style',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;

    let style = workStyles.get(employeeId);
    if (!style) {
      style = {
        employeeId,
        workPattern: { type: 'flexible', preferredStartTime: '09:00', preferredEndTime: '18:00' },
        communicationPreference: 'mixed',
        collaborationPreference: 'hybrid',
        decisionSpeed: 'data-driven',
        riskTolerance: 50,
        autonomyPreference: 70,
        feedbackPreference: 'periodic',
        focusDuration: 90,
        meetingPreference: 'spaced',
        confidence: 50,
        lastUpdated: new Date().toISOString()
      };
    }

    Object.assign(style, updates, { lastUpdated: new Date().toISOString() });
    workStyles.set(employeeId, style);

    res.json({ success: true, data: style });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'STYLE_ERROR', message: error.message } });
  }
});

/**
 * Get energy map
 */
app.get('/api/twin/:employeeId/behavior/energy-map', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const energy = energyMaps.get(employeeId);

  res.json({
    success: true,
    data: energy || {
      employeeId,
      weeklyPattern: {},
      taskEnergyMapping: {},
      optimalTimes: ['09:00-11:00', '14:00-16:00'],
      burnoutRisk: 0,
      message: 'Log energy levels to build your energy map'
    }
  });
});

/**
 * Log energy level
 */
app.post('/api/twin/:employeeId/behavior/energy-log',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { day, timeSlot, level, tasks } = req.body;

    let energy = energyMaps.get(employeeId);
    if (!energy) {
      energy = {
        employeeId,
        weeklyPattern: {},
        taskEnergyMapping: {},
        optimalTimes: [],
        burnoutRisk: 0,
        lastUpdated: new Date().toISOString()
      };
      energyMaps.set(employeeId, energy);
    }

    if (day && timeSlot) {
      if (!energy.weeklyPattern[day]) {
        energy.weeklyPattern[day] = { highEnergy: [], lowEnergy: [], tasks: [] };
      }
      if (level === 'high') {
        energy.weeklyPattern[day].highEnergy.push(timeSlot);
      } else if (level === 'low') {
        energy.weeklyPattern[day].lowEnergy.push(timeSlot);
      }
      if (tasks) {
        energy.weeklyPattern[day].tasks.push(...tasks);
      }
    }

    energy.lastUpdated = new Date().toISOString();
    res.json({ success: true, data: energy });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'ENERGY_ERROR', message: error.message } });
  }
});

/**
 * Get optimal work times
 */
app.get('/api/twin/:employeeId/behavior/optimal-hours', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const style = workStyles.get(employeeId);
  const energy = energyMaps.get(employeeId);

  const optimalTimes = [];

  if (style?.workPattern.type === 'morning') {
    optimalTimes.push('06:00-10:00', '10:00-12:00');
  } else if (style?.workPattern.type === 'evening') {
    optimalTimes.push('14:00-18:00', '19:00-22:00');
  } else {
    optimalTimes.push('09:00-12:00', '14:00-17:00');
  }

  // Check energy map for overrides
  if (energy?.optimalTimes) {
    optimalTimes.push(...energy.optimalTimes);
  }

  res.json({
    success: true,
    data: {
      employeeId,
      optimalTimes: [...new Set(optimalTimes)],
      basedOn: {
        workStyle: style?.workPattern.type || 'not_set',
        energyMap: energy ? 'available' : 'not_available'
      }
    }
  });
});

/**
 * Track productivity
 */
app.post('/api/twin/:employeeId/behavior/track',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const metrics = req.body;

    if (!metrics.date) {
      metrics.date = new Date().toISOString().split('T')[0];
    }

    const empProd = productivity.get(employeeId) || [];
    empProd.push({ employeeId, ...metrics });
    if (empProd.length > 365) empProd.shift(); // Keep 1 year
    productivity.set(employeeId, empProd);

    res.json({ success: true, data: { tracked: true, totalRecords: empProd.length } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'TRACK_ERROR', message: error.message } });
  }
});

/**
 * Get productivity metrics
 */
app.get('/api/twin/:employeeId/behavior/productivity', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { days = 7 } = req.query;

  const empProd = productivity.get(employeeId) || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const recent = empProd.filter(p => new Date(p.date) >= cutoff);
  const avgScore = recent.length > 0 ? recent.reduce((sum, p) => sum + p.score, 0) / recent.length : 0;

  res.json({
    success: true,
    data: {
      employeeId,
      period: `${days} days`,
      records: recent.length,
      avgScore: Math.round(avgScore),
      recentMetrics: recent.slice(-7)
    }
  });
});

/**
 * Get behavior patterns
 */
app.get('/api/twin/:employeeId/behavior/patterns', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const empPatterns = patterns.get(employeeId) || [];

  res.json({ success: true, data: { patterns: empPatterns, total: empPatterns.length } });
});

/**
 * Observe and learn behavior
 */
app.post('/api/twin/:employeeId/behavior/observe',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { behavior, category } = req.body;

    if (!behavior || !category) {
      const err: ApiError = new Error('behavior and category are required'); err.statusCode = 400; throw err;
    }

    const empPatterns = patterns.get(employeeId) || [];
    const existing = empPatterns.find(p => p.name === behavior && p.category === category);

    if (existing) {
      existing.frequency += 1;
      existing.consistency = Math.min(100, existing.consistency + 5);
    } else {
      empPatterns.push({
        id: generateId('pattern'),
        employeeId,
        name: behavior,
        category,
        frequency: 1,
        consistency: 30,
        confidence: 30
      });
    }

    patterns.set(employeeId, empPatterns);
    res.json({ success: true, data: { observed: true, patterns: empPatterns } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'OBSERVE_ERROR', message: error.message } });
  }
});

/**
 * Get all stats
 */
app.get('/api/twin/:employeeId/behavior/stats', (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const style = workStyles.get(employeeId);
  const energy = energyMaps.get(employeeId);
  const empProd = productivity.get(employeeId) || [];
  const empPatterns = patterns.get(employeeId) || [];

  res.json({
    success: true,
    data: {
      employeeId,
      workStyle: style ? { type: style.workPattern.type, confidence: style.confidence } : null,
      energyMap: energy ? { burnoutRisk: energy.burnoutRisk, hasData: true } : null,
      productivity: { totalRecords: empProd.length },
      patterns: { total: empPatterns.length }
    }
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Behavioral Twin Service - Started                 ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Work Style, Energy Map, Productivity, Patterns   ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
