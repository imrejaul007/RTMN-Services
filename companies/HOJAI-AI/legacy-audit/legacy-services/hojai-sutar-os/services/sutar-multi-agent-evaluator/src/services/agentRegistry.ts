import { Agent, AgentMetrics, AgentStatus, AgentType } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createScopedLogger } from '../utils/logger.js';

const logger = createScopedLogger('agentRegistry');

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private metricsHistory: Map<string, AgentMetrics[]> = new Map();

  constructor() {
    this.initializeDefaultAgents();
  }

  private initializeDefaultAgents(): void {
    const defaultAgents: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Coordinator-Alpha',
        type: 'coordinator',
        capabilities: ['task-coordination', 'resource-management', 'conflict-resolution'],
        status: 'available',
        score: 0.85,
        metrics: {
          tasksCompleted: 0,
          tasksFailed: 0,
          averageScore: 0,
          responseTime: 0,
          uptime: 100,
          collaborationScore: 0,
        },
      },
      {
        name: 'Evaluator-Beta',
        type: 'evaluator',
        capabilities: ['performance-evaluation', 'quality-assessment', 'feedback-generation'],
        status: 'available',
        score: 0.80,
        metrics: {
          tasksCompleted: 0,
          tasksFailed: 0,
          averageScore: 0,
          responseTime: 0,
          uptime: 100,
          collaborationScore: 0,
        },
      },
      {
        name: 'Executor-Gamma',
        type: 'executor',
        capabilities: ['task-execution', 'parallel-processing', 'error-handling'],
        status: 'available',
        score: 0.90,
        metrics: {
          tasksCompleted: 0,
          tasksFailed: 0,
          averageScore: 0,
          responseTime: 0,
          uptime: 100,
          collaborationScore: 0,
        },
      },
      {
        name: 'Specialist-Delta',
        type: 'specialist',
        capabilities: ['domain-expertise', 'deep-analysis', 'specialized-processing'],
        status: 'available',
        score: 0.88,
        metrics: {
          tasksCompleted: 0,
          tasksFailed: 0,
          averageScore: 0,
          responseTime: 0,
          uptime: 100,
          collaborationScore: 0,
        },
      },
    ];

    for (const agentData of defaultAgents) {
      const agent: Agent = {
        ...agentData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.agents.set(agent.id, agent);
      this.metricsHistory.set(agent.id, []);
    }

    logger.info('Initialized default agents', { count: defaultAgents.length });
  }

  registerAgent(name: string, type: AgentType, capabilities: string[]): Agent {
    const agent: Agent = {
      id: uuidv4(),
      name,
      type,
      capabilities,
      status: 'available',
      score: 0.5,
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        averageScore: 0,
        responseTime: 0,
        uptime: 100,
        collaborationScore: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.agents.set(agent.id, agent);
    this.metricsHistory.set(agent.id, []);
    logger.info('Registered new agent', { agentId: agent.id, name, type });
    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAvailableAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.status === 'available');
  }

  getAgentsByCapabilities(requiredCapabilities: string[]): Agent[] {
    return Array.from(this.agents.values()).filter(agent =>
      requiredCapabilities.every(cap => agent.capabilities.includes(cap))
    );
  }

  getAgentsByType(type: AgentType): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.type === type);
  }

  updateAgentStatus(id: string, status: AgentStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.status = status;
    agent.updatedAt = new Date().toISOString();
    this.agents.set(id, agent);
    logger.info('Updated agent status', { agentId: id, status });
    return true;
  }

  updateAgentScore(id: string, score: number): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.score = Math.max(0, Math.min(1, score));
    agent.updatedAt = new Date().toISOString();
    this.agents.set(id, agent);
    return true;
  }

  recordTaskCompletion(agentId: string, success: boolean, score: number, responseTime: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const metrics = agent.metrics;
    const totalTasks = metrics.tasksCompleted + metrics.tasksFailed + (success ? 1 : 0);
    const totalFailed = metrics.tasksFailed + (success ? 0 : 1);

    metrics.tasksCompleted = success ? metrics.tasksCompleted + 1 : metrics.tasksCompleted;
    metrics.tasksFailed = success ? metrics.tasksFailed : metrics.tasksFailed + 1;
    metrics.averageScore = ((metrics.averageScore * metrics.tasksCompleted) + score) / (metrics.tasksCompleted + 1);
    metrics.responseTime = ((metrics.responseTime * metrics.tasksCompleted) + responseTime) / (metrics.tasksCompleted + 1);

    agent.metrics = metrics;
    agent.score = metrics.averageScore;
    agent.updatedAt = new Date().toISOString();

    this.agents.set(agentId, agent);

    // Store history
    const history = this.metricsHistory.get(agentId) || [];
    history.push({ ...metrics });
    if (history.length > 100) history.shift();
    this.metricsHistory.set(agentId, history);

    return true;
  }

  updateCollaborationScore(agentId: string, score: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const currentScore = agent.metrics.collaborationScore;
    const totalCollaborations = agent.metrics.tasksCompleted > 0 ? agent.metrics.tasksCompleted : 1;
    agent.metrics.collaborationScore = ((currentScore * (totalCollaborations - 1)) + score) / totalCollaborations;
    agent.updatedAt = new Date().toISOString();

    this.agents.set(agentId, agent);
    return true;
  }

  getMetricsHistory(agentId: string, limit: number = 10): AgentMetrics[] {
    const history = this.metricsHistory.get(agentId) || [];
    return history.slice(-limit);
  }

  removeAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    if (deleted) {
      this.metricsHistory.delete(id);
      logger.info('Removed agent', { agentId: id });
    }
    return deleted;
  }
}

export const agentRegistry = new AgentRegistry();
