/**
 * HOJAI Performance Dashboard - KPI Tracker Service
 *
 * Tracks and manages Key Performance Indicators for AI employees.
 */

import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { KPIUpdate, KPI_THRESHOLDS, KPIQueryParams } from '../types/index.js';
import { KPI, KPIHistory, EmployeeProfile } from '../models/performanceModel.js';

export class KPITracker {
  /**
   * Initialize or get KPI record for an employee
   */
  async initializeKPI(employeeId: string, tenantId: string, period?: string) {
    const periodLabel = period || format(new Date(), 'yyyy-MM');

    let kpi = await KPI.findOne({ employeeId, tenantId, period: periodLabel });

    if (kpi) {
      return kpi;
    }

    const kpiId = `kpi_${uuid().slice(0, 12)}`;
    const now = new Date();

    kpi = new KPI({
      kpiId,
      employeeId,
      tenantId,
      period: periodLabel,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksInProgress: 0,
      tasksCancelled: 0,
      totalTasksAttempted: 0,
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      customerSatisfaction: 0,
      qualityScore: 0,
      revenueGenerated: 0,
      revenuePerTask: 0,
      conversionRate: 0,
      errorRate: 0,
      escalationRate: 0,
      escalationCount: 0,
      utilizationRate: 0,
      avgResolutionTime: 0,
      throughputPerHour: 0,
      peerRating: 0,
      teamContributionScore: 0,
    });

    await kpi.save();
    return kpi;
  }

  /**
   * Get KPI for an employee
   */
  async getKPI(employeeId: string, tenantId: string, period?: string) {
    const periodLabel = period || format(new Date(), 'yyyy-MM');
    return KPI.findOne({ employeeId, tenantId, period: periodLabel });
  }

  /**
   * Update KPI metrics
   */
  async updateKPI(
    employeeId: string,
    tenantId: string,
    updates: KPIUpdate,
    period?: string
  ) {
    const periodLabel = period || format(new Date(), 'yyyy-MM');

    let kpi = await this.initializeKPI(employeeId, tenantId, periodLabel);

    const changes: Record<string, { old: number; new: number }> = {};
    const now = new Date();

    if (updates.tasksCompleted !== undefined) {
      changes.tasksCompleted = { old: kpi.tasksCompleted, new: updates.tasksCompleted };
      kpi.tasksCompleted = updates.tasksCompleted;
    }

    if (updates.tasksFailed !== undefined) {
      changes.tasksFailed = { old: kpi.tasksFailed, new: updates.tasksFailed };
      kpi.tasksFailed = updates.tasksFailed;
    }

    if (updates.responseTime !== undefined) {
      const newAvg =
        kpi.totalTasksAttempted === 0
          ? updates.responseTime
          : (kpi.avgResponseTime * kpi.totalTasksAttempted + updates.responseTime) /
            (kpi.totalTasksAttempted + 1);

      changes.avgResponseTime = { old: kpi.avgResponseTime, new: newAvg };
      kpi.avgResponseTime = newAvg;

      if (kpi.minResponseTime === 0 || updates.responseTime < kpi.minResponseTime) {
        kpi.minResponseTime = updates.responseTime;
      }
      if (updates.responseTime > kpi.maxResponseTime) {
        kpi.maxResponseTime = updates.responseTime;
      }

      kpi.p95ResponseTime = newAvg * 1.5;
    }

    if (updates.customerSatisfaction !== undefined) {
      const prevTotal = kpi.customerSatisfaction * (kpi.tasksCompleted - 1);
      const newTotal = prevTotal + updates.customerSatisfaction;
      kpi.customerSatisfaction =
        kpi.tasksCompleted > 0 ? newTotal / kpi.tasksCompleted : updates.customerSatisfaction;
      changes.customerSatisfaction = {
        old: kpi.customerSatisfaction,
        new: updates.customerSatisfaction,
      };
    }

    if (updates.revenueGenerated !== undefined) {
      changes.revenueGenerated = { old: kpi.revenueGenerated, new: updates.revenueGenerated };
      kpi.revenueGenerated = updates.revenueGenerated;

      kpi.revenuePerTask =
        kpi.tasksCompleted > 0 ? updates.revenueGenerated / kpi.tasksCompleted : 0;
    }

    if (updates.errorOccurred) {
      kpi.tasksFailed += 1;
      kpi.totalTasksAttempted += 1;

      kpi.errorRate = kpi.totalTasksAttempted > 0 ? kpi.tasksFailed / kpi.totalTasksAttempted : 0;
    }

    if (updates.escalationTriggered) {
      kpi.escalationCount += 1;
      kpi.escalationRate =
        kpi.tasksCompleted > 0 ? kpi.escalationCount / kpi.tasksCompleted : 0;
    }

    await this.recalculateDerivedMetrics(kpi);

    (kpi as any).updatedAt = now;
    await kpi.save();

    if (Object.keys(changes).length > 0) {
      await this.recordHistory(kpi, changes, now);
    }

    return kpi;
  }

