import { Task, AssignRequest, Agent } from '../types/index.js';
import { createScopedLogger } from '../utils/logger.js';
import { agentRegistry } from './agentRegistry.js';
import { taskManager } from './taskManager.js';
import { decisionEngineClient } from './externalServices.js';

const logger = createScopedLogger('taskAssignment');

interface AssignmentResult {
  taskId: string;
  assignedAgents: string[];
  assignmentScore: number;
  reasoning: string;
  strategy: AssignmentStrategy;
}

type AssignmentStrategy = 'capability-match' | 'load-balanced' | 'performance-based' | 'collaborative';

export class TaskAssignmentService {
  async assignTask(request: AssignRequest): Promise<AssignmentResult> {
    logger.info('Processing task assignment', { taskId: request.taskId });

    const task = taskManager.getTask(request.taskId);
    if (!task) {
      throw new Error(`Task not found: ${request.taskId}`);
    }

    // Get available agents
    let candidates = agentRegistry.getAvailableAgents();

    // Filter by required capabilities if specified
    if (request.requiredCapabilities && request.requiredCapabilities.length > 0) {
      candidates = candidates.filter(agent =>
        request.requiredCapabilities!.every(cap => agent.capabilities.includes(cap))
      );
    }

    // Filter by preferred agents if specified
    if (request.preferredAgents && request.preferredAgents.length > 0) {
      const preferred = candidates.filter(a => request.preferredAgents!.includes(a.id));
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    if (candidates.length === 0) {
      logger.warn('No suitable agents found for task', { taskId: request.taskId });
      return {
        taskId: request.taskId,
        assignedAgents: [],
        assignmentScore: 0,
        reasoning: 'No suitable agents available',
        strategy: 'capability-match',
      };
    }

    // Try to get decision from Decision Engine
    let selectedAgents: string[];
    let strategy: AssignmentStrategy;

    try {
      const decision = await decisionEngineClient.requestAssignmentDecision({
        taskId: request.taskId,
        requiredCapabilities: request.requiredCapabilities || task.requiredCapabilities,
        priority: request.priority || task.priority,
        candidates: candidates.map(a => a.id),
      });

      selectedAgents = decision.selectedAgents;
      strategy = decision.strategy;
    } catch (error) {
      // Fallback to local assignment algorithm
      logger.warn('Decision Engine unavailable, using local assignment', { error });
      const result = this.localAssignment(task, candidates, request.priority || task.priority);
      selectedAgents = result.agents;
      strategy = result.strategy;
    }

    // Assign agents to task
    if (selectedAgents.length > 0) {
      taskManager.assignAgentsToTask(request.taskId, selectedAgents);
      selectedAgents.forEach(agentId => agentRegistry.updateAgentStatus(agentId, 'busy'));
    }

    const result: AssignmentResult = {
      taskId: request.taskId,
      assignedAgents: selectedAgents,
      assignmentScore: this.calculateAssignmentScore(selectedAgents),
      reasoning: this.generateAssignmentReasoning(selectedAgents, strategy),
      strategy,
    };

    logger.info('Task assignment completed', result);
    return result;
  }

  private localAssignment(
    task: Task,
    candidates: Agent[],
    priority: string
  ): { agents: string[]; strategy: AssignmentStrategy } {
    // Determine task complexity and select appropriate number of agents
    const complexity = this.assessTaskComplexity(task);
    const agentCount = this.determineAgentCount(complexity, priority);

    // Score and rank candidates
    const scoredCandidates = candidates.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, task),
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);

    // Select top candidates
    const selected = scoredCandidates.slice(0, agentCount);
    const strategy: AssignmentStrategy = selected.length > 1 ? 'collaborative' : 'performance-based';

