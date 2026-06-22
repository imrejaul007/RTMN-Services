import { CollaborationSession, CollaborationRound, AgentContribution, CollaborateRequest, CollaborationStrategy } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createScopedLogger } from '../utils/logger.js';
import { agentRegistry } from './agentRegistry.js';
import { taskManager } from './taskManager.js';

const logger = createScopedLogger('collaborationService');

export class CollaborationService {
  private sessions: Map<string, CollaborationSession> = new Map();
  private maxRoundsDefault = 5;

  async startCollaboration(request: CollaborateRequest): Promise<CollaborationSession> {
    logger.info('Starting collaboration session', {
      taskId: request.taskId,
      agents: request.agentIds,
      strategy: request.strategy || 'parallel',
    });

    // Verify all agents exist
    for (const agentId of request.agentIds) {
      const agent = agentRegistry.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
    }

    const session: CollaborationSession = {
      id: uuidv4(),
      taskId: request.taskId,
      participants: request.agentIds,
      status: 'active',
      rounds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);

    // Execute collaboration rounds
    const maxRounds = request.maxRounds || this.maxRoundsDefault;
    const strategy = request.strategy || 'parallel';

    try {
      await this.executeCollaboration(session, strategy, maxRounds);
    } catch (error) {
      session.status = 'failed';
      session.updatedAt = new Date().toISOString();
      this.sessions.set(session.id, session);
      throw error;
    }

    return session;
  }

  private async executeCollaboration(
    session: CollaborationSession,
    strategy: CollaborationStrategy,
    maxRounds: number
  ): Promise<void> {
    let converged = false;
    let roundNumber = 0;

    while (roundNumber < maxRounds && !converged) {
      roundNumber++;
      logger.info(`Executing collaboration round ${roundNumber}`, { sessionId: session.id });

      const round = await this.executeRound(session, strategy, roundNumber);
      session.rounds.push(round);

      // Check for convergence
      converged = this.checkConvergence(session.rounds);

      if (converged) {
        session.status = 'converging';
        logger.info('Collaboration converging', { sessionId: session.id, rounds: roundNumber });
      }

      session.updatedAt = new Date().toISOString();
      this.sessions.set(session.id, session);
    }

    if (converged) {
      session.status = 'completed';
      session.finalResult = this.generateFinalResult(session.rounds);
    } else {
      session.status = 'completed';
      session.finalResult = this.generateFinalResult(session.rounds);
    }

    session.updatedAt = new Date().toISOString();
    this.sessions.set(session.id, session);

    // Update collaboration scores for participants
    this.updateCollaborationScores(session);
  }

  private async executeRound(
    session: CollaborationSession,
    strategy: CollaborationStrategy,
    roundNumber: number
  ): Promise<CollaborationRound> {
    const contributions: AgentContribution[] = [];

    switch (strategy) {
      case 'sequential':
        // Agents contribute one at a time
        for (const agentId of session.participants) {
          const contribution = await this.getAgentContribution(agentId, session, roundNumber);
          contributions.push(contribution);
        }
        break;

      case 'parallel':
        // All agents contribute simultaneously
        const promises = session.participants.map(agentId =>
          this.getAgentContribution(agentId, session, roundNumber)
        );
        contributions.push(...(await Promise.all(promises)));
        break;

      case 'hierarchical':
        // Coordinator first, then specialists
        const coordinator = session.participants[0];
        if (coordinator) {
          const coordContribution = await this.getAgentContribution(coordinator, session, roundNumber);
          contributions.push(coordContribution);
        }
        for (let i = 1; i < session.participants.length; i++) {
          const contrib = await this.getAgentContribution(session.participants[i], session, roundNumber);
          contributions.push(contrib);
        }
        break;

      case 'democratic':
        // All agents contribute and vote on best approach
        const allContributions = await Promise.all(
          session.participants.map(agentId =>
            this.getAgentContribution(agentId, session, roundNumber)
          )
        );
        contributions.push(...allContributions);
        break;
    }

    const aggregatedInsight = this.aggregateInsights(contributions);

    return {
      roundNumber,
      agentContributions: contributions,
      aggregatedInsight,
      timestamp: new Date().toISOString(),
    };
  }

