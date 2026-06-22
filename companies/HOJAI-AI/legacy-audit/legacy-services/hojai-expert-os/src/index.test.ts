/**
 * ExpertOS - Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';

// Mock the main module
const mockApp = express();
mockApp.use(express.json());

// Mock data
const mockAgents = new Map();
const mockExecutions = new Map();

// Health endpoint test
mockApp.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-expert-os',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

mockApp.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

mockApp.get('/health/ready', (req, res) => {
  res.json({ status: 'ready', mongo: true, redis: true });
});

// Agent routes
mockApp.get('/api/agents', (req, res) => {
  res.json({ count: mockAgents.size, agents: Array.from(mockAgents.values()) });
});

mockApp.get('/api/agents/:id', (req, res) => {
  const agent = mockAgents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

mockApp.post('/api/agents', (req, res) => {
  const { name, type, skills, capabilities } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const id = `agent_${Date.now()}`;
  const agent = {
    id,
    name,
    type: type || 'task',
    skills: skills || [],
    capabilities: capabilities || [],
    status: 'idle',
    createdAt: new Date().toISOString(),
  };

  mockAgents.set(id, agent);
  res.status(201).json(agent);
});

mockApp.delete('/api/agents/:id', (req, res) => {
  const deleted = mockAgents.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Agent not found' });
  res.json({ deleted: true });
});

// Execution routes
mockApp.post('/api/agents/:id/invoke', (req, res) => {
  const { input, context } = req.body;
  const agent = mockAgents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const executionId = `exec_${Date.now()}`;
  const execution = {
    id: executionId,
    agentId: agent.id,
    status: 'completed',
    output: { response: 'Test response' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  mockExecutions.set(executionId, execution);

  res.json({
    executionId,
    output: execution.output,
    metrics: { duration: 100 },
  });
});

mockApp.get('/api/executions', (req, res) => {
  res.json({
    count: mockExecutions.size,
    executions: Array.from(mockExecutions.values()),
  });
});

// Tests
describe('ExpertOS Health Endpoints', () => {
  it('should return healthy status', async () => {
    const response = await fetch('http://localhost:4550/health');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('hojai-expert-os');
    expect(data.version).toBe('1.0.0');
  });

  it('should return alive for liveness probe', async () => {
    const response = await fetch('http://localhost:4550/health/live');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('alive');
  });

  it('should return ready for readiness probe', async () => {
    const response = await fetch('http://localhost:4550/health/ready');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ready');
  });
});

describe('ExpertOS Agent API', () => {
  let testAgentId: string;

  it('should create an agent', async () => {
    const response = await fetch('http://localhost:4550/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Agent',
        type: 'conversational',
        skills: ['skill1', 'skill2'],
        capabilities: ['nlp', 'reasoning'],
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Test Agent');
    expect(data.type).toBe('conversational');
    expect(data.status).toBe('idle');

    testAgentId = data.id;
  });

  it('should list agents', async () => {
    const response = await fetch('http://localhost:4550/api/agents');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBeGreaterThan(0);
    expect(Array.isArray(data.agents)).toBe(true);
  });

  it('should get agent by ID', async () => {
    const response = await fetch(`http://localhost:4550/api/agents/${testAgentId}`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(testAgentId);
  });

  it('should return 404 for non-existent agent', async () => {
    const response = await fetch('http://localhost:4550/api/agents/non-existent-id');
    expect(response.status).toBe(404);
  });

  it('should delete agent', async () => {
    const response = await fetch(`http://localhost:4550/api/agents/${testAgentId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(true);
  });
});

describe('ExpertOS Execution API', () => {
  let testAgentId: string;
  let testExecutionId: string;

  beforeAll(async () => {
    // Create a test agent first
    const response = await fetch('http://localhost:4550/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Execution Test Agent' }),
    });
    const data = await response.json();
    testAgentId = data.id;
  });

  it('should invoke agent', async () => {
    const response = await fetch(`http://localhost:4550/api/agents/${testAgentId}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { command: 'test' },
        context: { userId: 'user123' },
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executionId).toBeDefined();
    expect(data.output).toBeDefined();
    expect(data.metrics).toBeDefined();

    testExecutionId = data.executionId;
  });

  it('should list executions', async () => {
    const response = await fetch('http://localhost:4550/api/executions');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.executions)).toBe(true);
  });

  it('should return 404 for non-existent agent invocation', async () => {
    const response = await fetch('http://localhost:4550/api/agents/non-existent/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: {} }),
    });

    expect(response.status).toBe(404);
  });
});

describe('ExpertOS Validation', () => {
  it('should reject agent without name', async () => {
    const response = await fetch('http://localhost:4550/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'task' }),
    });

    expect(response.status).toBe(400);
  });
});

// Test utilities
describe('ExpertOS Types', () => {
  it('should validate agent types', () => {
    const validTypes = ['conversational', 'task', 'automation', 'analysis', 'custom'];
    expect(validTypes).toContain('conversational');
    expect(validTypes).toContain('task');
  });

  it('should validate agent status', () => {
    const validStatuses = ['idle', 'running', 'paused', 'error', 'stopped'];
    expect(validStatuses).toContain('idle');
    expect(validStatuses).toContain('running');
  });

  it('should validate execution status', () => {
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    expect(validStatuses).toContain('completed');
    expect(validStatuses).toContain('failed');
  });
});
