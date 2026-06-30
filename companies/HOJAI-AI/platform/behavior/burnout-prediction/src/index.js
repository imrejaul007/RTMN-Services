/**
 * Burnout Prediction Service - v1.0.0
 * ====================================
 * Predicts burnout risk based on behavioral signals.
 *
 * Port: 4732
 *
 * Risk Factors:
 * - Sleep deprivation
 * - High work hours
 * - High stress
 * - Low exercise
 * - Poor work-life balance
 * - Emotional exhaustion
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4732;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const profiles = new Map();      // entityId -> Profile
const assessments = new Map();    // entityId -> Assessment[]
const interventions = new Map(); // entityId -> Intervention[]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Risk factor weights
const WEIGHTS = {
  sleep: 0.25,           // Sleep deprivation
  workHours: 0.20,        // Overworking
  stress: 0.20,            // Stress level
  exercise: 0.10,          // Physical activity
  social: 0.10,            // Social connections
  recovery: 0.15           // Weekend/vacation
};

// Normalize value to 0-1 range
function normalize(value, min, max) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Calculate burnout risk score
function calculateBurnoutRisk(data) {
  let riskScore = 0;
  const factors = {};

  // Sleep score (8 hours = optimal, less = higher risk)
  const sleepHours = data.sleepHours || 7;
  factors.sleep = 1 - normalize(sleepHours, 4, 8);
  riskScore += factors.sleep * WEIGHTS.sleep;

  // Work hours score (40 hours = optimal, more = higher risk)
  const workHours = data.workHours || 40;
  factors.workHours = normalize(workHours, 35, 60);
  riskScore += factors.workHours * WEIGHTS.workHours;

  // Stress score (0-10 scale, higher = higher risk)
  const stress = data.stress || 5;
  factors.stress = normalize(stress, 0, 10);
  riskScore += factors.stress * WEIGHTS.stress;

  // Exercise score (7 days/week = optimal, 0 = higher risk)
  const exerciseDays = data.exerciseDays || 3;
  factors.exercise = 1 - normalize(exerciseDays, 0, 7);
  riskScore += factors.exercise * WEIGHTS.exercise;

  // Social score (more social = lower risk)
  const socialHours = data.socialHours || 5;
  factors.social = 1 - normalize(socialHours, 0, 14);
  riskScore += factors.social * WEIGHTS.social;

  // Recovery score (more recovery = lower risk)
  const recoveryHours = data.recoveryHours || 8;
  factors.recovery = 1 - normalize(recoveryHours, 0, 16);
  riskScore += factors.recovery * WEIGHTS.recovery;

  return {
    score: Math.round(riskScore * 100) / 100,
    factors,
    level: getRiskLevel(riskScore)
  };
}

// Get risk level from score
function getRiskLevel(score) {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.2) return 'low';
  return 'minimal';
}

// Generate recommendations based on risk factors
function generateRecommendations(riskData) {
  const recommendations = [];

  if (riskData.factors.sleep > 0.5) {
    recommendations.push({
      priority: 'high',
      category: 'sleep',
      title: 'Improve Sleep Quality',
      description: 'You are averaging less than 6 hours of sleep. Aim for 7-8 hours.',
      action: 'sleep_hygiene'
    });
  }

  if (riskData.factors.workHours > 0.5) {
    recommendations.push({
      priority: 'high',
      category: 'work',
      title: 'Reduce Work Hours',
      description: 'You are working more than 50 hours per week. Consider delegating or setting boundaries.',
      action: 'work_boundary'
    });
  }

  if (riskData.factors.stress > 0.6) {
    recommendations.push({
      priority: 'high',
      category: 'stress',
      title: 'Manage Stress',
      description: 'Your stress level is elevated. Consider mindfulness or therapy.',
      action: 'stress_management'
    });
  }

  if (riskData.factors.exercise > 0.5) {
    recommendations.push({
      priority: 'medium',
      category: 'health',
      title: 'Increase Physical Activity',
      description: 'Regular exercise can reduce stress and improve sleep.',
      action: 'exercise_plan'
    });
  }

  if (riskData.factors.social > 0.5) {
    recommendations.push({
      priority: 'medium',
      category: 'social',
      title: 'Strengthen Social Connections',
      description: 'Spending time with friends and family can buffer stress.',
      action: 'social_activity'
    });
  }

  if (riskData.factors.recovery > 0.5) {
    recommendations.push({
      priority: 'high',
      category: 'recovery',
      title: 'Increase Recovery Time',
      description: 'You need more time for rest and relaxation.',
      action: 'recovery_time'
    });
  }

  return recommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /assess - Create burnout assessment
 */
