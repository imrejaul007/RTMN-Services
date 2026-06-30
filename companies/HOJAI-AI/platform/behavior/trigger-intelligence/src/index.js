/**
 * Trigger Intelligence Service - v1.0.0
 * =======================================
 * Maps triggers to behaviors and predicts behavior patterns.
 *
 * Port: 4731 (conflicts with habit-engine, using 4735)
 *
 * The trigger chain:
 * Trigger -> Emotion -> Decision -> Action -> Outcome
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4735;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const triggers = new Map();       // triggerId -> Trigger
const behaviors = new Map();      // entityId -> Behavior[]
const triggerChain = new Map();   // entityId -> Chain[]
const predictions = new Map();     // entityId -> Prediction[]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getOrCreate(entityId, map) {
  if (!map.has(entityId)) map.set(entityId, []);
  return map.get(entityId);
}

// Categorize trigger type
function categorizeTrigger(trigger) {
  const lower = trigger.toLowerCase();

  if (/\b(deadline|pressure|rush|urgent)\b/.test(lower)) return 'time_pressure';
  if (/\b(family|friends|relationships|spouse)\b/.test(lower)) return 'social';
  if (/\b(work|project|meeting|presentation)\b/.test(lower)) return 'work';
  if (/\b(money|financial|budget|debt)\b/.test(lower)) return 'financial';
  if (/\b(health|exercise|sleep|energy)\b/.test(lower)) return 'health';
  if (/\b(feedback|criticism|rejection)\b/.test(lower)) return 'social_feedback';
  if (/\b(success|win|achievement|celebration)\b/.test(lower)) return 'achievement';
  if (/\b(failure|mistake|error|loss)\b/.test(lower)) return 'failure';

  return 'general';
}

// Categorize emotion
function categorizeEmotion(emotion) {
  const lower = (emotion || '').toLowerCase();

  if (/\b(angry|frustrated|irritated)\b/.test(lower)) return 'anger';
  if (/\b(sad|depressed|hopeless)\b/.test(lower)) return 'sadness';
  if (/\b(anxious|worried|stressed|nervous)\b/.test(lower)) return 'anxiety';
  if (/\b(fear|scared|afraid|terrified)\b/.test(lower)) return 'fear';
  if (/\b(happy|joyful|excited|delighted)\b/.test(lower)) return 'joy';
  if (/\b(calm|peaceful|relaxed)\b/.test(lower)) return 'calm';
  if (/\b(confused|uncertain|lost)\b/.test(lower)) return 'confusion';

  return 'neutral';
}

// Determine outcome type
function determineOutcome(action) {
  const lower = (action || '').toLowerCase();

  if (/\b(work|focus|productive|complete)\b/.test(lower)) return 'productive';
  if (/\b(avoid|procrastinate|escape|skip)\b/.test(lower)) return 'avoidance';
  if (/\b(communicate|talk|express|share)\b/.test(lower)) return 'communication';
  if (/\b(exercise|meditate|rest|sleep)\b/.test(lower)) return 'self_care';
  if (/\b(healthy|balance|boundary)\b/.test(lower)) return 'healthy';
  if (/\b(unhealthy|excessive|binge|over)\b/.test(lower)) return 'unhealthy';

  return 'neutral';
}

// Calculate trigger strength
function calculateTriggerStrength(observations) {
  if (observations.length === 0) return 0;
  const consistent = observations.filter(o => o.consistent).length;
  return consistent / observations.length;
}

// Predict behavior based on patterns
function predictBehavior(entityId, trigger) {
  const chains = triggerChain.get(entityId) || [];
  const triggerType = categorizeTrigger(trigger);

  // Find similar chains
  const similar = chains.filter(c =>
    categorizeTrigger(c.trigger) === triggerType ||
    c.trigger.toLowerCase().includes(trigger.toLowerCase())
  );

  if (similar.length === 0) {
    return {
      confidence: 0,
      prediction: 'unknown',
      basedOn: 0
    };
  }

  // Count outcomes
  const outcomeCounts = {};
  similar.forEach(chain => {
    const outcome = determineOutcome(chain.action);
    outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
  });

  const mostLikely = Object.entries(outcomeCounts)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    trigger: trigger,
    triggerType,
    prediction: mostLikely ? mostLikely[0] : 'unknown',
    confidence: similar.length / (chains.length || 1),
    basedOn: similar.length,
    alternativeOutcomes: Object.entries(outcomeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(1, 4)
      .map(([outcome, count]) => ({ outcome, probability: count / similar.length }))
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /trigger - Register a trigger
 */
app.post('/trigger', (req, res) => {
  const { entityId, trigger, description, category, tags } = req.body;

  if (!entityId || !trigger) {
    return res.status(400).json({ error: 'entityId and trigger required' });
  }

  const triggerId = uuidv4();
  const triggerData = {
    id: triggerId,
    entityId,
    trigger,
    description: description || '',
    category: category || categorizeTrigger(trigger),
    tags: tags || [],
    observations: [],
    createdAt: new Date().toISOString()
  };

  triggers.set(triggerId, triggerData);

  res.json({
    success: true,
    trigger: triggerData
  });
});

