import { PerformanceReport, PerformanceMetrics, PerformanceTrend, TimePeriod } from '../types/index.js';
import { createScopedLogger } from '../utils/logger.js';
import { agentRegistry } from './agentRegistry.js';
import { evaluationService } from './evaluationService.js';

const logger = createScopedLogger('performanceService');

export class PerformanceService {
  getPerformanceReport(agentId: string, period?: TimePeriod): PerformanceReport | null {
    const agent = agentRegistry.getAgent(agentId);
    if (!agent) {
      logger.warn('Agent not found for performance report', { agentId });
      return null;
    }

    const reportPeriod = period || this.getDefaultPeriod();
    const metrics = this.calculateMetrics(agentId, reportPeriod);
    const trends = this.calculateTrends(agentId);
    const recommendations = this.generateRecommendations(agentId, metrics, trends);

    return {
      agentId,
      period: reportPeriod,
      metrics,
      trends,
      recommendations,
    };
  }

  private getDefaultPeriod(): TimePeriod {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      start: weekAgo.toISOString(),
      end: now.toISOString(),
    };
  }

  private calculateMetrics(agentId: string, period: TimePeriod): PerformanceMetrics {
    const agent = agentRegistry.getAgent(agentId)!;
    const history = agentRegistry.getMetricsHistory(agentId, 10);
    const evaluations = evaluationService.getEvaluationsByAgent(agentId);

    const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
    const successRate = totalTasks > 0 ? agent.metrics.tasksCompleted / totalTasks : 0;
    const averageScore = agent.metrics.averageScore || evaluations.reduce((sum, e) => sum + e.overallScore, 0) / (evaluations.length || 1);

    // Calculate collaboration rate
    const recentCollaborations = history.filter(h => h.collaborationScore > 0).length;
    const collaborationRate = history.length > 0 ? recentCollaborations / history.length : 0;

    return {
      totalTasks,
      successRate: Math.round(successRate * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      averageResponseTime: Math.round(agent.metrics.responseTime * 100) / 100,
      collaborationRate: Math.round(collaborationRate * 100) / 100,
    };
  }

  private calculateTrends(agentId: string): PerformanceTrend[] {
    const history = agentRegistry.getMetricsHistory(agentId, 20);
    const trends: PerformanceTrend[] = [];

    if (history.length < 2) {
      return [
        { metric: 'overall', direction: 'stable', changePercent: 0 },
      ];
    }

    // Compare recent (last 5) with older (previous 5)
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    if (recent.length > 0 && older.length > 0) {
      // Score trend
      const recentAvgScore = recent.reduce((sum, h) => sum + h.averageScore, 0) / recent.length;
      const olderAvgScore = older.reduce((sum, h) => sum + h.averageScore, 0) / older.length;
      const scoreChange = olderAvgScore > 0 ? ((recentAvgScore - olderAvgScore) / olderAvgScore) * 100 : 0;
      trends.push({
        metric: 'averageScore',
        direction: this.getTrendDirection(scoreChange),
        changePercent: Math.round(scoreChange * 10) / 10,
      });

      // Response time trend
      const recentAvgTime = recent.reduce((sum, h) => sum + h.responseTime, 0) / recent.length;
      const olderAvgTime = older.reduce((sum, h) => sum + h.responseTime, 0) / older.length;
      const timeChange = olderAvgTime > 0 ? ((recentAvgTime - olderAvgTime) / olderAvgTime) * 100 : 0;
      trends.push({
        metric: 'responseTime',
        direction: timeChange <= 0 ? 'up' : 'down', // Lower response time is better
        changePercent: Math.round(timeChange * 10) / 10,
      });

      // Success rate trend
      const recentSuccess = recent.filter(h => h.tasksFailed < history.indexOf(h) ? 0 : 1).length / recent.length;
      const olderSuccess = older.filter(h => h.tasksFailed < history.indexOf(h) ? 0 : 1).length / older.length;
      const successChange = olderSuccess > 0 ? ((recentSuccess - olderSuccess) / olderSuccess) * 100 : 0;
      trends.push({
        metric: 'successRate',
        direction: this.getTrendDirection(successChange),
        changePercent: Math.round(successChange * 10) / 10,
      });
    } else {
      trends.push({ metric: 'overall', direction: 'stable', changePercent: 0 });
    }

    return trends;
  }

  private getTrendDirection(changePercent: number): 'up' | 'down' | 'stable' {
    if (changePercent > 5) return 'up';
    if (changePercent < -5) return 'down';
    return 'stable';
  }

  private generateRecommendations(
    agentId: string,
    metrics: PerformanceMetrics,
    trends: PerformanceTrend[]
  ): string[] {
    const recommendations: string[] = [];
    const agent = agentRegistry.getAgent(agentId)!;

    // Based on success rate
    if (metrics.successRate < 0.7) {
      recommendations.push('Focus on improving task completion rate. Review failed tasks for common issues.');
    } else if (metrics.successRate >= 0.9) {
      recommendations.push('Excellent success rate. Consider taking on more complex tasks.');
    }

    // Based on score trend
    const scoreTrend = trends.find(t => t.metric === 'averageScore');
    if (scoreTrend && scoreTrend.direction === 'down') {
      recommendations.push('Performance score is declining. Consider additional training or support.');
    } else if (scoreTrend && scoreTrend.direction === 'up') {
      recommendations.push('Performance is improving. Maintain current practices.');
    }

    // Based on response time
    if (metrics.averageResponseTime > 5000) {
      recommendations.push('Response time is high. Optimize processing or consider caching.');
    }

    // Based on collaboration
    if (metrics.collaborationRate < 0.3 && agent.capabilities.includes('collaboration')) {
      recommendations.push('Low collaboration rate despite capability. Consider more team-based tasks.');
    }

    // Based on overall score
    if (metrics.averageScore < 60) {
      recommendations.push('Overall performance needs improvement. Review evaluation feedback.');
    } else if (metrics.averageScore >= 85) {
      recommendations.push('Outstanding performance. Consider leadership or mentoring roles.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within normal parameters. Continue current approach.');
    }

    return recommendations;
  }

  getTeamPerformance(): {
    overallMetrics: {
      totalAgents: number;
      averageScore: number;
      averageSuccessRate: number;
      totalTasksCompleted: number;
    };
    topPerformers: Array<{ agentId: string; name: string; score: number }>;
    needsAttention: Array<{ agentId: string; name: string; score: number; issue: string }>;
  } {
    const agents = agentRegistry.getAllAgents();

    let totalScore = 0;
    let totalSuccessRate = 0;
    let totalTasks = 0;

    for (const agent of agents) {
      const report = this.getPerformanceReport(agent.id);
      if (report) {
        totalScore += report.metrics.averageScore;
        totalSuccessRate += report.metrics.successRate;
        totalTasks += report.metrics.totalTasks;
      }
    }

    const agentCount = agents.length || 1;

    // Top performers (top 3 by score)
    const sortedByScore = [...agents].sort((a, b) => b.score - a.score);
    const topPerformers = sortedByScore.slice(0, 3).map(a => ({
      agentId: a.id,
      name: a.name,
      score: Math.round(a.score * 100),
    }));

    // Needs attention (score < 0.6)
    const needsAttention = sortedByScore
      .filter(a => a.score < 0.6)
      .map(a => ({
        agentId: a.id,
        name: a.name,
        score: Math.round(a.score * 100),
        issue: a.score < 0.4 ? 'Critical: Immediate intervention required' : 'Warning: Performance below threshold',
      }));

    return {
      overallMetrics: {
        totalAgents: agentCount,
        averageScore: Math.round((totalScore / agentCount) * 100) / 100,
        averageSuccessRate: Math.round((totalSuccessRate / agentCount) * 100) / 100,
        totalTasksCompleted: totalTasks,
      },
      topPerformers,
      needsAttention,
    };
  }
}

export const performanceService = new PerformanceService();