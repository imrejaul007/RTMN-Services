import {
  Incident,
  Safeguarding,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  RiskLevel
} from '../models/incident';
import { logger } from '../utils/logger';

export interface IncidentTrend {
  date: string;
  count: number;
  critical: number;
  major: number;
  moderate: number;
  minor: number;
}

export interface IncidentByType {
  type: string;
  count: number;
  percentage: number;
  averageSeverity: number;
}

export interface IncidentByLocation {
  location: string;
  count: number;
  critical: number;
}

export interface PatientRiskScore {
  patientId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  incidentCount: number;
  lastIncidentDate: Date | null;
  incidentTypes: string[];
  contributingFactors: string[];
}

export interface IncidentReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalIncidents: number;
    openIncidents: number;
    closedIncidents: number;
    criticalIncidents: number;
    averageResolutionTimeHours: number | null;
  };
  byType: IncidentByType[];
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  trends: IncidentTrend[];
  topPatients: Array<{
    patientId: string;
    patientName: string;
    incidentCount: number;
    riskScore: number;
  }>;
  staffingImpact: {
    incidentsByHour: Record<number, number>;
    incidentsByDayOfWeek: Record<number, number>;
  };
  safeguardingSummary: {
    totalConcerns: number;
    openConcerns: number;
    highRiskConcerns: number;
    byType: Record<string, number>;
  };
  recommendations: string[];
}

export interface ComplianceMetrics {
  regulatoryReportableIncidents: number;
  timelyInvestigationCompletion: number;
  averageInvestigationTimeDays: number | null;
  documentationCompleteness: number;
  followUpCompletionRate: number;
}

export class AnalyticsService {
  /**
   * Get incident trends for a period
   */
  async getIncidentTrends(
    period: '7d' | '30d' | '90d' | '1y' | 'custom',
    startDate?: Date,
    endDate?: Date
  ): Promise<IncidentTrend[]> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const incidents = await Incident.find({
      incidentDate: { $gte: start, $lte: end },
      isActive: true
    }).lean();

    // Group by date
    const trendsByDate = new Map<string, IncidentTrend>();

    // Initialize all dates in range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      trendsByDate.set(dateKey, {
        date: dateKey,
        count: 0,
        critical: 0,
        major: 0,
        moderate: 0,
        minor: 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count incidents per date
    incidents.forEach((incident) => {
      const dateKey = new Date(incident.incidentDate).toISOString().split('T')[0];
      const trend = trendsByDate.get(dateKey);
      if (trend) {
        trend.count++;
        switch (incident.severity) {
          case IncidentSeverity.CRITICAL:
            trend.critical++;
            break;
          case IncidentSeverity.MAJOR:
            trend.major++;
            break;
          case IncidentSeverity.MODERATE:
            trend.moderate++;
            break;
          case IncidentSeverity.MINOR:
            trend.minor++;
            break;
        }
      }
    });

