const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.AB_TESTING_PORT || 5467;

const ANALYTICS_URL = process.env.ANALYTICS_URL || 'http://localhost:4750';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const experiments = new Map();
const variants = new Map();
const assignments = new Map();
const conversions = new Map();
const users = new Set();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ab-testing', port: PORT, timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'ab-testing', version: '1.0.0' });
});

// POST /api/experiments - Create experiment
app.post('/api/experiments', (req, res) => {
  const { companyId, name, description, hypothesis, metric, variants: variantList, trafficAllocation, startDate, endDate, status } = req.body;

  if (!companyId || !name || !metric) {
    return res.status(400).json({ success: false, error: 'companyId, name, and metric are required' });
  }

  if (!variantList || variantList.length < 2) {
    return res.status(400).json({ success: false, error: 'At least 2 variants are required' });
  }

  const totalWeight = variantList.reduce((sum, v) => sum + (v.weight || 1), 0);

  const experimentId = `exp_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const experiment = {
    experimentId,
    companyId,
    name,
    description: description || '',
    hypothesis: hypothesis || '',
    metric,
    status: status || 'draft',
    trafficAllocation: trafficAllocation || 100,
    startDate: startDate || null,
    endDate: endDate || null,
    winner: null,
    confidenceLevel: null,
    statisticalSignificance: null,
    variants: [],
    stats: {
      totalVisitors: 0,
      totalConversions: 0,
      overallConversionRate: 0
    },
    createdAt: new Date().toISOString()
  };

  let cumulativeWeight = 0;
  variantList.forEach((v, index) => {
    const variantId = `var_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const variant = {
      variantId,
      experimentId,
      name: v.name,
      description: v.description || '',
      weight: v.weight || 1,
      weightPercentage: ((v.weight || 1) / totalWeight * 100).toFixed(2),
      trafficRange: {
        start: cumulativeWeight,
        end: cumulativeWeight + (v.weight || 1)
      },
      isControl: index === 0,
      status: 'active',
      stats: {
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
        revenue: 0,
        avgOrderValue: 0
      },
      createdAt: new Date().toISOString()
    };

    cumulativeWeight += v.weight || 1;
    variants.set(variantId, variant);
    experiment.variants.push(variant);
  });

  experiments.set(experimentId, experiment);

  res.json({
    success: true,
    data: experiment
  });
});

// GET /api/experiments - List experiments
app.get('/api/experiments', (req, res) => {
  const { companyId, status } = req.query;

  let result = Array.from(experiments.values());

  if (companyId) {
    result = result.filter(e => e.companyId === companyId);
  }
  if (status) {
    result = result.filter(e => e.status === status);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    data: result
  });
});

// GET /api/experiments/:experimentId - Get experiment
app.get('/api/experiments/:experimentId', (req, res) => {
  const { experimentId } = req.params;
  const experiment = experiments.get(experimentId);

  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  res.json({
    success: true,
    data: experiment
  });
});

// PUT /api/experiments/:experimentId - Update experiment
app.put('/api/experiments/:experimentId', (req, res) => {
  const { experimentId } = req.params;
  const updates = req.body;

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  const allowedUpdates = ['name', 'description', 'hypothesis', 'trafficAllocation', 'startDate', 'endDate', 'status'];
  const filteredUpdates = {};
  allowedUpdates.forEach(key => {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  });

  const updated = { ...experiment, ...filteredUpdates, updatedAt: new Date().toISOString() };
  experiments.set(experimentId, updated);

  res.json({
    success: true,
    data: updated
  });
});

// DELETE /api/experiments/:experimentId - Delete experiment
app.delete('/api/experiments/:experimentId', (req, res) => {
  const { experimentId } = req.params;

  if (!experiments.has(experimentId)) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  variants.forEach((v, id) => {
    if (v.experimentId === experimentId) variants.delete(id);
  });

  assignments.forEach((a, id) => {
    if (a.experimentId === experimentId) assignments.delete(id);
  });

  experiments.delete(experimentId);

  res.json({ success: true, message: 'Experiment deleted' });
});

