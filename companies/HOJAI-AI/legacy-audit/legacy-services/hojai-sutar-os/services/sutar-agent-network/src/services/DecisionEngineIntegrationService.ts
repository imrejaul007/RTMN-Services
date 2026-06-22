// ============================================================================
// SUTAR Agent Network - Decision Engine Integration Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  DecisionRequest,
  DecisionOption,
  DecisionResponse,
  AgentDecision,
  Agent,
  Task,
} from '../types/index.js';

const DECISION_ENGINE_URL = process.env.DECISION_ENGINE_URL || 'http://localhost:4240';

export interface DecisionContext {
  type: 'agent_selection' | 'task_assignment' | 'team_formation' | 'resource_allocation';
  agents?: Agent[];
  task?: Task;
  options?: DecisionOption[];
  metadata?: Record<string, unknown>;
}

export class DecisionEngineIntegrationService {
  private decisions: Map<string, AgentDecision> = new Map();
  private decisionCache: Map<string, DecisionResponse> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Make a decision request to the decision engine
   */
  async makeDecision(request: DecisionRequest): Promise<DecisionResponse> {
    try {
      const response = await fetch(`${DECISION_ENGINE_URL}/api/v1/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Decision engine error: ${response.status}`);
      }

      const data = await response.json();
      return data as DecisionResponse;
    } catch (error) {
      // Fallback to local decision making if engine is unavailable
      console.log('Decision engine unavailable, using local decision making');
      return this.localDecision(request);
    }
  }

  /**
   * Local decision making fallback
   */
  private localDecision(request: DecisionRequest): DecisionResponse {
    const requestId = request.requestId || `local-${uuidv4()}`;

    if (request.options.length === 0) {
      return {
        requestId,
        decision: { id: 'none', type: 'no_option', value: null },
        confidence: 0,
        reasoning: 'No options provided',
        timestamp: new Date().toISOString(),
      };
    }

    // Simple weighted decision based on metadata
    let bestOption = request.options[0];
    let highestWeight = 0;

    request.options.forEach(option => {
      const weight = (option.weight || 1) * this.calculateOptionWeight(option);
      if (weight > highestWeight) {
        highestWeight = weight;
        bestOption = option;
      }
    });

    return {
      requestId,
      decision: bestOption,
      confidence: highestWeight / (request.options.length * 2),
      reasoning: `Selected based on weight and metadata analysis`,
      alternativeOptions: request.options.filter(o => o.id !== bestOption.id),
      metadata: {
        totalOptions: request.options.length,
        method: 'local_weighted',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate option weight based on metadata
   */
  private calculateOptionWeight(option: DecisionOption): number {
    let weight = 1;

    if (option.metadata) {
      // Rating factor
      if (option.metadata.rating) {
        weight *= (option.metadata.rating as number) / 5;
      }

      // Success rate factor
      if (option.metadata.successRate) {
        weight *= (option.metadata.successRate as number) / 100;
      }

      // Availability factor
      if (option.metadata.available) {
        weight *= 1.5;
      }

      // Cost factor (prefer lower cost)
      if (option.metadata.cost) {
        const maxCost = 1000;
        weight *= Math.max(0.5, 1 - ((option.metadata.cost as number) / maxCost) * 0.5);
      }
    }

    return weight;
  }

  /**
   * Select best agent for a task
   */
  async selectBestAgent(
    task: Task,
    agents: Agent[],
    context?: Record<string, unknown>
  ): Promise<{ agent: Agent; confidence: number; reasoning: string } | null> {
    if (agents.length === 0) {
      return null;
    }

    const options: DecisionOption[] = agents.map(agent => ({
      id: agent.id,
      type: 'agent',
      value: agent,
      weight: 1,
      metadata: {
        rating: agent.rating,
        successRate: agent.successRate,
        available: agent.status === 'available',
        cost: agent.hourlyRate || 50,
        capabilities: agent.capabilities,
        skills: agent.skills,
      },
    }));

    const request: DecisionRequest = {
      requestId: `agent-select-${uuidv4()}`,
      taskId: task.id,
      context: {
        task: {
          title: task.title,
          requirements: task.requirements,
          priority: task.priority,
          budget: task.budget,
        },
        ...context,
      },
      options,
      constraints: {
        requiredCapabilities: task.requirements.capabilities,
        maxBudget: task.budget?.max,
      },
    };

    const response = await this.makeDecision(request);

    if (response.decision.type === 'agent' && response.decision.value) {
      const selectedAgent = agents.find(a => a.id === response.decision.value);
      if (selectedAgent) {
        return {
          agent: selectedAgent,
          confidence: response.confidence,
          reasoning: response.reasoning,
        };
      }
    }

    // Fallback to first available agent
    const availableAgent = agents.find(a => a.status === 'available');
    if (availableAgent) {
      return {
        agent: availableAgent,
        confidence: 0.5,
        reasoning: 'Fallback to first available agent',
      };
    }

    return null;
  }

  /**
   * Select best team composition
   */
  async selectBestTeam(
    requirements: {
      capabilities: string[];
      skills: string[];
    },
    availableAgents: Agent[],
    maxTeamSize: number
  ): Promise<{ team: Agent[]; confidence: number; reasoning: string }> {
    const options: DecisionOption[] = [];

    // Generate team combinations (simplified - in production would use more sophisticated algorithm)
    const combinations = this.generateCombinations(availableAgents, maxTeamSize);

    combinations.forEach((team, index) => {
      const coverage = this.calculateTeamCoverage(team, requirements);
      options.push({
        id: `team-${index}`,
        type: 'team',
        value: team.map(a => a.id),
        weight: coverage.score,
        metadata: {
          members: team.length,
          coverage: coverage.capabilities,
          skillCoverage: coverage.skills,
          averageRating: team.reduce((sum, a) => sum + a.rating, 0) / team.length,
          totalCost: team.reduce((sum, a) => sum + (a.hourlyRate || 50), 0),
        },
      });
    });

    const request: DecisionRequest = {
      requestId: `team-select-${uuidv4()}`,
      context: { requirements },
      options,
    };

    const response = await this.makeDecision(request);

    if (response.decision.type === 'team' && Array.isArray(response.decision.value)) {
      const team = (response.decision.value as string[])
        .map(id => availableAgents.find(a => a.id === id))
        .filter((a): a is Agent => a !== undefined);

      return {
        team,
        confidence: response.confidence,
        reasoning: response.reasoning,
      };
    }

    // Fallback: return best available agents
    return {
      team: availableAgents.slice(0, maxTeamSize),
      confidence: 0.5,
      reasoning: 'Fallback to available agents',
    };
  }

  /**
   * Generate team combinations
   */
  private generateCombinations(agents: Agent[], size: number): Agent[][] {
    const combinations: Agent[][] = [];

    function combine(start: number, current: Agent[]) {
      if (current.length === size) {
        combinations.push([...current]);
        return;
      }

      for (let i = start; i < agents.length && current.length < size; i++) {
        current.push(agents[i]);
        combine(i + 1, current);
        current.pop();
      }
    }

    combine(0, []);
    return combinations;
  }

  /**
   * Calculate team coverage for requirements
   */
  private calculateTeamCoverage(
    team: Agent[],
    requirements: { capabilities: string[]; skills: string[] }
  ): { score: number; capabilities: string[]; skills: string[] } {
    const coveredCapabilities = new Set<string>();
    const coveredSkills = new Set<string>();

    team.forEach(agent => {
      agent.capabilities.forEach(cap => coveredCapabilities.add(cap));
      agent.skills.forEach(skill => coveredSkills.add(skill));
    });

    const capCoverage = requirements.capabilities.filter(c => coveredCapabilities.has(c)).length;
    const skillCoverage = requirements.skills.filter(s => coveredSkills.has(s)).length;

    const totalRequirements =
      requirements.capabilities.length + requirements.skills.length;
    const coverage = totalRequirements > 0 ? (capCoverage + skillCoverage) / totalRequirements : 0;

    return {
      score: coverage * 100,
      capabilities: Array.from(coveredCapabilities),
      skills: Array.from(coveredSkills),
    };
  }

  /**
   * Record agent decision
   */
  recordDecision(decision: AgentDecision): void {
    this.decisions.set(decision.agentId, decision);
  }

  /**
   * Get agent decision history
   */
  getAgentDecisions(agentId: string): AgentDecision[] {
    return Array.from(this.decisions.values())
      .filter(d => d.agentId === agentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get cached decision
   */
  getCachedDecision(cacheKey: string): DecisionResponse | undefined {
    const cached = this.decisionCache.get(cacheKey);
    if (cached) {
      const cacheTime = new Date(cached.timestamp).getTime();
      if (Date.now() - cacheTime < this.cacheTimeout) {
        return cached;
      }
      this.decisionCache.delete(cacheKey);
    }
    return undefined;
  }

  /**
   * Cache decision
   */
  cacheDecision(cacheKey: string, decision: DecisionResponse): void {
    this.decisionCache.set(cacheKey, decision);
  }

  /**
   * Allocate resources for task
   */
  async allocateResources(
    taskId: string,
    agents: Agent[],
    resources: Record<string, unknown>
  ): Promise<{
    allocatedAgents: Agent[];
    resourceAllocation: Record<string, unknown>;
    confidence: number;
  }> {
    const options: DecisionOption[] = agents.map(agent => ({
      id: agent.id,
      type: 'resource_allocation',
      value: agent,
      weight: agent.rating,
      metadata: {
        status: agent.status,
        currentLoad: agent.completedTasks,
        capabilities: agent.capabilities,
      },
    }));

    const request: DecisionRequest = {
      requestId: `resource-alloc-${uuidv4()}`,
      taskId,
      context: { resources },
      options,
    };

    const response = await this.makeDecision(request);

    const allocatedAgents = agents.filter(a => {
      return response.decision.value === a.id || response.alternativeOptions?.some(o => o.value === a.id);
    });

    return {
      allocatedAgents,
      resourceAllocation: resources,
      confidence: response.confidence,
    };
  }

  /**
   * Evaluate task success probability
   */
  async evaluateSuccessProbability(
    task: Task,
    agent: Agent
  ): Promise<{ probability: number; factors: string[]; confidence: number }> {
    const factors: string[] = [];
    let probability = 0.5;

    // Capability match
    const capMatch = task.requirements.capabilities.filter(c =>
      agent.capabilities.includes(c)
    ).length;
    const capScore = task.requirements.capabilities.length > 0
      ? capMatch / task.requirements.capabilities.length
      : 0.5;
    probability += capScore * 0.3;
    if (capScore === 1) factors.push('All capabilities matched');
    else if (capScore > 0.5) factors.push('Most capabilities matched');

    // Skill match
    const skillMatch = task.requirements.skills.filter(s =>
      agent.skills.includes(s)
    ).length;
    const skillScore = task.requirements.skills.length > 0
      ? skillMatch / task.requirements.skills.length
      : 0.5;
    probability += skillScore * 0.2;
    if (skillScore > 0.5) factors.push('Skills aligned');

    // Agent rating
    const ratingScore = agent.rating / 5;
    probability += ratingScore * 0.2;
    if (agent.rating >= 4.5) factors.push('High-rated agent');

    // Success rate
    const successScore = agent.successRate / 100;
    probability += successScore * 0.2;
    if (agent.successRate >= 95) factors.push('Excellent track record');

    // Budget constraint
    if (task.budget?.max && agent.hourlyRate) {
      if (agent.hourlyRate <= task.budget.max) {
        probability += 0.1;
        factors.push('Within budget');
      } else {
        probability -= 0.1;
        factors.push('Over budget');
      }
    }

    return {
      probability: Math.min(1, Math.max(0, probability)),
      factors,
      confidence: (capScore + skillScore) / 2,
    };
  }

  /**
   * Get decision statistics
   */
  getDecisionStatistics(): {
    totalDecisions: number;
    cachedDecisions: number;
    averageConfidence: number;
    decisionTypes: Record<string, number>;
  } {
    const decisions = Array.from(this.decisions.values());
    const decisionTypes: Record<string, number> = {};

    decisions.forEach(d => {
      decisionTypes[d.decisionType] = (decisionTypes[d.decisionType] || 0) + 1;
    });

    const totalConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0);

    return {
      totalDecisions: decisions.length,
      cachedDecisions: this.decisionCache.size,
      averageConfidence: decisions.length > 0 ? totalConfidence / decisions.length : 0,
      decisionTypes,
    };
  }

  /**
   * Clear decision cache
   */
  clearCache(): void {
    this.decisionCache.clear();
  }

  /**
   * Check if decision engine is available
   */
  async isEngineAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${DECISION_ENGINE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const decisionEngineIntegrationService = new DecisionEngineIntegrationService();