  private async getAgentContribution(
    agentId: string,
    session: CollaborationSession,
    roundNumber: number
  ): Promise<AgentContribution> {
    const agent = agentRegistry.getAgent(agentId)!;

    // Simulate agent contribution based on capabilities and round
    const contribution = {
      insights: [
        `Analysis from ${agent.name} in round ${roundNumber}`,
        `Building on previous rounds with ${agent.capabilities.slice(0, 2).join(', ')}`,
      ],
      recommendations: [
        `Consider prioritizing ${agent.capabilities[0]} for this task`,
      ],
      confidence: 0.7 + (agent.score * 0.3) - (roundNumber * 0.05),
    };

    // Calculate relevance based on agent's alignment with task
    const relevance = agent.score * (1 - (roundNumber * 0.1));

    return {
      agentId,
      contribution,
      relevance: Math.max(0, Math.min(1, relevance)),
    };
  }

  private aggregateInsights(contributions: AgentContribution[]): string {
    const allInsights: string[] = [];
    const allRecommendations: string[] = [];

    for (const contrib of contributions) {
      const contribution = contrib.contribution as any;
      if (contribution.insights) {
        allInsights.push(...contribution.insights);
      }
      if (contribution.recommendations) {
        allRecommendations.push(...contribution.recommendations);
      }
    }

    return [
      `Synthesized from ${contributions.length} agents:`,
      ...allInsights.slice(0, 3),
      ...allRecommendations.slice(0, 2),
    ].join(' ');
  }

  private checkConvergence(rounds: CollaborationRound[]): boolean {
    if (rounds.length < 2) return false;

    const lastRound = rounds[rounds.length - 1];
    const previousRound = rounds[rounds.length - 2];

    // Check if insights are becoming more similar (simplified convergence check)
    const lastRelevance = lastRound.agentContributions.reduce((sum, c) => sum + c.relevance, 0) / lastRound.agentContributions.length;
    const prevRelevance = previousRound.agentContributions.reduce((sum, c) => sum + c.relevance, 0) / previousRound.agentContributions.length;

    // Convergence if average relevance is stable (within 10%)
    return Math.abs(lastRelevance - prevRelevance) < 0.1 && lastRelevance > 0.5;
  }

  private generateFinalResult(rounds: CollaborationRound[]): unknown {
    if (rounds.length === 0) return null;

    const lastRound = rounds[rounds.length - 1];
    const allContributions = rounds.flatMap(r => r.agentContributions);

    // Aggregate all contributions into final result
    const finalInsights = new Map<string, number>();
    for (const contrib of allContributions) {
      const insight = JSON.stringify(contrib.contribution);
      finalInsights.set(insight, (finalInsights.get(insight) || 0) + contrib.relevance);
    }

    // Get top insights
    const topInsights = Array.from(finalInsights.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([insight]) => JSON.parse(insight));

    return {
      converged: this.checkConvergence(rounds),
      totalRounds: rounds.length,
      participantCount: lastRound.agentContributions.length,
      finalInsights: topInsights,
      summary: lastRound.aggregatedInsight,
    };
  }

  private updateCollaborationScores(session: CollaborationSession): void {
    const avgRelevance = session.rounds.length > 0
      ? session.rounds[session.rounds.length - 1].agentContributions.reduce((sum, c) => sum + c.relevance, 0) / session.rounds.length
      : 0.5;

    for (const agentId of session.participants) {
      agentRegistry.updateCollaborationScore(agentId, avgRelevance);
    }
  }

  getSession(id: string): CollaborationSession | undefined {
    return this.sessions.get(id);
  }

  getSessionsByAgent(agentId: string): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s =>
      s.participants.includes(agentId)
    );
  }

  getSessionsByStatus(status: string): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === status);
  }

  getActiveSessions(): CollaborationSession[] {
    return this.getSessionsByStatus('active');
  }

  abortSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.status === 'active' || session.status === 'converging') {
      session.status = 'failed';
      session.updatedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
      logger.info('Aborted collaboration session', { sessionId });
      return true;
    }

    return false;
  }
}

export const collaborationService = new CollaborationService();