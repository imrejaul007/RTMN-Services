/**
 * Canary Deployment Support
 * Handles canary deployments with gradual traffic shifting
 */

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const CANARY_FILE = join(DATA_DIR, 'canary.json');

// Initialize data file
if (!existsSync(CANARY_FILE)) {
  writeFileSync(CANARY_FILE, JSON.stringify([]));
}

// Canary progression steps
const CANARY_STEPS = [
  { percent: 5, durationMs: 60000 },   // 1 minute at 5%
  { percent: 10, durationMs: 120000 }, // 2 minutes at 10%
  { percent: 25, durationMs: 300000 }, // 5 minutes at 25%
  { percent: 50, durationMs: 300000 }, // 5 minutes at 50%
  { percent: 100, durationMs: 0 }      // 100% (complete)
];

// Health thresholds for canary promotion
const CANARY_HEALTH_THRESHOLDS = {
  errorRate: 0.02,    // Max 2% error rate
  latencyP99: 1000,   // Max 1000ms latency
  minRequests: 100    // Minimum requests before evaluation
};

function readCanaryData() {
  try {
    return JSON.parse(readFileSync(CANARY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeCanaryData(data) {
  writeFileSync(CANARY_FILE, JSON.stringify(data, null, 2));
}

/**
 * Start a canary deployment
 * @param {string} deploymentId - Parent deployment ID
 * @param {string} agentId - Agent ID
 * @param {string} version - Target version
 * @param {string} environment - Environment
 * @param {Object} baselineMetrics - Metrics from current version
 * @returns {Object} Canary deployment record
 */
export function startCanary(deploymentId, agentId, version, environment, baselineMetrics = {}) {
  const canary = {
    id: uuidv4(),
    deploymentId,
    agentId,
    version,
    environment,
    baselineMetrics,
    status: 'initializing',
    currentStep: 0,
    currentPercent: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    metrics: {
      requests: 0,
      errors: 0,
      totalLatency: 0
    },
    stepHistory: [],
    healthChecks: [],
    logs: ['Canary deployment initialized']
  };

  const canaries = readCanaryData();
  canaries.push(canary);
  writeCanaryData(canaries);

  return canary;
}

/**
 * Update canary traffic percentage
 * @param {string} canaryId - Canary ID
 * @param {number} percent - Traffic percentage for canary
 * @returns {Object|null} Updated canary or null
 */
export function updateCanaryPercent(canaryId, percent) {
  const canaries = readCanaryData();
  const index = canaries.findIndex(c => c.id === canaryId);

  if (index === -1) {
    return null;
  }

  canaries[index].currentPercent = Math.min(100, Math.max(0, percent));
  canaries[index].logs.push(`Traffic updated to ${canaries[index].currentPercent}% at ${new Date().toISOString()}`);

  writeCanaryData(canaries);
  return canaries[index];
}

/**
 * Record canary metrics
 * @param {string} canaryId - Canary ID
 * @param {Object} metrics - New metrics
 * @returns {Object|null} Updated canary or null
 */
export function recordCanaryMetrics(canaryId, metrics) {
  const canaries = readCanaryData();
  const index = canaries.findIndex(c => c.id === canaryId);

  if (index === -1) {
    return null;
  }

  const canary = canaries[index];

  // Update aggregated metrics
  canary.metrics.requests += metrics.requests || 0;
  canary.metrics.errors += metrics.errors || 0;
  canary.metrics.totalLatency += metrics.latency || 0;

  // Calculate current error rate and latency
  const currentErrorRate = canary.metrics.requests > 0
    ? canary.metrics.errors / canary.metrics.requests
    : 0;
  const currentLatency = canary.metrics.requests > 0
    ? canary.metrics.totalLatency / canary.metrics.requests
    : 0;

  // Record health check
  const healthCheck = {
    timestamp: new Date().toISOString(),
    errorRate: currentErrorRate,
    latencyP99: metrics.latencyP99 || currentLatency,
    requests: canary.metrics.requests
  };
  canary.healthChecks.push(healthCheck);

  // Keep only last 100 health checks
  if (canary.healthChecks.length > 100) {
    canary.healthChecks = canary.healthChecks.slice(-100);
  }

  writeCanaryData(canaries);
  return canary;
}

/**
 * Evaluate canary health and determine if it should progress
 * @param {string} canaryId - Canary ID
 * @returns {Object} Evaluation result
 */
export function evaluateCanary(canaryId) {
  const canaries = readCanaryData();
  const index = canaries.findIndex(c => c.id === canaryId);

  if (index === -1) {
    return { success: false, error: 'Canary not found' };
  }

  const canary = canaries[index];
  const lastCheck = canary.healthChecks[canary.healthChecks.length - 1];

  if (!lastCheck) {
    return { success: true, action: 'wait', message: 'Waiting for health data' };
  }

  // Check if minimum requests met
  if (lastCheck.requests < CANARY_HEALTH_THRESHOLDS.minRequests) {
    return {
      success: true,
      action: 'wait',
      message: `Waiting for more requests (${lastCheck.requests}/${CANARY_HEALTH_THRESHOLDS.minRequests})`
    };
  }

  // Evaluate health
  const issues = [];

  if (lastCheck.errorRate > CANARY_HEALTH_THRESHOLDS.errorRate) {
    issues.push(`Error rate ${(lastCheck.errorRate * 100).toFixed(2)}% exceeds threshold ${CANARY_HEALTH_THRESHOLDS.errorRate * 100}%`);
  }

  if (lastCheck.latencyP99 > CANARY_HEALTH_THRESHOLDS.latencyP99) {
    issues.push(`Latency ${lastCheck.latencyP99}ms exceeds threshold ${CANARY_HEALTH_THRESHOLDS.latencyP99}ms`);
  }

  if (issues.length > 0) {
    // Canary is unhealthy - should rollback
    return {
      success: false,
      action: 'rollback',
      message: issues.join('; ')
    };
  }

  // Canary is healthy - check if should progress
  if (canary.currentStep < CANARY_STEPS.length - 1) {
    const nextStep = CANARY_STEPS[canary.currentStep + 1];
    return {
      success: true,
      action: 'promote',
      nextPercent: nextStep.percent,
      durationMs: nextStep.durationMs,
      message: `Canary healthy, promoting to ${nextStep.percent}%`
    };
  }

  // Canary at 100% - complete
  return {
    success: true,
    action: 'complete',
    message: 'Canary deployment complete'
  };
}

/**
 * Promote canary to next step
 * @param {string} canaryId - Canary ID
 * @returns {Object|null} Updated canary or null
 */
export function promoteCanary(canaryId) {
  const canaries = readCanaryData();
  const index = canaries.findIndex(c => c.id === canaryId);

  if (index === -1) {
    return null;
  }

  const canary = canaries[index];

  if (canary.currentStep >= CANARY_STEPS.length - 1) {
    // Already at final step
    return canary;
  }

  canary.currentStep++;
  canary.currentPercent = CANARY_STEPS[canary.currentStep].percent;
  canary.status = 'progressing';

  canary.stepHistory.push({
    step: canary.currentStep,
    percent: canary.currentPercent,
    timestamp: new Date().toISOString()
  });

  canary.logs.push(`Promoted to step ${canary.currentStep}: ${canary.currentPercent}% traffic`);

  writeCanaryData(canaries);
  return canary;
}

/**
 * Complete canary deployment
 * @param {string} canaryId - Canary ID
 * @returns {Object|null} Updated canary or null
 */
export function completeCanary(canaryId) {
  const canaries = readCanaryData();
  const index = canaries.findIndex(c => c.id === canaryId);

  if (index === -1) {
    return null;
  }

  const canary = canaries[index];
  canary.status = 'completed';
  canary.currentPercent = 100;
  canary.completedAt = new Date().toISOString();
  canary.logs.push(`Canary deployment completed at ${canary.completedAt}`);

  writeCanaryData(canaries);
  return canary;
}

/**
 * Abort canary deployment (rollback)
 * @param {string} canaryId - Canary ID
 * @param {string} reason - Abort reason
 * @returns {Object|null} Updated canary or null
 */
export function abortCanary(canaryId, reason = 'Manual abort') {
  const canaries = readCanaryData();
  const index = canaries.findIndex(c => c.id === canaryId);

  if (index === -1) {
    return null;
  }

  const canary = canaries[index];
  canary.status = 'aborted';
  canary.completedAt = new Date().toISOString();
  canary.logs.push(`Canary aborted at ${canary.completedAt}: ${reason}`);

  writeCanaryData(canaries);
  return canary;
}

/**
 * Get canary by ID
 * @param {string} canaryId - Canary ID
 * @returns {Object|null} Canary or null
 */
export function getCanary(canaryId) {
  const canaries = readCanaryData();
  return canaries.find(c => c.id === canaryId) || null;
}

/**
 * Get canary by deployment ID
 * @param {string} deploymentId - Deployment ID
 * @returns {Object|null} Canary or null
 */
export function getCanaryByDeployment(deploymentId) {
  const canaries = readCanaryData();
  return canaries.find(c => c.deploymentId === deploymentId) || null;
}

/**
 * Get all canaries for an agent
 * @param {string} agentId - Agent ID
 * @returns {Array} List of canaries
 */
export function getCanariesByAgent(agentId) {
  const canaries = readCanaryData();
  return canaries
    .filter(c => c.agentId === agentId)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

export default {
  startCanary,
  updateCanaryPercent,
  recordCanaryMetrics,
  evaluateCanary,
  promoteCanary,
  completeCanary,
  abortCanary,
  getCanary,
  getCanaryByDeployment,
  getCanariesByAgent,
  CANARY_STEPS,
  CANARY_HEALTH_THRESHOLDS
};