/**
 * HOJAI SiteOS - Widget Experiments Service
 * Experiments Widget: A/B Testing Engine with Statistical Significance (Port 5408)
 *
 * Features:
 * - A/B testing engine
 * - Create experiment, traffic split, track conversions
 * - Statistical significance calculation
 * - POST /api/experiments, GET /api/experiments/:id, POST /api/experiments/:id/variant, POST /api/experiments/:id/conversion
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pino from 'pino';

// Logger setup
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Express app setup
const app = express();

// In-memory stores
const experimentsStore = new Map();
const variantsStore = new Map();
const assignmentsStore = new Map();
const conversionsStore = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Statistical Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate z-score for two-proportion z-test
 */
function calculateZScore(visitors1, conversions1, visitors2, conversions2) {
  if (visitors1 === 0 || visitors2 === 0) return 0;

  const p1 = conversions1 / visitors1;
  const p2 = conversions2 / visitors2;
  const pPooled = (conversions1 + conversions2) / (visitors1 + visitors2);

  if (pPooled === 0 || pPooled === 1) return 0;

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / visitors1 + 1 / visitors2));
  if (se === 0) return 0;

  return (p1 - p2) / se;
}

/**
 * Normal CDF approximation (Abramowitz and Stegun)
 */
function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate p-value from z-score
 */
function calculatePValue(zScore) {
  return 2 * (1 - normalCDF(Math.abs(zScore)));
}

/**
 * Calculate confidence interval
 */
function calculateConfidenceInterval(visitors, conversions, confidence = 0.95) {
  if (visitors === 0) return { lower: 0, upper: 0 };

  const p = conversions / visitors;
  const zValue = confidence === 0.99 ? 2.576 : 1.96; // 95% or 99%
  const se = Math.sqrt(p * (1 - p) / visitors);

  return {
    lower: Math.max(0, p - zValue * se),
    upper: Math.min(1, p + zValue * se),
  };
}

/**
 * Calculate statistical significance
 */
export function calculateStatisticalSignificance(experimentId) {
  const experiment = experimentsStore.get(experimentId);
  if (!experiment) return null;

  const variants = Array.from(variantsStore.values())
    .filter(v => v.experimentId === experimentId)
    .sort((a, b) => a.index - b.index);

  if (variants.length < 2) return null;

  // Control is always variant 0
  const control = variants[0];
  const results = {
    experimentId,
    control: {
      variantId: control.id,
      visitors: control.visitors,
      conversions: control.conversions,
      conversionRate: control.visitors > 0 ? control.conversions / control.visitors : 0,
    },
    treatments: [],
    winner: null,
    isSignificant: false,
    confidence: 0,
  };

  for (let i = 1; i < variants.length; i++) {
    const treatment = variants[i];
    const zScore = calculateZScore(
      control.visitors, control.conversions,
      treatment.visitors, treatment.conversions
    );
    const pValue = calculatePValue(zScore);
    const confidence = (1 - pValue) * 100;

    const treatmentResult = {
      variantId: treatment.id,
      variantName: treatment.name,
      visitors: treatment.visitors,
      conversions: treatment.conversions,
      conversionRate: treatment.visitors > 0 ? treatment.conversions / treatment.visitors : 0,
      zScore,
      pValue,
      confidence,
      confidenceInterval: calculateConfidenceInterval(treatment.visitors, treatment.conversions),
      lift: control.conversionRate > 0
        ? ((treatment.conversionRate - control.conversionRate) / control.conversionRate) * 100
        : 0,
    };

    results.treatments.push(treatmentResult);
  }

  // Find winner (treatment with highest conversion rate, if significant)
  const significantTreatments = results.treatments.filter(t => t.confidence >= 95);
  if (significantTreatments.length > 0) {
    significantTreatments.sort((a, b) => b.conversionRate - a.conversionRate);
    if (significantTreatments[0].conversionRate > control.conversionRate) {
      results.winner = significantTreatments[0].variantId;
      results.isSignificant = true;
      results.confidence = significantTreatments[0].confidence;
    }
  }

  return results;
}

