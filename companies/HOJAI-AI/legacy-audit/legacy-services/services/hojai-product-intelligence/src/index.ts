/**
 * HOJAI Product Intelligence - Main Server
 * Port: 4755
 * 
 * Provides unified product intelligence from multiple data sources.
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

// Types
import {
  Product,
  ProductFeature,
  ProductFeedback,
  RoadmapItem,
  ProductMetric,
  ProductAnalytics,
  CreateProductRequest,
  UpdateProductRequest,
  CreateFeatureRequest,
  UpdateFeatureRequest,
  CreateFeedbackRequest,
  RespondFeedbackRequest,
  CreateRoadmapItemRequest,
  UpdateRoadmapItemRequest,
  RecordMetricRequest,
  ProductListQuery,
  FeatureListQuery,
  FeedbackListQuery,
  RoadmapListQuery,
  MetricsQuery,
  FeaturePrioritization,
  calculateRiceScore,
  getRiceRecommendation,
  ProductStatusSchema,
  FeatureStatusSchema,
  FeaturePrioritySchema,
  FeedbackSentimentSchema,
  FeedbackSourceSchema,
} from './types';

// ============================================
// VERSION FROM PACKAGE.JSON
// ============================================

function getPackageVersion(): string {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const VERSION = getPackageVersion();

// ============================================
// LOGGING SETUP
// ============================================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();
const PORT = parseInt(process.env.PORT || '4755', 10);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : [];

if (allowedOrigins.length > 0) {
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
} else {
  app.use(cors({
    origin: false,
    credentials: true,
  }));
}

app.use(express.json({ limit: '10kb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      requestId: req.headers['x-request-id'],
    }, 'Request completed');
  });
  next();
});

// ============================================
// RATE LIMITING
// ============================================

const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    next();
    return;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
    return;
  }

  record.count++;
  next();
}

app.use('/api/', rateLimitMiddleware);

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

interface AuthPayload {
  userId: string;
  roles: string[];
}

function verifyJWT(token: string): AuthPayload | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.warn('JWT_SECRET not configured');
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      userId: payload.sub || payload.userId,
      roles: payload.roles || [],
    };
  } catch {
    return null;
  }
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/health')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  if (apiKey) {
    const validApiKey = process.env.HOJAI_PRODUCT_INTELLIGENCE_API_KEY;
    if (validApiKey && apiKey === validApiKey) {
      (req as any).auth = { userId: 'service', roles: ['service'] };
      return next();
    }
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    if (payload) {
      (req as any).auth = payload;
      return next();
    }
  }

  res.status(401).json({ error: 'Authentication required' });
}

app.use('/api/', authMiddleware);

// ============================================
// DATABASE CONNECTIONS
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-product-intelligence';
const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose.connect(MONGODB_URI, MONGODB_OPTIONS)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error({ err }, 'MongoDB connection failed'));

// ============================================
// INPUT SANITIZATION
// ============================================

function sanitizeString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.replace(/[\$<>]/g, '').substring(0, 1000);
  }
  return undefined;
}

// ============================================
// MONGOOSE SCHEMAS
// ============================================

// Product Schema
const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  category: { type: String, required: true, maxlength: 100 },
  subcategory: { type: String, maxlength: 100 },
  status: { type: String, enum: ['active', 'draft', 'archived', 'discontinued'], default: 'draft' },
  version: { type: String, default: '1.0.0' },
  tags: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ownerId: { type: String, index: true },
  teamId: { type: String, index: true },
}, { timestamps: true });
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ status: 1 });
ProductSchema.index({ category: 1 });
const ProductModel = mongoose.model('Product', ProductSchema);

// Product Feature Schema
const ProductFeatureSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  productId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' },
  estimatedEffort: { type: Number, min: 0 },
  actualEffort: { type: Number, min: 0 },
  assignedTo: String,
  dueDate: Date,
  completedAt: Date,
  tags: [{ type: String }],
  dependencies: [{ type: String }],
}, { timestamps: true });
ProductFeatureSchema.index({ productId: 1, status: 1 });
ProductFeatureSchema.index({ productId: 1, priority: 1 });
const ProductFeatureModel = mongoose.model('ProductFeature', ProductFeatureSchema);

// Product Feedback Schema
const ProductFeedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  productId: { type: String, required: true, index: true },
  featureId: String,
  userId: String,
  content: { type: String, required: true, maxlength: 5000 },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
  source: { type: String, enum: ['in_app', 'email', 'support_ticket', 'social', 'review', 'survey', 'other'], default: 'in_app' },
  rating: { type: Number, min: 1, max: 5 },
  category: { type: String, maxlength: 100 },
  status: { type: String, enum: ['new', 'reviewed', 'accepted', 'rejected', 'duplicate'], default: 'new' },
  response: { type: String, maxlength: 2000 },
  responderId: String,
  respondedAt: Date,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
ProductFeedbackSchema.index({ productId: 1, sentiment: 1 });
ProductFeedbackSchema.index({ productId: 1, status: 1 });
const ProductFeedbackModel = mongoose.model('ProductFeedback', ProductFeedbackSchema);

// Roadmap Item Schema
const RoadmapItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  productId: { type: String, required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  targetDate: { type: Date, required: true },
  type: { type: String, enum: ['feature', 'improvement', 'bug_fix', 'milestone', 'release'], default: 'feature' },
  status: { type: String, enum: ['planned', 'in_progress', 'completed', 'delayed', 'cancelled'], default: 'planned' },
  features: [{ type: String }],
  progress: { type: Number, min: 0, max: 100, default: 0 },
  completedAt: Date,
}, { timestamps: true });
RoadmapItemSchema.index({ productId: 1, targetDate: 1 });
RoadmapItemSchema.index({ productId: 1, status: 1 });
const RoadmapItemModel = mongoose.model('RoadmapItem', RoadmapItemSchema);

// Product Metric Schema
const ProductMetricSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  productId: { type: String, required: true, index: true },
  metricType: {
    type: String,
    enum: [
      'daily_active_users',
      'monthly_active_users',
      'sessions',
      'session_duration',
      'retention_rate',
      'churn_rate',
      'nps_score',
      'csat_score',
      'feature_adoption_rate',
      'task_completion_rate',
      'error_rate',
      'response_time',
      'revenue',
      'conversions',
      'support_tickets',
      'page_views',
    ],
  },
  value: { type: Number, required: true },
  unit: String,
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'], default: 'daily' },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });
ProductMetricSchema.index({ productId: 1, metricType: 1, recordedAt: -1 });
const ProductMetricModel = mongoose.model('ProductMetric', ProductMetricSchema);

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    service: 'hojai-product-intelligence',
    version: VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    },
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1;
    if (mongoStatus) {
      res.json({ status: 'ready', mongo: mongoStatus });
    } else {
      res.status(503).json({ status: 'not ready', mongo: mongoStatus });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: String(error) });
  }
});

// ============================================
// PRODUCT API (v1)
// ============================================

// List products
app.get('/api/v1/products', async (req: Request, res: Response) => {
  try {
    const { status, category, ownerId, teamId, search, tags, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (category) filter.category = sanitizeString(category);
    if (ownerId) filter.ownerId = sanitizeString(ownerId);
    if (teamId) filter.teamId = sanitizeString(teamId);
    if (search) {
      filter.$text = { $search: sanitizeString(search) || search };
    }
    if (tags) {
      const tagArray = (tags as string).split(',').map(t => t.trim());
      filter.tags = { $all: tagArray };
    }

    const parsedLimit = Math.min(Math.max(1, Number(limit)), 100);
    const parsedOffset = Math.max(0, Number(offset));

    const [products, total] = await Promise.all([
      ProductModel.find(filter).skip(parsedOffset).limit(parsedLimit).lean(),
      ProductModel.countDocuments(filter),
    ]);

    res.json({ count: products.length, total, limit: parsedLimit, offset: parsedOffset, products });
  } catch (error) {
    logger.error({ error }, 'Failed to list products');
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// Create product
app.post('/api/v1/products', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const product = new ProductModel({
      id: uuidv4(),
      ...data,
    });
    await product.save();
    logger.info({ productId: product.id, name: product.name }, 'Product created');
    res.status(201).json(product.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error({ error }, 'Failed to create product');
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Get product
app.get('/api/v1/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await ProductModel.findOne({ id: req.params.id }).lean();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    logger.error({ error }, 'Failed to get product');
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Update product
app.put('/api/v1/products/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, category, subcategory, status, version, tags, metadata } = req.body;
    const updateFields: Record<string, unknown> = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (category !== undefined) updateFields.category = category;
    if (subcategory !== undefined) updateFields.subcategory = subcategory;
    if (status !== undefined) updateFields.status = status;
    if (version !== undefined) updateFields.version = version;
    if (tags !== undefined) updateFields.tags = tags;
    if (metadata !== undefined) updateFields.metadata = metadata;

    const product = await ProductModel.findOneAndUpdate(
      { id: req.params.id },
      updateFields,
      { new: true }
    ).lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    logger.error({ error }, 'Failed to update product');
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/v1/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await ProductModel.findOneAndDelete({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Delete associated data
    await Promise.all([
      ProductFeatureModel.deleteMany({ productId: req.params.id }),
      ProductFeedbackModel.deleteMany({ productId: req.params.id }),
      RoadmapItemModel.deleteMany({ productId: req.params.id }),
      ProductMetricModel.deleteMany({ productId: req.params.id }),
    ]);
    logger.info({ productId: req.params.id }, 'Product deleted');
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete product');
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ============================================
// FEATURE API (v1)
// ============================================

// List features
app.get('/api/v1/products/:productId/features', async (req: Request, res: Response) => {
  try {
    const { status, priority, assignedTo, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { productId: req.params.productId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = sanitizeString(assignedTo);

    const parsedLimit = Math.min(Math.max(1, Number(limit)), 100);
    const parsedOffset = Math.max(0, Number(offset));

    const [features, total] = await Promise.all([
      ProductFeatureModel.find(filter).skip(parsedOffset).limit(parsedLimit).lean(),
      ProductFeatureModel.countDocuments(filter),
    ]);

    res.json({ count: features.length, total, limit: parsedLimit, offset: parsedOffset, features });
  } catch (error) {
    logger.error({ error }, 'Failed to list features');
    res.status(500).json({ error: 'Failed to list features' });
  }
});

// Create feature
app.post('/api/v1/products/:productId/features', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const feature = new ProductFeatureModel({
      id: uuidv4(),
      productId: req.params.productId,
      ...data,
    });
    await feature.save();
    logger.info({ featureId: feature.id, name: feature.name }, 'Feature created');
    res.status(201).json(feature.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error({ error }, 'Failed to create feature');
    res.status(500).json({ error: 'Failed to create feature' });
  }
});

// Get feature
app.get('/api/v1/products/:productId/features/:id', async (req: Request, res: Response) => {
  try {
    const feature = await ProductFeatureModel.findOne({
      id: req.params.id,
      productId: req.params.productId
    }).lean();
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    res.json(feature);
  } catch (error) {
    logger.error({ error }, 'Failed to get feature');
    res.status(500).json({ error: 'Failed to get feature' });
  }
});

// Update feature
app.put('/api/v1/products/:productId/features/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, priority, status, estimatedEffort, actualEffort, assignedTo, dueDate, tags, dependencies } = req.body;
    const updateFields: Record<string, unknown> = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (priority !== undefined) updateFields.priority = priority;
    if (status !== undefined) {
      updateFields.status = status;
      if (status === 'completed') {
        updateFields.completedAt = new Date();
      }
    }
    if (estimatedEffort !== undefined) updateFields.estimatedEffort = estimatedEffort;
    if (actualEffort !== undefined) updateFields.actualEffort = actualEffort;
    if (assignedTo !== undefined) updateFields.assignedTo = assignedTo;
    if (dueDate !== undefined) updateFields.dueDate = dueDate;
    if (tags !== undefined) updateFields.tags = tags;
    if (dependencies !== undefined) updateFields.dependencies = dependencies;

    const feature = await ProductFeatureModel.findOneAndUpdate(
      { id: req.params.id, productId: req.params.productId },
      updateFields,
      { new: true }
    ).lean();

    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    res.json(feature);
  } catch (error) {
    logger.error({ error }, 'Failed to update feature');
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// Delete feature
app.delete('/api/v1/products/:productId/features/:id', async (req: Request, res: Response) => {
  try {
    const feature = await ProductFeatureModel.findOneAndDelete({
      id: req.params.id,
      productId: req.params.productId
    });
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete feature');
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});

// ============================================
// FEEDBACK API (v1)
// ============================================

// List feedback
app.get('/api/v1/feedback', async (req: Request, res: Response) => {
  try {
    const { productId, featureId, sentiment, source, status, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = {};
    if (productId) filter.productId = sanitizeString(productId);
    if (featureId) filter.featureId = sanitizeString(featureId);
    if (sentiment) filter.sentiment = sentiment;
    if (source) filter.source = source;
    if (status) filter.status = status;

    const parsedLimit = Math.min(Math.max(1, Number(limit)), 100);
    const parsedOffset = Math.max(0, Number(offset));

    const [feedback, total] = await Promise.all([
      ProductFeedbackModel.find(filter).sort({ createdAt: -1 }).skip(parsedOffset).limit(parsedLimit).lean(),
      ProductFeedbackModel.countDocuments(filter),
    ]);

    res.json({ count: feedback.length, total, limit: parsedLimit, offset: parsedOffset, feedback });
  } catch (error) {
    logger.error({ error }, 'Failed to list feedback');
    res.status(500).json({ error: 'Failed to list feedback' });
  }
});

// Create feedback
app.post('/api/v1/feedback', async (req: Request, res: Response) => {
  try {
    const { productId, featureId, userId, content, sentiment, source, rating, category, metadata } = req.body;

    if (!productId || !content) {
      return res.status(400).json({ error: 'productId and content are required' });
    }

    // Auto-detect sentiment if not provided
    let detectedSentiment = sentiment;
    if (!detectedSentiment && content) {
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('great') || lowerContent.includes('love') || lowerContent.includes('excellent') || lowerContent.includes('amazing')) {
        detectedSentiment = 'positive';
      } else if (lowerContent.includes('bad') || lowerContent.includes('hate') || lowerContent.includes('terrible') || lowerContent.includes('awful')) {
        detectedSentiment = 'negative';
      } else {
        detectedSentiment = 'neutral';
      }
    }

    const feedback = new ProductFeedbackModel({
      id: uuidv4(),
      productId,
      featureId,
      userId,
      content,
      sentiment: detectedSentiment,
      source: source || 'in_app',
      rating,
      category,
      metadata: metadata || {},
    });

    await feedback.save();
    logger.info({ feedbackId: feedback.id, productId: feedback.productId }, 'Feedback created');
    res.status(201).json(feedback.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error({ error }, 'Failed to create feedback');
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

// Get feedback
app.get('/api/v1/feedback/:id', async (req: Request, res: Response) => {
  try {
    const feedback = await ProductFeedbackModel.findOne({ id: req.params.id }).lean();
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    logger.error({ error }, 'Failed to get feedback');
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Respond to feedback
app.post('/api/v1/feedback/:id/respond', async (req: Request, res: Response) => {
  try {
    const { response, status } = req.body;
    const feedback = await ProductFeedbackModel.findOneAndUpdate(
      { id: req.params.id },
      {
        response,
        status: status || 'reviewed',
        responderId: (req as any).auth?.userId,
        respondedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(feedback);
  } catch (error) {
    logger.error({ error }, 'Failed to respond to feedback');
    res.status(500).json({ error: 'Failed to respond to feedback' });
  }
});

// ============================================
// ROADMAP API (v1)
// ============================================

// List roadmap items
app.get('/api/v1/products/:productId/roadmap', async (req: Request, res: Response) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { productId: req.params.productId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const parsedLimit = Math.min(Math.max(1, Number(limit)), 100);
    const parsedOffset = Math.max(0, Number(offset));

    const [items, total] = await Promise.all([
      RoadmapItemModel.find(filter).sort({ targetDate: 1 }).skip(parsedOffset).limit(parsedLimit).lean(),
      RoadmapItemModel.countDocuments(filter),
    ]);

    res.json({ count: items.length, total, limit: parsedLimit, offset: parsedOffset, roadmap: items });
  } catch (error) {
    logger.error({ error }, 'Failed to list roadmap items');
    res.status(500).json({ error: 'Failed to list roadmap items' });
  }
});

// Create roadmap item
app.post('/api/v1/products/:productId/roadmap', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const item = new RoadmapItemModel({
      id: uuidv4(),
      productId: req.params.productId,
      ...data,
    });
    await item.save();
    logger.info({ roadmapItemId: item.id, title: item.title }, 'Roadmap item created');
    res.status(201).json(item.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error({ error }, 'Failed to create roadmap item');
    res.status(500).json({ error: 'Failed to create roadmap item' });
  }
});

// Get roadmap item
app.get('/api/v1/products/:productId/roadmap/:id', async (req: Request, res: Response) => {
  try {
    const item = await RoadmapItemModel.findOne({
      id: req.params.id,
      productId: req.params.productId
    }).lean();
    if (!item) {
      return res.status(404).json({ error: 'Roadmap item not found' });
    }
    res.json(item);
  } catch (error) {
    logger.error({ error }, 'Failed to get roadmap item');
    res.status(500).json({ error: 'Failed to get roadmap item' });
  }
});

// Update roadmap item
app.put('/api/v1/products/:productId/roadmap/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, targetDate, type, status, features, progress } = req.body;
    const updateFields: Record<string, unknown> = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (targetDate !== undefined) updateFields.targetDate = targetDate;
    if (type !== undefined) updateFields.type = type;
    if (status !== undefined) {
      updateFields.status = status;
      if (status === 'completed') {
        updateFields.completedAt = new Date();
        updateFields.progress = 100;
      }
    }
    if (features !== undefined) updateFields.features = features;
    if (progress !== undefined) updateFields.progress = progress;

    const item = await RoadmapItemModel.findOneAndUpdate(
      { id: req.params.id, productId: req.params.productId },
      updateFields,
      { new: true }
    ).lean();

    if (!item) {
      return res.status(404).json({ error: 'Roadmap item not found' });
    }
    res.json(item);
  } catch (error) {
    logger.error({ error }, 'Failed to update roadmap item');
    res.status(500).json({ error: 'Failed to update roadmap item' });
  }
});

// Delete roadmap item
app.delete('/api/v1/products/:productId/roadmap/:id', async (req: Request, res: Response) => {
  try {
    const item = await RoadmapItemModel.findOneAndDelete({
      id: req.params.id,
      productId: req.params.productId
    });
    if (!item) {
      return res.status(404).json({ error: 'Roadmap item not found' });
    }
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete roadmap item');
    res.status(500).json({ error: 'Failed to delete roadmap item' });
  }
});

// ============================================
// METRICS API (v1)
// ============================================

// List metrics
app.get('/api/v1/products/:productId/metrics', async (req: Request, res: Response) => {
  try {
    const { metricType, period, startDate, endDate, limit = 30 } = req.query;

    const filter: Record<string, unknown> = { productId: req.params.productId };
    if (metricType) filter.metricType = metricType;
    if (period) filter.period = period;
    if (startDate || endDate) {
      filter.recordedAt = {};
      if (startDate) (filter.recordedAt as any).$gte = new Date(startDate as string);
      if (endDate) (filter.recordedAt as any).$lte = new Date(endDate as string);
    }

    const metrics = await ProductMetricModel.find(filter)
      .sort({ recordedAt: -1 })
      .limit(Math.min(Number(limit), 365))
      .lean();

    res.json({ count: metrics.length, metrics });
  } catch (error) {
    logger.error({ error }, 'Failed to list metrics');
    res.status(500).json({ error: 'Failed to list metrics' });
  }
});

// Record metric
app.post('/api/v1/products/:productId/metrics', async (req: Request, res: Response) => {
  try {
    const { metricType, value, unit, period, recordedAt } = req.body;

    if (!metricType || value === undefined) {
      return res.status(400).json({ error: 'metricType and value are required' });
    }

    const metric = new ProductMetricModel({
      id: uuidv4(),
      productId: req.params.productId,
      metricType,
      value,
      unit,
      period: period || 'daily',
      recordedAt: recordedAt || new Date(),
    });

    await metric.save();
    res.status(201).json(metric.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error({ error }, 'Failed to record metric');
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

// ============================================
// ANALYTICS API (v1)
// ============================================

// Get product analytics
app.get('/api/v1/products/:id/analytics', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;

    const product = await ProductModel.findOne({ id: productId }).lean();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Aggregate features
    const featureStats = await ProductFeatureModel.aggregate([
      { $match: { productId } },
      {
        $group: {
          _id: null,
          totalFeatures: { $sum: 1 },
          completedFeatures: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          inProgressFeatures: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          plannedFeatures: { $sum: { $cond: [{ $eq: ['$status', 'planned'] }, 1, 0] } },
          overdueFeatures: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'in_progress'] }, { $lt: ['$dueDate', new Date()] }] },
                1, 0
              ]
            }
          },
        },
      },
    ]);

    // Aggregate feedback
    const feedbackStats = await ProductFeedbackModel.aggregate([
      { $match: { productId } },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          positiveCount: { $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] } },
          neutralCount: { $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] } },
          negativeCount: { $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] } },
          avgSentiment: { $avg: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 0.5, 0] }] } },
        },
      },
    ]);

    // Get top feedback categories
    const topCategories = await ProductFeedbackModel.aggregate([
      { $match: { productId, category: { $exists: true, $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get latest metrics
    const latestMetrics = await ProductMetricModel.aggregate([
      { $match: { productId } },
      { $sort: { recordedAt: -1 } },
      { $group: { _id: '$metricType', latestValue: { $first: '$value' }, latestDate: { $first: '$recordedAt' } } },
    ]);

    const fStats = featureStats[0] || { totalFeatures: 0, completedFeatures: 0, inProgressFeatures: 0, plannedFeatures: 0, overdueFeatures: 0 };
    const fbStats = feedbackStats[0] || { totalFeedback: 0, positiveCount: 0, neutralCount: 0, negativeCount: 0, avgSentiment: null };

    const analytics = {
      productId,
      overview: {
        totalFeatures: fStats.totalFeatures,
        completedFeatures: fStats.completedFeatures,
        inProgressFeatures: fStats.inProgressFeatures,
        plannedFeatures: fStats.plannedFeatures,
        totalFeedback: fbStats.totalFeedback,
        avgSentiment: fbStats.avgSentiment,
        pmfScore: fbStats.avgSentiment ? Math.round(fbStats.avgSentiment * 100) : null,
      },
      featureHealth: {
        completionRate: fStats.totalFeatures > 0 ? Math.round((fStats.completedFeatures / fStats.totalFeatures) * 100) : 0,
        overdueFeatures: fStats.overdueFeatures,
        blockedFeatures: 0,
      },
      feedbackInsights: {
        positiveCount: fbStats.positiveCount,
        neutralCount: fbStats.neutralCount,
        negativeCount: fbStats.negativeCount,
        topCategories: topCategories.map(c => ({ category: c._id, count: c.count })),
        recentThemes: [],
      },
      metrics: {
        latestValues: Object.fromEntries(latestMetrics.map(m => [m._id, m.latestValue])),
        trends: {},
      },
      generatedAt: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    logger.error({ error }, 'Failed to get analytics');
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ============================================
// PRIORITIZATION API (v1)
// ============================================

// Prioritize features
app.post('/api/v1/products/:productId/features/prioritize', async (req: Request, res: Response) => {
  try {
    const { reach, impact, confidence, effort } = req.body;

    if (reach === undefined || impact === undefined || confidence === undefined || effort === undefined) {
      return res.status(400).json({ error: 'reach, impact, confidence, and effort are required' });
    }

    const score = calculateRiceScore(reach, impact, confidence, effort);
    const recommendation = getRiceRecommendation(score);

    const prioritization = {
      reach,
      impact,
      confidence,
      effort,
      riceScore: score,
      recommendation,
    };

    res.json(prioritization);
  } catch (error) {
    logger.error({ error }, 'Failed to calculate prioritization');
    res.status(500).json({ error: 'Failed to calculate prioritization' });
  }
});

// ============================================
// CROSS-PRODUCT ANALYTICS
// ============================================

// Get cross-product analytics
app.get('/api/v1/analytics', async (req: Request, res: Response) => {
  try {
    const { category, teamId, status } = req.query;

    const filter: Record<string, unknown> = {};
    if (category) filter.category = sanitizeString(category);
    if (teamId) filter.teamId = sanitizeString(teamId);
    if (status) filter.status = status;

    // Get all products with stats
    const products = await ProductModel.find(filter).lean();

    const productStats = await Promise.all(
      products.map(async (product) => {
        const [featureCount, feedbackCount] = await Promise.all([
          ProductFeatureModel.countDocuments({ productId: product.id }),
          ProductFeedbackModel.countDocuments({ productId: product.id }),
        ]);
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          status: product.status,
          featureCount,
          feedbackCount,
        };
      })
    );

    res.json({
      totalProducts: products.length,
      products: productStats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get analytics');
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown initiated');
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error({ error }, 'Error closing MongoDB connection');
  }

  await new Promise(resolve => setTimeout(resolve, 5000));
  logger.info('Graceful shutdown completed');
  process.exit(0);
}

const server = app.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎯 HOJAI Product Intelligence (${PORT})            ║
║                                                       ║
║   Endpoints:                                          ║
║   GET  /health                                       ║
║   GET  /api/v1/products                              ║
║   POST /api/v1/products                              ║
║   GET  /api/v1/products/:id/features                 ║
║   GET  /api/v1/products/:id/analytics                ║
║   GET  /api/v1/feedback                              ║
║   GET  /api/v1/products/:id/roadmap                  ║
║   GET  /api/v1/products/:id/metrics                 ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
});

export default app;
