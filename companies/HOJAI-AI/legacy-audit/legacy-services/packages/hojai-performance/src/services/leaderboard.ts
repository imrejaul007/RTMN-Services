/**
 * HOJAI Performance Dashboard - Leaderboard Service
 *
 * Rankings and competitive metrics between AI employees.
 */

import { v4 as uuid } from 'uuid';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import {
  Leaderboard,
  ILeaderboardEntry,
  KPI,
  Evaluation,
  EmployeeProfile,
} from '../models/performanceModel.js';

export type LeaderboardMetric = 'overall' | 'productivity' | 'quality' | 'revenue' | 'efficiency';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export class LeaderboardService {
  /**
   * Generate leaderboard for a specific metric and period
   */
  async generateLeaderboard(
    tenantId: string,
    metric: LeaderboardMetric = 'overall',
    period: LeaderboardPeriod = 'monthly',
    department?: string
  ) {
    const periodLabel = this.getPeriodLabel(period);
    const employees = await this.getEmployees(tenantId, department);
    const entries = await this.calculateEntries(tenantId, employees, metric, period);

    entries.sort((a, b) => b.score - a.score);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      entry.rank = i + 1;
      entry.rankChange = entry.previousRank !== undefined
        ? entry.previousRank - (i + 1)
        : 0;
      entry.badge = this.assignBadge(entry, i, entries.length);
    }

    let leaderboard = await Leaderboard.findOne({
      tenantId,
      metric,
      period,
      periodLabel,
    });

    const leaderboardId = leaderboard?.leaderboardId || `lb_${uuid().slice(0, 12)}`;
    const now = new Date();

    if (leaderboard) {
      leaderboard.entries = entries;
      leaderboard.totalParticipants = entries.length;
      leaderboard.generatedAt = now;
    } else {
      leaderboard = new Leaderboard({
        leaderboardId,
        tenantId,
        metric,
        period,
        periodLabel,
        entries,
        totalParticipants: entries.length,
        generatedAt: now,
      });
    }

    await leaderboard.save();
    return leaderboard;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    tenantId: string,
    metric: LeaderboardMetric = 'overall',
    period: LeaderboardPeriod = 'monthly',
    limit: number = 10,
    offset: number = 0
  ) {
    const periodLabel = this.getPeriodLabel(period);

    const leaderboard = await Leaderboard.findOne({
      tenantId,
      metric,
      period,
      periodLabel,
    });

    if (!leaderboard) {
      return null;
    }

    const paginatedEntries = leaderboard.entries.slice(offset, offset + limit);

    return {
      ...leaderboard.toObject(),
      entries: paginatedEntries,
    };
  }

  /**
   * Get employee's rank in leaderboard
   */
  async getEmployeeRank(
    employeeId: string,
    tenantId: string,
    metric: LeaderboardMetric = 'overall',
    period: LeaderboardPeriod = 'monthly'
  ) {
    const periodLabel = this.getPeriodLabel(period);

    const leaderboard = await Leaderboard.findOne({
      tenantId,
      metric,
      period,
      periodLabel,
    });

    if (!leaderboard) {
      return { rank: 0, total: 0 };
    }

    const entry = leaderboard.entries.find((e) => e.employeeId === employeeId);

    return {
      rank: entry?.rank || 0,
      total: leaderboard.totalParticipants,
      entry,
    };
  }

  /**
   * Get top performers
   */
  async getTopPerformers(tenantId: string, period: LeaderboardPeriod = 'monthly', limit: number = 5) {
    const periodLabel = this.getPeriodLabel(period);

    const leaderboard = await Leaderboard.findOne({
      tenantId,
      metric: 'overall',
      period,
      periodLabel,
    });

    if (!leaderboard) {
      return [];
    }

    return leaderboard.entries.slice(0, limit);
  }

  /**
   * Get most improved employees
   */
  async getMostImproved(tenantId: string, period: LeaderboardPeriod = 'monthly', limit: number = 5) {
    const periodLabel = this.getPeriodLabel(period);

    const leaderboard = await Leaderboard.findOne({
      tenantId,
      metric: 'overall',
      period,
      periodLabel,
    });

    if (!leaderboard) {
      return [];
    }

    const improved = leaderboard.entries
      .filter((e) => e.rankChange > 0)
      .sort((a, b) => b.rankChange - a.rankChange);

    return improved.slice(0, limit);
  }

  /**
   * Get leaderboard history for an employee
   */
  async getEmployeeLeaderboardHistory(
    employeeId: string,
    tenantId: string,
    metric: LeaderboardMetric = 'overall',
    limit: number = 6
  ) {
    const leaderboards = await Leaderboard.find({
      tenantId,
      metric,
      'entries.employeeId': employeeId,
    })
      .sort({ generatedAt: -1 })
      .limit(limit);

    return leaderboards
      .map((lb) => {
        const entry = lb.entries.find((e) => e.employeeId === employeeId);
        return {
          period: lb.periodLabel,
          rank: entry?.rank,
          score: entry?.score,
          rankChange: entry?.rankChange,
          badge: entry?.badge,
        };
      })
      .reverse();
  }

  /**
   * Compare two employees
   */
  async compareEmployees(
    employee1Id: string,
    employee2Id: string,
    tenantId: string,
    period: LeaderboardPeriod = 'monthly'
  ) {
    const periodLabel = this.getPeriodLabel(period);

    const [employee1, employee2] = await Promise.all([
      EmployeeProfile.findOne({ employeeId: employee1Id, tenantId }),
      EmployeeProfile.findOne({ employeeId: employee2Id, tenantId }),
    ]);

    if (!employee1 || !employee2) {
      throw new Error('One or both employees not found');
    }

    const metrics: LeaderboardMetric[] = ['overall', 'productivity', 'quality', 'revenue', 'efficiency'];
    const comparison: any = {
      employees: {
        [employee1Id]: { name: employee1.name, role: employee1.role, department: employee1.department },
        [employee2Id]: { name: employee2.name, role: employee2.role, department: employee2.department },
      },
      metrics: {},
    };

    for (const metric of metrics) {
      const leaderboard = await Leaderboard.findOne({
        tenantId,
        metric,
        period,
        periodLabel,
      });

      if (leaderboard) {
        const entry1 = leaderboard.entries.find((e) => e.employeeId === employee1Id);
        const entry2 = leaderboard.entries.find((e) => e.employeeId === employee2Id);

        comparison.metrics[metric] = {
          [employee1Id]: entry1 || null,
          [employee2Id]: entry2 || null,
          winner: this.determineWinner(metric, entry1?.score || 0, entry2?.score || 0),
        };
      }
    }

    return comparison;
  }

  /**
   * Get department leaderboard
   */
  async getDepartmentLeaderboard(tenantId: string, period: LeaderboardPeriod = 'monthly') {
    const periodLabel = this.getPeriodLabel(period);

    const employees = await EmployeeProfile.find({ tenantId, status: 'active' });
    const departmentKPIs = await this.aggregateByDepartment(tenantId, period, periodLabel);

    const departments: Record<string, any> = {};

    for (const employee of employees) {
      const dept = employee.department;
      if (!departments[dept]) {
        departments[dept] = {
          department: dept,
          employeeCount: 0,
          totalScore: 0,
          totalRevenue: 0,
          avgQuality: 0,
        };
      }

      const kpi = await KPI.findOne({
        tenantId,
        employeeId: employee.employeeId,
        period: periodLabel,
      });

      if (kpi) {
        departments[dept].totalScore += kpi.qualityScore;
        departments[dept].totalRevenue += kpi.revenueGenerated;
        departments[dept].employeeCount++;
      }
    }

    const departmentLeaderboard = Object.values(departments)
      .map((d: any) => ({
        ...d,
        avgScore: d.employeeCount > 0 ? d.totalScore / d.employeeCount : 0,
      }))
      .sort((a: any, b: any) => b.avgScore - a.avgScore);

    for (let i = 0; i < departmentLeaderboard.length; i++) {
      departmentLeaderboard[i].rank = i + 1;
    }

    return departmentLeaderboard;
  }

  /**
   * Get available leaderboard periods
   */
  async getAvailablePeriods(tenantId: string) {
    const leaderboards = await Leaderboard.distinct('periodLabel', { tenantId });

    return leaderboards.map((label: string) => ({
      period: label,
      periodType: label.length === 7 ? 'monthly' : label.includes('W') ? 'weekly' : 'daily',
    }));
  }

  // ============ Private Helper Methods ============

  private getPeriodLabel(period: LeaderboardPeriod): string {
    const now = new Date();

    switch (period) {
      case 'daily':
        return format(now, 'yyyy-MM-dd');
      case 'weekly':
        const weekStart = startOfWeek(now);
        const weekNum = Math.ceil(weekStart.getDate() / 7);
        return `${format(now, 'yyyy')}-W${weekNum}`;
      case 'monthly':
      default:
        return format(now, 'yyyy-MM');
    }
  }

  private async getEmployees(tenantId: string, department?: string) {
    const query: any = { tenantId, status: 'active' };
    if (department) {
      query.department = department;
    }
    return EmployeeProfile.find(query);
  }

  private async calculateEntries(
    tenantId: string,
    employees: any[],
    metric: LeaderboardMetric,
    period: LeaderboardPeriod
  ): Promise<ILeaderboardEntry[]> {
    const periodLabel = this.getPeriodLabel(period);
    const entries: ILeaderboardEntry[] = [];

    for (const employee of employees) {
      const kpi = await KPI.findOne({
        tenantId,
        employeeId: employee.employeeId,
        period: periodLabel,
      });

      const evaluation = await Evaluation.findOne({
        tenantId,
        employeeId: employee.employeeId,
        period: periodLabel,
      });

      const prevPeriod = this.getPreviousPeriodLabel(period);
      const prevLeaderboard = await Leaderboard.findOne({
        tenantId,
        metric,
        period,
        periodLabel: prevPeriod,
      });
      const prevEntry = prevLeaderboard?.entries.find(
        (e) => e.employeeId === employee.employeeId
      );

      const score = this.calculateScore(metric, kpi, evaluation);
      const entry: ILeaderboardEntry = {
        rank: 0,
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department,
        role: employee.role,
        score,
        previousRank: prevEntry?.rank ?? undefined,
        rankChange: 0,
        metrics: {
          overall: evaluation?.overallScore ?? 50,
          productivity: evaluation?.productivityScore ?? 50,
          quality: evaluation?.qualityScore ?? 50,
          revenue: kpi?.revenueGenerated ?? 0,
          efficiency: kpi?.utilizationRate != null ? kpi.utilizationRate * 100 : 50,
        },
      };

      entries.push(entry);
    }

    return entries;
  }

  private calculateScore(metric: LeaderboardMetric, kpi: any, evaluation: any): number {
    switch (metric) {
      case 'overall':
        return evaluation?.overallScore || 50;
      case 'productivity':
        return evaluation?.productivityScore || 50;
      case 'quality':
        return evaluation?.qualityScore || 50;
      case 'revenue':
        return kpi?.revenueGenerated || 0;
      case 'efficiency':
        return (kpi?.utilizationRate || 0) * 100;
      default:
        return 50;
    }
  }

  private assignBadge(entry: ILeaderboardEntry, position: number, total: number): string | undefined {
    if (position === 0) return 'top_performer';
    if (position === 1) return 'revenue_leader';
    if (position === 2) return 'quality_champion';
    if (entry.rankChange >= 3) return 'most_improved';
    return undefined;
  }

  private determineWinner(metric: LeaderboardMetric, score1: number, score2: number): string {
    if (score1 > score2) return 'employee1';
    if (score2 > score1) return 'employee2';
    return 'tie';
  }

  private getPreviousPeriodLabel(period: LeaderboardPeriod): string {
    const now = new Date();

    switch (period) {
      case 'daily':
        return format(subDays(now, 1), 'yyyy-MM-dd');
      case 'weekly':
        const prevWeek = new Date(now);
        prevWeek.setDate(prevWeek.getDate() - 7);
        const weekNum = Math.ceil(prevWeek.getDate() / 7);
        return `${format(prevWeek, 'yyyy')}-W${weekNum}`;
      case 'monthly':
      default:
        const prevMonth = new Date(now);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        return format(prevMonth, 'yyyy-MM');
    }
  }

  private async aggregateByDepartment(
    tenantId: string,
    period: LeaderboardPeriod,
    periodLabel: string
  ) {
    return KPI.aggregate([
      {
        $match: {
          tenantId,
          period: periodLabel,
        },
      },
      {
        $lookup: {
          from: 'employeeprofiles',
          localField: 'employeeId',
          foreignField: 'employeeId',
          as: 'employee',
        },
      },
      {
        $unwind: '$employee',
      },
      {
        $group: {
          _id: '$employee.department',
          avgScore: { $avg: '$qualityScore' },
          totalRevenue: { $sum: '$revenueGenerated' },
          employeeCount: { $sum: 1 },
        },
      },
    ]);
  }
}

export const leaderboardService = new LeaderboardService();
export default leaderboardService;
