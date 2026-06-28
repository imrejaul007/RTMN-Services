/**
 * Agent Version Registry
 * Manages agent registration, versioning, and metadata storage
 */

import { v4 as uuidv4 } from 'uuid';
import semver from 'semver';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const AGENTS_FILE = join(DATA_DIR, 'agents.json');
const VERSIONS_FILE = join(DATA_DIR, 'versions.json');

// Initialize data files
function initDataFile(filePath, defaultData = []) {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initDataFile(AGENTS_FILE, []);
initDataFile(VERSIONS_FILE, []);

// Data access functions
function readAgents() {
  try {
    return JSON.parse(readFileSync(AGENTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeAgents(agents) {
  writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

function readVersions() {
  try {
    return JSON.parse(readFileSync(VERSIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeVersions(versions) {
  writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
}

/**
 * Create a new agent
 * @param {Object} agentData - Agent data
 * @returns {Object} Created agent
 */
export function createAgent(agentData) {
  const agents = readAgents();
  const now = new Date().toISOString();

  const agent = {
    id: uuidv4(),
    name: agentData.name,
    description: agentData.description || '',
    type: agentData.type || 'hybrid', // "reasoning" | "action" | "hybrid"
    createdAt: now,
    updatedAt: now,
    status: 'active',
    currentVersion: null,
    environments: {
      dev: null,
      staging: null,
      prod: null
    },
    metadata: agentData.metadata || {}
  };

  agents.push(agent);
  writeAgents(agents);
  return agent;
}

/**
 * Get all agents
 * @returns {Array} List of all agents
 */
export function getAllAgents() {
  return readAgents();
}

/**
 * Get agent by ID
 * @param {string} id - Agent ID
 * @returns {Object|null} Agent or null
 */
export function getAgentById(id) {
  const agents = readAgents();
  return agents.find(a => a.id === id) || null;
}

/**
 * Update agent
 * @param {string} id - Agent ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated agent or null
 */
export function updateAgent(id, updates) {
  const agents = readAgents();
  const index = agents.findIndex(a => a.id === id);

  if (index === -1) {
    return null;
  }

  const allowedUpdates = ['name', 'description', 'status', 'metadata'];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      agents[index][field] = updates[field];
    }
  });

  agents[index].updatedAt = new Date().toISOString();
  writeAgents(agents);
  return agents[index];
}

/**
 * Delete (retire) agent
 * @param {string} id - Agent ID
 * @returns {boolean} Success
 */
export function deleteAgent(id) {
  const agents = readAgents();
  const index = agents.findIndex(a => a.id === id);

  if (index === -1) {
    return false;
  }

  // Soft delete - mark as retired
  agents[index].status = 'retired';
  agents[index].updatedAt = new Date().toISOString();
  writeAgents(agents);
  return true;
}

/**
 * Register a new version for an agent
 * @param {string} agentId - Agent ID
 * @param {Object} versionData - Version data
 * @returns {Object} Created version
 */
export function registerVersion(agentId, versionData) {
  const agents = readAgents();
  const agent = agents.find(a => a.id === agentId);

  if (!agent) {
    throw new Error('Agent not found');
  }

  const versions = readVersions();
  const agentVersions = versions.filter(v => v.agentId === agentId);

  // Validate semver format
  if (!semver.valid(versionData.version)) {
    throw new Error('Invalid semver version format');
  }

  // Check for duplicate version
  const existingVersion = agentVersions.find(v => v.version === versionData.version);
  if (existingVersion) {
    throw new Error(`Version ${versionData.version} already exists`);
  }

  const now = new Date().toISOString();
  const version = {
    id: uuidv4(),
    agentId,
    version: versionData.version,
    changelog: versionData.changelog || '',
    imageUrl: versionData.imageUrl || '',
    config: versionData.config || {},
    createdAt: now,
    createdBy: versionData.createdBy || 'system'
  };

  versions.push(version);
  writeVersions(versions);

  // Update agent's current version if it's the first one
  if (!agent.currentVersion) {
    agent.currentVersion = versionData.version;
    writeAgents(agents);
  }

  return version;
}

/**
 * Get all versions for an agent
 * @param {string} agentId - Agent ID
 * @returns {Array} List of versions sorted by semver
 */
export function getVersions(agentId) {
  const versions = readVersions();
  const agentVersions = versions
    .filter(v => v.agentId === agentId)
    .sort((a, b) => semver.rcompare(a.version, b.version)); // Sort descending

  return agentVersions;
}

/**
 * Get specific version
 * @param {string} agentId - Agent ID
 * @param {string} version - Version string
 * @returns {Object|null} Version or null
 */
export function getVersion(agentId, version) {
  const versions = readVersions();
  return versions.find(v => v.agentId === agentId && v.version === version) || null;
}

/**
 * Get latest version for an agent
 * @param {string} agentId - Agent ID
 * @returns {Object|null} Latest version or null
 */
export function getLatestVersion(agentId) {
  const versions = getVersions(agentId);
  return versions[0] || null;
}

/**
 * Update agent's current version
 * @param {string} agentId - Agent ID
 * @param {string} version - Version string
 * @returns {Object|null} Updated agent or null
 */
export function setCurrentVersion(agentId, version) {
  const agents = readAgents();
  const index = agents.findIndex(a => a.id === agentId);

  if (index === -1) {
    return null;
  }

  agents[index].currentVersion = version;
  agents[index].updatedAt = new Date().toISOString();
  writeAgents(agents);
  return agents[index];
}

/**
 * Update agent's environment deployment
 * @param {string} agentId - Agent ID
 * @param {string} environment - Environment (dev/staging/prod)
 * @param {string} version - Version string
 */
export function setEnvironmentVersion(agentId, environment, version) {
  const agents = readAgents();
  const index = agents.findIndex(a => a.id === agentId);

  if (index === -1) {
    return false;
  }

  if (!['dev', 'staging', 'prod'].includes(environment)) {
    throw new Error('Invalid environment');
  }

  agents[index].environments[environment] = version;
  agents[index].updatedAt = new Date().toISOString();
  writeAgents(agents);
  return true;
}

export default {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  registerVersion,
  getVersions,
  getVersion,
  getLatestVersion,
  setCurrentVersion,
  setEnvironmentVersion
};