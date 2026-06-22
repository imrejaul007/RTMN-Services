/**
 * HOJAI Competitive Intelligence - Main Server
 * Port: 4756
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

import {
  Competitor,
  CompetitorProduct,
  FundingRound,
  HiringActivity,
  NewsArticle,
  Alert,
  CreateCompetitorRequest,
  UpdateCompetitorRequest,
  CreateProductRequest,
  CreateFundingRequest,
  CreateHiringRequest,
  CreateNewsRequest,
  CreateAlertRequest,
  detectThreatFromPricing,
  detectThreatFromNews,
  detectOpportunityFromNews,
} from './types';

const VERSION = '1.0.0';

function getPackageVersion(): string {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch { return '1.0.0'; }
}

const app = express();
const PORT = parseInt(process.env.PORT || '4756', 10);

app.use(helmet());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : [];

if (allowedOrigins.length > 0) {
  app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'] }));
} else {
  app.use(cors({ origin: false, credentials: true }));
}

app.use(express.json({ limit: '10kb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => pino().info({ method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start }, 'Request completed'));
  next();
});

const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = 60 * 1000;

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) { requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW }); next(); return; }
  if (record.count >= RATE_LIMIT_MAX) { res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil((record.resetTime - now) / 1000) }); return; }
  record.count++;
  next();
}
app.use('/api/', rateLimitMiddleware);

function verifyJWT(token: string): { userId: string; roles: string[] } | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: payload.sub || payload.userId, roles: payload.roles || [] };
  } catch { return null; }
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/health')) return next();
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    const validApiKey = process.env.HOJAI_COMPETITIVE_INTELLIGENCE_API_KEY;
    if (validApiKey && apiKey === validApiKey) { (req as any).auth = { userId: 'service', roles: ['service'] }; return next(); }
    res.status(401).json({ error: 'Invalid API key' }); return;
  }
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    if (payload) { (req as any).auth = payload; return next(); }
  }
  res.status(401).json({ error: 'Authentication required' });
}
app.use('/api/', authMiddleware);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-competitive-intelligence';
mongoose.connect(MONGODB_URI).then(() => pino().info('MongoDB connected')).catch(err => pino().error({ err }, 'MongoDB connection failed'));

function sanitizeString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.replace(/[\$<>]/g, '').substring(0, 1000);
  return undefined;
}

// SCHEMAS
const CompetitorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  website: String,
  logo: String,
  industry: { type: String, required: true, maxlength: 100 },
  size: { type: String, enum: ['startup', 'small', 'medium', 'large', 'enterprise'] },
  founded: Number,
  headquarters: String,
  status: { type: String, enum: ['active', 'inactive', 'acquired', 'defunct'], default: 'active' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
CompetitorSchema.index({ name: 'text', description: 'text' });
CompetitorSchema.index({ industry: 1, status: 1 });
const CompetitorModel = mongoose.model('Competitor', CompetitorSchema);

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  competitorId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  category: { type: String, required: true, maxlength: 100 },
  pricing: mongoose.Schema.Types.Mixed,
  targetMarket: [String],
  keyFeatures: [String],
  launchedAt: Date,
}, { timestamps: true });
const ProductModel = mongoose.model('CompetitorProduct', ProductSchema);

const FundingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  competitorId: { type: String, required: true, index: true },
  roundType: { type: String, enum: ['seed', 'series_a', 'series_b', 'series_c', 'series_d', 'series_e', 'ipo', 'acquisition', 'other'] },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  valuation: Number,
  investors: [String],
  announcedDate: Date,
  description: String,
}, { timestamps: true });
const FundingModel = mongoose.model('FundingRound', FundingSchema);

const HiringSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  competitorId: { type: String, required: true, index: true },
  jobTitle: { type: String, required: true, maxlength: 200 },
  department: String,
  location: String,
  remote: { type: Boolean, default: false },
  salary: mongoose.Schema.Types.Mixed,
  postedDate: Date,
  source: String,
  url: String,
}, { timestamps: true });
HiringSchema.index({ competitorId: 1, postedDate: -1 });
const HiringModel = mongoose.model('HiringActivity', HiringSchema);

const NewsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  competitorId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 500 },
  summary: String,
  source: { type: String, required: true, maxlength: 200 },
  url: { type: String, required: true },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
  sentimentScore: Number,
  publishedAt: Date,
  category: { type: String, enum: ['product', 'funding', 'leadership', 'partnership', 'legal', 'Layoffs', 'expansion', 'other'] },
}, { timestamps: true });
NewsSchema.index({ competitorId: 1, publishedAt: -1 });
NewsSchema.index({ sentiment: 1 });
const NewsModel = mongoose.model('NewsArticle', NewsSchema);

const AlertSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  competitorId: String,
  type: { type: String, enum: ['threat', 'opportunity', 'milestone', 'crisis'], required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'], required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 2000 },
  source: String,
  sourceUrl: String,
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: Date,
  acknowledgedBy: String,
}, { timestamps: true });
AlertSchema.index({ type: 1, severity: 1, createdAt: -1 });
const AlertModel = mongoose.model('Alert', AlertSchema);

// HEALTH
app.get('/health', (req: Request, res: Response) => {
  const mem = process.memoryUsage();
  res.json({ status: 'healthy', service: 'hojai-competitive-intelligence', version: VERSION, uptime: process.uptime(), timestamp: new Date().toISOString(), memory: { heapUsed: Math.round(mem.heapUsed / 1024 / 1024), heapTotal: Math.round(mem.heapTotal / 1024 / 1024), rss: Math.round(mem.rss / 1024 / 1024) } });
});
app.get('/health/live', (req: Request, res: Response) => res.json({ status: 'alive' }));
app.get('/health/ready', async (req: Request, res: Response) => {
  try { const mongoStatus = mongoose.connection.readyState === 1; if (mongoStatus) res.json({ status: 'ready', mongo: mongoStatus }); else res.status(503).json({ status: 'not ready', mongo: mongoStatus }); }
  catch (error) { res.status(503).json({ status: 'not ready', error: String(error) }); }
});

// COMPETITORS
app.get('/api/v1/competitors', async (req: Request, res: Response) => {
  try {
    const { industry, size, status, search, limit = 50, offset = 0 } = req.query;
    const filter: Record<string, unknown> = {};
    if (industry) filter.industry = sanitizeString(industry);
    if (size) filter.size = size;
    if (status) filter.status = status;
    if (search) filter.$text = { $search: sanitizeString(search) || search };
    const [competitors, total] = await Promise.all([CompetitorModel.find(filter).skip(Math.max(0, Number(offset))).limit(Math.min(100, Number(limit))).lean(), CompetitorModel.countDocuments(filter)]);
    res.json({ count: competitors.length, total, limit: Number(limit), offset: Number(offset), competitors });
  } catch (error) { pino().error({ error }, 'Failed to list competitors'); res.status(500).json({ error: 'Failed to list competitors' }); }
});

app.post('/api/v1/competitors', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const competitor = new CompetitorModel({ id: uuidv4(), ...data });
    await competitor.save();
    pino().info({ competitorId: competitor.id, name: competitor.name }, 'Competitor created');
    res.status(201).json(competitor.toObject());
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: error.errors }); pino().error({ error }, 'Failed to create competitor'); res.status(500).json({ error: 'Failed to create competitor' }); }
});

app.get('/api/v1/competitors/:id', async (req: Request, res: Response) => {
  try { const competitor = await CompetitorModel.findOne({ id: req.params.id }).lean(); if (!competitor) return res.status(404).json({ error: 'Competitor not found' }); res.json(competitor); }
  catch (error) { pino().error({ error }, 'Failed to get competitor'); res.status(500).json({ error: 'Failed to get competitor' }); }
});

app.put('/api/v1/competitors/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, website, logo, industry, size, founded, headquarters, status, metadata } = req.body;
    const updateFields: Record<string, unknown> = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (website !== undefined) updateFields.website = website;
    if (logo !== undefined) updateFields.logo = logo;
    if (industry !== undefined) updateFields.industry = industry;
    if (size !== undefined) updateFields.size = size;
    if (founded !== undefined) updateFields.founded = founded;
    if (headquarters !== undefined) updateFields.headquarters = headquarters;
    if (status !== undefined) updateFields.status = status;
    if (metadata !== undefined) updateFields.metadata = metadata;
    const competitor = await CompetitorModel.findOneAndUpdate({ id: req.params.id }, updateFields, { new: true }).lean();
    if (!competitor) return res.status(404).json({ error: 'Competitor not found' });
    res.json(competitor);
  } catch (error) { pino().error({ error }, 'Failed to update competitor'); res.status(500).json({ error: 'Failed to update competitor' }); }
});

app.delete('/api/v1/competitors/:id', async (req: Request, res: Response) => {
  try {
    const competitor = await CompetitorModel.findOneAndDelete({ id: req.params.id });
    if (!competitor) return res.status(404).json({ error: 'Competitor not found' });
    await Promise.all([ProductModel.deleteMany({ competitorId: req.params.id }), FundingModel.deleteMany({ competitorId: req.params.id }), HiringModel.deleteMany({ competitorId: req.params.id }), NewsModel.deleteMany({ competitorId: req.params.id })]);
    pino().info({ competitorId: req.params.id }, 'Competitor deleted');
    res.json({ deleted: true });
  } catch (error) { pino().error({ error }, 'Failed to delete competitor'); res.status(500).json({ error: 'Failed to delete competitor' }); }
});

// PRODUCTS
app.get('/api/v1/competitors/:competitorId/products', async (req: Request, res: Response) => {
  try { const products = await ProductModel.find({ competitorId: req.params.competitorId }).lean(); res.json({ count: products.length, products }); }
  catch (error) { pino().error({ error }, 'Failed to list products'); res.status(500).json({ error: 'Failed to list products' }); }
});

app.post('/api/v1/competitors/:competitorId/products', async (req: Request, res: Response) => {
  try {
    const product = new ProductModel({ id: uuidv4(), competitorId: req.params.competitorId, ...req.body });
    await product.save();
    res.status(201).json(product.toObject());
  } catch (error) { pino().error({ error }, 'Failed to create product'); res.status(500).json({ error: 'Failed to create product' }); }
});

// FUNDING
app.get('/api/v1/competitors/:competitorId/funding', async (req: Request, res: Response) => {
  try { const funding = await FundingModel.find({ competitorId: req.params.competitorId }).sort({ announcedDate: -1 }).lean(); res.json({ count: funding.length, funding }); }
  catch (error) { pino().error({ error }, 'Failed to list funding'); res.status(500).json({ error: 'Failed to list funding' }); }
});

app.post('/api/v1/competitors/:competitorId/funding', async (req: Request, res: Response) => {
  try {
    const funding = new FundingModel({ id: uuidv4(), competitorId: req.params.competitorId, ...req.body });
    await funding.save();
    res.status(201).json(funding.toObject());
  } catch (error) { pino().error({ error }, 'Failed to record funding'); res.status(500).json({ error: 'Failed to record funding' }); }
});

// HIRING
app.get('/api/v1/competitors/:competitorId/hiring', async (req: Request, res: Response) => {
  try { const hiring = await HiringModel.find({ competitorId: req.params.competitorId }).sort({ postedDate: -1 }).lean(); res.json({ count: hiring.length, hiring }); }
  catch (error) { pino().error({ error }, 'Failed to list hiring'); res.status(500).json({ error: 'Failed to list hiring' }); }
});

app.post('/api/v1/competitors/:competitorId/hiring', async (req: Request, res: Response) => {
  try { const hiring = new HiringModel({ id: uuidv4(), competitorId: req.params.competitorId, ...req.body }); await hiring.save(); res.status(201).json(hiring.toObject()); }
  catch (error) { pino().error({ error }, 'Failed to record hiring'); res.status(500).json({ error: 'Failed to record hiring' }); }
});

// NEWS
app.get('/api/v1/news', async (req: Request, res: Response) => {
  try {
    const { competitorId, sentiment, category, startDate, endDate, limit = 50, offset = 0 } = req.query;
    const filter: Record<string, unknown> = {};
    if (competitorId) filter.competitorId = sanitizeString(competitorId);
    if (sentiment) filter.sentiment = sentiment;
    if (category) filter.category = category;
    if (startDate || endDate) { filter.publishedAt = {}; if (startDate) (filter.publishedAt as any).$gte = new Date(startDate as string); if (endDate) (filter.publishedAt as any).$lte = new Date(endDate as string); }
    const [news, total] = await Promise.all([NewsModel.find(filter).sort({ publishedAt: -1 }).skip(Number(offset)).limit(Math.min(100, Number(limit))).lean(), NewsModel.countDocuments(filter)]);
    res.json({ count: news.length, total, news });
  } catch (error) { pino().error({ error }, 'Failed to list news'); res.status(500).json({ error: 'Failed to list news' }); }
});

app.post('/api/v1/news', async (req: Request, res: Response) => {
  try {
    const { competitorId, title, summary, source, url, sentiment, publishedAt, category } = req.body;
    if (!competitorId || !title || !source || !url) return res.status(400).json({ error: 'competitorId, title, source, and url are required' });
    const news = new NewsModel({ id: uuidv4(), competitorId, title, summary, source, url, sentiment, publishedAt: publishedAt || new Date(), category });
    await news.save();
    
    // Auto-create alert based on sentiment
    if (sentiment === 'negative' && detectThreatFromNews(sentiment)) {
      const alert = new AlertModel({ id: uuidv4(), competitorId, type: 'threat', severity: 'high', title: `Negative news about competitor`, description: title, source, sourceUrl: url });
      await alert.save();
    } else if (sentiment === 'positive' && detectOpportunityFromNews(sentiment)) {
      const alert = new AlertModel({ id: uuidv4(), competitorId, type: 'opportunity', severity: 'medium', title: `Positive news about competitor`, description: title, source, sourceUrl: url });
      await alert.save();
    }
    
    res.status(201).json(news.toObject());
  } catch (error) { pino().error({ error }, 'Failed to record news'); res.status(500).json({ error: 'Failed to record news' }); }
});

// ALERTS
app.get('/api/v1/alerts', async (req: Request, res: Response) => {
  try {
    const { type, severity, acknowledged, limit = 50, offset = 0 } = req.query;
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';
    const [alerts, total] = await Promise.all([AlertModel.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Math.min(100, Number(limit))).lean(), AlertModel.countDocuments(filter)]);
    res.json({ count: alerts.length, total, alerts });
  } catch (error) { pino().error({ error }, 'Failed to list alerts'); res.status(500).json({ error: 'Failed to list alerts' }); }
});

app.post('/api/v1/alerts', async (req: Request, res: Response) => {
  try {
    const { competitorId, type, severity, title, description, source, sourceUrl } = req.body;
    if (!type || !severity || !title || !description) return res.status(400).json({ error: 'type, severity, title, and description are required' });
    const alert = new AlertModel({ id: uuidv4(), competitorId, type, severity, title, description, source, sourceUrl });
    await alert.save();
    res.status(201).json(alert.toObject());
  } catch (error) { pino().error({ error }, 'Failed to create alert'); res.status(500).json({ error: 'Failed to create alert' }); }
});

app.post('/api/v1/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const alert = await AlertModel.findOneAndUpdate({ id: req.params.id }, { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: (req as any).auth?.userId }, { new: true }).lean();
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) { pino().error({ error }, 'Failed to acknowledge alert'); res.status(500).json({ error: 'Failed to acknowledge alert' }); }
});

// ANALYTICS
app.get('/api/v1/competitors/:id/analytics', async (req: Request, res: Response) => {
  try {
    const competitorId = req.params.id;
    const [competitor, products, funding, hiring, news, alerts] = await Promise.all([
      CompetitorModel.findOne({ id: competitorId }).lean(),
      ProductModel.find({ competitorId }).lean(),
      FundingModel.find({ competitorId }).sort({ announcedDate: -1 }).limit(10).lean(),
      HiringModel.find({ competitorId }).sort({ postedDate: -1 }).limit(20).lean(),
      NewsModel.find({ competitorId }).sort({ publishedAt: -1 }).limit(20).lean(),
      AlertModel.find({ competitorId }).lean()
    ]);
    if (!competitor) return res.status(404).json({ error: 'Competitor not found' });
    const sentimentCounts = { positive: news.filter(n => n.sentiment === 'positive').length, neutral: news.filter(n => n.sentiment === 'neutral').length, negative: news.filter(n => n.sentiment === 'negative').length };
    const totalFunding = funding.reduce((sum, f) => sum + f.amount, 0);
    res.json({ competitor, overview: { totalProducts: products.length, totalFunding, totalHiring: hiring.length, totalNews: news.length, activeAlerts: alerts.filter(a => !a.acknowledged).length }, sentimentAnalysis: sentimentCounts, recentNews: news.slice(0, 5), recentHiring: hiring.slice(0, 10), generatedAt: new Date() });
  } catch (error) { pino().error({ error }, 'Failed to get analytics'); res.status(500).json({ error: 'Failed to get analytics' }); }
});

// GRACEFUL SHUTDOWN
let isShuttingDown = false;
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return; isShuttingDown = true;
  pino().info({ signal }, 'Graceful shutdown initiated');
  server.close(() => pino().info('HTTP server closed'));
  try { await mongoose.connection.close(); pino().info('MongoDB connection closed'); } catch (error) { pino().error({ error }, 'Error closing MongoDB connection'); }
  await new Promise(resolve => setTimeout(resolve, 5000));
  pino().info('Graceful shutdown completed'); process.exit(0);
}

const server = app.listen(PORT, () => {
  pino().info(`HOJAI Competitive Intelligence running on port ${PORT}`);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => { pino().fatal({ error }, 'Uncaught exception'); gracefulShutdown('uncaughtException'); });
process.on('unhandledRejection', (reason) => { pino().fatal({ reason }, 'Unhandled rejection'); });

export default app;