  /**
   * Increment task completion
   */
  async incrementTaskCompleted(
    employeeId: string,
    tenantId: string,
    responseTime?: number,
    customerSatisfaction?: number
  ) {
    const periodLabel = format(new Date(), 'yyyy-MM');
    let kpi = await this.initializeKPI(employeeId, tenantId, periodLabel);

    kpi.tasksCompleted += 1;
    kpi.totalTasksAttempted += 1;

    if (responseTime !== undefined) {
      const totalResponses = kpi.tasksCompleted;
      const prevTotal = kpi.avgResponseTime * (totalResponses - 1);
      kpi.avgResponseTime = (prevTotal + responseTime) / totalResponses;

      if (kpi.minResponseTime === 0 || responseTime < kpi.minResponseTime) {
        kpi.minResponseTime = responseTime;
      }
      if (responseTime > kpi.maxResponseTime) {
        kpi.maxResponseTime = responseTime;
      }
    }

    if (customerSatisfaction !== undefined) {
      const totalSatisfaction = kpi.customerSatisfaction * (kpi.tasksCompleted - 1);
      kpi.customerSatisfaction =
        (totalSatisfaction + customerSatisfaction) / kpi.tasksCompleted;
    }

    await this.recalculateDerivedMetrics(kpi);
    await kpi.save();

    return kpi;
  }

  /**
   * Record error
   */
  async recordError(employeeId: string, tenantId: string) {
    const periodLabel = format(new Date(), 'yyyy-MM');
    let kpi = await this.initializeKPI(employeeId, tenantId, periodLabel);

    kpi.tasksFailed += 1;
    kpi.totalTasksAttempted += 1;
    kpi.errorRate = kpi.totalTasksAttempted > 0 ? kpi.tasksFailed / kpi.totalTasksAttempted : 0;

    await kpi.save();
    return kpi;
  }

  /**
   * Record escalation
   */
  async recordEscalation(employeeId: string, tenantId: string) {
    const periodLabel = format(new Date(), 'yyyy-MM');
    let kpi = await this.initializeKPI(employeeId, tenantId, periodLabel);

    kpi.escalationCount += 1;
    kpi.escalationRate = kpi.tasksCompleted > 0 ? kpi.escalationCount / kpi.tasksCompleted : 0;

    await kpi.save();
    return kpi;
  }

  /**
   * Record customer satisfaction
   */
  async recordCustomerSatisfaction(
    employeeId: string,
    tenantId: string,
    rating: number
  ) {
    const periodLabel = format(new Date(), 'yyyy-MM');
    let kpi = await this.initializeKPI(employeeId, tenantId, periodLabel);

    const completedTasks = kpi.tasksCompleted;
    const prevTotal = kpi.customerSatisfaction * Math.max(0, completedTasks - 1);
    kpi.customerSatisfaction = completedTasks > 0 ? (prevTotal + rating) / completedTasks : rating;

    await kpi.save();
    return kpi;
  }

  /**
   * Record revenue
   */
  async recordRevenue(employeeId: string, tenantId: string, amount: number) {
    const periodLabel = format(new Date(), 'yyyy-MM');
    let kpi = await this.initializeKPI(employeeId, tenantId, periodLabel);

    kpi.revenueGenerated += amount;
    kpi.revenuePerTask = kpi.tasksCompleted > 0 ? kpi.revenueGenerated / kpi.tasksCompleted : 0;

    await kpi.save();
    return kpi;
  }

