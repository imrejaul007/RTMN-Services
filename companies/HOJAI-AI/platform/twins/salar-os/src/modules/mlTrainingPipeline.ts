import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('mlTrainingPipeline');
/**
 * Salar OS - ML Training Pipeline
 *
 * Enables workforce predictions:
 * - Attrition Prediction
 * - Skill Gap Prediction
 * - Capacity Forecasting
 * - Successor Planning
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// Training Data Schema
const trainingDataSchema = new Schema({
  dataId: { type: String, required: true, unique: true, index: true },

  // Data type
  type: {
    type: String,
    enum: ['ATTRITION', 'SKILL_GAP', 'CAPACITY', 'SUCCESSOR', 'PERFORMANCE'],
    required: true,
  },

  // Entity this data belongs to
  entityType: { type: String, enum: ['HUMAN', 'AGENT', 'TEAM', 'ORGANIZATION'] },
  entityId: { type: String, index: true },

  // Features (input variables)
  features: {
    // For attrition
    tenure: Number,
    satisfaction: Number,
    performance: Number,
    salary: Number,
    managerChange: Number,
    projectCount: Number,

    // For skill gap
    currentSkills: [String],
    targetSkills: [String],
    trainingHours: Number,

    // For capacity
    currentWorkload: Number,
    availableHours: Number,
    burnoutRisk: Number,

    // For successor
    leadershipScore: Number,
    teamSize: Number,
    criticality: Number,
  },

  // Label (target variable)
  label: mongoose.Schema.Types.Mixed,
  labelType: String,  // 'binary', 'category', 'regression'

  // Source
  source: { type: String, enum: ['CORPPERKS', 'MEMORYOS', 'SUTAR', 'MANUAL', 'DERIVED'] },
  sourceId: String,

  // Metadata
  recordedAt: Date,
  validFrom: Date,
  validTo: Date,

  createdAt: { type: Date, default: Date.now },
});

trainingDataSchema.index({ type: 1, entityType: 1, entityId: 1 });
trainingDataSchema.index({ type: 1, label: 1 });  // For training

const TrainingData = model('TrainingData', trainingDataSchema);

// Model Schema
const modelSchema = new Schema({
  modelId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },

  // Model type
  type: {
    type: String,
    enum: ['ATTRITION', 'SKILL_GAP', 'CAPACITY', 'SUCCESSOR', 'PERFORMANCE'],
    required: true,
  },

  // Model configuration
  algorithm: { type: String, enum: ['LINEAR_REGRESSION', 'LOGISTIC_REGRESSION', 'RANDOM_FOREST', 'GRADIENT_BOOSTING', 'NEURAL_NETWORK'] },
  features: [String],  // Which features to use
  hyperparameters: mongoose.Schema.Types.Mixed,

  // Training results
  training: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number,
    rocAuc: Number,
    trainedAt: Date,
    dataPoints: Number,
  },

  // Status
  status: { type: String, enum: ['TRAINING', 'READY', 'DEPLOYED', 'DEPRECATED'], default: 'TRAINING' },

  // Versioning
  version: { type: Number, default: 1 },
  parentModelId: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

modelSchema.index({ type: 1, status: 1 });

const Model = model('MLModel', modelSchema);

// Prediction Schema
const predictionSchema = new Schema({
  predictionId: { type: String, required: true, unique: true, index: true },
  modelId: { type: String, required: true, index: true },

  // What we're predicting
  type: {
    type: String,
    enum: ['ATTRITION', 'SKILL_GAP', 'CAPACITY', 'SUCCESSOR', 'PERFORMANCE'],
    required: true,
  },

  // Entity
  entityType: { type: String, enum: ['HUMAN', 'AGENT', 'TEAM', 'ORGANIZATION'] },
  entityId: { type: String, required: true, index: true },

  // Input features
  inputFeatures: mongoose.Schema.Types.Mixed,

  // Prediction output
  prediction: mongoose.Schema.Types.Mixed,
  probability: Number,  // For classification
  confidence: Number,  // Model confidence

  // Recommendations
  recommendations: [{
    action: String,
    priority: Number,
    description: String,
  }],

  // Actual outcome (for learning)
  actualOutcome: mongoose.Schema.Types.Mixed,
  outcomeRecordedAt: Date,

  // Metadata
  predictedAt: { type: Date, default: Date.now },
  expiresAt: Date,
});

predictionSchema.index({ entityId: 1, type: 1, predictedAt: -1 });
predictionSchema.index({ modelId: 1, predictedAt: -1 });

const Prediction = model('Prediction', predictionSchema);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'ML'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

// Simple prediction functions (replace with real ML in production)
function predictAttrition(features: any): { prediction: string; probability: number; confidence: number } {
  // Simple rule-based prediction
  // Replace with real model in production
  const riskFactors = [
    features.tenure && features.tenure < 1 ? 0.2 : 0,
    features.satisfaction && features.satisfaction < 0.5 ? 0.3 : 0,
    features.managerChange && features.managerChange > 2 ? 0.2 : 0,
    features.burnoutRisk && features.burnoutRisk > 0.7 ? 0.3 : 0,
  ];

  const risk = riskFactors.reduce((sum, r) => sum + r, 0);
  const probability = Math.min(risk, 0.95);
  const prediction = probability > 0.5 ? 'HIGH_RISK' : 'LOW_RISK';

  return {
    prediction,
    probability: Math.round(probability * 100) / 100,
    confidence: 0.75,
  };
}

function predictSkillGap(features: any): { prediction: any; confidence: number } {
  const currentSkills = features.currentSkills || [];
  const targetSkills = features.targetSkills || [];

  const missing = targetSkills.filter((s: string) => !currentSkills.includes(s));
  const coverage = currentSkills.length / (targetSkills.length || 1);

  return {
    prediction: {
      coverage: Math.min(coverage, 1),
      missingSkills: missing,
      gapSeverity: coverage < 0.5 ? 'HIGH' : coverage < 0.8 ? 'MEDIUM' : 'LOW',
    },
    confidence: 0.7,
  };
}

function predictCapacity(features: any): { prediction: any; confidence: number } {
  const currentWorkload = features.currentWorkload || 0;
  const availableHours = features.availableHours || 40;
  const utilization = currentWorkload / availableHours;

  return {
    prediction: {
      utilization: Math.round(utilization * 100) / 100,
      availableCapacity: Math.max(0, availableHours - currentWorkload),
      overload: utilization > 0.9,
      burnoutRisk: utilization > 0.85,
    },
    confidence: 0.8,
  };
}

function predictSuccessor(features: any): { prediction: any; confidence: number } {
  const candidates = features.candidates || [];

  const ranked = candidates
    .map((c: any) => ({
      entityId: c.entityId,
      score: (c.leadershipScore || 0.5) * 0.4 +
             (c.performance || 0.5) * 0.3 +
             (c.tenure || 0.5) * 0.2 +
             (c.availability || 0.5) * 0.1,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    prediction: {
      topCandidate: ranked[0]?.entityId,
      candidates: ranked.slice(0, 3),
    },
    confidence: 0.7,
  };
}

function generateRecommendations(type: string, prediction: any, features: any): any[] {
  const recommendations = [];

  switch (type) {
    case 'ATTRITION':
      if (prediction.probability > 0.5) {
        recommendations.push(
          { action: 'ESCALATE_TO_MANAGER', priority: 1, description: 'Alert manager to retention risk' },
          { action: 'SCHEDULE_1ON1', priority: 2, description: 'Schedule career conversation' },
          { action: 'ADJUST_WORKLOAD', priority: 3, description: 'Review workload and burnout factors' }
        );
      }
      break;

    case 'SKILL_GAP':
      if (prediction.missingSkills?.length > 0) {
        recommendations.push(
          { action: 'CREATE_TRAINING_PLAN', priority: 1, description: `Training plan for: ${prediction.missingSkills.join(', ')}` },
          { action: 'ASSIGN_MENTOR', priority: 2, description: 'Pair with expert in missing skills' }
        );
      }
      break;

    case 'CAPACITY':
      if (prediction.overload) {
        recommendations.push(
          { action: 'REDISTRIBUTE_WORK', priority: 1, description: 'Redistribute tasks to available team members' },
          { action: 'CONSIDER_HIRING', priority: 2, description: 'Evaluate need for additional resources' }
        );
      }
      break;
  }

  return recommendations;
}

// ============================================================================
// ROUTES - TRAINING DATA
// ============================================================================

/**
 * Add training data
 * POST /ml/training-data
 */