// POST /api/experiments/:experimentId/start - Start experiment
app.post('/api/experiments/:experimentId/start', (req, res) => {
  const { experimentId } = req.params;

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  if (experiment.status === 'running') {
    return res.status(400).json({ success: false, error: 'Experiment is already running' });
  }

  experiment.status = 'running';
  experiment.startDate = new Date().toISOString();
  experiment.updatedAt = new Date().toISOString();

  experiments.set(experimentId, experiment);

  res.json({
    success: true,
    data: experiment
  });
});

// POST /api/experiments/:experimentId/stop - Stop experiment
app.post('/api/experiments/:experimentId/stop', (req, res) => {
  const { experimentId } = req.params;
  const { winner } = req.body;

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  experiment.status = 'stopped';
  experiment.endDate = new Date().toISOString();
  experiment.updatedAt = new Date().toISOString();

  if (winner) {
    const winnerVariant = experiment.variants.find(v => v.variantId === winner);
    if (winnerVariant) {
      experiment.winner = winner;
    }
  }

  experiment.variants.forEach(v => {
    v.status = 'completed';
  });

  experiments.set(experimentId, experiment);

  res.json({
    success: true,
    data: experiment
  });
});

// GET /api/experiments/:experimentId/assign - Get variant assignment
app.get('/api/experiments/:experimentId/assign', (req, res) => {
  const { experimentId } = req.params;
  const { userId, forceVariant } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  if (experiment.status !== 'running') {
    return res.status(400).json({ success: false, error: 'Experiment is not running' });
  }

  const assignmentKey = `${experimentId}:${userId}`;
  let assignment = assignments.get(assignmentKey);

  if (assignment) {
    return res.json({
      success: true,
      data: {
        experimentId,
        variantId: assignment.variantId,
        variantName: assignment.variantName,
        isControl: assignment.isControl,
        assignedAt: assignment.assignedAt
      }
    });
  }

  if (forceVariant) {
    const variant = experiment.variants.find(v => v.variantId === forceVariant);
    if (!variant) {
      return res.status(404).json({ success: false, error: 'Variant not found' });
    }

    assignment = {
      experimentId,
      userId,
      variantId: variant.variantId,
      variantName: variant.name,
      isControl: variant.isControl,
      assignedAt: new Date().toISOString()
    };
  } else {
    const userHash = hashUserId(userId);
    const assignedVariant = assignVariant(experiment, userHash);

    assignment = {
      experimentId,
      userId,
      variantId: assignedVariant.variantId,
      variantName: assignedVariant.name,
      isControl: assignedVariant.isControl,
      assignedAt: new Date().toISOString()
    };
  }

  assignments.set(assignmentKey, assignment);

  variant.variants.find(v => v.variantId === assignment.variantId).stats.visitors += 1;
  experiments.set(experimentId, experiment);

  users.add(userId);

  res.json({
    success: true,
    data: assignment
  });
});