app.post('/assess', (req, res) => {
  const {
    entityId,
    entityType,  // 'founder' | 'employee' | 'student'
    sleepHours,
    workHours,
    stress,
    exerciseDays,
    socialHours,
    recoveryHours,
    symptoms,  // Array of burnout symptoms
    metadata
  } = req.body;

  if (!entityId) {
    return res.status(400).json({ error: 'entityId required' });
  }

  // Calculate risk
  const riskData = calculateBurnoutRisk({
    sleepHours,
    workHours,
    stress,
    exerciseDays,
    socialHours,
    recoveryHours
  });

  // Generate recommendations
  const recommendations = generateRecommendations(riskData);

  // Create assessment
  const assessment = {
    id: uuidv4(),
    entityId,
    entityType: entityType || 'employee',
    sleepHours: sleepHours || null,
    workHours: workHours || null,
    stress: stress || null,
    exerciseDays: exerciseDays || null,
    socialHours: socialHours || null,
    recoveryHours: recoveryHours || null,
    symptoms: symptoms || [],
    riskScore: riskData.score,
    riskLevel: riskData.level,
    riskFactors: riskData.factors,
    recommendations,
    timestamp: new Date().toISOString()
  };

  // Store assessment
  if (!assessments.has(entityId)) {
    assessments.set(entityId, []);
  }
  assessments.get(entityId).push(assessment);

  // Update profile
  updateProfile(entityId, assessment);

  res.json({
    success: true,
    assessment
  });
});

/**
 * Update entity profile with latest assessment
 */
function updateProfile(entityId, assessment) {
  if (!profiles.has(entityId)) {
    profiles.set(entityId, {
      entityId,
      createdAt: new Date().toISOString(),
      lastAssessment: null,
      avgRiskScore: 0,
      assessmentsCount: 0,
      trend: 'stable',
      currentRiskLevel: 'minimal',
      interventionsCount: 0
    });
  }

  const profile = profiles.get(entityId);
  const history = assessments.get(entityId) || [];

  // Calculate average risk
  const totalScore = history.reduce((sum, a) => sum + a.riskScore, 0);
  profile.avgRiskScore = totalScore / history.length;

  // Calculate trend
  if (history.length >= 3) {
    const recent = history.slice(-3);
    const first = recent[0].riskScore;
    const last = recent[recent.length - 1].riskScore;

    if (last > first + 0.1) profile.trend = 'increasing';
    else if (last < first - 0.1) profile.trend = 'decreasing';
    else profile.trend = 'stable';
  }

  profile.lastAssessment = assessment.timestamp;
  profile.assessmentsCount = history.length;
  profile.currentRiskLevel = assessment.riskLevel;
}

/**
 * GET /profile/:entityId - Get burnout profile
 */
app.get('/profile/:entityId', (req, res) => {
  const { entityId } = req.params;

  const profile = profiles.get(entityId);

  if (!profile) {
    return res.json({
      entityId,
      profile: null,
      message: 'No assessments found'
    });
  }

  const history = assessments.get(entityId) || [];

  res.json({
    entityId,
    profile: {
      ...profile,
      recentAssessments: history.slice(-5)
    }
  });
});

/**
 * GET /history/:entityId - Get assessment history
 */
app.get('/history/:entityId', (req, res) => {
  const { entityId } = req.params;
  const { days, limit } = req.query;

  let history = assessments.get(entityId) || [];

  // Filter by days
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    history = history.filter(a => new Date(a.timestamp) > cutoff);
  }

  // Sort by timestamp descending
  history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply limit
  if (limit) {
    history = history.slice(0, parseInt(limit));
  }

  res.json({
    entityId,
    history,
    count: history.length
  });
});

/**
 * GET /trend/:entityId - Get burnout trend
 */
app.get('/trend/:entityId', (req, res) => {
  const { entityId } = req.params;

  const history = assessments.get(entityId) || [];

  if (history.length < 2) {
    return res.json({
      entityId,
      trend: 'insufficient_data',
      message: 'Need at least 2 assessments for trend analysis'
    });
  }

  // Calculate trend over time
  const trend = calculateTrend(history);

  res.json({
    entityId,
    trend,
    historyLength: history.length,
    currentRisk: history[history.length - 1].riskScore,
    avgRisk: history.reduce((s, a) => s + a.riskScore, 0) / history.length
  });
});

/**
 * Calculate burnout trend
 */
