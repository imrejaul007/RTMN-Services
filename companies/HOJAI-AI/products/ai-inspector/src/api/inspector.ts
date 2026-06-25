/**
 * AI Inspector API - Connects to all observability services
 * Provides unified view of agent execution, memory, tools, and errors
 */

export interface AgentSession {
  id: string;
  agentId: string;
  agentName: string;
  status: 'running' | 'completed' | 'error' | 'paused';
  startedAt: string;
  endedAt?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  tools: ToolCall[];
  memory: MemorySnapshot;
  errors: AgentError[];
  metrics: AgentMetrics;
}

export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startedAt: string;
  duration?: number;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
}

export interface MemorySnapshot {
  working: number;
  longTerm: number;
  context: number;
  accessed: number;
  confidence: number;
}

export interface AgentError {
  id: string;
  type: 'validation' | 'timeout' | 'rate_limit' | 'api_error' | 'memory_full' | 'tool_error';
  message: string;
  stack?: string;
  timestamp: string;
  recoverable: boolean;
}

export interface AgentMetrics {
  latency: number;
  cost: number;
  steps: number;
  retries: number;
  handoffs: number;
}

export interface TraceEvent {
  id: string;
  sessionId: string;
  type: 'llm_call' | 'tool_call' | 'memory_access' | 'decision' | 'handoff' | 'error';
  timestamp: string;
  data: Record<string, unknown>;
  parentId?: string;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
}

// Mock data for demo (replace with real API calls)
const generateMockSession = (id: string): AgentSession => ({
  id,
  agentId: `agent-${Math.random().toString(36).substr(2, 6)}`,
  agentName: ['Sales Agent', 'Support Agent', 'Finance Agent', 'Marketing Agent'][Math.floor(Math.random() * 4)],
  status: ['running', 'completed', 'error'][Math.floor(Math.random() * 3)] as AgentSession['status'],
  startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  tokens: {
    prompt: Math.floor(Math.random() * 2000),
    completion: Math.floor(Math.random() * 1000),
    total: 0
  },
  tools: [
    { id: 't1', name: 'searchCRM', status: 'success', startedAt: new Date().toISOString(), duration: 120 },
    { id: 't2', name: 'fetchInventory', status: 'success', startedAt: new Date().toISOString(), duration: 85 },
    { id: 't3', name: 'calculatePrice', status: 'error', startedAt: new Date().toISOString(), error: 'Invalid discount code' },
  ],
  memory: {
    working: Math.floor(Math.random() * 100),
    longTerm: Math.floor(Math.random() * 1000),
    context: Math.floor(Math.random() * 50),
    accessed: Math.floor(Math.random() * 100),
    confidence: Math.random()
  },
  errors: [],
  metrics: {
    latency: Math.floor(Math.random() * 5000),
    cost: Math.random() * 0.5,
    steps: Math.floor(Math.random() * 20),
    retries: Math.floor(Math.random() * 3),
    handoffs: Math.floor(Math.random() * 5)
  },
  input: { query: 'Show me sales report for Q4', userId: 'user-123' },
  output: { report: 'Q4 Sales: $2.5M (+15% YoY)' }
});

class AIInspectorAPI {
  private baseUrl: string;
  private healthUrl: string;

  constructor() {
    this.baseUrl = process.env.INSPECTOR_API_URL || 'http://localhost:4399/api/ai';
    this.healthUrl = process.env.HUB_URL || 'http://localhost:4399';
  }

  async getSessions(limit = 50): Promise<AgentSession[]> {
    // In production, call: GET /api/ai/sessions
    // For now, return mock data
    return Array.from({ length: Math.min(limit, 10) }, (_, i) =>
      generateMockSession(`session-${i}-${Date.now()}`)
    );
  }

  async getSession(id: string): Promise<AgentSession | null> {
    // GET /api/ai/sessions/:id
    return generateMockSession(id);
  }

  async getTrace(sessionId: string): Promise<TraceEvent[]> {
    // GET /api/ai/sessions/:id/trace
    const events: TraceEvent[] = [];
    const types: TraceEvent['type'][] = ['llm_call', 'tool_call', 'memory_access', 'decision', 'handoff'];

    for (let i = 0; i < 20; i++) {
      events.push({
        id: `event-${i}`,
        sessionId,
        type: types[Math.floor(Math.random() * types.length)],
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        data: { step: i, duration: Math.floor(Math.random() * 500) }
      });
    }
    return events;
  }

  async getServiceHealth(): Promise<ServiceHealth[]> {
    // Aggregate health from Hub + observability services
    const services = [
      { name: 'sutar-gateway', url: 'http://localhost:4140/health' },
      { name: 'memory-os', url: 'http://localhost:4703/health' },
      { name: 'twin-os', url: 'http://localhost:4705/health' },
      { name: 'corp-id', url: 'http://localhost:4702/health' },
      { name: 'genie-os', url: 'http://localhost:4701/health' },
    ];

    const health: ServiceHealth[] = [];
    for (const svc of services) {
      try {
        const start = Date.now();
        const res = await fetch(svc.url, { signal: AbortSignal.timeout(2000) });
        const latency = Date.now() - start;
        health.push({
          name: svc.name,
          status: res.ok ? 'healthy' : 'degraded',
          latency,
          errorRate: res.ok ? 0 : 1
        });
      } catch {
        health.push({
          name: svc.name,
          status: 'down',
          latency: 0,
          errorRate: 1
        });
      }
    }
    return health;
  }

  async getAgentMetrics(agentId: string, range: '1h' | '24h' | '7d' = '24h'): Promise<{
    requests: number;
    success: number;
    errors: number;
    avgLatency: number;
    avgCost: number;
    tokenUsage: { prompt: number; completion: number };
  }> {
    return {
      requests: Math.floor(Math.random() * 1000),
      success: Math.floor(Math.random() * 900),
      errors: Math.floor(Math.random() * 50),
      avgLatency: Math.floor(Math.random() * 2000),
      avgCost: Math.random() * 2,
      tokenUsage: {
        prompt: Math.floor(Math.random() * 100000),
        completion: Math.floor(Math.random() * 50000)
      }
    };
  }
}

export const api = new AIInspectorAPI();
export type { AgentSession, ToolCall, MemorySnapshot, AgentError, TraceEvent, ServiceHealth };