// POST /api/experiments/:experimentId/convert - Track conversion
app.post('/api/experiments/:experimentId/convert', (req, res) => {
  const { experimentId } = req.params;
  const { userId, value, metadata } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  const assignmentKey = `${experimentId}:${userId}`;
  const assignment = assignments.get(assignmentKey);

  if (!assignment) {
    return res.status(400).json({ success: false, error: 'User not assigned to this experiment' });
  }

  const variant = experiment.variants.find(v => v.variantId === assignment.variantId);
  if (!variant) {
    return res.status(404).json({ success: false, error: 'Variant not found' });
  }

  const conversionId = `conv_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const conversion = {
    conversionId,
    experimentId,
    variantId: variant.variantId,
    userId,
    value: value || 0,
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  };

  conversions.set(conversionId, conversion);

  variant.stats.conversions += 1;
  variant.stats.revenue += value || 0;
  variant.stats.avgOrderValue = variant.stats.revenue / variant.stats.conversions;
  variant.stats.conversionRate = variant.stats.visitors > 0
    ? (variant.stats.conversions / variant.stats.visitors * 100).toFixed(4)
    : 0;

  experiment.stats.totalConversions += 1;

  const totalVisitors = experiment.variants.reduce((sum, v) => sum + v.stats.visitors, 0);
  const totalConversions = experiment.variants.reduce((sum, v) => sum + v.stats.conversions, 0);
  experiment.stats.totalVisitors = totalVisitors;
  experiment.stats.overallConversionRate = totalVisitors > 0
    ? (totalConversions / totalVisitors * 100).toFixed(4)
    : 0;

  experiments.set(experimentId, experiment);

  sendToAnalytics(experiment, variant, conversion);

  res.json({
    success: true,
    data: {
      conversionId,
      variantId: variant.variantId,
      variantName: variant.name,
      conversionRate: variant.stats.conversionRate
    }
  });
});

// GET /api/experiments/:experimentId/stats - Get experiment statistics
app.get('/api/experiments/:experimentId/stats', (req, res) => {
  const { experimentId } = req.params;

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  const variantsWithStats = experiment.variants.map(v => ({
    variantId: v.variantId,
    name: v.name,
    isControl: v.isControl,
    visitors: v.stats.visitors,
    conversions: v.stats.conversions,
    conversionRate: v.stats.conversionRate,
    revenue: v.stats.revenue,
    avgOrderValue: v.stats.avgOrderValue.toFixed(2)
  }));

  const control = variantsWithStats.find(v => v.isControl);
  const nonControls = variantsWithStats.filter(v => !v.isControl);

  const upliftResults = nonControls.map(v => {
    const uplift = control ? {
      absolute: (parseFloat(v.conversionRate) - parseFloat(control.conversionRate)).toFixed(4),
      relative: control.conversionRate > 0
        ? (((parseFloat(v.conversionRate) - parseFloat(control.conversionRate)) / parseFloat(control.conversionRate)) * 100).toFixed(2)
        : 0
    } : null;

    return {
      ...v,
      uplift
    };
  });

  res.json({
    success: true,
    data: {
      experimentId: experiment.experimentId,
      name: experiment.name,
      status: experiment.status,
      metric: experiment.metric,
      winner: experiment.winner,
      variants: [...variantsWithStats.map(v => ({
        ...v,
        uplift: v.isControl ? null : upliftResults.find(u => u.variantId === v.variantId)?.uplift
      }))],
      overall: {
        totalVisitors: experiment.stats.totalVisitors,
        totalConversions: experiment.stats.totalConversions,
        conversionRate: experiment.stats.overallConversionRate
      },
      period: {
        startDate: experiment.startDate,
        endDate: experiment.endDate
      }
    }
  });
});

// GET /api/experiments/:experimentId/significance - Calculate statistical significance
app.get('/api/experiments/:experimentId/significance', (req, res) => {
  const { experimentId } = req.params;
  const { confidenceLevel } = req.query;

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  const requiredConfidence = parseFloat(confidenceLevel) || 95;
  const results = [];

  const control = experiment.variants.find(v => v.isControl);
  if (!control) {
    return res.status(400).json({ success: false, error: 'No control variant found' });
  }

  experiment.variants.forEach(variant => {
    if (variant.isControl) return;

    const significance = calculateStatisticalSignificance(
      control.stats.visitors,
      control.stats.conversions,
      variant.stats.visitors,
      variant.stats.conversions,
      requiredConfidence
    );

    results.push({
      variantId: variant.variantId,
      variantName: variant.name,
      controlConversionRate: control.stats.conversionRate,
      variantConversionRate: variant.stats.conversionRate,
      relativeUplift: control.stats.conversionRate > 0
        ? (((parseFloat(variant.stats.conversionRate) - parseFloat(control.stats.conversionRate)) / parseFloat(control.stats.conversionRate)) * 100).toFixed(2)
        : 0,
      confidenceLevel: significance.confidence.toFixed(2),
      isSignificant: significance.isSignificant,
      pValue: significance.pValue.toFixed(6),
      zScore: significance.zScore.toFixed(4),
      recommendedAction: getRecommendation(significance, variant.stats.conversionRate > control.stats.conversionRate)
    });
  });

  const allSignificant = results.every(r => r.isSignificant);
  const bestVariant = results.reduce((best, current) =>
    parseFloat(current.variantConversionRate) > parseFloat(best.variantConversionRate) ? current : best
  , results[0]);

  if (allSignificant && bestVariant) {
    experiment.winner = bestVariant.variantId;
    experiment.statisticalSignificance = requiredConfidence;
    experiments.set(experimentId, experiment);
  }

  res.json({
    success: true,
    data: {
      experimentId,
      requiredConfidence,
      results,
      summary: {
        allSignificant,
        recommendedWinner: bestVariant?.variantId,
        recommendedWinnerName: bestVariant?.variantName,
        action: allSignificant && bestVariant?.isSignificant
          ? 'declare_winner'
          : 'continue_experiment'
      }
    }
  });
});

// GET /api/experiments/:experimentId/auto-winner - Auto-declare winner
app.post('/api/experiments/:experimentId/auto-winner', (req, res) => {
  const { experimentId } = req.params;
  const { confidenceThreshold, minSampleSize } = req.body;

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  if (experiment.status !== 'running') {
    return res.status(400).json({ success: false, error: 'Experiment is not running' });
  }

  const confidence = parseFloat(confidenceThreshold) || 95;
  const minSample = parseInt(minSampleSize) || 100;

  const control = experiment.variants.find(v => v.isControl);
  if (!control) {
    return res.status(400).json({ success: false, error: 'No control variant found' });
  }

  const eligibleVariants = experiment.variants.filter(v =>
    !v.isControl && v.stats.visitors >= minSample
  );

  if (eligibleVariants.length === 0) {
    return res.json({
      success: true,
      data: {
        declared: false,
        reason: `Minimum sample size (${minSample}) not reached by any variant`,
        variants: experiment.variants.map(v => ({
          variantId: v.variantId,
          name: v.name,
          visitors: v.stats.visitors,
          required: minSample
        }))
      }
    });
  }

  let bestVariant = null;
  let bestConfidence = 0;

  for (const variant of eligibleVariants) {
    const significance = calculateStatisticalSignificance(
      control.stats.visitors,
      control.stats.conversions,
      variant.stats.visitors,
      variant.stats.conversions,
      confidence
    );

    if (significance.isSignificant && significance.confidence > bestConfidence) {
      bestConfidence = significance.confidence;
      bestVariant = variant;
    }
  }

  if (bestVariant) {
    experiment.status = 'stopped';
    experiment.winner = bestVariant.variantId;
    experiment.confidenceLevel = bestConfidence;
    experiment.endDate = new Date().toISOString();
    experiment.updatedAt = new Date().toISOString();

    experiment.variants.forEach(v => {
      v.status = 'completed';
    });

    experiments.set(experimentId, experiment);

    return res.json({
      success: true,
      data: {
        declared: true,
        winner: {
          variantId: bestVariant.variantId,
          name: bestVariant.name,
          confidence: bestConfidence.toFixed(2),
          conversionRate: bestVariant.stats.conversionRate,
          relativeUplift: control.stats.conversionRate > 0
            ? (((parseFloat(bestVariant.stats.conversionRate) - parseFloat(control.stats.conversionRate)) / parseFloat(control.stats.conversionRate)) * 100).toFixed(2)
            : 0
        }
      }
    });
  }

  res.json({
    success: true,
    data: {
      declared: false,
      reason: 'No variant reached statistical significance',
      highestConfidence: bestConfidence.toFixed(2)
    }
  });
});

// GET /api/experiments/:experimentId/variants - List variants
app.get('/api/experiments/:experimentId/variants', (req, res) => {
  const { experimentId } = req.params;

  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return res.status(404).json({ success: false, error: 'Experiment not found' });
  }

  res.json({
    success: true,
    data: experiment.variants
  });
});

// GET /api/analytics - Get A/B testing analytics
app.get('/api/analytics', (req, res) => {
  const { companyId, status } = req.query;

  let companyExperiments = Array.from(experiments.values());

  if (companyId) {
    companyExperiments = companyExperiments.filter(e => e.companyId === companyId);
  }
  if (status) {
    companyExperiments = companyExperiments.filter(e => e.status === status);
  }

  const running = companyExperiments.filter(e => e.status === 'running').length;
  const completed = companyExperiments.filter(e => e.status === 'stopped').length;
  const draft = companyExperiments.filter(e => e.status === 'draft').length;

  const totalVisitors = companyExperiments.reduce((sum, e) => sum + e.stats.totalVisitors, 0);
  const totalConversions = companyExperiments.reduce((sum, e) => sum + e.stats.totalConversions, 0);

  const experimentsWithWinners = companyExperiments.filter(e => e.winner).length;
  const avgUplift = calculateAverageUplift(companyExperiments);

  res.json({
    success: true,
    data: {
      summary: {
        totalExperiments: companyExperiments.length,
        running,
        completed,
        draft,
        experimentsWithWinners,
        avgUplift
      },
      totals: {
        totalVisitors,
        totalConversions,
        overallConversionRate: totalVisitors > 0 ? (totalConversions / totalVisitors * 100).toFixed(4) : 0
      },
      experiments: companyExperiments.slice(0, 10).map(e => ({
        experimentId: e.experimentId,
        name: e.name,
        status: e.status,
        metric: e.metric,
        winner: e.winner,
        visitors: e.stats.totalVisitors,
        conversions: e.stats.totalConversions
      }))
    }
  });
});

// ─── Helper Functions ──────────────────────────────────

function hashUserId(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function assignVariant(experiment, userHash) {
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  const normalizedHash = userHash % totalWeight;

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (normalizedHash < cumulative) {
      return variant;
    }
  }

  return experiment.variants[0];
}

function calculateStatisticalSignificance(controlVisitors, controlConversions, variantVisitors, variantConversions, requiredConfidence) {
  if (controlVisitors === 0 || variantVisitors === 0) {
    return { isSignificant: false, confidence: 0, pValue: 1, zScore: 0 };
  }

  const p1 = controlConversions / controlVisitors;
  const p2 = variantConversions / variantVisitors;
  const n1 = controlVisitors;
  const n2 = variantVisitors;

  const pooledP = (controlConversions + variantConversions) / (n1 + n2);
  const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

  if (standardError === 0) {
    return { isSignificant: false, confidence: 0, pValue: 1, zScore: 0 };
  }

  const zScore = (p2 - p1) / standardError;

  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  const confidence = (1 - pValue) * 100;
  const isSignificant = confidence >= requiredConfidence && Math.abs(zScore) > 1.96;

  return {
    isSignificant,
    confidence,
    pValue,
    zScore,
    controlRate: p1,
    variantRate: p2
  };
}

function normalCDF(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function getRecommendation(significance, isBetter) {
  if (!significance.isSignificant) {
    return 'continue_experiment';
  }

  if (significance.confidence >= 99) {
    return isBetter ? 'implement_winner' : 'implement_control';
  }

  return isBetter ? 'consider_implementing' : 'revert_to_control';
}

function calculateAverageUplift(experiments) {
  const uplifts = [];

  experiments.forEach(exp => {
    const control = exp.variants.find(v => v.isControl);
    if (!control || control.stats.conversionRate === 0) return;

    exp.variants.forEach(v => {
      if (v.isControl) return;
      if (v.stats.conversionRate === 0) return;

      const relativeUplift = ((parseFloat(v.stats.conversionRate) - parseFloat(control.stats.conversionRate)) / parseFloat(control.stats.conversionRate)) * 100;
      uplifts.push(relativeUplift);
    });
  });

  if (uplifts.length === 0) return '0.00';

  const avg = uplifts.reduce((sum, u) => sum + u, 0) / uplifts.length;
  return avg.toFixed(2);
}

async function sendToAnalytics(experiment, variant, conversion) {
  try {
    await axios.post(`${ANALYTICS_URL}/api/events/track`, {
      event: 'ab_test_conversion',
      experimentId: experiment.experimentId,
      variantId: variant.variantId,
      userId: conversion.userId,
      value: conversion.value,
      metadata: conversion.metadata
    }, { timeout: 3000 });
  } catch (error) {
    console.log(`[A/B Testing] Analytics send failed: ${error.message}`);
  }
}

app.listen(PORT, () => {
  console.log(`A/B Testing Engine running on port ${PORT}`);
  console.log(`Analytics URL: ${ANALYTICS_URL}`);
});

module.exports = app;
