/**
 * HOJAI Revenue Intelligence - Main Server
 * Port: 4757
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { RevenueMetric, Forecast, Alert, CreateMetricRequest, calculateChurnRate, calculateCAC, calculateLTV, calculateRunwayMonths } from './types';

const VERSION = '1.0.0';
const app = express();
const PORT = parseInt(process.env.PORT || '4757', 10);

app.use(helmet());
const origins = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || [];
app.use(cors({ origin: origins.length ? origins : false, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'] }));
app.use(express.json({ limit: '10kb' }));
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

const rateLimiter = new Map<string, { count: number; resetTime: number }>();
app.use('/api/', (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimiter.get(ip);
  if (!record || now > record.resetTime) { rateLimiter.set(ip, { count: 1, resetTime: now + 60000 }); next(); return; }
  if (record.count >= 100) { res.status(429).json({ error: 'Too many requests' }); return; }
  record.count++;
  next();
});

function auth(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/health')) return next();
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey && apiKey === process.env.HOJAI_REVENUE_INTELLIGENCE_API_KEY) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();
  res.status(401).json({ error: 'Authentication required' });
}
app.use('/api/', auth);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-revenue-intelligence').then(() => pino().info('MongoDB connected')).catch(e => pino().error({ e }, 'MongoDB failed'));

const MetricSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  metricType: { type: String, enum: ['arr', 'mrr', 'revenue', 'new_revenue', 'expansion', 'churn', 'net_new', 'ltv', 'cac', 'burn_rate', 'runway_months'] },
  value: Number, currency: { type: String, default: 'USD' },
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
  startDate: Date, endDate: Date, metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
MetricSchema.index({ metricType: 1, startDate: -1 });
const MetricModel = mongoose.model('Metric', MetricSchema);

const ForecastSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  metricType: String, predictedValue: Number, confidence: Number, horizon: Number, model: String, startDate: Date, endDate: Date
}, { timestamps: true });
const ForecastModel = mongoose.model('Forecast', ForecastSchema);

const AlertSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  type: { type: String, enum: ['churn_risk', 'revenue_drop', 'burn_rate', 'milestone', 'opportunity'] },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
  title: String, description: String, metricValue: Number, threshold: Number, acknowledged: { type: Boolean, default: false }
}, { timestamps: true });
AlertSchema.index({ acknowledged: 1, createdAt: -1 });
const AlertModel = mongoose.model('Alert', AlertSchema);

app.get('/health', (req: Request, res: Response) => res.json({ status: 'healthy', service: 'hojai-revenue-intelligence', version: VERSION, uptime: process.uptime() }));
app.get('/health/live', (req: Request, res: Response) => res.json({ status: 'alive' }));
app.get('/health/ready', async (req: Request, res: Response) => {
  try { res.json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'not ready', mongo: mongoose.connection.readyState === 1 }); }
  catch (e) { res.status(503).json({ status: 'not ready' }); }
});

app.get('/api/v1/metrics', async (req: Request, res: Response) => {
  try {
    const { metricType, period, startDate, endDate, limit = 30 } = req.query;
    const filter: Record<string, unknown> = {};
    if (metricType) filter.metricType = metricType;
    if (period) filter.period = period;
    if (startDate || endDate) { filter.startDate = {}; if (startDate) (filter.startDate as any).$gte = new Date(startDate as string); if (endDate) (filter.startDate as any).$lte = new Date(endDate as string); }
    const metrics = await MetricModel.find(filter).sort({ startDate: -1 }).limit(Math.min(365, Number(limit))).lean();
    res.json({ count: metrics.length, metrics });
  } catch (e) { pino().error({ e }, 'Failed to list metrics'); res.status(500).json({ error: 'Failed to list metrics' }); }
});

app.post('/api/v1/metrics', async (req: Request, res: Response) => {
  try {
    const { metricType, value, currency, period, startDate, endDate } = req.body;
    if (!metricType || value === undefined || !startDate || !endDate) return res.status(400).json({ error: 'metricType, value, startDate, endDate required' });
    const metric = new MetricModel({ id: uuidv4(), metricType, value, currency: currency || 'USD', period: period || 'monthly', startDate: new Date(startDate), endDate: new Date(endDate) });
    await metric.save();
    // Check for alerts
    if (metricType === 'churn' && value > 5) {
      await new AlertModel({ id: uuidv4(), type: 'churn_risk', severity: 'high', title: 'High churn rate detected', description: `Churn rate at ${value}%`, metricValue: value, threshold: 5 }).save();
    }
    res.status(201).json(metric.toObject());
  } catch (e) { pino().error({ e }, 'Failed to create metric'); res.status(500).json({ error: 'Failed to create metric' }); }
});

app.get('/api/v1/analytics', async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [metrics, alerts] = await Promise.all([
      MetricModel.find({ startDate: { $gte: thirtyDaysAgo } }).sort({ startDate: -1 }).lean(),
      AlertModel.find({ acknowledged: false }).sort({ createdAt: -1 }).limit(10).lean()
    ]);
    const byType = metrics.reduce((acc, m) => { acc[m.metricType] = m.value; return acc; }, {} as Record<string, number>);
    const churnRate = byType.churn || 0;
    const ltv = byType.revenue ? calculateLTV(byType.revenue, churnRate) : 0;
    const cac = byType.cac || 0;
    const burnRate = byType.burn_rate || 0;
    const runway = byType.cash ? calculateRunwayMonths(byType.cash, burnRate) : 999;
    res.json({ period: { start: thirtyDaysAgo, end: new Date() }, metrics: byType, health: { ltv, cac, ltvToCacRatio: cac > 0 ? ltv / cac : 0, runwayMonths: runway }, alerts: alerts.length, generatedAt: new Date() });
  } catch (e) { pino().error({ e }, 'Failed to get analytics'); res.status(500).json({ error: 'Failed to get analytics' }); }
});

app.get('/api/v1/alerts', async (req: Request, res: Response) => {
  try { const { acknowledged } = req.query; const filter: Record<string, unknown> = {}; if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true'; const alerts = await AlertModel.find(filter).sort({ createdAt: -1 }).lean(); res.json({ count: alerts.length, alerts }); }
  catch (e) { pino().error({ e }, 'Failed to list alerts'); res.status(500).json({ error: 'Failed to list alerts' }); }
});

app.post('/api/v1/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try { const alert = await AlertModel.findOneAndUpdate({ id: req.params.id }, { acknowledged: true }, { new: true }).lean(); if (!alert) return res.status(404).json({ error: 'Alert not found' }); res.json(alert); }
  catch (e) { pino().error({ e }, 'Failed to acknowledge alert'); res.status(500).json({ error: 'Failed to acknowledge alert' }); }
});

let isShuttingDown = false;
const server = app.listen(PORT, () => pino().info(`HOJAI Revenue Intelligence running on port ${PORT}`));
process.on('SIGTERM', () => { if (!isShuttingDown) { isShuttingDown = true; pino().info('Shutting down'); server.close(() => { mongoose.connection.close(); process.exit(0); }); } });
process.on('SIGINT', () => process.emit('SIGTERM'));

export default app;
