import { ConsensusRequest, ConsensusResult, AgentVote, DecisionType } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createScopedLogger } from '../utils/logger.js';
import { agentRegistry } from './agentRegistry.js';

const logger = createScopedLogger('consensusService');

export class ConsensusService {
  async buildConsensus(request: ConsensusRequest): Promise<ConsensusResult> {
    logger.info('Building consensus', {
      taskId: request.taskId,
      decisionType: request.decisionType,
      agentCount: request.agentIds.length,
    });

    // Collect votes from all agents
    const votes = await this.collectVotes(request);

    // Determine consensus
    const result = this.determineConsensus(request, votes);

    logger.info('Consensus built', {
      consensusId: result.consensusId,
      agreed: result.agreed,
      confidence: result.confidence,
    });

    return result;
  }

  private async collectVotes(request: ConsensusRequest): Promise<AgentVote[]> {
    const votes: AgentVote[] = [];

    for (const agentId of request.agentIds) {
      const agent = agentRegistry.getAgent(agentId);
      if (!agent) {
        logger.warn('Agent not found for voting', { agentId });
        continue;
      }

      const vote = this.generateAgentVote(agentId, request);
      votes.push(vote);
    }

    return votes;
  }

  private generateAgentVote(agentId: string, request: ConsensusRequest): AgentVote {
    const agent = agentRegistry.getAgent(agentId)!;
    let vote: unknown;
    let confidence = 0.7 + (agent.score * 0.3);
    let reasoning = '';

    switch (request.decisionType) {
      case 'task_assignment':
        vote = this.voteOnTaskAssignment(agent, request);
        reasoning = `Based on ${agent.name}'s capabilities and current load.`;
        break;

      case 'agent_selection':
        vote = this.voteOnAgentSelection(agent, request);
        reasoning = `${agent.name} assessed based on performance metrics.`;
        break;

      case 'performance_review':
        vote = this.voteOnPerformanceReview(agent, request);
        reasoning = `Performance review for ${agent.name} based on task history.`;
        confidence = 0.6 + (agent.metrics.averageScore * 0.4);
        break;

      case 'capability_assessment':
        vote = this.voteOnCapabilityAssessment(agent, request);
        reasoning = `Capability assessment for ${agent.name}: ${agent.capabilities.join(', ')}.`;
        break;

      default:
        vote = { decision: 'abstain' };
        reasoning = 'No specific decision criteria.';
        confidence = 0.5;
    }

    return {
      agentId,
      vote,
      confidence,
      reasoning,
    };
  }

  private voteOnTaskAssignment(agent: any, request: any): unknown {
    const capabilities = request.context?.requiredCapabilities || [];
    const matchScore = capabilities.filter((c: string) => agent.capabilities.includes(c)).length / capabilities.length;
    return {
      decision: matchScore >= 0.5 ? 'approve' : 'reject',
      matchScore,
      recommended: matchScore >= 0.7,
    };
  }

  private voteOnAgentSelection(agent: any, request: any): unknown {
    return {
      decision: agent.score >= 0.7 ? 'select' : 'defer',
      score: agent.score,
      status: agent.status,
    };
  }

  private voteOnPerformanceReview(agent: any, request: any): unknown {
    const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
    const successRate = totalTasks > 0 ? agent.metrics.tasksCompleted / totalTasks : 0;
    return {
      decision: successRate >= 0.8 ? 'approve' : 'needs_improvement',
      successRate,
      averageScore: agent.metrics.averageScore,
    };
  }

  private voteOnCapabilityAssessment(agent: any, request: any): unknown {
    return {
      decision: 'assessed',
      capabilities: agent.capabilities,
      proficiency: agent.score,
    };
  }

  private determineConsensus(request: ConsensusRequest, votes: AgentVote[]): ConsensusResult {
    if (votes.length === 0) {
      return {
        consensusId: uuidv4(),
        agreed: false,
        decision: null,
        confidence: 0,
        agentVotes: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Calculate agreement metrics
    const confidence = votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;
    const decisions = votes.map(v => JSON.stringify(v.vote));
    const uniqueDecisions = new Set(decisions);

    // Determine if consensus is reached
    let agreed = false;
    let decision: unknown = null;

    if (uniqueDecisions.size === 1) {
      // Full consensus
      agreed = true;
      decision = votes[0].vote;
    } else if (uniqueDecisions.size <= Math.ceil(votes.length / 2)) {
      // Majority consensus (more than half agree)
      const decisionCounts = new Map<string, number>();
      for (const d of decisions) {
        decisionCounts.set(d, (decisionCounts.get(d) || 0) + 1);
      }

      let maxCount = 0;
      let majorityDecision = '';
      decisionCounts.forEach((count, dec) => {
        if (count > maxCount) {
          maxCount = count;
          majorityDecision = dec;
        }
      });

      if (maxCount > votes.length / 2) {
        agreed = true;
        decision = votes.find(v => JSON.stringify(v.vote) === majorityDecision)?.vote;
      }
    }

    // If no consensus, provide a compromise decision
    if (!agreed) {
      decision = this.generateCompromiseDecision(votes, request.decisionType);
    }

    return {
      consensusId: uuidv4(),
      agreed,
      decision,
      confidence,
      agentVotes: votes,
      timestamp: new Date().toISOString(),
    };
  }

  private generateCompromiseDecision(votes: AgentVote[], decisionType: DecisionType): unknown {
    switch (decisionType) {
      case 'task_assignment':
        // Average out the match scores
        const matchScores = votes
          .map(v => (v.vote as any)?.matchScore)
          .filter((s): s is number => typeof s === 'number');
        const avgScore = matchScores.length > 0
          ? matchScores.reduce((a, b) => a + b, 0) / matchScores.length
          : 0.5;
        return {
          decision: 'compromise',
          averageMatchScore: avgScore,
          compromiseType: 'weighted_average',
        };

      case 'agent_selection':
        const scores = votes
          .map(v => (v.vote as any)?.score)
          .filter((s): s is number => typeof s === 'number');
        const avgPerfScore = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0.5;
        return {
          decision: 'compromise',
          averageScore: avgPerfScore,
          compromiseType: 'performance_threshold',
        };

      default:
        return {
          decision: 'no_consensus',
          votesCollected: votes.length,
          compromiseType: 'informational',
        };
    }
  }

  async verifyConsensus(consensusId: string): Promise<boolean> {
    // In a real implementation, this would verify the consensus
    // against a distributed ledger or consensus mechanism
    logger.info('Verifying consensus', { consensusId });
    return true;
  }

  getConsensusHistory(taskId?: string): ConsensusResult[] {
    // Return stored consensus results (in-memory for now)
    return [];
  }
}

export const consensusService = new ConsensusService();