/**
 * GET /triggers/:entityId - Get all triggers for entity
 */
app.get('/triggers/:entityId', (req, res) => {
  const { entityId } = req.params;

  const entityTriggers = Array.from(triggers.values())
    .filter(t => t.entityId === entityId);

  res.json({
    entityId,
    triggers: entityTriggers,
    count: entityTriggers.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BEHAVIOR TRACKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /behavior - Record a behavior
 */
app.post('/behavior', (req, res) => {
  const { entityId, trigger, emotion, action, outcome, context, metadata } = req.body;

  if (!entityId || !action) {
    return res.status(400).json({ error: 'entityId and action required' });
  }

  const behavior = {
    id: uuidv4(),
    entityId,
    trigger: trigger || 'unknown',
    triggerType: categorizeTrigger(trigger || ''),
    emotion: emotion || 'neutral',
    emotionType: categorizeEmotion(emotion),
    action,
    outcome: outcome || determineOutcome(action),
    outcomeType: determineOutcome(outcome || action),
    context: context || 'general',
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  };

  getOrCreate(entityId, behaviors).push(behavior);

  // Update trigger chain
  if (trigger) {
    updateTriggerChain(entityId, behavior);
  }

  res.json({
    success: true,
    behavior
  });
});

/**
 * Update trigger chain
 */
function updateTriggerChain(entityId, behavior) {
  const chain = getOrCreate(entityId, triggerChain);

  const entry = {
    id: uuidv4(),
    entityId,
    trigger: behavior.trigger,
    triggerType: behavior.triggerType,
    emotion: behavior.emotion,
    emotionType: behavior.emotionType,
    action: behavior.action,
    outcome: behavior.outcome,
    outcomeType: behavior.outcomeType,
    timestamp: behavior.timestamp
  };

  chain.push(entry);

  // Keep last 100 entries
  if (chain.length > 100) chain.shift();
}

/**
 * GET /behaviors/:entityId - Get behaviors for entity
 */
app.get('/behaviors/:entityId', (req, res) => {
  const { entityId } = req.params;
  const { triggerType, outcomeType, limit } = req.query;

  let behaviorsList = behaviors.get(entityId) || [];

  if (triggerType) {
    behaviorsList = behaviorsList.filter(b => b.triggerType === triggerType);
  }

  if (outcomeType) {
    behaviorsList = behaviorsList.filter(b => b.outcomeType === outcomeType);
  }

  behaviorsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (limit) {
    behaviorsList = behaviorsList.slice(0, parseInt(limit));
  }

  res.json({
    entityId,
    behaviors: behaviorsList,
    count: behaviorsList.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PREDICTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /predict - Predict behavior for trigger
 */
app.post('/predict', (req, res) => {
  const { entityId, trigger } = req.body;

  if (!entityId || !trigger) {
    return res.status(400).json({ error: 'entityId and trigger required' });
  }

  const prediction = predictBehavior(entityId, trigger);

  // Store prediction
  getOrCreate(entityId, predictions).push({
    ...prediction,
    id: uuidv4(),
    timestamp: new Date().toISOString()
  });

  res.json({
    entityId,
    ...prediction
  });
});

/**
 * POST /intervention - Suggest intervention
 */
app.post('/intervention', (req, res) => {
  const { entityId, trigger } = req.body;

  if (!entityId || !trigger) {
    return res.status(400).json({ error: 'entityId and trigger required' });
  }

  const prediction = predictBehavior(entityId, trigger);
  const triggerType = categorizeTrigger(trigger);

  // Generate interventions based on trigger type
  const interventions = generateInterventions(triggerType, prediction.prediction);

  res.json({
    entityId,
    trigger,
    triggerType,
    currentPattern: prediction.prediction,
    interventions,
    confidence: prediction.confidence
  });
});

/**
 * Generate interventions based on trigger and outcome
 */
function generateInterventions(triggerType, currentOutcome) {
  const interventions = [];

  // Default interventions based on trigger type
  switch (triggerType) {
    case 'time_pressure':
      interventions.push({
        type: 'time_management',
        suggestion: 'Break tasks into smaller chunks',
        action: 'pomodoro_timer'
      });
      interventions.push({
        type: 'stress_reduction',
        suggestion: 'Take a 5-minute break before continuing',
        action: 'breathing_exercise'
      });
      break;

    case 'work':
      interventions.push({
        type: 'boundary',
        suggestion: 'Set clear work boundaries',
        action: 'set_availability'
      });
      break;

    case 'social':
      interventions.push({
        type: 'communication',
        suggestion: 'Express feelings openly',
        action: 'scheduled_checkin'
      });
      break;

    case 'financial':
      interventions.push({
        type: 'planning',
        suggestion: 'Create a financial plan',
        action: 'budget_template'
      });
      break;

    default:
      interventions.push({
        type: 'mindfulness',
        suggestion: 'Practice present-moment awareness',
        action: 'meditation'
      });
  }

  // Adjust based on current outcome
  if (currentOutcome === 'avoidance') {
    interventions.push({
      type: 'motivation',
      suggestion: 'Start with just 5 minutes',
      action: 'micro_task'
    });
  }

  if (currentOutcome === 'unhealthy') {
    interventions.push({
      type: 'substitution',
      suggestion: 'Replace with healthier alternative',
      action: 'healthy_alternatives'
    });
  }

  return interventions;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /analytics/:entityId - Get trigger analytics
 */
app.get('/analytics/:entityId', (req, res) => {
  const { entityId } = req.params;

  const chains = triggerChain.get(entityId) || [];
  const behaviorsList = behaviors.get(entityId) || [];

  if (chains.length === 0) {
    return res.json({
      entityId,
      analytics: {
        totalObservations: 0,
        topTriggers: [],
        topOutcomes: [],
        triggerPatterns: [],
        recommendations: []
      }
    });
  }

  // Count trigger types
  const triggerCounts = {};
  chains.forEach(c => {
    triggerCounts[c.triggerType] = (triggerCounts[c.triggerType] || 0) + 1;
  });

  // Count outcomes
  const outcomeCounts = {};
  chains.forEach(c => {
    outcomeCounts[c.outcomeType] = (outcomeCounts[c.outcomeType] || 0) + 1;
  });

  // Find patterns (trigger -> emotion -> outcome)
  const patterns = findPatterns(chains);

  // Generate recommendations
  const recommendations = generateRecommendations(triggerCounts, outcomeCounts, patterns);

  res.json({
    entityId,
    analytics: {
      totalObservations: chains.length,
      topTriggers: Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
      topOutcomes: Object.entries(outcomeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
      triggerPatterns: patterns.slice(0, 5),
      recommendations
    }
  });
});

/**
 * Find patterns in trigger chains
 */
function findPatterns(chains) {
  const patterns = [];

  // Group by trigger type
  const byTrigger = {};
  chains.forEach(c => {
    if (!byTrigger[c.triggerType]) byTrigger[c.triggerType] = [];
    byTrigger[c.triggerType].push(c);
  });

  // Find dominant emotion/outcome per trigger type
  for (const [triggerType, entries] of Object.entries(byTrigger)) {
    const emotionCounts = {};
    const outcomeCounts = {};

    entries.forEach(e => {
      emotionCounts[e.emotionType] = (emotionCounts[e.emotionType] || 0) + 1;
      outcomeCounts[e.outcomeType] = (outcomeCounts[e.outcomeType] || 0) + 1;
    });

    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    const topOutcome = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])[0];

    patterns.push({
      triggerType,
      frequency: entries.length,
      typicalEmotion: topEmotion ? topEmotion[0] : 'neutral',
      typicalOutcome: topOutcome ? topOutcome[0] : 'neutral',
      consistency: Math.max(topEmotion[1], topOutcome[1]) / entries.length
    });
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Generate recommendations based on analytics
 */
function generateRecommendations(triggerCounts, outcomeCounts, patterns) {
  const recommendations = [];

  // Find unhealthy patterns
  if (outcomeCounts.avoidance > 3) {
    recommendations.push({
      type: 'avoidance',
      priority: 'high',
      suggestion: 'You often avoid tasks when triggered. Try breaking tasks into smaller steps.'
    });
  }

  if (outcomeCounts.unhealthy > 2) {
    recommendations.push({
      type: 'health',
      priority: 'high',
      suggestion: 'Consider healthier alternatives when stressed.'
    });
  }

  // Find most common trigger
  const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0];
  if (topTrigger) {
    recommendations.push({
      type: 'awareness',
      priority: 'medium',
      suggestion: `"${topTrigger[0]}" is your most common trigger. Being aware is the first step.`
    });
  }

  // Find most common outcome
  const topOutcome = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])[0];
  if (topOutcome && topOutcome[0] === 'productive') {
    recommendations.push({
      type: 'strength',
      priority: 'low',
      suggestion: 'You handle triggers productively. Leverage this strength.'
    });
  }

  return recommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /trigger/:entityId/:triggerId - Delete trigger
 */
app.delete('/trigger/:entityId/:triggerId', (req, res) => {
  const { triggerId } = req.params;

  if (!triggers.has(triggerId)) {
    return res.status(404).json({ error: 'Trigger not found' });
  }

  triggers.delete(triggerId);

  res.json({ success: true, deletedId: triggerId });
});

/**
 * DELETE /data/:entityId - Clear all data for entity
 */
app.delete('/data/:entityId', (req, res) => {
  const { entityId } = req.params;

  behaviors.delete(entityId);
  triggerChain.delete(entityId);
  predictions.delete(entityId);

  // Remove triggers for entity
  for (const [id, trigger] of triggers) {
    if (trigger.entityId === entityId) {
      triggers.delete(id);
    }
  }

  res.json({ success: true, cleared: entityId });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'trigger-intelligence',
    port: PORT,
    triggers: triggers.size,
    entities: behaviors.size
  });
});

app.listen(PORT, () => {
  console.log(`Trigger Intelligence Service running on port ${PORT}`);
});

export default app;
