/**
 * GENIE Health Twin Service
 * Port: 4730
 * Purpose: Digital twin for personal health - fitness, sleep, nutrition, mental wellness
 *
 * Tagline: "Your Health, Reflected"
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '4730', 10);
const SERVICE_NAME = 'genie-health-twin-service';

const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 60000, max: 100, message: { success: false, error: { code: 'RATE_LIMIT' } } }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

const healthTwins = new Map<string, any>();

interface HealthTwin {
  id: string;
  userId: string;
  fitness: { level: 'beginner' | 'moderate' | 'advanced' | 'athlete'; weeklyMinutes: number; lastWorkout?: string };
  sleep: { averageHours: number; quality: number; lastNight?: number };
  nutrition: { caloriesToday: number; waterToday: number; lastMeal?: string };
  mental: { moodScore: number; stressLevel: number; lastCheckin?: string };
  vitals: { restingHR?: number; bpSystolic?: number; bpDiastolic?: number; weightKg?: number };
  goals: { type: string; target: number; current: number; deadline?: string }[];
  healthScore: number;
  createdAt: string;
  updatedAt: string;
}

function createDefaultHealthTwin(userId: string): HealthTwin {
  return {
    id: uuidv4(),
    userId,
    fitness: { level: 'moderate', weeklyMinutes: 0 },
    sleep: { averageHours: 0, quality: 0 },
    nutrition: { caloriesToday: 0, waterToday: 0 },
    mental: { moodScore: 50, stressLevel: 50 },
    vitals: {},
    goals: [],
    healthScore: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function calcHealthScore(t: HealthTwin): number {
  const fitnessScore = Math.min(100, (t.fitness.weeklyMinutes / 150) * 100);
  const sleepScore = Math.min(100, (t.sleep.averageHours / 8) * 100);
  const moodScore = t.mental.moodScore;
  const stressScore = 100 - t.mental.stressLevel;
  return Math.round((fitnessScore + sleepScore + moodScore + stressScore) / 4);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}`;
  res.setHeader('X-Request-Id', requestId);
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, message: 'request', requestId, method: req.method, path: req.path }));
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', port: PORT, twins: healthTwins.size, timestamp: new Date().toISOString() });
});
app.get('/health/live', (_req: Request, res: Response) => res.json({ status: 'ok' }));
app.get('/health/ready', (_req: Request, res: Response) => res.json({ status: 'ready' }));

app.get('/api/health/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  let twin = healthTwins.get(userId);
  if (!twin) {
    twin = createDefaultHealthTwin(userId);
    healthTwins.set(userId, twin);
  }
  res.json({ success: true, data: twin });
});

app.post('/api/health/:userId/workout', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { minutes, type } = req.body;
  if (typeof minutes !== 'number') return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  let twin = healthTwins.get(userId) || createDefaultHealthTwin(userId);
  twin.fitness.weeklyMinutes += minutes;
  twin.fitness.lastWorkout = new Date().toISOString();
  if (twin.fitness.weeklyMinutes >= 300) twin.fitness.level = 'athlete';
  else if (twin.fitness.weeklyMinutes >= 150) twin.fitness.level = 'advanced';
  else if (twin.fitness.weeklyMinutes >= 60) twin.fitness.level = 'moderate';
  else twin.fitness.level = 'beginner';
  twin.healthScore = calcHealthScore(twin);
  twin.updatedAt = new Date().toISOString();
  healthTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

app.post('/api/health/:userId/sleep', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { hours, quality } = req.body;
  if (typeof hours !== 'number' || typeof quality !== 'number') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  }
  let twin = healthTwins.get(userId) || createDefaultHealthTwin(userId);
  // Moving average
  twin.sleep.averageHours = Math.round(((twin.sleep.averageHours * 0.7) + (hours * 0.3)) * 10) / 10;
  twin.sleep.quality = Math.round(((twin.sleep.quality * 0.7) + (quality * 0.3)) * 10) / 10;
  twin.sleep.lastNight = hours;
  twin.healthScore = calcHealthScore(twin);
  twin.updatedAt = new Date().toISOString();
  healthTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

app.post('/api/health/:userId/nutrition', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { calories, water, meal } = req.body;
  let twin = healthTwins.get(userId) || createDefaultHealthTwin(userId);
  if (typeof calories === 'number') twin.nutrition.caloriesToday += calories;
  if (typeof water === 'number') twin.nutrition.waterToday += water;
  if (meal) twin.nutrition.lastMeal = meal;
  twin.updatedAt = new Date().toISOString();
  healthTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

app.post('/api/health/:userId/mood', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { moodScore, stressLevel } = req.body;
  if (typeof moodScore !== 'number' || typeof stressLevel !== 'number') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  }
  let twin = healthTwins.get(userId) || createDefaultHealthTwin(userId);
  twin.mental.moodScore = moodScore;
  twin.mental.stressLevel = stressLevel;
  twin.mental.lastCheckin = new Date().toISOString();
  twin.healthScore = calcHealthScore(twin);
  twin.updatedAt = new Date().toISOString();
  healthTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

app.put('/api/health/:userId/vitals', (req: Request, res: Response) => {
  const { userId } = req.params;
  const vitals = req.body;
  let twin = healthTwins.get(userId) || createDefaultHealthTwin(userId);
  twin.vitals = { ...twin.vitals, ...vitals };
  twin.updatedAt = new Date().toISOString();
  healthTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

app.get('/api/health/:userId/summary', (req: Request, res: Response) => {
  const { userId } = req.params;
  const twin = healthTwins.get(userId) || createDefaultHealthTwin(userId);
  res.json({ success: true, data: { fitness_level: twin.fitness.level, health_goals: twin.goals, metrics: twin.vitals, healthScore: twin.healthScore, sleep: twin.sleep, mental: twin.mental } });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error(JSON.stringify({ service: SERVICE_NAME, error: err.message }));
  res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
});

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  GENIE HEALTH TWIN v1.0.0                                 ║`);
  console.log(`║  Port: ${PORT}                                               ║`);
  console.log(`║  Status: RUNNING                                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
});

export default app;
