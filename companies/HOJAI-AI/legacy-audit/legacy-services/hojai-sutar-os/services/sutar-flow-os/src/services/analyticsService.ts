/**
 * SUTAR Flow OS - Analytics Service
 * Handles flow analytics, bottleneck detection, and dashboard data
 */

import { v4 as uuid } from 'uuid';
import {
  FlowRunModel,
  FlowStepModel,
  FlowDefinitionModel,
  FlowAnalyticsModel,
  FlowBottleneckModel
} from '../models/index.js';
import {
  IFlowRun,
  IFlowStep,
  IFlowDefinition,
  IFlowAnalytics,
  IFlowBottleneck,
  IStepAnalytics
} from '../models/index.js';
import { RunStatus, DashboardStats, WorkflowAnalytics } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('analytics-service');

export const analyticsService = {
  /**
   * Get flow analytics
   */
  async getFlowAnalytics(
    tenantId: string,
    flowId: string,
    period: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  ): Promise<IFlowAnalytics | null> {
    const runs = await FlowRunModel.find({
      tenantId,
      flowId,
      createdAt: { $gte: period.start, $lte: period.end }
    }).lean();

    if (runs.length === 0) {
      return null;
    }

    const totalRuns = runs.length;
    const completedRuns = runs.filter(r => r.status === RunStatus.COMPLETED).length;
    const failedRuns = runs.filter(r => r.status === RunStatus.FAILED).length;

    // Calculate average duration
    const completedWithDuration = runs.filter(
      r => r.status === RunStatus.COMPLETED && r.startedAt && r.completedAt
    );
    const avgDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, r) => {
          const duration = new Date(r.completedAt!).getTime() - new Date(r.startedAt).getTime();
          return sum + duration;
        }, 0) / completedWithDuration.length
      : 0;

    const successRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

    // Get step-level analytics
    const stepExecutions = await FlowStepModel.find({
      tenantId,
      flowId,
      startedAt: { $gte: period.start, $lte: period.end }
    }).lean();

    const stepMap = new Map<string, IFlowStep[]>();
    for (const step of stepExecutions as unknown as IFlowStep[]) {
      const existing = stepMap.get(step.stepId) || [];
      existing.push(step);
      stepMap.set(step.stepId, existing);
    }

    const stepAnalytics: IStepAnalytics[] = [];
    for (const [stepId, steps] of stepMap) {
      const totalExecutions = steps.length;
      const failedSteps = steps.filter(s => s.status === 'failed').length;
      const completedSteps = steps.filter(s => s.status === 'completed' && s.completedAt);

      const avgStepDuration = completedSteps.length > 0
        ? completedSteps.reduce((sum, s) => {
            const duration = new Date(s.completedAt!).getTime() - new Date(s.startedAt).getTime();
            return sum + duration;
          }, 0) / completedSteps.length
        : 0;

      const avgRetries = steps.reduce((sum, s) => sum + s.retryCount, 0) / totalExecutions;

      stepAnalytics.push({
        stepId,
        avgDuration: avgStepDuration,
        failureRate: (failedSteps / totalExecutions) * 100,
        avgRetries,
        totalExecutions
      });
    }

    // Create or update analytics record
    const analyticsId = `${flowId}_${period.start.toISOString().split('T')[0]}`;
    const analytics = await FlowAnalyticsModel.findOneAndUpdate(
      { id: analyticsId },
      {
        id: analyticsId,
        tenantId,
        flowId,
        period,
        totalRuns,
        completedRuns,
        failedRuns,
        avgDuration,
        successRate,
        stepAnalytics,
        recordedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return analytics.toObject();
  },

  /**
   * Get flow bottlenecks
   */
  async getBottlenecks(tenantId: string, flowId: string): Promise<IFlowBottleneck[]> {
    const bottlenecks = await FlowBottleneckModel.find({ tenantId, flowId })
      .sort({ failureRate: -1 })
      .lean();
    return bottlenecks as unknown as IFlowBottleneck[];
  },

  /**
   * Detect bottlenecks for a flow
   */
  async detectBottlenecks(tenantId: string, flowId: string): Promise<IFlowBottleneck[]> {
    const flow = await FlowDefinitionModel.findOne({ id: flowId, tenantId });
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    const runs = await FlowRunModel.find({ tenantId, flowId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    if (runs.length < 5) {
      return [];
    }

    const stepExecutions = await FlowStepModel.find({
      tenantId,
      flowId
    })
      .sort({ startedAt: -1 })
      .limit(1000)
      .lean();

    const bottlenecks: IFlowBottleneck[] = [];

    for (const step of flow.steps) {
      const stepRuns = (stepExecutions as unknown as IFlowStep[]).filter(s => s.stepId === step.id);
      if (stepRuns.length < 3) continue;

      const failedCount = stepRuns.filter(s => s.status === 'failed').length;
      const failureRate = (failedCount / stepRuns.length) * 100;

      // Check for high failure rate
      if (failureRate > 20) {
        bottlenecks.push({
          id: uuid(),
          tenantId,
          flowId,
          stepId: step.id,
          description: `Step "${step.name}" has a ${failureRate.toFixed(1)}% failure rate`,
          avgWaitTime: 0,
          failureRate,
          suggestion: `Consider adding retry logic or error handling for step "${step.name}". Current retry policy: ${step.retryPolicy?.maxRetries || 0} retries.`,
          createdAt: new Date()
        } as unknown as IFlowBottleneck);
      }

      // Check for long execution times
      const completedSteps = stepRuns.filter(s => s.status === 'completed' && s.completedAt);
      if (completedSteps.length > 0) {
        const avgDuration = completedSteps.reduce((sum, s) => {
          return sum + (new Date(s.completedAt!).getTime() - new Date(s.startedAt).getTime());
        }, 0) / completedSteps.length;

        if (avgDuration > 30000) { // > 30 seconds
          bottlenecks.push({
            id: uuid(),
            tenantId,
            flowId,
            stepId: step.id,
            description: `Step "${step.name}" has an average execution time of ${(avgDuration / 1000).toFixed(1)}s`,
            avgWaitTime: avgDuration,
            failureRate,
            suggestion: `Consider optimizing step "${step.name}" or adding caching. Average time: ${(avgDuration / 1000).toFixed(1)}s.`,
            createdAt: new Date()
          } as unknown as IFlowBottleneck);
        }
      }
    }

    // Save bottlenecks
    for (const bottleneck of bottlenecks) {
      await FlowBottleneckModel.findOneAndUpdate(
        { tenantId, flowId, stepId: bottleneck.stepId },
        bottleneck,
        { upsert: true }
      );
    }

    return bottlenecks;
  },

  /**
   * Get dashboard statistics
   */
  async getDashboard(tenantId: string): Promise<DashboardStats> {
    const [flows, runs] = await Promise.all([
      FlowDefinitionModel.find({ tenantId }).lean(),
      FlowRunModel.find({ tenantId }).lean()
    ]);

    const totalFlows = flows.length;
    const activeFlows = flows.filter(f => {
      const flowRuns = (runs as unknown as IFlowRun[]).filter(r => r.flowId === f.id);
      return flowRuns.some(r => r.status === RunStatus.RUNNING);
    }).length;

    const totalRuns = runs.length;
    const runningRuns = (runs as unknown as IFlowRun[]).filter(r => r.status === RunStatus.RUNNING).length;
    const completedRuns = (runs as unknown as IFlowRun[]).filter(r => r.status === RunStatus.COMPLETED).length;
    const failedRuns = (runs as unknown as IFlowRun[]).filter(r => r.status === RunStatus.FAILED).length;

    const avgSuccessRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

    // Calculate average execution time
    const completedWithDuration = (runs as unknown as IFlowRun[]).filter(
      r => r.status === RunStatus.COMPLETED && r.startedAt && r.completedAt
    );
    const avgExecutionTime = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, r) => {
          return sum + (new Date(r.completedAt!).getTime() - new Date(r.startedAt).getTime());
        }, 0) / completedWithDuration.length
      : 0;

    // Get top flows by run count
    const flowRunCounts = new Map<string, number>();
    for (const run of runs as unknown as IFlowRun[]) {
      const count = flowRunCounts.get(run.flowId) || 0;
      flowRunCounts.set(run.flowId, count + 1);
    }

    const topFlows = Array.from(flowRunCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flowId, runCount]) => {
        const flow = (flows as unknown as IFlowDefinition[]).find(f => f.id === flowId);
        const flowRuns = (runs as unknown as IFlowRun[]).filter(r => r.flowId === flowId);
        const completed = flowRuns.filter(r => r.status === RunStatus.COMPLETED).length;
        return {
          flowId,
          name: flow?.name || 'Unknown',
          runCount,
          successRate: runCount > 0 ? (completed / runCount) * 100 : 0
        };
      });

    // Get recent runs
    const recentRuns = (runs as unknown as IFlowRun[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(r => {
        const flow = (flows as unknown as IFlowDefinition[]).find(f => f.id === r.flowId);
        return {
          id: r.id,
          flowId: r.flowId,
          flowName: flow?.name || 'Unknown',
          status: r.status as RunStatus,
          startedAt: r.startedAt
        };
      });

    return {
      totalFlows,
      activeFlows,
      totalRuns,
      runningRuns,
      completedRuns,
      failedRuns,
      avgSuccessRate,
      avgExecutionTime,
      topFlows,
      recentRuns
    };
  },

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(tenantId: string): Promise<WorkflowAnalytics> {
    const [flows, runs, bottlenecks] = await Promise.all([
      FlowDefinitionModel.find({ tenantId }).lean(),
      FlowRunModel.find({ tenantId }).lean(),
      FlowBottleneckModel.find({ tenantId }).sort({ failureRate: -1 }).limit(10).lean()
    ]);

    const totalFlows = flows.length;
    const totalRuns = runs.length;
    const completedRuns = (runs as unknown as IFlowRun[]).filter(r => r.status === RunStatus.COMPLETED).length;
    const failedRuns = (runs as unknown as IFlowRun[]).filter(r => r.status === RunStatus.FAILED).length;
    const successRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

    // Calculate average duration
    const completedWithDuration = (runs as unknown as IFlowRun[]).filter(
      r => r.status === RunStatus.COMPLETED && r.startedAt && r.completedAt
    );
    const avgDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, r) => {
          return sum + (new Date(r.completedAt!).getTime() - new Date(r.startedAt).getTime());
        }, 0) / completedWithDuration.length
      : 0;

    // Flows by status
    const flowsByStatus: Record<string, number> = {};
    for (const flow of flows as unknown as IFlowDefinition[]) {
      const latestRun = (runs as unknown as IFlowRun[])
        .filter(r => r.flowId === flow.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const status = latestRun?.status || 'pending';
      flowsByStatus[status] = (flowsByStatus[status] || 0) + 1;
    }

    // Runs by day (last 30 days)
    const runsByDay: Array<{ date: string; total: number; completed: number; failed: number }> = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayRuns = (runs as unknown as IFlowRun[]).filter(r => {
        const runDate = new Date(r.createdAt).toISOString().split('T')[0];
        return runDate === dateStr;
      });

      runsByDay.push({
        date: dateStr,
        total: dayRuns.length,
        completed: dayRuns.filter(r => r.status === RunStatus.COMPLETED).length,
        failed: dayRuns.filter(r => r.status === RunStatus.FAILED).length
      });
    }

    // Optimization suggestions
    const optimizationSuggestions = (bottlenecks as unknown as IFlowBottleneck[]).map(b => ({
      flowId: b.flowId,
      type: 'bottleneck',
      description: b.description,
      potentialSavings: `Reducing failure rate from ${b.failureRate.toFixed(1)}% could save ${Math.round(b.failureRate * 0.1)} minutes per 100 runs`
    }));

    return {
      totalFlows,
      totalRuns,
      successRate,
      avgDuration,
      flowsByStatus,
      runsByDay,
      topBottlenecks: bottlenecks as unknown as IFlowBottleneck[],
      optimizationSuggestions
    };
  }
};

export default analyticsService;
