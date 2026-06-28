/**
 * Agent Health Monitor
 * Monitors agent health and auto-retires unhealthy agents
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import * as registry from './registry.js';
import * as deployer from './deployer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// Health thresholds
const HEALTH_THRESHOLDS = {
  errorRate: {
    warning: 0.01,    // 1% error rate
    critical: 0.05    // 5% error rate
  },
  latencyP99: {
    warning: 500,     // 500ms
    critical: 2000    // 2000ms
  },
  requestsPerSec: {
    minWarning: 1     // Less than 1 req/sec might indicate issues
  }
};

// Auto-retirement settings
const AUTO_RETIRE_CONFIG = {
  enabled: true,
  consecutiveUnhealthyChecks: 3,
  checkIntervalMs: 60000 // 1 minute
};

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const HEALTH_FILE = join(DATA_DIR, 'health.json');

// Initialize data file
if (!existsSync(HEALTH_FILE)) {
  writeFileSync(HEALTH_FILE, JSON.stringify({}));
}

function readHealthData() {
  try {
    return JSON.parse(readFileSync(HEALTH_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeHealthData(data) {
  writeFileSync(HEALTH_FILE, JSON.stringify(data, null, 2));
}

/**
 * Calculate health status based on metrics
 * @param {Object} metrics - Agent metrics
 * @returns {Object} Health status with score and status
 */
export function calculateHealthStatus(metrics) {
  const score = {
    errorRate: 100,
    latency: 100,
    throughput: 100
  };

  const issues = [];

  // Check error rate
  if (metrics.errorRate >= HEALTH_THRESHOLDS.errorRate.critical) {
    score.errorRate = 0;
    issues.push('CRITICAL: Error rate exceeds 5%');
  } else if (metrics.errorRate >= HEALTH_THRESHOLDS.errorRate.warning) {
    score.errorRate = 50;
    issues.push('WARNING: Error rate exceeds 1%');
  } else {
    score.errorRate = 100 - (metrics.errorRate * 100);
  }

  // Check latency
  if (metrics.latencyP99 >= HEALTH_THRESHOLDS.latencyP99.critical) {
    score.latency = 0;
    issues.push('CRITICAL: P99 latency exceeds 2000ms');
  } else if (metrics.latencyP99 >= HEALTH_THRESHOLDS.latencyP99.warning) {
    score.latency = 50;
    issues.push('WARNING: P99 latency exceeds 500ms');
  } else {
    score.latency = Math.max(0, 100 - (metrics.latencyP99 / HEALTH_THRESHOLDS.latencyP99.warning * 100));
  }

  // Check throughput
  if (metrics.requestsPerSec < HEALTH_THRESHOLDS.requestsPerSec.minWarning) {
    score.throughput = 50;
    issues.push('WARNING: Request throughput below minimum threshold');
  } else {
    score.throughput = Math.min(100, metrics.requestsPerSec * 2);
  }

  // Calculate overall score (weighted average)
  const overallScore = (score.errorRate * 0.4) + (score.latency * 0.3) + (score.throughput * 0.3);

  // Determine status
  let status = 'healthy';
  if (overallScore < 30 || score.errorRate === 0 || score.latency === 0) {
    status = 'critical';
  } else if (overallScore < 60 || score.errorRate < 50) {
    status = 'unhealthy';
  } else if (overallScore < 80 || issues.length > 0) {
    status = 'degraded';
  }

  return {
    score: Math.round(overallScore),
    status,
    componentScores: score,
    issues,
    timestamp: new Date().toISOString()
  };
}

/**
 * Update health data for an agent
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment
 * @param {Object} metrics - Agent metrics
 * @returns {Object} Health status
 */
