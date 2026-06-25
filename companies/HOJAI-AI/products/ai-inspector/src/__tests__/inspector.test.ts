import { describe, it, expect, beforeEach } from 'vitest';
import { api, AgentSession, ServiceHealth, ToolCall } from '../api/inspector';

describe('AI Inspector API', () => {
  describe('getSessions', () => {
    it('returns an array of sessions', async () => {
      const sessions = await api.getSessions(5);
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeLessThanOrEqual(5);
    });

    it('each session has required fields', async () => {
      const sessions = await api.getSessions(1);
      if (sessions.length > 0) {
        const session = sessions[0];
        expect(session.id).toBeDefined();
        expect(session.agentId).toBeDefined();
        expect(session.agentName).toBeDefined();
        expect(['running', 'completed', 'error', 'paused']).toContain(session.status);
        expect(session.startedAt).toBeDefined();
        expect(session.tokens).toBeDefined();
        expect(session.tools).toBeDefined();
        expect(session.memory).toBeDefined();
        expect(session.metrics).toBeDefined();
      }
    });
  });

  describe('getSession', () => {
    it('returns a session by id', async () => {
      const session = await api.getSession('test-session-1');
      expect(session).not.toBeNull();
      expect(session?.id).toBe('test-session-1');
    });

    it('session has tools array', async () => {
      const session = await api.getSession('test-session-1');
      expect(session?.tools).toBeDefined();
      expect(Array.isArray(session?.tools)).toBe(true);
    });
  });

  describe('getTrace', () => {
    it('returns trace events', async () => {
      const trace = await api.getTrace('test-session-1');
      expect(Array.isArray(trace)).toBe(true);
      expect(trace.length).toBeGreaterThan(0);
    });

    it('each event has required fields', async () => {
      const trace = await api.getTrace('test-session-1');
      const event = trace[0];
      expect(event.id).toBeDefined();
      expect(event.sessionId).toBe('test-session-1');
      expect(event.type).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.data).toBeDefined();
    });

    it('events have valid types', async () => {
      const trace = await api.getTrace('test-session-1');
      const validTypes = ['llm_call', 'tool_call', 'memory_access', 'decision', 'handoff', 'error'];
      trace.forEach(event => {
        expect(validTypes).toContain(event.type);
      });
    });
  });

  describe('getServiceHealth', () => {
    it('returns service health array', async () => {
      const health = await api.getServiceHealth();
      expect(Array.isArray(health)).toBe(true);
      expect(health.length).toBeGreaterThan(0);
    });

    it('each service has required fields', async () => {
      const health = await api.getServiceHealth();
      health.forEach(svc => {
        expect(svc.name).toBeDefined();
        expect(['healthy', 'degraded', 'down']).toContain(svc.status);
        expect(svc.latency).toBeDefined();
        expect(svc.errorRate).toBeDefined();
      });
    });
  });

  describe('getAgentMetrics', () => {
    it('returns metrics object', async () => {
      const metrics = await api.getAgentMetrics('agent-1', '24h');
      expect(metrics.requests).toBeDefined();
      expect(metrics.success).toBeDefined();
      expect(metrics.errors).toBeDefined();
      expect(metrics.avgLatency).toBeDefined();
      expect(metrics.avgCost).toBeDefined();
      expect(metrics.tokenUsage).toBeDefined();
    });

    it('success rate is reasonable', async () => {
      const metrics = await api.getAgentMetrics('agent-1', '24h');
      // Success rate should be between 0 and 100%
      const successRate = metrics.requests > 0 ? (metrics.success / metrics.requests) * 100 : 0;
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(100);
    });
  });
});

describe('AgentSession', () => {
  it('valid session status', () => {
    const validStatuses = ['running', 'completed', 'error', 'paused'];
    const session: Partial<AgentSession> = {
      id: 'test',
      status: 'running'
    };
    expect(validStatuses).toContain(session.status);
  });
});

describe('ServiceHealth', () => {
  it('valid health status', () => {
    const validStatuses = ['healthy', 'degraded', 'down'];
    const health: Partial<ServiceHealth> = {
      name: 'test',
      status: 'healthy'
    };
    expect(validStatuses).toContain(health.status);
  });
});

describe('ToolCall', () => {
  it('valid tool status', () => {
    const validStatuses = ['pending', 'running', 'success', 'error'];
    const tool: Partial<ToolCall> = {
      id: 't1',
      name: 'search',
      status: 'success'
    };
    expect(validStatuses).toContain(tool.status);
  });
});
