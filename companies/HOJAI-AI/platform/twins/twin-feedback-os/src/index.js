/**
 * Twin Feedback OS
 *
 * Human feedback and corrections loop for employee twins.
 * Employees can approve, reject, or correct their twin's actions.
 *
 * Port: 4736
 *
 * Feedback Types:
 * - approve: Twin was correct
 * - reject: Twin was wrong
 * - correct: Here's the right answer
 * - explain: Here's why I'm doing it this way
 * - suggest: Try this alternative
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

const PORT = process.env.PORT || 4736;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const feedbackStore = new Map();
const correctionPatterns = new Map();
let feedbackIdCounter = 1;

// ============================================================
// TWIN SERVICE CONNECTIONS
// ============================================================

const TWIN_SERVICES = {
  memoryOS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  decisionEngine: process.env.DECISION_ENGINE_URL || 'http://localhost:4240',
  salarOS: process.env.SALAR_OS_URL || 'http://localhost:4710',
  twinLearningOS: process.env.TWIN_LEARNING_OS_URL || 'http://localhost:4735',
};

// ============================================================
// FEEDBACK TYPES & VALIDATION
// ============================================================

const FEEDBACK_TYPES = {
  approve: {
    description: 'Twin was correct',
    impact: 'increases_confidence',
    requiresCorrection: false,
  },
  reject: {
    description: 'Twin was wrong',
    impact: 'decreases_confidence',
    requiresCorrection: false,
  },
  correct: {
    description: 'Here is the correct answer',
    impact: 'updates_pattern',
    requiresCorrection: true,
  },
  explain: {
    description: 'Here is why I am doing it this way',
    impact: 'adds_context',
    requiresCorrection: false,
  },
  suggest: {
    description: 'Try this alternative approach',
    impact: 'adds_option',
    requiresCorrection: false,
  },
};

const CAPABILITY_AREAS = {
  communication: ['email', 'chat', 'meeting', 'proposal', 'report'],
  decision: ['approval', 'selection', 'priority', 'budget', 'timeline'],
  workflow: ['task', 'process', 'automation', 'sequence', 'template'],
  skill: ['sales', 'negotiation', 'analysis', 'coding', 'design'],
  relationship: ['customer', 'partner', 'team', 'stakeholder', 'vendor'],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function fetchTwin(service, path, options = {}) {
  const url = `${TWIN_SERVICES[service]}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error(`[Feedback] Failed to call ${service}:`, error.message);
    return null;
  }
}

/**
 * Calculate new confidence based on feedback
 */
function calculateNewConfidence(currentConfidence, feedbackType) {
  const adjustments = {
    approve: 5,
    reject: -10,
    correct: 0, // Doesn't change, updates pattern instead
    explain: 2,
    suggest: 1,
  };

  const adjustment = adjustments[feedbackType] || 0;
  const newConfidence = Math.max(0, Math.min(100, currentConfidence + adjustment));
  return newConfidence;
}

/**
 * Extract pattern from correction
 */
function extractPattern(feedback) {
  const { capability, twinAction, correction } = feedback;

  return {
    capability,
    trigger: twinAction.context || twinAction.description,
    correctResponse: correction.value,
    reason: correction.reason,
    context: correction.context || {},
    frequency: 1,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update correction patterns
 */
function updateCorrectionPattern(feedback) {
  const key = `${feedback.employeeId}:${feedback.capability}`;
  const existing = correctionPatterns.get(key);

  if (existing) {
    // Update existing pattern
    existing.frequency += 1;
    if (feedback.correction?.reason) {
      existing.reason = feedback.correction.reason;
    }
    existing.lastUpdated = new Date().toISOString();
  } else {
    // Create new pattern
    correctionPatterns.set(key, extractPattern(feedback));
  }
}

/**
 * Apply feedback to relevant twins
 */
async function applyFeedbackToTwins(feedback) {
  const updates = [];

  // Update Memory OS
  if (feedback.feedbackType === 'correct' || feedback.feedbackType === 'explain') {
    await fetchTwin('memoryOS', '/api/memories', {
      method: 'POST',
      body: JSON.stringify({
        twinId: feedback.employeeId,
        type: 'feedback_correction',
        data: {
          capability: feedback.capability,
          correction: feedback.correction,
          timestamp: feedback.timestamp,
        },
      }),
    });
    updates.push('memoryOS');
  }

  // Update Decision Engine
  if (feedback.capabilityArea === 'decision') {
    await fetchTwin('decisionEngine', '/api/decisions/feedback', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: feedback.employeeId,
        decisionId: feedback.twinAction.id,
        feedback: feedback.feedbackType,
        correction: feedback.correction,
      }),
    });
    updates.push('decisionEngine');
  }

  // Update Salar OS (skill confidence)
  if (feedback.capabilityArea === 'skill') {
    const newConfidence = calculateNewConfidence(
      feedback.currentConfidence || 70,
      feedback.feedbackType
    );
    await fetchTwin('salarOS', `/api/human-twin/${feedback.employeeId}/confidence`, {
      method: 'PATCH',
      body: JSON.stringify({
        capability: feedback.capability,
        confidence: newConfidence,
      }),
    });
    updates.push('salarOS');
  }

  return updates;
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'twin-feedback-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    feedbackTypes: Object.keys(FEEDBACK_TYPES),
    totalFeedback: feedbackStore.size,
    patterns: correctionPatterns.size,
  });
});

