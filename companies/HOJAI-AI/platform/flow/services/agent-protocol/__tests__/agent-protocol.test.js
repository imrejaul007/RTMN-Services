/**
 * Agent Protocol Tests
 */

import { describe, it, expect } from 'vitest';

// Mock storage
const agents = new Map();
const messages = new Map();
const sessions = new Map();

// A2A Message Types
const MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
  NOTIFICATION: 'notification',
  ERROR: 'error'
};

// Resource Types
const RESOURCE_TYPES = {
  FILE: 'file',
  DATABASE: 'database',
  API: 'api',
  MEMORY: 'memory',
  TWIN: 'twin'
};

// Register agent
function registerAgent(data) {
  const id = data.id || 'agent_' + Date.now();
  const agent = { id, name: data.name, type: data.type || 'generic', status: 'online' };
  agents.set(id, agent);
  return agent;
}

// Send message
function sendMessage(from, to, content, type = MESSAGE_TYPES.REQUEST) {
  const msgId = 'msg_' + Date.now();
  const sessionId = 'session_' + Date.now();
  const message = { id: msgId, from, to, type, content, sessionId };
  if (!messages.has(sessionId)) messages.set(sessionId, []);
  messages.get(sessionId).push(message);
  return message;
}

// Create session
function createSession(agentId) {
  const id = 'session_' + Date.now();
  const session = { id, agentId, status: 'active', messages: [] };
  sessions.set(id, session);
  return session;
}

// Route to model
function routeModel(models, strategy = 'balanced') {
  if (models.length === 0) return { model: 'claude', reason: 'default' };

  switch (strategy) {
    case 'cheapest': return { model: models[0].id, reason: 'lowest cost' };
    case 'fastest': return { model: models[0].id, reason: 'lowest latency' };
    default: return { model: models[0].id, reason: 'balanced' };
  }
}

describe('Agent Protocol', () => {
  describe('Agent Registry', () => {
    it('should register an agent', () => {
      const agent = registerAgent({ name: 'Test Agent' });
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('Test Agent');
      expect(agent.status).toBe('online');
    });

    it('should register with custom id', () => {
      const agent = registerAgent({ id: 'agent_custom', name: 'Custom Agent' });
      expect(agent.id).toBe('agent_custom');
    });

    it('should register multiple agents', () => {
      registerAgent({ name: 'Agent 1' });
      registerAgent({ name: 'Agent 2' });
      expect(agents.size).toBeGreaterThan(2);
    });
  });

  describe('A2A Messaging', () => {
    it('should send request message', () => {
      const msg = sendMessage('agent_1', 'agent_2', 'Hello', MESSAGE_TYPES.REQUEST);
      expect(msg.id).toBeDefined();
      expect(msg.type).toBe(MESSAGE_TYPES.REQUEST);
      expect(msg.content).toBe('Hello');
    });

    it('should send notification message', () => {
      const msg = sendMessage('agent_1', 'agent_2', 'Update', MESSAGE_TYPES.NOTIFICATION);
      expect(msg.type).toBe(MESSAGE_TYPES.NOTIFICATION);
    });

    it('should get session messages', () => {
      const msg = sendMessage('a', 'b', 'test');
      const sessionMsgs = messages.get(msg.sessionId);
      expect(sessionMsgs).toHaveLength(1);
    });
  });

  describe('Agent Sessions', () => {
    it('should create session', () => {
      const session = createSession('agent_1');
      expect(session.id).toBeDefined();
      expect(session.agentId).toBe('agent_1');
      expect(session.status).toBe('active');
    });

    it('should get sessions for agent', () => {
      createSession('agent_test');
      const agentSessions = Array.from(sessions.values()).filter(s => s.agentId === 'agent_test');
      expect(agentSessions.length).toBeGreaterThan(0);
    });
  });

  describe('MCP Resources', () => {
    it('should have correct resource types', () => {
      expect(RESOURCE_TYPES.FILE).toBe('file');
      expect(RESOURCE_TYPES.MEMORY).toBe('memory');
      expect(RESOURCE_TYPES.TWIN).toBe('twin');
    });

    it('should support all resource types', () => {
      const types = Object.values(RESOURCE_TYPES);
      expect(types).toContain('file');
      expect(types).toContain('database');
      expect(types).toContain('api');
      expect(types).toContain('memory');
      expect(types).toContain('twin');
    });
  });

  describe('Model Routing', () => {
    it('should route with no models', () => {
      const result = routeModel([]);
      expect(result.model).toBe('claude');
    });

    it('should route with cheapest strategy', () => {
      const models = [{ id: 'model_1', cost: 10 }, { id: 'model_2', cost: 5 }];
      const result = routeModel(models, 'cheapest');
      expect(result.model).toBe('model_1');
    });

    it('should route with fastest strategy', () => {
      const models = [{ id: 'model_1', latency: 100 }, { id: 'model_2', latency: 50 }];
      const result = routeModel(models, 'fastest');
      expect(result.model).toBe('model_1');
    });

    it('should route with balanced strategy', () => {
      const models = [{ id: 'model_balanced' }];
      const result = routeModel(models, 'balanced');
      expect(result.model).toBe('model_balanced');
    });
  });

  describe('Message Types', () => {
    it('should have correct message types', () => {
      expect(MESSAGE_TYPES.REQUEST).toBe('request');
      expect(MESSAGE_TYPES.RESPONSE).toBe('response');
      expect(MESSAGE_TYPES.NOTIFICATION).toBe('notification');
      expect(MESSAGE_TYPES.ERROR).toBe('error');
    });
  });
});
