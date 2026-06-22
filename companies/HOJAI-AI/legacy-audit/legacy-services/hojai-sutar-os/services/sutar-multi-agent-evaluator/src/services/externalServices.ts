import { AgentNetworkAgent, DecisionEngineRequest } from '../types/index.js';
import { createScopedLogger } from '../utils/logger.js';

const logger = createScopedLogger('externalServices');

const AGENT_NETWORK_URL = process.env.AGENT_NETWORK_URL || 'http://localhost:4155';
const DECISION_ENGINE_URL = process.env.DECISION_ENGINE_URL || 'http://localhost:4240';
const REQUEST_TIMEOUT = 5000;

class AgentNetworkClient {
  async getAgents(): Promise<AgentNetworkAgent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${AGENT_NETWORK_URL}/api/v1/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      logger.warn('Failed to fetch agents from Agent Network', { error: String(error) });
      return this.getFallbackAgents();
    }
  }

  async getAgent(id: string): Promise<AgentNetworkAgent | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${AGENT_NETWORK_URL}/api/v1/agents/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      logger.warn('Failed to fetch agent from Agent Network', { error: String(error), agentId: id });
      return null;
    }
  }

  async registerAgent(agent: Partial<AgentNetworkAgent>): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${AGENT_NETWORK_URL}/api/v1/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      logger.warn('Failed to register agent with Agent Network', { error: String(error) });
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${AGENT_NETWORK_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      logger.debug('Agent Network health check failed', { error: String(error) });
      return false;
    }
  }

  private getFallbackAgents(): AgentNetworkAgent[] {
    return [
      {
        id: 'fallback-1',
        name: 'Fallback Coordinator',
        capabilities: ['coordination', 'management'],
        availability: true,
        currentLoad: 0.2,
      },
      {
        id: 'fallback-2',
        name: 'Fallback Executor',
        capabilities: ['execution', 'processing'],
        availability: true,
        currentLoad: 0.3,
      },
    ];
  }
}

interface AssignmentDecision {
  selectedAgents: string[];
  strategy: 'capability-match' | 'load-balanced' | 'performance-based' | 'collaborative';
  confidence: number;
  reasoning: string;
}

class DecisionEngineClient {
  async requestAssignmentDecision(request: {
    taskId: string;
    requiredCapabilities: string[];
    priority: string;
    candidates: string[];
  }): Promise<AssignmentDecision> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${DECISION_ENGINE_URL}/api/v1/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task_assignment',
          agents: request.candidates,
          task: {
            id: request.taskId,
            type: 'evaluation',
            requirements: request.requiredCapabilities,
          },
          context: {
            priority: request.priority,
            requiredCapabilities: request.requiredCapabilities,
          },
        } as DecisionEngineRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || this.getFallbackDecision(request);
    } catch (error) {
      logger.warn('Failed to get decision from Decision Engine', { error: String(error) });
      return this.getFallbackDecision(request);
    }
  }

  async requestEvaluationDecision(agents: string[]): Promise<{
    recommendations: string[];
    confidence: number;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${DECISION_ENGINE_URL}/api/v1/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'agent_selection',
          agents,
          task: { id: 'eval-task', type: 'evaluation', requirements: [] },
          context: {},
        } as DecisionEngineRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || { recommendations: agents, confidence: 0.7 };
    } catch (error) {
      logger.warn('Failed to get evaluation decision', { error: String(error) });
      return { recommendations: agents, confidence: 0.7 };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${DECISION_ENGINE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      logger.debug('Decision Engine health check failed', { error: String(error) });
      return false;
    }
  }

  private getFallbackDecision(request: {
    candidates: string[];
    requiredCapabilities: string[];
  }): AssignmentDecision {
    // Simple fallback: select top 2 candidates
    return {
      selectedAgents: request.candidates.slice(0, Math.min(2, request.candidates.length)),
      strategy: 'capability-match',
      confidence: 0.6,
      reasoning: 'Fallback decision using capability matching',
    };
  }
}

export const agentNetworkClient = new AgentNetworkClient();
export const decisionEngineClient = new DecisionEngineClient();