    return {
      agents: selected.map(s => s.agent.id),
      strategy,
    };
  }

  private assessTaskComplexity(task: Task): 'simple' | 'moderate' | 'complex' {
    const capabilityScore = task.requiredCapabilities.length;
    const typeComplexity: Record<string, number> = {
      analysis: 3,
      collaborative: 3,
      evaluation: 2,
      execution: 1,
      coordination: 2,
    };

    const score = capabilityScore + (typeComplexity[task.type] || 1);
    if (score >= 5) return 'complex';
    if (score >= 3) return 'moderate';
    return 'simple';
  }

  private determineAgentCount(complexity: string, priority: string): number {
    const baseCount: Record<string, number> = {
      simple: 1,
      moderate: 2,
      complex: 3,
    };

    let count = baseCount[complexity] || 1;

    // Increase for critical priority
    if (priority === 'critical') {
      count = Math.min(count + 1, 4);
    }

    return count;
  }

  private calculateAgentScore(agent: Agent, task: Task): number {
    // Capability match score (0-40)
    const matchingCapabilities = task.requiredCapabilities.filter(cap =>
      agent.capabilities.includes(cap)
    ).length;
    const capabilityScore = (matchingCapabilities / task.requiredCapabilities.length) * 40;

    // Performance score (0-30)
    const performanceScore = agent.score * 30;

    // Availability/load score (0-20)
    const loadScore = agent.status === 'available' ? 20 : 0;

    // Historical success score (0-10)
    const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
    const successRate = totalTasks > 0 ? agent.metrics.tasksCompleted / totalTasks : 0.5;
    const historicalScore = successRate * 10;

    return capabilityScore + performanceScore + loadScore + historicalScore;
  }

  private calculateAssignmentScore(agentIds: string[]): number {
    if (agentIds.length === 0) return 0;

    const scores = agentIds.map(id => {
      const agent = agentRegistry.getAgent(id);
      return agent?.score || 0;
    });

    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  private generateAssignmentReasoning(agentIds: string[], strategy: AssignmentStrategy): string {
    if (agentIds.length === 0) {
      return 'No agents could be assigned due to unavailability or capability mismatch.';
    }

    const reasons: string[] = [];

    switch (strategy) {
      case 'capability-match':
        reasons.push('Selected based on best capability match for task requirements.');
        break;
      case 'load-balanced':
        reasons.push('Selected to balance workload across available agents.');
        break;
      case 'performance-based':
        reasons.push('Selected based on highest performance scores.');
        break;
      case 'collaborative':
        reasons.push('Multiple agents selected for collaborative task execution.');
        break;
    }

    reasons.push(`${agentIds.length} agent(s) assigned: ${agentIds.join(', ')}`);

    return reasons.join(' ');
  }

  async reassignTask(taskId: string, newAgentIds: string[]): Promise<boolean> {
    const task = taskManager.getTask(taskId);
    if (!task) return false;

    // Release current agents
    for (const agentId of task.assignedAgents) {
      agentRegistry.updateAgentStatus(agentId, 'available');
    }

    // Assign new agents
    taskManager.assignAgentsToTask(taskId, newAgentIds);
    newAgentIds.forEach(agentId => agentRegistry.updateAgentStatus(agentId, 'busy'));

    logger.info('Task reassigned', { taskId, newAgents: newAgentIds });
    return true;
  }

  getAssignmentRecommendations(taskId: string): {
    recommendedAgents: Array<{ agentId: string; score: number; reason: string }>;
    alternativeAgents: Array<{ agentId: string; score: number; reason: string }>;
  } {
    const task = taskManager.getTask(taskId);
    if (!task) {
      return { recommendedAgents: [], alternativeAgents: [] };
    }

    const allAgents = agentRegistry.getAllAgents();
    const scored = allAgents.map(agent => ({
      agentId: agent.id,
      score: this.calculateAgentScore(agent, task),
      reason: this.getAgentSelectionReason(agent, task),
    }));

    scored.sort((a, b) => b.score - a.score);

    const recommended = scored.slice(0, 3);
    const alternatives = scored.slice(3, 6);

    return { recommendedAgents: recommended, alternativeAgents: alternatives };
  }

  private getAgentSelectionReason(agent: Agent, task: Task): string {
    const matchingCaps = task.requiredCapabilities.filter(c => agent.capabilities.includes(c));
    const reasons: string[] = [];

    if (matchingCaps.length === task.requiredCapabilities.length) {
      reasons.push('Full capability match');
    } else {
      reasons.push(`${matchingCaps.length}/${task.requiredCapabilities.length} capabilities matched`);
    }

    if (agent.score >= 0.8) {
      reasons.push('High performance score');
    }

    if (agent.status === 'available') {
      reasons.push('Currently available');
    }

    return reasons.join(', ');
  }
}

export const taskAssignmentService = new TaskAssignmentService();