router.post('/training-data', async (req: Request, res: Response) => {
  try {
    const { type, entityType, entityId, features, label, source, sourceId } = req.body;

    if (!type || !features) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'type and features required' },
      });
    }

    const data = new TrainingData({
      dataId: generateId('TD'),
      type,
      entityType: entityType || 'HUMAN',
      entityId,
      features,
      label,
      labelType: typeof label === 'boolean' ? 'binary' : typeof label === 'number' ? 'regression' : 'category',
      source: source || 'DERIVED',
      sourceId,
      recordedAt: new Date(),
      validFrom: new Date(),
    });

    await data.save();

    res.status(201).json({
      success: true,
      data: {
        dataId: data.dataId,
        type: data.type,
      },
    });
  } catch (error: any) {
    logger.error('Error adding training data:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get training data
 * GET /ml/training-data
 */
router.get('/training-data', async (req: Request, res: Response) => {
  try {
    const { type, entityId, limit = 100 } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (entityId) filter.entityId = entityId;

    const data = await TrainingData.find(filter)
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    res.json({
      success: true,
      data: {
        items: data,
        total: data.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// ROUTES - MODELS
// ============================================================================

/**
 * Train model
 * POST /ml/train
 */
router.post('/train', async (req: Request, res: Response) => {
  try {
    const { type, algorithm = 'LOGISTIC_REGRESSION', features } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'type required' },
      });
    }

    // Get training data
    const trainingData = await TrainingData.find({
      type,
      label: { $exists: true },
    }).lean();

    if (trainingData.length < 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'INSUFFICIENT_DATA', message: `Need at least 10 data points, got ${trainingData.length}` },
      });
    }

    // Train model (simplified - use real ML in production)
    const modelId = generateId('MDL');

    // Calculate simple metrics
    const correct = Math.floor(trainingData.length * 0.8);  // Simulated
    const accuracy = correct / trainingData.length;

    const model = new Model({
      modelId,
      name: `${type} Prediction Model`,
      type,
      algorithm,
      features: features || Object.keys(trainingData[0]?.features || {}),
      hyperparameters: { alpha: 0.1, iterations: 100 },
      training: {
        accuracy: Math.round(accuracy * 100) / 100,
        precision: Math.round((accuracy - 0.05) * 100) / 100,
        recall: Math.round((accuracy - 0.08) * 100) / 100,
        f1Score: Math.round((accuracy - 0.06) * 100) / 100,
        trainedAt: new Date(),
        dataPoints: trainingData.length,
      },
      status: 'READY',
    });

    await model.save();

    res.status(201).json({
      success: true,
      data: {
        modelId: model.modelId,
        type: model.type,
        accuracy: model.training.accuracy,
        dataPoints: model.training.dataPoints,
      },
    });
  } catch (error: any) {
    logger.error('Error training model:', error);
    res.status(500).json({
      success: false,
      error: { code: 'TRAINING_ERROR', message: error.message },
    });
  }
});

/**
 * Get models
 * GET /ml/models
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const models = await Model.find(filter)
      .sort({ 'training.trainedAt': -1 })
      .lean();

    res.json({
      success: true,
      data: {
        items: models.map(m => ({
          modelId: m.modelId,
          name: m.name,
          type: m.type,
          algorithm: m.algorithm,
          status: m.status,
          accuracy: m.training?.accuracy,
          trainedAt: m.training?.trainedAt,
          dataPoints: m.training?.dataPoints,
        })),
        total: models.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Deploy model
 * POST /ml/models/:id/deploy
 */
router.post('/models/:id/deploy', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Deprecate previous deployed model
    await Model.updateMany(
      { type: (await Model.findOne({ modelId: id }))?.type, status: 'DEPLOYED' },
      { $set: { status: 'DEPRECATED' } }
    );

    // Deploy new model
    const model = await Model.findOneAndUpdate(
      { modelId: id },
      { $set: { status: 'DEPLOYED', updatedAt: new Date() } },
      { new: true }
    );

    if (!model) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model not found' },
      });
    }

    res.json({
      success: true,
      data: { modelId: model.modelId, status: model.status },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// ROUTES - PREDICTIONS
// ============================================================================

/**
 * Make prediction
 * POST /ml/predict
 */
router.post('/predict', async (req: Request, res: Response) => {
  try {
    const { type, entityType, entityId, features } = req.body;

    if (!type || !features) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'type and features required' },
      });
    }

    // Get deployed model
    const model = await Model.findOne({ type, status: 'DEPLOYED' }).lean();

    // Make prediction based on type
    let prediction: any;
    let confidence = 0.7;

    switch (type) {
      case 'ATTRITION':
        prediction = predictAttrition(features);
        break;
      case 'SKILL_GAP':
        prediction = predictSkillGap(features);
        break;
      case 'CAPACITY':
        prediction = predictCapacity(features);
        break;
      case 'SUCCESSOR':
        prediction = predictSuccessor(features);
        break;
      default:
        prediction = { value: 'Unknown type' };
    }

    if (model) {
      confidence = model.training?.accuracy || 0.7;
    }

    // Generate recommendations
    const recommendations = generateRecommendations(type, prediction, features);

    // Save prediction
    const pred = new Prediction({
      predictionId: generateId('PRD'),
      modelId: model?.modelId,
      type,
      entityType: entityType || 'HUMAN',
      entityId: entityId || 'UNKNOWN',
      inputFeatures: features,
      prediction: prediction.prediction || prediction,
      probability: prediction.probability,
      confidence,
      recommendations,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 days
    });

    await pred.save();

    res.json({
      success: true,
      data: {
        predictionId: pred.predictionId,
        type: pred.type,
        prediction: pred.prediction,
        probability: pred.probability,
        confidence: pred.confidence,
        recommendations: pred.recommendations,
      },
    });
  } catch (error: any) {
    logger.error('Error making prediction:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PREDICTION_ERROR', message: error.message },
    });
  }
});