export function updateHealth(agentId, environment, metrics) {
  const agent = registry.getAgentById(agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  const healthData = readHealthData();
  const key = `${agentId}:${environment}`;

  const currentHealth = calculateHealthStatus(metrics);

  // Get or create health record
  if (!healthData[key]) {
    healthData[key] = {
      agentId,
      environment,
      consecutiveUnhealthy: 0,
      history: [],
      lastChecked: null
    };
  }

  const record = healthData[key];

  // Update consecutive unhealthy count
  if (currentHealth.status === 'critical' || currentHealth.status === 'unhealthy') {
    record.consecutiveUnhealthy++;
  } else {
    record.consecutiveUnhealthy = 0;
  }

  // Add to history (keep last 100 entries)
  record.history.push({
    ...currentHealth,
    metrics
  });
  if (record.history.length > 100) {
    record.history = record.history.slice(-100);
  }

  record.lastChecked = new Date().toISOString();

  // Check for auto-retirement
  if (AUTO_RETIRE_CONFIG.enabled &&
      record.consecutiveUnhealthy >= AUTO_RETIRE_CONFIG.consecutiveUnhealthyChecks) {
    // Mark deployment as unhealthy
    const deployments = deployer.getDeploymentsByEnvironment(agentId, environment);
    if (deployments.length > 0) {
      const latestDeployment = deployments[0];
      if (latestDeployment.status === 'healthy') {
        deployer.failDeployment(latestDeployment.id, 'Auto-retirement: consecutive unhealthy checks');
      }
    }
    currentHealth.autoRetiring = true;
    currentHealth.autoRetireMessage = `Agent auto-retiring after ${record.consecutiveUnhealthy} consecutive unhealthy checks`;
  }

  writeHealthData(healthData);
  return currentHealth;
}

/**
 * Get health status for an agent in an environment
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment
 * @returns {Object|null} Health status or null
 */
export function getHealth(agentId, environment) {
  const healthData = readHealthData();
  const key = `${agentId}:${environment}`;
  return healthData[key] || null;
}

/**
 * Get health status across all environments for an agent
 * @param {string} agentId - Agent ID
 * @returns {Object} Health status for all environments
 */
export function getAgentHealth(agentId) {
  const agent = registry.getAgentById(agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  const environments = ['dev', 'staging', 'prod'];
  const health = {};

  for (const env of environments) {
    const envHealth = getHealth(agentId, env);
    if (envHealth) {
      health[env] = {
        status: envHealth.history.length > 0
          ? envHealth.history[envHealth.history.length - 1].status
          : 'unknown',
        score: envHealth.history.length > 0
          ? envHealth.history[envHealth.history.length - 1].score
          : 0,
        consecutiveUnhealthy: envHealth.consecutiveUnhealthy,
        lastChecked: envHealth.lastChecked
      };
    } else {
      health[env] = {
        status: 'unknown',
        score: 0,
        consecutiveUnhealthy: 0,
        lastChecked: null
      };
    }
  }

  // Calculate overall health
  const scores = Object.values(health).map(h => h.score);
  const overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const statuses = Object.values(health).map(h => h.status);

  let overallStatus = 'healthy';
  if (statuses.includes('critical')) {
    overallStatus = 'critical';
  } else if (statuses.includes('unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded';
  } else if (statuses.includes('unknown')) {
    overallStatus = 'unknown';
  }

  return {
    agentId,
    overallScore: Math.round(overallScore),
    overallStatus,
    environments: health,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get health history for an agent
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment
 * @param {number} limit - Maximum number of records
 * @returns {Array} Health history
 */
export function getHealthHistory(agentId, environment, limit = 50) {
  const healthData = readHealthData();
  const key = `${agentId}:${environment}`;

  if (!healthData[key]) {
    return [];
  }

  return healthData[key].history.slice(-limit).reverse();
}

/**
 * Reset health data for an agent
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment
 * @returns {boolean} Success
 */
export function resetHealth(agentId, environment) {
  const healthData = readHealthData();
  const key = `${agentId}:${environment}`;

  if (!healthData[key]) {
    return false;
  }

  healthData[key].consecutiveUnhealthy = 0;
  writeHealthData(healthData);
  return true;
}

export default {
  calculateHealthStatus,
  updateHealth,
  getHealth,
  getAgentHealth,
  getHealthHistory,
  resetHealth,
  HEALTH_THRESHOLDS,
  AUTO_RETIRE_CONFIG
};