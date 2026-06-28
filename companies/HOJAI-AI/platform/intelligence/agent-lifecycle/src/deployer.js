/**
 * Agent Deployer
 * Handles deployment logic for agents across environments
 */

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import * as registry from './registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const DEPLOYMENTS_FILE = join(DATA_DIR, 'deployments.json');

// Initialize data file
if (!existsSync(DEPLOYMENTS_FILE)) {
  writeFileSync(DEPLOYMENTS_FILE, JSON.stringify([]));
}

function readDeployments() {
  try {
    return JSON.parse(readFileSync(DEPLOYMENTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeDeployments(deployments) {
  writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2));
}

/**
 * Create a new deployment
 * @param {Object} deployData - Deployment configuration
 * @returns {Object} Deployment record
 */
export function createDeployment(deployData) {
  const agent = registry.getAgentById(deployData.agentId);
  if (!agent) {
    throw new Error('Agent not found');
  }

  const version = registry.getVersion(deployData.agentId, deployData.version);
  if (!version) {
    throw new Error('Version not found');
  }

  if (!['dev', 'staging', 'prod'].includes(deployData.environment)) {
    throw new Error('Invalid environment');
  }

  if (!['rolling', 'canary', 'bluegreen'].includes(deployData.strategy)) {
    throw new Error('Invalid deployment strategy');
  }

  const now = new Date().toISOString();
  const deployment = {
    id: uuidv4(),
    agentId: deployData.agentId,
    version: deployData.version,
    environment: deployData.environment,
    strategy: deployData.strategy,
    status: 'pending',
    canaryPercent: deployData.canaryPercent || 0,
    startedAt: now,
    completedAt: null,
    metrics: {
      requestsPerSec: 0,
      errorRate: 0,
      latencyP99: 0
    },
    previousVersion: agent.environments[deployData.environment],
    logs: [`Deployment created at ${now}`]
  };

  const deployments = readDeployments();
  deployments.push(deployment);
  writeDeployments(deployments);

  return deployment;
}

/**
 * Start deployment (transition from pending to deploying)
 * @param {string} deploymentId - Deployment ID
 * @returns {Object|null} Updated deployment or null
 */
export function startDeployment(deploymentId) {
  const deployments = readDeployments();
  const index = deployments.findIndex(d => d.id === deploymentId);

  if (index === -1) {
    return null;
  }

  if (deployments[index].status !== 'pending') {
    throw new Error('Deployment can only be started from pending state');
  }

  deployments[index].status = 'deploying';
  deployments[index].logs.push(`Deployment started at ${new Date().toISOString()}`);
  writeDeployments(deployments);

  return deployments[index];
}

/**
 * Complete deployment successfully
 * @param {string} deploymentId - Deployment ID
 * @param {Object} metrics - Final deployment metrics
 * @returns {Object|null} Updated deployment or null
 */
export function completeDeployment(deploymentId, metrics = {}) {
  const deployments = readDeployments();
  const index = deployments.findIndex(d => d.id === deploymentId);

  if (index === -1) {
    return null;
  }

  const deployment = deployments[index];
  deployment.status = 'healthy';
  deployment.completedAt = new Date().toISOString();
  deployment.metrics = {
    requestsPerSec: metrics.requestsPerSec || 0,
    errorRate: metrics.errorRate || 0,
    latencyP99: metrics.latencyP99 || 0
  };
  deployment.logs.push(`Deployment completed at ${deployment.completedAt}`);

  // Update agent's environment to point to this version
  registry.setEnvironmentVersion(deployment.agentId, deployment.environment, deployment.version);
  registry.setCurrentVersion(deployment.agentId, deployment.version);

  writeDeployments(deployments);
  return deployment;
}

/**
 * Mark deployment as failed
 * @param {string} deploymentId - Deployment ID
 * @param {string} reason - Failure reason
 * @returns {Object|null} Updated deployment or null
 */
export function failDeployment(deploymentId, reason = 'Unknown error') {
  const deployments = readDeployments();
  const index = deployments.findIndex(d => d.id === deploymentId);

  if (index === -1) {
    return null;
  }

  const deployment = deployments[index];
  deployment.status = 'unhealthy';
  deployment.completedAt = new Date().toISOString();
  deployment.logs.push(`Deployment failed at ${deployment.completedAt}: ${reason}`);

  writeDeployments(deployments);
  return deployment;
}

/**
 * Get deployment by ID
 * @param {string} deploymentId - Deployment ID
 * @returns {Object|null} Deployment or null
 */
export function getDeployment(deploymentId) {
  const deployments = readDeployments();
  return deployments.find(d => d.id === deploymentId) || null;
}

/**
 * Get all deployments for an agent
 * @param {string} agentId - Agent ID
 * @returns {Array} List of deployments
 */
export function getDeploymentsByAgent(agentId) {
  const deployments = readDeployments();
  return deployments
    .filter(d => d.agentId === agentId)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

/**
 * Get deployments by environment
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment
 * @returns {Array} List of deployments
 */
export function getDeploymentsByEnvironment(agentId, environment) {
  const deployments = readDeployments();
  return deployments
    .filter(d => d.agentId === agentId && d.environment === environment)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

/**
 * Get current deployment for environment
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment
 * @returns {Object|null} Latest deployment or null
 */
export function getCurrentDeployment(agentId, environment) {
  const deployments = readDeployments();
  return deployments
    .filter(d => d.agentId === agentId && d.environment === environment)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0] || null;
}

/**
 * Update deployment metrics
 * @param {string} deploymentId - Deployment ID
 * @param {Object} metrics - New metrics
 * @returns {Object|null} Updated deployment or null
 */
export function updateMetrics(deploymentId, metrics) {
  const deployments = readDeployments();
  const index = deployments.findIndex(d => d.id === deploymentId);

  if (index === -1) {
    return null;
  }

  deployments[index].metrics = {
    requestsPerSec: metrics.requestsPerSec ?? deployments[index].metrics.requestsPerSec,
    errorRate: metrics.errorRate ?? deployments[index].metrics.errorRate,
    latencyP99: metrics.latencyP99 ?? deployments[index].metrics.latencyP99
  };

  writeDeployments(deployments);
  return deployments[index];
}

/**
 * Simulate deployment process (for testing/demo)
 * @param {string} deploymentId - Deployment ID
 * @returns {Promise<Object>} Promise resolving to completed deployment
 */
export async function simulateDeployment(deploymentId) {
  // Start deployment
  startDeployment(deploymentId);

  // Simulate deployment time (100ms)
  await new Promise(resolve => setTimeout(resolve, 100));

  // Complete deployment
  return completeDeployment(deploymentId, {
    requestsPerSec: Math.random() * 100,
    errorRate: Math.random() * 0.05,
    latencyP99: Math.random() * 200 + 50
  });
}

export default {
  createDeployment,
  startDeployment,
  completeDeployment,
  failDeployment,
  getDeployment,
  getDeploymentsByAgent,
  getDeploymentsByEnvironment,
  getCurrentDeployment,
  updateMetrics,
  simulateDeployment
};