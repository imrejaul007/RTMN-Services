/**
 * Agent Rollback Handler
 * Handles rollback to previous agent versions
 */

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import * as registry from './registry.js';
import * as deployer from './deployer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const ROLLBACKS_FILE = join(DATA_DIR, 'rollbacks.json');

// Initialize data file
if (!existsSync(ROLLBACKS_FILE)) {
  writeFileSync(ROLLBACKS_FILE, JSON.stringify([]));
}

function readRollbacks() {
  try {
    return JSON.parse(readFileSync(ROLLBACKS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeRollbacks(rollbacks) {
  writeFileSync(ROLLBACKS_FILE, JSON.stringify(rollbacks, null, 2));
}

/**
 * Get available versions for rollback
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment to rollback
 * @returns {Array} List of available previous versions
 */
export function getAvailableVersionsForRollback(agentId, environment) {
  const agent = registry.getAgentById(agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  const currentVersion = agent.environments[environment];
  if (!currentVersion) {
    return []; // No previous version deployed
  }

  const versions = registry.getVersions(agentId);
  // Filter out current version and return previous versions
  return versions
    .filter(v => v.version !== currentVersion)
    .map(v => ({
      version: v.version,
      createdAt: v.createdAt,
      createdBy: v.createdBy
    }));
}

/**
 * Rollback agent to previous version in an environment
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment to rollback
 * @param {Object} options - Rollback options
 * @returns {Object} Rollback record
 */
export function rollback(agentId, environment, options = {}) {
  const agent = registry.getAgentById(agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  if (!['dev', 'staging', 'prod'].includes(environment)) {
    throw new Error('Invalid environment');
  }

  const currentVersion = agent.environments[environment];
  if (!currentVersion) {
    throw new Error('No previous version to rollback to');
  }

  // Find the previous version to rollback to
  const versions = registry.getVersions(agentId);
  const currentIndex = versions.findIndex(v => v.version === currentVersion);

  if (currentIndex === -1 || currentIndex >= versions.length - 1) {
    throw new Error('No previous version available for rollback');
  }

  const targetVersion = versions[currentIndex + 1].version; // Next oldest version

  const now = new Date().toISOString();
  const rollbackRecord = {
    id: uuidv4(),
    agentId,
    environment,
    fromVersion: currentVersion,
    toVersion: targetVersion,
    reason: options.reason || 'Manual rollback',
    initiatedBy: options.initiatedBy || 'system',
    status: 'initiated',
    createdAt: now,
    completedAt: null,
    logs: [`Rollback initiated at ${now}: ${currentVersion} -> ${targetVersion}`]
  };

  const rollbacks = readRollbacks();
  rollbacks.push(rollbackRecord);
  writeRollbacks(rollbacks);

  return rollbackRecord;
}

/**
 * Complete rollback successfully
 * @param {string} rollbackId - Rollback ID
 * @returns {Object|null} Updated rollback record or null
 */
export function completeRollback(rollbackId) {
  const rollbacks = readRollbacks();
  const index = rollbacks.findIndex(r => r.id === rollbackId);

  if (index === -1) {
    return null;
  }

  const rollback = rollbacks[index];

  if (rollback.status !== 'initiated' && rollback.status !== 'rolling_back') {
    throw new Error('Invalid rollback state');
  }

  // Update rollback record
  rollback.status = 'completed';
  rollback.completedAt = new Date().toISOString();
  rollback.logs.push(`Rollback completed at ${rollback.completedAt}`);

  // Update agent environment to target version
  registry.setEnvironmentVersion(rollback.agentId, rollback.environment, rollback.toVersion);
  registry.setCurrentVersion(rollback.agentId, rollback.toVersion);

  // Create a deployment record for the rollback
  deployer.createDeployment({
    agentId: rollback.agentId,
    version: rollback.toVersion,
    environment: rollback.environment,
    strategy: 'rolling',
    canaryPercent: 0
  });

  // Mark the latest deployment as rolled_back
  const deployments = deployer.getDeploymentsByEnvironment(rollback.agentId, rollback.environment);
  if (deployments.length > 0) {
    deployments[0].status = 'rolled_back';
    deployments[0].logs.push(`Rolled back from ${rollback.fromVersion} to ${rollback.toVersion}`);
  }

  writeRollbacks(rollbacks);
  return rollback;
}

/**
 * Fail rollback
 * @param {string} rollbackId - Rollback ID
 * @param {string} reason - Failure reason
 * @returns {Object|null} Updated rollback record or null
 */
export function failRollback(rollbackId, reason) {
  const rollbacks = readRollbacks();
  const index = rollbacks.findIndex(r => r.id === rollbackId);

  if (index === -1) {
    return null;
  }

  rollbacks[index].status = 'failed';
  rollbacks[index].completedAt = new Date().toISOString();
  rollbacks[index].logs.push(`Rollback failed at ${rollbacks[index].completedAt}: ${reason}`);

  writeRollbacks(rollbacks);
  return rollbacks[index];
}

/**
 * Get rollback by ID
 * @param {string} rollbackId - Rollback ID
 * @returns {Object|null} Rollback record or null
 */
export function getRollback(rollbackId) {
  const rollbacks = readRollbacks();
  return rollbacks.find(r => r.id === rollbackId) || null;
}

/**
 * Get rollback history for an agent
 * @param {string} agentId - Agent ID
 * @returns {Array} List of rollbacks
 */
export function getRollbacksByAgent(agentId) {
  const rollbacks = readRollbacks();
  return rollbacks
    .filter(r => r.agentId === agentId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get rollback history for an agent's environment
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment
 * @returns {Array} List of rollbacks
 */
export function getRollbacksByEnvironment(agentId, environment) {
  const rollbacks = readRollbacks();
  return rollbacks
    .filter(r => r.agentId === agentId && r.environment === environment)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Simulate rollback process (for testing/demo)
 * @param {string} rollbackId - Rollback ID
 * @returns {Promise<Object>} Promise resolving to completed rollback
 */
export async function simulateRollback(rollbackId) {
  const rollbacks = readRollbacks();
  const index = rollbacks.findIndex(r => r.id === rollbackId);

  if (index === -1) {
    throw new Error('Rollback not found');
  }

  rollbacks[index].status = 'rolling_back';
  rollbacks[index].logs.push(`Rollback in progress at ${new Date().toISOString()}`);
  writeRollbacks(rollbacks);

  // Simulate rollback time (50ms)
  await new Promise(resolve => setTimeout(resolve, 50));

  return completeRollback(rollbackId);
}

export default {
  getAvailableVersionsForRollback,
  rollback,
  completeRollback,
  failRollback,
  getRollback,
  getRollbacksByAgent,
  getRollbacksByEnvironment,
  simulateRollback
};