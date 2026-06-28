/**
 * Agent Lifecycle Management Tests
 * Tests for: CRUD agents, versioning, deploy, rollback, health
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock fs module for tests
const mockData = {
  agents: [],
  versions: [],
  deployments: [],
  rollbacks: [],
  health: {},
  canary: []
};

const mockFs = {
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn((path) => {
    const fileName = path.split('/').pop();
    if (fileName === 'agents.json') return JSON.stringify(mockData.agents);
    if (fileName === 'versions.json') return JSON.stringify(mockData.versions);
    if (fileName === 'deployments.json') return JSON.stringify(mockData.deployments);
    if (fileName === 'rollbacks.json') return JSON.stringify(mockData.rollbacks);
    if (fileName === 'health.json') return JSON.stringify(mockData.health);
    if (fileName === 'canary.json') return JSON.stringify(mockData.canary);
    return '[]';
  }),
  writeFileSync: vi.fn((path, data) => {
    const fileName = path.split('/').pop();
    if (fileName === 'agents.json') mockData.agents = JSON.parse(data);
    if (fileName === 'versions.json') mockData.versions = JSON.parse(data);
    if (fileName === 'deployments.json') mockData.deployments = JSON.parse(data);
    if (fileName === 'rollbacks.json') mockData.rollbacks = JSON.parse(data);
    if (fileName === 'health.json') mockData.health = JSON.parse(data);
    if (fileName === 'canary.json') mockData.canary = JSON.parse(data);
  }),
  mkdirSync: vi.fn()
};

vi.mock('fs', () => mockFs);

// Import modules after mocking
import * as registry from '../src/registry.js';
import * as deployer from '../src/deployer.js';
import * as rollback from '../src/rollback.js';
import * as health from '../src/health.js';
import * as canary from '../src/canary.js';

describe('Agent Lifecycle Management', () => {
  beforeEach(() => {
    // Reset mock data
    mockData.agents = [];
    mockData.versions = [];
    mockData.deployments = [];
    mockData.rollbacks = [];
    mockData.health = {};
    mockData.canary = [];
    vi.clearAllMocks();
  });

  // ==================== AGENT CRUD TESTS ====================
  describe('Agent CRUD Operations', () => {
    it('should create a new agent', () => {
      const agent = registry.createAgent({
        name: 'TestAgent',
        description: 'A test agent',
        type: 'reasoning'
      });

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('TestAgent');
      expect(agent.description).toBe('A test agent');
      expect(agent.type).toBe('reasoning');
      expect(agent.status).toBe('active');
      expect(agent.currentVersion).toBeNull();
      expect(agent.environments).toEqual({ dev: null, staging: null, prod: null });
    });

    it('should get all agents', () => {
      registry.createAgent({ name: 'Agent1', type: 'reasoning' });
      registry.createAgent({ name: 'Agent2', type: 'action' });

      const agents = registry.getAllAgents();
      expect(agents).toHaveLength(2);
    });

    it('should get agent by ID', () => {
      const created = registry.createAgent({ name: 'FindMe', type: 'hybrid' });
      const found = registry.getAgentById(created.id);

      expect(found).toBeDefined();
      expect(found.name).toBe('FindMe');
    });

    it('should return null for non-existent agent', () => {
      const found = registry.getAgentById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should update agent', () => {
      const agent = registry.createAgent({ name: 'Original', type: 'reasoning' });
      const updated = registry.updateAgent(agent.id, {
        name: 'Updated',
        metadata: { key: 'value' }
      });

      expect(updated.name).toBe('Updated');
      expect(updated.metadata.key).toBe('value');
    });

    it('should retire agent (soft delete)', () => {
      const agent = registry.createAgent({ name: 'ToRetire', type: 'reasoning' });
      const result = registry.deleteAgent(agent.id);

      expect(result).toBe(true);

      const found = registry.getAgentById(agent.id);
      expect(found.status).toBe('retired');
    });

    it('should return false for deleting non-existent agent', () => {
      const result = registry.deleteAgent('non-existent-id');
      expect(result).toBe(false);
    });
  });

  // ==================== VERSION MANAGEMENT TESTS ====================
  describe('Version Management', () => {
    let agent;

    beforeEach(() => {
      agent = registry.createAgent({ name: 'VersionTestAgent', type: 'hybrid' });
    });

    it('should register a new version', () => {
      const version = registry.registerVersion(agent.id, {
        version: '1.0.0',
        changelog: 'Initial release',
        imageUrl: 'registry.example.com/agent:1.0.0',
        createdBy: 'developer'
      });

      expect(version).toBeDefined();
      expect(version.id).toBeDefined();
      expect(version.version).toBe('1.0.0');
      expect(version.changelog).toBe('Initial release');
      expect(version.agentId).toBe(agent.id);
    });

    it('should set agent currentVersion on first version', () => {
      registry.registerVersion(agent.id, { version: '1.0.0' });

      const updated = registry.getAgentById(agent.id);
      expect(updated.currentVersion).toBe('1.0.0');
    });

    it('should reject invalid semver format', () => {
      expect(() => {
        registry.registerVersion(agent.id, { version: 'invalid' });
      }).toThrow('Invalid semver version format');
    });

    it('should reject duplicate version', () => {
      registry.registerVersion(agent.id, { version: '1.0.0' });

      expect(() => {
        registry.registerVersion(agent.id, { version: '1.0.0' });
      }).toThrow('Version 1.0.0 already exists');
    });

    it('should get all versions sorted by semver descending', () => {
      registry.registerVersion(agent.id, { version: '1.0.0' });
      registry.registerVersion(agent.id, { version: '1.1.0' });
      registry.registerVersion(agent.id, { version: '2.0.0' });

      const versions = registry.getVersions(agent.id);
      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe('2.0.0');
      expect(versions[1].version).toBe('1.1.0');
      expect(versions[2].version).toBe('1.0.0');
    });

    it('should get specific version', () => {
      registry.registerVersion(agent.id, { version: '1.0.0' });

      const version = registry.getVersion(agent.id, '1.0.0');
      expect(version).toBeDefined();
      expect(version.version).toBe('1.0.0');
    });

    it('should get latest version', () => {
      registry.registerVersion(agent.id, { version: '1.0.0' });
      registry.registerVersion(agent.id, { version: '2.0.0' });

      const latest = registry.getLatestVersion(agent.id);
      expect(latest.version).toBe('2.0.0');
    });

    it('should throw when registering version for non-existent agent', () => {
      expect(() => {
        registry.registerVersion('non-existent-id', { version: '1.0.0' });
      }).toThrow('Agent not found');
    });
  });

  // ==================== DEPLOYMENT TESTS ====================
  describe('Deployment Operations', () => {
    let agent;

    beforeEach(() => {
      agent = registry.createAgent({ name: 'DeployTestAgent', type: 'action' });
      registry.registerVersion(agent.id, { version: '1.0.0' });
      registry.registerVersion(agent.id, { version: '1.1.0' });
    });

    it('should create a deployment', () => {
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });

      expect(deployment).toBeDefined();
      expect(deployment.id).toBeDefined();
      expect(deployment.agentId).toBe(agent.id);
      expect(deployment.version).toBe('1.0.0');
      expect(deployment.environment).toBe('dev');
      expect(deployment.status).toBe('pending');
    });

    it('should throw for invalid environment', () => {
      expect(() => {
        deployer.createDeployment({
          agentId: agent.id,
          version: '1.0.0',
          environment: 'invalid',
          strategy: 'rolling'
        });
      }).toThrow('Invalid environment');
    });

    it('should throw for invalid strategy', () => {
      expect(() => {
        deployer.createDeployment({
          agentId: agent.id,
          version: '1.0.0',
          environment: 'dev',
          strategy: 'invalid'
        });
      }).toThrow('Invalid deployment strategy');
    });

    it('should start a deployment', () => {
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });

      const started = deployer.startDeployment(deployment.id);
      expect(started.status).toBe('deploying');
    });

    it('should complete a deployment', () => {
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });

      deployer.startDeployment(deployment.id);
      const completed = deployer.completeDeployment(deployment.id, {
        requestsPerSec: 100,
        errorRate: 0.01,
        latencyP99: 150
      });

      expect(completed.status).toBe('healthy');
      expect(completed.completedAt).toBeDefined();
    });

    it('should update agent environment on deployment completion', () => {
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'prod',
        strategy: 'rolling'
      });

      deployer.startDeployment(deployment.id);
      deployer.completeDeployment(deployment.id);

      const updatedAgent = registry.getAgentById(agent.id);
      expect(updatedAgent.environments.prod).toBe('1.0.0');
    });

    it('should get deployment by ID', () => {
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });

      const found = deployer.getDeployment(deployment.id);
      expect(found.id).toBe(deployment.id);
    });

    it('should get deployments by agent', () => {
      deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });
      deployer.createDeployment({
        agentId: agent.id,
        version: '1.1.0',
        environment: 'staging',
        strategy: 'rolling'
      });

      const deployments = deployer.getDeploymentsByAgent(agent.id);
      expect(deployments).toHaveLength(2);
    });

    it('should update deployment metrics', () => {
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });

      const updated = deployer.updateMetrics(deployment.id, {
        requestsPerSec: 200,
        errorRate: 0.02,
        latencyP99: 100
      });

      expect(updated.metrics.requestsPerSec).toBe(200);
      expect(updated.metrics.errorRate).toBe(0.02);
    });

    it('should fail a deployment', () => {
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });

      const failed = deployer.failDeployment(deployment.id, 'Health check failed');
      expect(failed.status).toBe('unhealthy');
      expect(failed.logs).toContain(expect.stringContaining('Health check failed'));
    });
  });

  // ==================== ROLLBACK TESTS ====================
  describe('Rollback Operations', () => {
    let agent;

    beforeEach(() => {
      agent = registry.createAgent({ name: 'RollbackTestAgent', type: 'hybrid' });
      registry.registerVersion(agent.id, { version: '1.0.0' });
      registry.registerVersion(agent.id, { version: '1.1.0' });
      registry.registerVersion(agent.id, { version: '2.0.0' });

      // Deploy version 1.0.0 to dev
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });
      deployer.startDeployment(deployment.id);
      deployer.completeDeployment(deployment.id);
      registry.setEnvironmentVersion(agent.id, 'dev', '1.0.0');

      // Deploy version 1.1.0 to dev
      const deployment2 = deployer.createDeployment({
        agentId: agent.id,
        version: '1.1.0',
        environment: 'dev',
        strategy: 'rolling'
      });
      deployer.startDeployment(deployment2.id);
      deployer.completeDeployment(deployment2.id);
      registry.setEnvironmentVersion(agent.id, 'dev', '1.1.0');
    });

    it('should get available versions for rollback', () => {
      const versions = rollback.getAvailableVersionsForRollback(agent.id, 'dev');
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe('1.0.0');
    });

    it('should initiate rollback', () => {
      const rollbackRecord = rollback.rollback(agent.id, 'dev', {
        reason: 'Critical bug found',
        initiatedBy: 'developer'
      });

      expect(rollbackRecord).toBeDefined();
      expect(rollbackRecord.fromVersion).toBe('1.1.0');
      expect(rollbackRecord.toVersion).toBe('1.0.0');
      expect(rollbackRecord.status).toBe('initiated');
    });

    it('should throw when no previous version available', () => {
      // Create agent with only one version deployed
      const soloAgent = registry.createAgent({ name: 'SoloAgent', type: 'reasoning' });
      registry.registerVersion(soloAgent.id, { version: '1.0.0' });

      const deployment = deployer.createDeployment({
        agentId: soloAgent.id,
        version: '1.0.0',
        environment: 'dev',
        strategy: 'rolling'
      });
      deployer.startDeployment(deployment.id);
      deployer.completeDeployment(deployment.id);
      registry.setEnvironmentVersion(soloAgent.id, 'dev', '1.0.0');

      expect(() => {
        rollback.rollback(soloAgent.id, 'dev');
      }).toThrow('No previous version available for rollback');
    });

    it('should complete rollback', async () => {
      const rollbackRecord = rollback.rollback(agent.id, 'dev');
      const completed = await rollback.simulateRollback(rollbackRecord.id);

      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();

      const updatedAgent = registry.getAgentById(agent.id);
      expect(updatedAgent.environments.dev).toBe('1.0.0');
    });

    it('should get rollback history', () => {
      rollback.rollback(agent.id, 'dev', { reason: 'Test rollback 1' });
      rollback.rollback(agent.id, 'staging', { reason: 'Test rollback 2' });

      const history = rollback.getRollbacksByAgent(agent.id);
      expect(history).toHaveLength(2);
    });

    it('should get rollback by environment', () => {
      rollback.rollback(agent.id, 'dev', { reason: 'Dev rollback' });
      rollback.rollback(agent.id, 'staging', { reason: 'Staging rollback' });

      const devRollbacks = rollback.getRollbacksByEnvironment(agent.id, 'dev');
      expect(devRollbacks).toHaveLength(1);
      expect(devRollbacks[0].reason).toBe('Dev rollback');
    });
  });

  // ==================== HEALTH MONITORING TESTS ====================
  describe('Health Monitoring', () => {
    let agent;

    beforeEach(() => {
      agent = registry.createAgent({ name: 'HealthTestAgent', type: 'action' });
    });

    it('should calculate healthy status', () => {
      const status = health.calculateHealthStatus({
        requestsPerSec: 100,
        errorRate: 0.001,
        latencyP99: 100
      });

      expect(status.status).toBe('healthy');
      expect(status.score).toBeGreaterThan(80);
    });

    it('should detect critical error rate', () => {
      const status = health.calculateHealthStatus({
        requestsPerSec: 100,
        errorRate: 0.1, // 10% error rate
        latencyP99: 100
      });

      expect(status.status).toBe('critical');
      expect(status.issues).toContain('CRITICAL: Error rate exceeds 5%');
    });

    it('should detect high latency', () => {
      const status = health.calculateHealthStatus({
        requestsPerSec: 100,
        errorRate: 0.001,
        latencyP99: 3000 // 3000ms
      });

      expect(status.status).toBe('critical');
      expect(status.issues).toContain('CRITICAL: P99 latency exceeds 2000ms');
    });

    it('should detect low throughput', () => {
      const status = health.calculateHealthStatus({
        requestsPerSec: 0.5,
        errorRate: 0.001,
        latencyP99: 100
      });

      expect(status.componentScores.throughput).toBe(50);
      expect(status.issues).toContain('WARNING: Request throughput below minimum threshold');
    });

    it('should update health and track consecutive unhealthy', () => {
      // First check - healthy
      health.updateHealth(agent.id, 'dev', {
        requestsPerSec: 100,
        errorRate: 0.001,
        latencyP99: 100
      });

      // Second check - critical (should increment counter)
      health.updateHealth(agent.id, 'dev', {
        requestsPerSec: 100,
        errorRate: 0.1,
        latencyP99: 3000
      });

      const healthData = health.getHealth(agent.id, 'dev');
      expect(healthData.consecutiveUnhealthy).toBe(1);
    });

    it('should get agent health across environments', () => {
      health.updateHealth(agent.id, 'dev', {
        requestsPerSec: 100,
        errorRate: 0.001,
        latencyP99: 100
      });

      health.updateHealth(agent.id, 'prod', {
        requestsPerSec: 50,
        errorRate: 0.01,
        latencyP99: 200
      });

      const agentHealth = health.getAgentHealth(agent.id);

      expect(agentHealth.agentId).toBe(agent.id);
      expect(agentHealth.environments.dev).toBeDefined();
      expect(agentHealth.environments.prod).toBeDefined();
      expect(agentHealth.environments.staging).toBeDefined();
    });

    it('should reset health data', () => {
      health.updateHealth(agent.id, 'dev', {
        requestsPerSec: 100,
        errorRate: 0.1,
        latencyP99: 3000
      });

      const result = health.resetHealth(agent.id, 'dev');
      expect(result).toBe(true);

      const healthData = health.getHealth(agent.id, 'dev');
      expect(healthData.consecutiveUnhealthy).toBe(0);
    });

    it('should get health history', () => {
      health.updateHealth(agent.id, 'dev', {
        requestsPerSec: 100,
        errorRate: 0.001,
        latencyP99: 100
      });
      health.updateHealth(agent.id, 'dev', {
        requestsPerSec: 200,
        errorRate: 0.002,
        latencyP99: 150
      });

      const history = health.getHealthHistory(agent.id, 'dev', 10);
      expect(history.length).toBe(2);
    });
  });

  // ==================== CANARY DEPLOYMENT TESTS ====================
  describe('Canary Deployment', () => {
    let agent;

    beforeEach(() => {
      agent = registry.createAgent({ name: 'CanaryTestAgent', type: 'hybrid' });
      registry.registerVersion(agent.id, { version: '1.0.0' });
      registry.registerVersion(agent.id, { version: '2.0.0' });
    });

    it('should start canary deployment', () => {
      const deployment = deployer.createDeployment({
        agentId: agent.id,
        version: '2.0.0',
        environment: 'prod',
        strategy: 'canary'
      });

      const canaryRecord = canary.startCanary(
        deployment.id,
        agent.id,
        '2.0.0',
        'prod',
        { errorRate: 0.01 }
      );

      expect(canaryRecord).toBeDefined();
      expect(canaryRecord.deploymentId).toBe(deployment.id);
      expect(canaryRecord.currentPercent).toBe(0);
      expect(canaryRecord.status).toBe('initializing');
    });

    it('should update canary percent', () => {
      const canaryRecord = canary.startCanary('dep-id', agent.id, '2.0.0', 'prod');
      const updated = canary.updateCanaryPercent(canaryRecord.id, 25);

      expect(updated.currentPercent).toBe(25);
    });

    it('should record canary metrics', () => {
      const canaryRecord = canary.startCanary('dep-id', agent.id, '2.0.0', 'prod');
      const updated = canary.recordCanaryMetrics(canaryRecord.id, {
        requests: 100,
        errors: 2,
        latency: 50000
      });

      expect(updated.metrics.requests).toBe(100);
      expect(updated.metrics.errors).toBe(2);
    });

    it('should evaluate canary health', () => {
      const canaryRecord = canary.startCanary('dep-id', agent.id, '2.0.0', 'prod');

      // Record enough healthy metrics
      for (let i = 0; i < 10; i++) {
        canary.recordCanaryMetrics(canaryRecord.id, {
          requests: 50,
          errors: 0,
          latency: 10000,
          latencyP99: 100
        });
      }

      const evaluation = canary.evaluateCanary(canaryRecord.id);
      expect(evaluation.success).toBe(true);
      expect(evaluation.action).toBe('promote');
    });

    it('should abort unhealthy canary', () => {
      const canaryRecord = canary.startCanary('dep-id', agent.id, '2.0.0', 'prod');

      // Record unhealthy metrics
      for (let i = 0; i < 10; i++) {
        canary.recordCanaryMetrics(canaryRecord.id, {
          requests: 50,
          errors: 10, // High error rate
          latency: 100000, // High latency
          latencyP99: 2000
        });
      }

      const evaluation = canary.evaluateCanary(canaryRecord.id);
      expect(evaluation.success).toBe(false);
      expect(evaluation.action).toBe('rollback');
    });

    it('should get canaries by agent', () => {
      canary.startCanary('dep-1', agent.id, '2.0.0', 'dev');
      canary.startCanary('dep-2', agent.id, '2.0.0', 'prod');

      const canaries = canary.getCanariesByAgent(agent.id);
      expect(canaries).toHaveLength(2);
    });

    it('should complete canary', () => {
      const canaryRecord = canary.startCanary('dep-id', agent.id, '2.0.0', 'prod');
      const completed = canary.completeCanary(canaryRecord.id);

      expect(completed.status).toBe('completed');
      expect(completed.currentPercent).toBe(100);
      expect(completed.completedAt).toBeDefined();
    });
  });
});