    return Array.from(trendsByDate.values());
  }

  /**
   * Get breakdown by incident type
   */
  async getIncidentByType(
    facilityId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IncidentByType[]> {
    const query: Record<string, unknown> = { isActive: true };

    if (facilityId) {
      query.facilityId = facilityId;
    }

    if (startDate && endDate) {
      query.incidentDate = { $gte: startDate, $lte: endDate };
    }

    const incidents = await Incident.find(query).lean();

    // Count by type
    const typeCounts = new Map<string, { count: number; severitySum: number }>();
    incidents.forEach((incident) => {
      const current = typeCounts.get(incident.type) || { count: 0, severitySum: 0 };
      current.count++;
      current.severitySum += this.getSeverityScore(incident.severity);
      typeCounts.set(incident.type, current);
    });

    const total = incidents.length;
    const result: IncidentByType[] = [];

    typeCounts.forEach((data, type) => {
      result.push({
        type,
        count: data.count,
        percentage: total > 0 ? (data.count / total) * 100 : 0,
        averageSeverity: data.count > 0 ? data.severitySum / data.count : 0
      });
    });

    return result.sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate risk score for a patient
   */
  async calculateRiskScore(
    patientId: string,
    lookbackDays: number = 90
  ): Promise<PatientRiskScore> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const incidents = await Incident.find({
      patientId,
      incidentDate: { $gte: startDate },
      isActive: true
    }).lean();

    const incidentTypes = [...new Set(incidents.map((i) => i.type))];
    const lastIncidentDate =
      incidents.length > 0
        ? new Date(
            incidents.sort(
              (a, b) =>
                new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
            )[0].incidentDate
          )
        : null;

    // Calculate risk score
    let riskScore = 0;
    const contributingFactors: string[] = [];

    // Weight by incident count
    riskScore += Math.min(incidents.length * 5, 25); // Max 25 points from frequency

    // Weight by severity
    incidents.forEach((incident) => {
      switch (incident.severity) {
        case IncidentSeverity.CRITICAL:
          riskScore += 30;
          contributingFactors.push(`${incident.type}: critical incident`);
          break;
        case IncidentSeverity.MAJOR:
          riskScore += 20;
          contributingFactors.push(`${incident.type}: major incident`);
          break;
        case IncidentSeverity.MODERATE:
          riskScore += 10;
          break;
        case IncidentSeverity.MINOR:
          riskScore += 5;
          break;
      }
    });

    // Recency factor (incidents in last 30 days weighted more)
    const recentIncidents = incidents.filter((i) => {
      const daysSince = (Date.now() - new Date(i.incidentDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });
    riskScore += Math.min(recentIncidents.length * 5, 15); // Max 15 points for recency

    // Pattern detection
    const fallIncidents = incidents.filter((i) => i.type === IncidentType.FALL);
    if (fallIncidents.length >= 2) {
      riskScore += 10;
      contributingFactors.push('Multiple falls detected');
    }

    const medicationErrors = incidents.filter(
      (i) => i.type === IncidentType.MEDICATION_ERROR
    );
    if (medicationErrors.length >= 1) {
      riskScore += 15;
      contributingFactors.push('Medication error history');
    }

    // Normalize to 0-100
    riskScore = Math.min(Math.round(riskScore), 100);

    return {
      patientId,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      incidentCount: incidents.length,
      lastIncidentDate,
      incidentTypes,
      contributingFactors: [...new Set(contributingFactors)]
    };
  }

  /**
   * Generate comprehensive incident report
   */
  async generateIncidentReport(
    period: '7d' | '30d' | '90d' | '1y' | 'custom',
    startDate?: Date,
    endDate?: Date,
    facilityId?: string
  ): Promise<IncidentReport> {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const query: Record<string, unknown> = {
      incidentDate: { $gte: start, $lte: end },
      isActive: true
    };

    if (facilityId) {
      query.facilityId = facilityId;
    }

    const incidents = await Incident.find(query).lean();

    // Summary statistics
    const totalIncidents = incidents.length;
    const openIncidents = incidents.filter(
      (i) => i.status !== IncidentStatus.CLOSED && i.status !== IncidentStatus.RESOLVED
    ).length;
    const closedIncidents = totalIncidents - openIncidents;
    const criticalIncidents = incidents.filter(
      (i) => i.severity === IncidentSeverity.CRITICAL
    ).length;

    // Resolution time calculation
    const resolvedIncidents = incidents.filter(
      (i) => i.resolution?.resolutionDate && i.reportedDate
    );
    const averageResolutionTimeHours =
      resolvedIncidents.length > 0
        ? resolvedIncidents.reduce((sum, i) => {
            const resolutionTime =
              new Date(i.resolution!.resolutionDate!).getTime() -
              new Date(i.reportedDate).getTime();
            return sum + resolutionTime / (1000 * 60 * 60);
          }, 0) / resolvedIncidents.length
        : null;

    // By type
    const byType = await this.getIncidentByType(facilityId, start, end);

    // By severity
    const bySeverity: Record<string, number> = {};
    incidents.forEach((i) => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    });

    // By status
    const byStatus: Record<string, number> = {};
    incidents.forEach((i) => {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    });

    // Trends
    const trends = await this.getIncidentTrends(period, start, end);

    // Top patients
    const patientIncidents = new Map<
      string,
      { patientName: string; count: number; riskScore: number }
    >();
    incidents.forEach((i) => {
      const current = patientIncidents.get(i.patientId) || {
        patientName: i.patientName,
        count: 0,
        riskScore: 0
      };
      current.count++;
      current.riskScore += this.getSeverityScore(i.severity);
      patientIncidents.set(i.patientId, current);
    });

    const topPatients = Array.from(patientIncidents.entries())
      .map(([patientId, data]) => ({
        patientId,
        patientName: data.patientName,
        incidentCount: data.count,
        riskScore: data.riskScore
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Staffing impact
    const incidentsByHour: Record<number, number> = {};
    const incidentsByDayOfWeek: Record<number, number> = {};
    incidents.forEach((i) => {
      const date = new Date(i.incidentDate);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      incidentsByHour[hour] = (incidentsByHour[hour] || 0) + 1;
      incidentsByDayOfWeek[dayOfWeek] = (incidentsByDayOfWeek[dayOfWeek] || 0) + 1;
    });

    // Safeguarding summary
    const safeguardingQuery: Record<string, unknown> = {
      createdAt: { $gte: start, $lte: end }
    };
    if (facilityId) {
      safeguardingQuery['vulnerablePerson.careLocation'] = facilityId;
    }

    const safeguardingConcerns = await Safeguarding.find(safeguardingQuery).lean();

    const safeguardingByType: Record<string, number> = {};
    safeguardingConcerns.forEach((c) => {
      safeguardingByType[c.concernType] = (safeguardingByType[c.concernType] || 0) + 1;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      incidents,
      byType,
      bySeverity,
      trends
    );

    return {
      period: { startDate: start, endDate: end },
      summary: {
        totalIncidents,
        openIncidents,
        closedIncidents,
        criticalIncidents,
        averageResolutionTimeHours
      },
      byType,
      bySeverity,
      byStatus,
      trends,
      topPatients,
      staffingImpact: {
        incidentsByHour,
        incidentsByDayOfWeek
      },
      safeguardingSummary: {
        totalConcerns: safeguardingConcerns.length,
        openConcerns: safeguardingConcerns.filter(
          (c) => c.status !== 'resolved' && c.status !== 'closed'
        ).length,
        highRiskConcerns: safeguardingConcerns.filter(
          (c) => c.riskLevel === RiskLevel.HIGH || c.riskLevel === RiskLevel.IMMEDIATE
        ).length,
        byType: safeguardingByType
      },
      recommendations
    };
  }

  /**
   * Get compliance metrics
   */
  async getComplianceMetrics(
    facilityId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ComplianceMetrics> {
    const query: Record<string, unknown> = { isActive: true };

    if (facilityId) {
      query.facilityId = facilityId;
    }

    if (startDate && endDate) {
      query.incidentDate = { $gte: startDate, $lte: endDate };
    }

    const incidents = await Incident.find(query).lean();

    const totalIncidents = incidents.length;
    const regulatoryReportable = incidents.filter((i) => i.regulatoryReportable).length;

    // Investigation completion
    const investigatedIncidents = incidents.filter((i) => i.investigation?.endDate);
    const timelyInvestigationCompletion =
      investigatedIncidents.length > 0
        ? (investigatedIncidents.filter((i) => {
            const investigationDays = (new Date(i.investigation!.endDate!).getTime() -
              new Date(i.investigation!.startDate).getTime()) /
              (1000 * 60 * 60 * 24);
            return investigationDays <= 14; // 14-day regulatory requirement
          }).length /
            investigatedIncidents.length) *
          100
        : 0;

    const averageInvestigationTimeDays =
      investigatedIncidents.length > 0
        ? investigatedIncidents.reduce((sum, i) => {
            const days = (new Date(i.investigation!.endDate!).getTime() -
              new Date(i.investigation!.startDate).getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / investigatedIncidents.length
        : null;

    // Documentation completeness
    const completeDocumentation = incidents.filter((i) => {
      const hasDescription = i.description && i.description.length > 50;
      const hasLocation = i.location?.area;
      const hasWitnesses = i.witnesses.length > 0 || i.type !== 'fall';
      return hasDescription && hasLocation && hasWitnesses;
    }).length;

    const documentationCompleteness =
      totalIncidents > 0 ? (completeDocumentation / totalIncidents) * 100 : 0;

    // Follow-up completion
    const incidentsRequiringFollowUp = incidents.filter(
      (i) => i.resolution?.followUpRequired
    );
    const completedFollowUps = incidentsRequiringFollowUp.filter(
      (i) => i.resolution?.followUpDate
    );
    const followUpCompletionRate =
      incidentsRequiringFollowUp.length > 0
        ? (completedFollowUps.length / incidentsRequiringFollowUp.length) * 100
        : 100;

    return {
      regulatoryReportableIncidents: regulatoryReportable,
      timelyInvestigationCompletion,
      averageInvestigationTimeDays,
      documentationCompleteness,
      followUpCompletionRate
    };
  }

  /**
   * Get incidents by location
   */
  async getIncidentsByLocation(
    facilityId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IncidentByLocation[]> {
    const query: Record<string, unknown> = { isActive: true };

    if (facilityId) {
      query.facilityId = facilityId;
    }

    if (startDate && endDate) {
      query.incidentDate = { $gte: startDate, $lte: endDate };
    }

    const incidents = await Incident.find(query).lean();

    const locationCounts = new Map<string, { count: number; critical: number }>();

    incidents.forEach((incident) => {
      const location = incident.location.area;
      const current = locationCounts.get(location) || { count: 0, critical: 0 };
      current.count++;
      if (incident.severity === IncidentSeverity.CRITICAL) {
        current.critical++;
      }
      locationCounts.set(location, current);
    });

    return Array.from(locationCounts.entries())
      .map(([location, data]) => ({
        location,
        count: data.count,
        critical: data.critical
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get staff performance metrics
   */
  async getStaffPerformanceMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<
    Array<{
      userId: string;
      name: string;
      incidentsReported: number;
      incidentsInvestigated: number;
      investigationsCompleted: number;
    }>
  > {
    const query: Record<string, unknown> = { isActive: true };

    if (startDate && endDate) {
      query.incidentDate = { $gte: startDate, $lte: endDate };
    }

    const incidents = await Incident.find(query).lean();

    const staffMetrics = new Map<
      string,
      {
        name: string;
        incidentsReported: number;
        incidentsInvestigated: number;
        investigationsCompleted: number;
      }
    >();

    incidents.forEach((incident) => {
      // Reported by
      const reporterKey = incident.reportedBy.userId;
      const reporter = staffMetrics.get(reporterKey) || {
        name: incident.reportedBy.name,
        incidentsReported: 0,
        incidentsInvestigated: 0,
        investigationsCompleted: 0
      };
      reporter.incidentsReported++;
      staffMetrics.set(reporterKey, reporter);

      // Investigator
      if (incident.investigation) {
        const investigatorKey = incident.investigation.investigatorId;
        const investigator = staffMetrics.get(investigatorKey) || {
          name: incident.investigation.investigatorName,
          incidentsReported: 0,
          incidentsInvestigated: 0,
          investigationsCompleted: 0
        };
        investigator.incidentsInvestigated++;
        if (incident.investigation.status === 'completed') {
          investigator.investigationsCompleted++;
        }
        staffMetrics.set(investigatorKey, investigator);
      }
    });

    return Array.from(staffMetrics.entries())
      .map(([userId, metrics]) => ({
        userId,
        ...metrics
      }))
      .sort((a, b) => b.incidentsReported - a.incidentsReported);
  }

  // ==================== PRIVATE METHODS ====================

  private getDateRange(
    period: string,
    startDate?: Date,
    endDate?: Date
  ): { start: Date; end: Date } {
    const end = endDate || new Date();
    let start: Date;

    switch (period) {
      case '7d':
        start = new Date();
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start = new Date();
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start = new Date();
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'custom':
        start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date();
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  }

  private getSeverityScore(severity: string): number {
    const scores: Record<string, number> = {
      [IncidentSeverity.CRITICAL]: 4,
      [IncidentSeverity.MAJOR]: 3,
      [IncidentSeverity.MODERATE]: 2,
      [IncidentSeverity.MINOR]: 1
    };
    return scores[severity] || 2;
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private generateRecommendations(
    incidents: Record<string, unknown>[],
    byType: IncidentByType[],
    bySeverity: Record<string, number>,
    trends: IncidentTrend[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for concerning trends
    if (trends.length >= 3) {
      const recentTrend = trends.slice(-7);
      const increasing = recentTrend.every(
        (t, i) => i === 0 || t.count >= recentTrend[i - 1].count
      );
      if (increasing && recentTrend[recentTrend.length - 1].count > recentTrend[0].count * 1.5) {
        recommendations.push(
          'Incident frequency is trending upward. Review staffing levels and environmental factors.'
        );
      }
    }

    // Check for high-severity concentration
    if (bySeverity['critical'] > 0) {
      recommendations.push(
        'Critical incidents detected. Conduct immediate root cause analysis and implement preventive measures.'
      );
    }

    // Check for specific type issues
    const fallType = byType.find((t) => t.type === 'fall');
    if (fallType && fallType.count > 5) {
      recommendations.push(
        'High number of fall incidents. Review mobility assessments, assistive devices, and environmental hazards.'
      );
    }

    const medicationType = byType.find((t) => t.type === 'medication_error');
    if (medicationType && medicationType.count > 2) {
      recommendations.push(
        'Medication errors detected. Review medication administration procedures and staff training.'
      );
    }

    // General recommendations
    if (incidents.length > 20) {
      recommendations.push(
        'High incident volume. Consider enhanced monitoring protocols and additional staff training.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Continue monitoring current protocols. No significant patterns detected.'
      );
    }

    return recommendations;
  }
}

export const analyticsService = new AnalyticsService();