/**
 * Calculate minimum sample size needed
 */
export function calculateMinimumSampleSize(baselineRate, minimumDetectableEffect, confidence = 0.95, power = 0.8) {
  const alpha = 1 - confidence;
  const zAlpha = confidence === 0.99 ? 2.576 : 1.96;
  const zBeta = power === 0.8 ? 0.84 : 1.28;

  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minimumDetectableEffect);
  const pBar = (p1 + p2) / 2;

  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
    zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(p2 - p1, 2);

  return Math.ceil(numerator / denominator);
}

// ─────────────────────────────────────────────────────────────────────────────
// Experiment Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create experiment
 */
export function createExperiment(experimentData) {
  const experiment = {
    id: uuidv4(),
    name: experimentData.name,
    description: experimentData.description,
    hypothesis: experimentData.hypothesis,
    status: 'draft', // draft, running, paused, completed
    metric: experimentData.metric || 'conversion',
    primaryGoal: experimentData.primaryGoal,
    startedAt: null,
    endedAt: null,
    confidenceLevel: experimentData.confidenceLevel || 0.95,
    minimumSampleSize: experimentData.minimumSampleSize,
    variants: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  experimentsStore.set(experiment.id, experiment);
  logger.info({ event: 'experiment_created', experimentId: experiment.id, name: experiment.name });

  return experiment;
}

/**
 * Get experiment by ID
 */
export function getExperiment(experimentId) {
  return experimentsStore.get(experimentId);
}

/**
 * Update experiment
 */
export function updateExperiment(experimentId, updates) {
  const experiment = experimentsStore.get(experimentId);
  if (!experiment) return null;

  Object.assign(experiment, updates, { updatedAt: Date.now() });
  return experiment;
}

/**
 * Start experiment
 */
export function startExperiment(experimentId) {
  const experiment = experimentsStore.get(experimentId);
  if (!experiment) return null;

  experiment.status = 'running';
  experiment.startedAt = Date.now();
  experiment.updatedAt = Date.now();

  logger.info({ event: 'experiment_started', experimentId });
  return experiment;
}

/**
 * Pause experiment
 */
export function pauseExperiment(experimentId) {
  const experiment = experimentsStore.get(experimentId);
  if (!experiment) return null;

  experiment.status = 'paused';
  experiment.updatedAt = Date.now();

  logger.info({ event: 'experiment_paused', experimentId });
  return experiment;
}

/**
 * Complete experiment
 */
export function completeExperiment(experimentId) {
  const experiment = experimentsStore.get(experimentId);
  if (!experiment) return null;

  experiment.status = 'completed';
  experiment.endedAt = Date.now();
  experiment.updatedAt = Date.now();

  // Calculate final significance
  experiment.finalResults = calculateStatisticalSignificance(experimentId);

  logger.info({ event: 'experiment_completed', experimentId });
  return experiment;
}

/**
 * Get all experiments
 */
export function getAllExperiments(options = {}) {
  const { status, limit = 100, offset = 0 } = options;

  let experiments = Array.from(experimentsStore.values());

  if (status) {
    experiments = experiments.filter(e => e.status === status);
  }

  experiments.sort((a, b) => b.createdAt - a.createdAt);

  return {
    total: experiments.length,
    experiments: experiments.slice(offset, offset + limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Variant Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create variant
 */
export function createVariant(experimentId, variantData) {
  const experiment = experimentsStore.get(experimentId);
  if (!experiment) return null;

  const variant = {
    id: uuidv4(),
    experimentId,
    name: variantData.name,
    description: variantData.description,
    index: experiment.variants.length,
    isControl: experiment.variants.length === 0,
    trafficAllocation: variantData.trafficAllocation || (100 / (experiment.variants.length + 1)),
    visitors: 0,
    conversions: 0,
    revenue: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  variantsStore.set(variant.id, variant);
  experiment.variants.push(variant.id);

  // Recalculate traffic allocations
  recalculateTrafficAllocations(experimentId);

  logger.info({
    event: 'variant_created',
    experimentId,
    variantId: variant.id,
    name: variant.name,
    isControl: variant.isControl
  });

  return variant;
}

/**
 * Get variant by ID
 */
export function getVariant(variantId) {
  return variantsStore.get(variantId);
}

/**
 * Update variant
 */
export function updateVariant(variantId, updates) {
  const variant = variantsStore.get(variantId);
  if (!variant) return null;

  Object.assign(variant, updates, { updatedAt: Date.now() });
  return variant;
}

/**
 * Recalculate traffic allocations
 */
function recalculateTrafficAllocations(experimentId) {
  const variants = Array.from(variantsStore.values())
    .filter(v => v.experimentId === experimentId);

  const control = variants.find(v => v.isControl);
  const treatments = variants.filter(v => !v.isControl);

  if (control) {
    control.trafficAllocation = 100 / (variants.length || 1);
  }

  const remainingTraffic = 100 - (control?.trafficAllocation || 0);
  const perVariantTraffic = treatments.length > 0 ? remainingTraffic / treatments.length : 0;

  for (const treatment of treatments) {
    treatment.trafficAllocation = perVariantTraffic;
  }
}

/**
 * Get variants for experiment
 */
export function getExperimentVariants(experimentId) {
  return Array.from(variantsStore.values())
    .filter(v => v.experimentId === experimentId)
    .sort((a, b) => a.index - b.index);
}

// ─────────────────────────────────────────────────────────────────────────────
// Traffic Assignment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assign user to variant (consistent hashing based on visitor ID)
 */
export function assignVisitor(experimentId, visitorId) {
  const experiment = experimentsStore.get(experimentId);
  if (!experiment || experiment.status !== 'running') return null;

  // Check for existing assignment
  const assignmentKey = `${experimentId}:${visitorId}`;
  const existing = assignmentsStore.get(assignmentKey);
  if (existing) return existing;

  const variants = getExperimentVariants(experimentId);
  if (variants.length === 0) return null;

  // Consistent hashing based on visitor ID
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = ((hash << 5) - hash) + visitorId.charCodeAt(i);
    hash = hash & hash;
  }

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.trafficAllocation;
    if ((Math.abs(hash) % 100) < cumulative) {
      // Assign visitor to variant
      variant.visitors++;
      updateVariant(variant.id, { visitors: variant.visitors });

      const assignment = {
        experimentId,
        variantId: variant.id,
        visitorId,
        assignedAt: Date.now(),
      };

      assignmentsStore.set(assignmentKey, assignment);
      logger.info({
        event: 'visitor_assigned',
        experimentId,
        variantId: variant.id,
        visitorId
      });

      return assignment;
    }
  }

  // Fallback to control
  const control = variants.find(v => v.isControl);
  if (control) {
    control.visitors++;
    updateVariant(control.id, { visitors: control.visitors });

    const assignment = {
      experimentId,
      variantId: control.id,
      visitorId,
      assignedAt: Date.now(),
    };

    assignmentsStore.set(assignmentKey, assignment);
    return assignment;
  }

  return null;
}

/**
 * Get visitor assignment
 */
export function getVisitorAssignment(experimentId, visitorId) {
  const assignmentKey = `${experimentId}:${visitorId}`;
  return assignmentsStore.get(assignmentKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track conversion
 */
export function trackConversion(experimentId, visitorId, value = 0, metadata = {}) {
  const assignment = getVisitorAssignment(experimentId, visitorId);
  if (!assignment) return null;

  const variant = variantsStore.get(assignment.variantId);
  if (!variant) return null;

  const conversion = {
    id: uuidv4(),
    experimentId,
    variantId: variant.id,
    visitorId,
    value,
    metadata,
    timestamp: Date.now(),
  };

  conversionsStore.set(conversion.id, conversion);

  // Update variant stats
  variant.conversions++;
  variant.revenue += value;
  updateVariant(variant.id, {
    conversions: variant.conversions,
    revenue: variant.revenue,
  });

  logger.info({
    event: 'conversion_tracked',
    experimentId,
    variantId: variant.id,
    visitorId,
    value
  });

  return conversion;
}

/**
 * Get conversions for variant
 */
export function getVariantConversions(variantId, options = {}) {
  const { limit = 100, offset = 0 } = options;

  const conversions = Array.from(conversionsStore.values())
    .filter(c => c.variantId === variantId)
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    total: conversions.length,
    conversions: conversions.slice(offset, offset + limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Express Routes
// ─────────────────────────────────────────────────────────────────────────────

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  const experiments = Array.from(experimentsStore.values());
  res.json({
    status: 'healthy',
    service: 'widget-experiments',
    version: '1.0.0',
    port: process.env.PORT || 5408,
    timestamp: new Date().toISOString(),
    stats: {
      experiments: experimentsStore.size,
      running: experiments.filter(e => e.status === 'running').length,
      completed: experiments.filter(e => e.status === 'completed').length,
      variants: variantsStore.size,
      conversions: conversionsStore.size,
    },
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Experiment Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create experiment
 * POST /api/experiments
 */
app.post('/api/experiments', (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      hypothesis: z.string().optional(),
      metric: z.string().optional(),
      primaryGoal: z.string().optional(),
      confidenceLevel: z.number().min(0.8).max(0.99).optional(),
      minimumSampleSize: z.number().optional(),
    });

    const experiment = createExperiment(schema.parse(req.body));
    res.status(201).json({ success: true, experiment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all experiments
 * GET /api/experiments
 */
app.get('/api/experiments', (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;
  const result = getAllExperiments({
    status,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json({ success: true, ...result });
});

/**
 * Get experiment
 * GET /api/experiments/:id
 */
app.get('/api/experiments/:id', (req, res) => {
  const experiment = getExperiment(req.params.id);
  if (!experiment) {
    return res.status(404).json({ error: 'Experiment not found' });
  }

  // Get variants
  const variants = getExperimentVariants(experiment.id);

  // Calculate current significance
  const significance = calculateStatisticalSignificance(experiment.id);

  res.json({
    success: true,
    experiment,
    variants,
    significance,
  });
});

/**
 * Update experiment
 * PATCH /api/experiments/:id
 */
app.patch('/api/experiments/:id', (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      hypothesis: z.string().optional(),
      status: z.enum(['draft', 'running', 'paused', 'completed']).optional(),
    });

    const experiment = updateExperiment(req.params.id, schema.parse(req.body));
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({ success: true, experiment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Start experiment
 * POST /api/experiments/:id/start
 */
app.post('/api/experiments/:id/start', (req, res) => {
  const experiment = startExperiment(req.params.id);
  if (!experiment) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  res.json({ success: true, experiment });
});

/**
 * Pause experiment
 * POST /api/experiments/:id/pause
 */
app.post('/api/experiments/:id/pause', (req, res) => {
  const experiment = pauseExperiment(req.params.id);
  if (!experiment) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  res.json({ success: true, experiment });
});

/**
 * Complete experiment
 * POST /api/experiments/:id/complete
 */
app.post('/api/experiments/:id/complete', (req, res) => {
  const experiment = completeExperiment(req.params.id);
  if (!experiment) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  res.json({ success: true, experiment });
});

// ─────────────────────────────────────────────────────────────────────────────
// Variant Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add variant to experiment
 * POST /api/experiments/:id/variant
 */
app.post('/api/experiments/:id/variant', (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      trafficAllocation: z.number().min(0).max(100).optional(),
    });

    const variant = createVariant(req.params.id, schema.parse(req.body));
    if (!variant) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.status(201).json({ success: true, variant });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get variant
 * GET /api/experiments/:id/variant/:variantId
 */
app.get('/api/experiments/:id/variant/:variantId', (req, res) => {
  const variant = getVariant(req.params.variantId);
  if (!variant || variant.experimentId !== req.params.id) {
    return res.status(404).json({ error: 'Variant not found' });
  }

  res.json({ success: true, variant });
});

/**
 * Update variant
 * PATCH /api/experiments/:id/variant/:variantId
 */
app.patch('/api/experiments/:id/variant/:variantId', (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      trafficAllocation: z.number().min(0).max(100).optional(),
    });

    const variant = updateVariant(req.params.variantId, schema.parse(req.body));
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    recalculateTrafficAllocations(variant.experimentId);

    res.json({ success: true, variant });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Assignment Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assign visitor to variant
 * POST /api/experiments/:id/assign
 */
app.post('/api/experiments/:id/assign', (req, res) => {
  try {
    const schema = z.object({
      visitorId: z.string().min(1),
    });

    const { visitorId } = schema.parse(req.body);
    const assignment = assignVisitor(req.params.id, visitorId);

    if (!assignment) {
      return res.status(400).json({ error: 'Experiment not running or no variants' });
    }

    const variant = getVariant(assignment.variantId);

    res.json({
      success: true,
      assignment,
      variant: {
        id: variant.id,
        name: variant.name,
        isControl: variant.isControl,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get visitor assignment
 * GET /api/experiments/:id/assign/:visitorId
 */
app.get('/api/experiments/:id/assign/:visitorId', (req, res) => {
  const assignment = getVisitorAssignment(req.params.id, req.params.visitorId);
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  res.json({ success: true, assignment });
});

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track conversion
 * POST /api/experiments/:id/conversion
 */
app.post('/api/experiments/:id/conversion', (req, res) => {
  try {
    const schema = z.object({
      visitorId: z.string().min(1),
      value: z.number().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const { visitorId, value, metadata } = schema.parse(req.body);
    const conversion = trackConversion(req.params.id, visitorId, value, metadata);

    if (!conversion) {
      return res.status(400).json({ error: 'Assignment not found. Assign visitor first.' });
    }

    res.status(201).json({ success: true, conversion });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get experiment conversions
 * GET /api/experiments/:id/conversions
 */
app.get('/api/experiments/:id/conversions', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const variants = getExperimentVariants(req.params.id);

  const allConversions = [];
  for (const variant of variants) {
    const result = getVariantConversions(variant.id, { limit: 1000, offset: 0 });
    allConversions.push(...result.conversions);
  }

  allConversions.sort((a, b) => b.timestamp - a.timestamp);

  res.json({
    success: true,
    total: allConversions.length,
    conversions: allConversions.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Statistics Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get experiment significance
 * GET /api/experiments/:id/significance
 */
app.get('/api/experiments/:id/significance', (req, res) => {
  const significance = calculateStatisticalSignificance(req.params.id);
  if (!significance) {
    return res.status(404).json({ error: 'Experiment not found or insufficient data' });
  }

  res.json({ success: true, significance });
});

/**
 * Calculate minimum sample size
 * POST /api/experiments/sample-size
 */
app.post('/api/experiments/sample-size', (req, res) => {
  try {
    const schema = z.object({
      baselineRate: z.number().min(0).max(1),
      minimumDetectableEffect: z.number().min(0.01).max(1),
      confidence: z.number().min(0.8).max(0.99).optional(),
      power: z.number().min(0.5).max(0.99).optional(),
    });

    const { baselineRate, minimumDetectableEffect, confidence, power } = schema.parse(req.body);
    const sampleSize = calculateMinimumSampleSize(baselineRate, minimumDetectableEffect, confidence, power);

    res.json({
      success: true,
      sampleSize,
      perVariant: sampleSize,
      total: sampleSize * 2, // Assuming control + one treatment
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method });

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5408;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget Experiments Service running on port ${port}`);
      resolve(server);
    });
  });
}

// Start if run directly
const isMainModule = process.argv[1]?.includes('index.js');
if (isMainModule) {
  startServer();
}

export { app };