// Submit feedback
app.post('/api/feedback', requireInternal, async (req, res) => {
  try {
    const { employeeId, capability, capabilityArea, feedbackType, twinAction, correction, currentConfidence } = req.body;

    // Validation
    if (!employeeId || !capability || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: employeeId, capability, feedbackType',
      });
    }

    if (!FEEDBACK_TYPES[feedbackType]) {
      return res.status(400).json({
        success: false,
        error: `Invalid feedbackType. Valid types: ${Object.keys(FEEDBACK_TYPES).join(', ')}`,
      });
    }

    if (FEEDBACK_TYPES[feedbackType].requiresCorrection && !correction) {
      return res.status(400).json({
        success: false,
        error: `Feedback type '${feedbackType}' requires a correction object`,
      });
    }

    console.log(`[Feedback] Received ${feedbackType} feedback from ${employeeId} for ${capability}`);

    // Create feedback record
    const feedback = {
      id: `fb_${feedbackIdCounter++}`,
      employeeId,
      capability,
      capabilityArea: capabilityArea || 'general',
      feedbackType,
      twinAction,
      correction,
      currentConfidence,
      newConfidence: calculateNewConfidence(currentConfidence || 70, feedbackType),
      outcome: 'applied',
      timestamp: new Date().toISOString(),
    };

    // Store feedback
    const employeeFeedback = feedbackStore.get(employeeId) || [];
    employeeFeedback.push(feedback);
    feedbackStore.set(employeeId, employeeFeedback);

    // Update patterns if correction
    if (feedbackType === 'correct' || feedbackType === 'explain') {
      updateCorrectionPattern(feedback);
    }

    // Apply to twins
    const twinUpdates = await applyFeedbackToTwins(feedback);

    res.json({
      success: true,
      data: {
        feedbackId: feedback.id,
        feedbackType,
        newConfidence: feedback.newConfidence,
        twinsUpdated: twinUpdates,
        patternLearned: feedbackType === 'correct' || feedbackType === 'explain',
      },
    });
  } catch (error) {
    console.error('[Feedback] Error processing feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Batch feedback submission
app.post('/api/feedback/batch', requireInternal, async (req, res) => {
  try {
    const { feedback: feedbackList } = req.body;

    if (!Array.isArray(feedbackList)) {
      return res.status(400).json({
        success: false,
        error: 'Feedback must be an array',
      });
    }

    const results = [];
    for (const fb of feedbackList) {
      try {
        const result = await applyFeedbackToTwins(fb);
        results.push({ employeeId: fb.employeeId, success: true, twinsUpdated: result });
      } catch (e) {
        results.push({ employeeId: fb.employeeId, success: false, error: e.message });
      }
    }

    res.json({
      success: true,
      processed: feedbackList.length,
      results,
    });
  } catch (error) {
    console.error('[Feedback] Error processing batch:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get feedback history
app.get('/api/feedback/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const feedback = feedbackStore.get(employeeId) || [];

  res.json({
    success: true,
    data: {
      employeeId,
      totalFeedback: feedback.length,
      byType: feedback.reduce((acc, fb) => {
        acc[fb.feedbackType] = (acc[fb.feedbackType] || 0) + 1;
        return acc;
      }, {}),
      recent: feedback.slice(-10).reverse(),
    },
  });
});

// Get correction patterns for employee
app.get('/api/patterns/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const patterns = [];

  for (const [key, pattern] of correctionPatterns) {
    if (key.startsWith(`${employeeId}:`)) {
      patterns.push({ ...pattern, key });
    }
  }

  res.json({
    success: true,
    data: {
      employeeId,
      patterns,
      total: patterns.length,
    },
  });
});

// Get capability confidence
app.get('/api/confidence/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const feedback = feedbackStore.get(employeeId) || [];

  // Calculate confidence per capability
  const confidenceByCapability = {};

  for (const fb of feedback) {
    if (!confidenceByCapability[fb.capability]) {
      confidenceByCapability[fb.capability] = {
        capability: fb.capability,
        currentConfidence: 70, // Default starting confidence
        totalFeedback: 0,
        approvals: 0,
        rejections: 0,
      };
    }

    const cap = confidenceByCapability[fb.capability];
    cap.totalFeedback += 1;
    cap.currentConfidence = fb.newConfidence;

    if (fb.feedbackType === 'approve') cap.approvals += 1;
    if (fb.feedbackType === 'reject') cap.rejections += 1;
  }

  const capabilities = Object.values(confidenceByCapability);

  res.json({
    success: true,
    data: {
      employeeId,
      overallConfidence: capabilities.length > 0
        ? Math.round(capabilities.reduce((sum, c) => sum + c.currentConfidence, 0) / capabilities.length)
        : 0,
      capabilities,
      totalFeedback: feedback.length,
    },
  });
});

// Get feedback statistics
app.get('/api/stats', (req, res) => {
  let totalFeedback = 0;
  const typeCount = {};
  const capabilityCount = {};

  for (const feedback of feedbackStore.values()) {
    totalFeedback += feedback.length;
    for (const fb of feedback) {
      typeCount[fb.feedbackType] = (typeCount[fb.feedbackType] || 0) + 1;
      capabilityCount[fb.capability] = (capabilityCount[fb.capability] || 0) + 1;
    }
  }

  res.json({
    success: true,
    data: {
      totalFeedback,
      employeesProvidingFeedback: feedbackStore.size,
      feedbackByType: typeCount,
      topCapabilities: Object.entries(capabilityCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cap, count]) => ({ capability: cap, count })),
      patternsLearned: correctionPatterns.size,
    },
  });
});

// Quick approve/reject endpoints
app.post('/api/feedback/:feedbackId/approve', requireInternal, (req, res) => {
  // For approving a specific feedback
  res.json({
    success: true,
    message: 'Feedback approved',
  });
});

app.post('/api/feedback/:feedbackId/reject', requireInternal, (req, res) => {
  // For rejecting a specific feedback
  res.json({
    success: true,
    message: 'Feedback rejected',
  });
});

// RLHF endpoint for training data
app.get('/api/rlhf/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const feedback = feedbackStore.get(employeeId) || [];

  // Format as RLHF training data
  const trainingData = feedback
    .filter(fb => fb.feedbackType === 'correct' || fb.feedbackType === 'reject')
    .map(fb => ({
      instruction: fb.twinAction.description,
      input: fb.twinAction.context || {},
      output_preferred: fb.correction?.value || null,
      output_rejected: fb.feedbackType === 'reject' ? fb.twinAction.value : null,
      metadata: {
        capability: fb.capability,
        reason: fb.correction?.reason,
        timestamp: fb.timestamp,
      },
    }));

  res.json({
    success: true,
    data: {
      employeeId,
      trainingExamples: trainingData.length,
      examples: trainingData,
    },
  });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              Twin Feedback OS - Started                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Feedback Types:                                             ║
║    - approve  (Twin was correct)                            ║
║    - reject   (Twin was wrong)                             ║
║    - correct  (Here is the correct answer)                  ║
║    - explain  (Here is why I am doing it this way)         ║
║    - suggest  (Try this alternative)                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
