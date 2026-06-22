import { Evaluation, EvaluationCriteria, EvaluationVerdict, EvaluateRequest } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createScopedLogger } from '../utils/logger.js';
import { agentRegistry } from './agentRegistry.js';
import { taskManager } from './taskManager.js';

const logger = createScopedLogger('evaluationService');

const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  { name: 'accuracy', weight: 0.3, score: 0, maxScore: 100 },
  { name: 'efficiency', weight: 0.25, score: 0, maxScore: 100 },
  { name: 'reliability', weight: 0.2, score: 0, maxScore: 100 },
  { name: 'timeliness', weight: 0.15, score: 0, maxScore: 100 },
  { name: 'collaboration', weight: 0.1, score: 0, maxScore: 100 },
];

export class EvaluationService {
  private evaluations: Map<string, Evaluation> = new Map();
  private evaluationHistory: Map<string, Evaluation[]> = new Map();

  async evaluateAgents(request: EvaluateRequest): Promise<Evaluation[]> {
    logger.info('Starting agent evaluation', { agentIds: request.agentIds, taskId: request.taskId });

    const evaluations: Evaluation[] = [];
    const criteria = request.criteria?.length
      ? request.criteria.map(c => ({
          name: c.name || '',
          weight: c.weight || 0.2,
          score: c.score || 0,
          maxScore: c.maxScore || 100,
          notes: c.notes,
        }))
      : DEFAULT_CRITERIA.map(c => ({ ...c }));

    for (const agentId of request.agentIds) {
      const agent = agentRegistry.getAgent(agentId);
      if (!agent) {
        logger.warn('Agent not found for evaluation', { agentId });
        continue;
      }

      const evaluation = this.performEvaluation(agentId, request.taskId, criteria);
      evaluations.push(evaluation);

      // Update agent score based on evaluation
      agentRegistry.updateAgentScore(agentId, evaluation.overallScore / 100);
    }

    logger.info('Completed agent evaluation', { count: evaluations.length });
    return evaluations;
  }

  private performEvaluation(agentId: string, taskId: string | undefined, criteria: EvaluationCriteria[]): Evaluation {
    const agent = agentRegistry.getAgent(agentId)!;
    const startTime = Date.now();

    // Simulate evaluation scoring based on agent metrics and capabilities
    const scoredCriteria = criteria.map(criterion => {
      let score: number;

      switch (criterion.name) {
        case 'accuracy':
          score = agent.score * 100;
          break;
        case 'efficiency':
          score = agent.metrics.responseTime > 0
            ? Math.max(0, 100 - (agent.metrics.responseTime / 10))
            : 85 + Math.random() * 15;
          break;
        case 'reliability':
          const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
          score = totalTasks > 0
            ? (agent.metrics.tasksCompleted / totalTasks) * 100
            : 80 + Math.random() * 20;
          break;
        case 'timeliness':
          score = 70 + Math.random() * 30;
          break;
        case 'collaboration':
          score = agent.metrics.collaborationScore > 0
            ? agent.metrics.collaborationScore * 100
            : 75 + Math.random() * 25;
          break;
        default:
          score = 70 + Math.random() * 30;
      }

      return {
        ...criterion,
        score: Math.round(score * 100) / 100,
        notes: `Evaluated based on ${criterion.name} metrics`,
      };
    });

    // Calculate weighted overall score
    const overallScore = scoredCriteria.reduce((sum, c) => sum + (c.score * c.weight), 0);

    // Determine verdict
    const verdict = this.determineVerdict(overallScore);

    const evaluation: Evaluation = {
      id: uuidv4(),
      taskId: taskId || '',
      agentId,
      criteria: scoredCriteria,
      overallScore: Math.round(overallScore * 100) / 100,
      verdict,
      feedback: this.generateFeedback(verdict, scoredCriteria),
      timestamp: new Date().toISOString(),
    };

    this.evaluations.set(evaluation.id, evaluation);

    // Store in history
    const history = this.evaluationHistory.get(agentId) || [];
    history.push(evaluation);
    if (history.length > 50) history.shift();
    this.evaluationHistory.set(agentId, history);

    logger.debug('Evaluation completed', { evaluationId: evaluation.id, agentId, overallScore, verdict });
    return evaluation;
  }

  private determineVerdict(score: number): EvaluationVerdict {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'acceptable';
    if (score >= 40) return 'poor';
    return 'failed';
  }

  private generateFeedback(verdict: EvaluationVerdict, criteria: EvaluationCriteria[]): string {
    const feedbackParts: string[] = [`Overall performance: ${verdict.toUpperCase()}.`];

    const strongCriteria = criteria.filter(c => c.score >= 80);
    const weakCriteria = criteria.filter(c => c.score < 60);

    if (strongCriteria.length > 0) {
      feedbackParts.push(`Strong areas: ${strongCriteria.map(c => c.name).join(', ')}.`);
    }

    if (weakCriteria.length > 0) {
      feedbackParts.push(`Areas for improvement: ${weakCriteria.map(c => c.name).join(', ')}.`);
    }

    return feedbackParts.join(' ');
  }

  getEvaluation(id: string): Evaluation | undefined {
    return this.evaluations.get(id);
  }

  getEvaluationsByAgent(agentId: string): Evaluation[] {
    return this.evaluationHistory.get(agentId) || [];
  }

  getEvaluationsByTask(taskId: string): Evaluation[] {
    return Array.from(this.evaluations.values()).filter(e => e.taskId === taskId);
  }

  getLatestEvaluation(agentId: string): Evaluation | undefined {
    const history = this.evaluationHistory.get(agentId);
    return history ? history[history.length - 1] : undefined;
  }

  compareAgents(agentIds: string[]): {
    comparisons: Array<{
      agentId: string;
      score: number;
      rank: number;
    }>;
    recommendations: string[];
  } {
    const comparisons = agentIds.map(agentId => {
      const agent = agentRegistry.getAgent(agentId);
      return {
        agentId,
        score: agent?.score || 0,
        rank: 0,
      };
    });

    comparisons.sort((a, b) => b.score - a.score);
    comparisons.forEach((c, i) => c.rank = i + 1);

    const recommendations: string[] = [];
    if (comparisons.length > 0) {
      recommendations.push(`Top performer: ${comparisons[0].agentId} with score ${(comparisons[0].score * 100).toFixed(1)}%`);
      if (comparisons.length > 1) {
        const gap = comparisons[0].score - comparisons[comparisons.length - 1].score;
        if (gap > 0.2) {
          recommendations.push('Consider training for lower-ranked agents to improve overall team performance.');
        }
      }
    }

    return { comparisons, recommendations };
  }

  getEvaluationStatistics(): {
    totalEvaluations: number;
    averageScore: number;
    verdictDistribution: Record<EvaluationVerdict, number>;
  } {
    const evaluations = Array.from(this.evaluations.values());

    const verdictDistribution: Record<EvaluationVerdict, number> = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0,
      failed: 0,
    };

    let totalScore = 0;
    for (const evaluation of evaluations) {
      totalScore += evaluation.overallScore;
      verdictDistribution[evaluation.verdict]++;
    }

    return {
      totalEvaluations: evaluations.length,
      averageScore: evaluations.length > 0 ? totalScore / evaluations.length : 0,
      verdictDistribution,
    };
  }
}

export const evaluationService = new EvaluationService();