function calculateTrend(history) {
  const sorted = [...history].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  const first = sorted[0].riskScore;
  const last = sorted[sorted.length - 1].riskScore;
  const change = last - first;

  // Find peaks
  let peak = sorted[0];
  sorted.forEach(a => {
    if (a.riskScore > peak.riskScore) peak = a;
  });

  return {
    direction: change > 0.1 ? 'increasing' : change < -0.1 ? 'decreasing' : 'stable',
    change: Math.round(change * 100) / 100,
    peak: {
      score: peak.riskScore,
      level: peak.riskLevel,
      date: peak.timestamp
    },
    span: {
      start: sorted[0].timestamp,
      end: sorted[sorted.length - 1].timestamp
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERVENTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /intervention - Log intervention
 */
app.post('/intervention', (req, res) => {
  const { entityId, type, description, outcome } = req.body;

  if (!entityId || !type) {
    return res.status(400).json({ error: 'entityId and type required' });
  }

  const intervention = {
    id: uuidv4(),
    entityId,
    type,
    description: description || '',
    outcome: outcome || 'pending',
    timestamp: new Date().toISOString()
  };

  if (!interventions.has(entityId)) {
    interventions.set(entityId, []);
  }
  interventions.get(entityId).push(intervention);

  // Update profile
  const profile = profiles.get(entityId);
  if (profile) {
    profile.interventionsCount++;
  }

  res.json({
    success: true,
    intervention
  });
});

/**
 * GET /interventions/:entityId - Get interventions
 */
app.get('/interventions/:entityId', (req, res) => {
  const { entityId } = req.params;

  const entityInterventions = interventions.get(entityId) || [];

  res.json({
    entityId,
    interventions: entityInterventions,
    count: entityInterventions.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QUICK CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /quick-check - Quick burnout risk check
 */
app.post('/quick-check', (req, res) => {
  const { sleepHours, workHours, stress, exerciseDays } = req.body;

  const riskData = calculateBurnoutRisk({
    sleepHours,
    workHours,
    stress,
    exerciseDays
  });

  const recommendations = generateRecommendations(riskData);

  res.json({
    riskScore: riskData.score,
    riskLevel: riskData.level,
    factors: riskData.factors,
    topRecommendations: recommendations.slice(0, 3)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEAM / COMPANY VIEW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /team/:companyId - Get team burnout overview
 */
app.get('/team/:companyId', (req, res) => {
  const { companyId } = req.params;

  // Get all profiles for this company
  const teamProfiles = [];

  profiles.forEach((profile, entityId) => {
    if (entityId.startsWith(`${companyId}:`)) {
      teamProfiles.push(profile);
    }
  });

  if (teamProfiles.length === 0) {
    return res.json({
      companyId,
      team: null,
      message: 'No team data found'
    });
  }

  // Calculate team stats
  const avgRisk = teamProfiles.reduce((sum, p) => sum + p.avgRiskScore, 0) / teamProfiles.length;
  const highRiskCount = teamProfiles.filter(p => p.currentRiskLevel === 'high' || p.currentRiskLevel === 'critical').length;
  const increasingTrendCount = teamProfiles.filter(p => p.trend === 'increasing').length;

  // Risk distribution
  const riskDistribution = {
    critical: teamProfiles.filter(p => p.currentRiskLevel === 'critical').length,
    high: teamProfiles.filter(p => p.currentRiskLevel === 'high').length,
    medium: teamProfiles.filter(p => p.currentRiskLevel === 'medium').length,
    low: teamProfiles.filter(p => p.currentRiskLevel === 'low').length,
    minimal: teamProfiles.filter(p => p.currentRiskLevel === 'minimal').length
  };

  res.json({
    companyId,
    teamSize: teamProfiles.length,
    avgTeamRisk: Math.round(avgRisk * 100) / 100,
    riskDistribution,
    highRiskCount,
    increasingTrendCount,
    recommendations: highRiskCount > teamProfiles.length * 0.3
      ? [{
          priority: 'high',
          title: 'High team burnout risk',
          description: 'More than 30% of team members are at high risk. Consider team-wide interventions.'
        }]
      : []
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /data/:entityId - Clear all data for entity
 */
app.delete('/data/:entityId', (req, res) => {
  const { entityId } = req.params;

  profiles.delete(entityId);
  assessments.delete(entityId);
  interventions.delete(entityId);

  res.json({ success: true, cleared: entityId });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'burnout-prediction',
    port: PORT,
    profiles: profiles.size,
    totalAssessments: Array.from(assessments.values()).reduce((sum, a) => sum + a.length, 0)
  });
});

app.listen(PORT, () => {
  console.log(`Burnout Prediction Service running on port ${PORT}`);
});

export default app;