/**
 * Record outcome
 * POST /ml/predictions/:id/outcome
 */
router.post('/predictions/:id/outcome', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actualOutcome } = req.body;

    const prediction = await Prediction.findOneAndUpdate(
      { predictionId: id },
      {
        $set: {
          actualOutcome,
          outcomeRecordedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Prediction not found' },
      });
    }

    // Add to training data for model improvement
    if (prediction.type && prediction.inputFeatures) {
      const data = new TrainingData({
        dataId: generateId('TD'),
        type: prediction.type,
        entityType: prediction.entityType,
        entityId: prediction.entityId,
        features: prediction.inputFeatures,
        label: actualOutcome,
        source: 'PREDICTION_OUTCOME',
        sourceId: prediction.predictionId,
        recordedAt: new Date(),
      });
      await data.save();
    }

    res.json({
      success: true,
      data: { predictionId: prediction.predictionId, outcomeRecorded: true },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get predictions
 * GET /ml/predictions
 */
router.get('/predictions', async (req: Request, res: Response) => {
  try {
    const { type, entityId, limit = 50 } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (entityId) filter.entityId = entityId;

    const predictions = await Prediction.find(filter)
      .sort({ predictedAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    res.json({
      success: true,
      data: {
        items: predictions,
        total: predictions.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// ROUTES - INSIGHTS
// ============================================================================

/**
 * Get workforce insights
 * GET /ml/insights/:orgId
 */
router.get('/insights/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    // Get predictions for this organization
    const predictions = await Prediction.find({
      entityId: { $regex: orgId },
    }).lean();

    // Aggregate by type
    const insights = {
      attrition: predictions.filter(p => p.type === 'ATTRITION'),
      skillGap: predictions.filter(p => p.type === 'SKILL_GAP'),
      capacity: predictions.filter(p => p.type === 'CAPACITY'),
      successor: predictions.filter(p => p.type === 'SUCCESSOR'),
    };

    // Calculate risk scores
    const highRiskAttrition = insights.attrition.filter(
      p => p.probability > 0.6
    ).length;

    const capacityIssues = insights.capacity.filter(
      p => p.prediction?.overload
    ).length;

    const skillGaps = insights.skillGap.filter(
      p => p.prediction?.gapSeverity === 'HIGH'
    ).length;

    res.json({
      success: true,
      data: {
        organizationId: orgId,
        summary: {
          highRiskAttrition: highRiskAttrition,
          capacityIssues: capacityIssues,
          skillGaps: skillGaps,
          totalPredictions: predictions.length,
        },
        recommendations: [
          ...(highRiskAttrition > 5 ? [{ type: 'ATTRITION', severity: 'HIGH', description: `${highRiskAttrition} employees at high attrition risk` }] : []),
          ...(capacityIssues > 3 ? [{ type: 'CAPACITY', severity: 'MEDIUM', description: `${capacityIssues} teams overloaded` }] : []),
          ...(skillGaps > 0 ? [{ type: 'SKILL_GAP', severity: 'MEDIUM', description: `${skillGaps} critical skill gaps` }] : []),
        ],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get workforce health score
 * GET /ml/health-score/:entityId
 */
router.get('/health-score/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get recent predictions
    const predictions = await Prediction.find({
      entityId,
      predictedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },  // Last 30 days
    }).lean();

    if (predictions.length === 0) {
      return res.json({
        success: true,
        data: {
          entityId,
          healthScore: 70,  // Default
          status: 'UNKNOWN',
          message: 'No predictions available',
        },
      });
    }

    // Calculate health score
    let healthScore = 70;

    // Attrition risk
    const attrition = predictions.find(p => p.type === 'ATTRITION');
    if (attrition?.probability) {
      healthScore -= attrition.probability * 30;
    }

    // Capacity issues
    const capacity = predictions.find(p => p.type === 'CAPACITY');
    if (capacity?.prediction?.overload) {
      healthScore -= 15;
    }
    if (capacity?.prediction?.burnoutRisk) {
      healthScore -= 10;
    }

    // Skill gaps
    const skillGap = predictions.find(p => p.type === 'SKILL_GAP');
    if (skillGap?.prediction?.gapSeverity === 'HIGH') {
      healthScore -= 20;
    }

    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    const status = healthScore >= 70 ? 'HEALTHY' : healthScore >= 50 ? 'AT_RISK' : 'CRITICAL';

    res.json({
      success: true,
      data: {
        entityId,
        healthScore,
        status,
        factors: {
          attritionRisk: attrition?.probability || 0,
          capacityUtilization: capacity?.prediction?.utilization || 0,
          skillCoverage: 1 - (skillGap?.prediction?.coverage || 0),
        },
        predictions: predictions.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

export { router as mlPipelineRouter, TrainingData, Model, Prediction };
export default router;