  /**
   * Recalculate derived metrics
   */
  private async recalculateDerivedMetrics(kpi: any): Promise<void> {
    const qualityComponents = [
      { value: 1 - kpi.errorRate, weight: 0.3 },
      { value: kpi.customerSatisfaction / 100, weight: 0.3 },
      { value: 1 - kpi.escalationRate, weight: 0.2 },
      { value: kpi.peerRating / 100, weight: 0.2 },
    ];

    kpi.qualityScore = qualityComponents.reduce(
      (sum, c) => sum + c.value * c.weight,
      0
    ) * 100;

    kpi.utilizationRate = kpi.totalTasksAttempted > 0
      ? Math.min(1, kpi.tasksCompleted / kpi.totalTasksAttempted)
      : 0;

    const hoursPerMonth = 8 * 22;
    kpi.throughputPerHour = hoursPerMonth > 0 ? kpi.tasksCompleted / hoursPerMonth : 0;

    kpi.conversionRate = kpi.totalTasksAttempted > 0
      ? kpi.tasksCompleted / kpi.totalTasksAttempted
      : 0;
  }

  /**
   * Record KPI history
   */
  private async recordHistory(
    kpi: any,
    changes: Record<string, { old: number; new: number }>,
    timestamp: Date
  ): Promise<void> {
    const historyId = `history_${uuid().slice(0, 12)}`;

    const history = new KPIHistory({
      historyId,
      kpiId: kpi.kpiId,
      employeeId: kpi.employeeId,
      tenantId: kpi.tenantId,
      changes,
      timestamp,
    });

    await history.save();
  }

  /**
   * Get KPI history
   */
  async getHistory(
    employeeId: string,
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const query: any = { employeeId, tenantId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    return KPIHistory.find(query).sort({ timestamp: -1 }).limit(100);
  }

  /**
   * Get KPI trends for an employee
   */
  async getKPITrends(
    employeeId: string,
    tenantId: string,
    months: number = 6
  ) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const kpis = await KPI.aggregate([
      {
        $match: {
          employeeId,
          tenantId,
          period: {
            $gte: format(startDate, 'yyyy-MM'),
            $lte: format(endDate, 'yyyy-MM'),
          },
        },
      },
      { $sort: { period: 1 } },
      {
        $project: {
          period: 1,
          tasksCompleted: 1,
          customerSatisfaction: 1,
          revenueGenerated: 1,
          errorRate: 1,
          qualityScore: 1,
          avgResponseTime: 1,
        },
      },
    ]);

    return kpis;
  }

  /**
   * Get KPIs for multiple employees (team/department view)
   */
  async getTeamKPIs(tenantId: string, department?: string, period?: string) {
    const query: any = { tenantId };

    if (period) {
      query.period = period;
    }

    if (department) {
      const employees = await EmployeeProfile.find({ tenantId, department });
      const employeeIds = employees.map((e) => e.employeeId);
      query.employeeId = { $in: employeeIds };
    }

    return KPI.find(query).sort({ employeeId: 1, period: -1 });
  }

  /**
   * Get KPI summary statistics for a tenant
   */
  async getKPISummary(tenantId: string, period?: string) {
    const periodLabel = period || format(new Date(), 'yyyy-MM');

    const result = await KPI.aggregate([
      { $match: { tenantId, period: periodLabel } },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          avgTasksCompleted: { $avg: '$tasksCompleted' },
          avgCustomerSatisfaction: { $avg: '$customerSatisfaction' },
          avgQualityScore: { $avg: '$qualityScore' },
          avgErrorRate: { $avg: '$errorRate' },
          totalRevenue: { $sum: '$revenueGenerated' },
          avgUtilizationRate: { $avg: '$utilizationRate' },
        },
      },
    ]);

    return result[0] || {
      totalEmployees: 0,
      avgTasksCompleted: 0,
      avgCustomerSatisfaction: 0,
      avgQualityScore: 0,
      avgErrorRate: 0,
      totalRevenue: 0,
      avgUtilizationRate: 0,
    };
  }

  /**
   * Get performance rating based on KPI
   */
  getPerformanceRating(kpi: any): string {
    if (kpi.qualityScore >= KPI_THRESHOLDS.excellent) return 'Excellent';
    if (kpi.qualityScore >= KPI_THRESHOLDS.good) return 'Good';
    if (kpi.qualityScore >= KPI_THRESHOLDS.average) return 'Average';
    if (kpi.qualityScore >= KPI_THRESHOLDS.poor) return 'Needs Improvement';
    return 'Unsatisfactory';
  }

  /**
   * Check if KPI meets threshold
   */
  checkKPIMetThreshold(kpi: any, metric: keyof typeof KPI_THRESHOLDS): boolean {
    const threshold = KPI_THRESHOLDS[metric];
    return (kpi.qualityScore || 0) >= threshold;
  }
}

export const kpiTracker = new KPITracker();
export default kpiTracker;
