import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  Risk,
  RiskLevel,
  RiskStatus,
  RiskAssessment,
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// Risks Service - Risk Management and Assessment
// ============================================================================

export class RisksService {
  private risks: Map<string, Risk> = new Map();

  constructor() {
    // Initialize with sample risks
    this.initializeSampleRisks();
  }

  /**
   * Get all risks for a tenant
   */
  async getRisks(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      level?: string;
      status?: string;
      category?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ data: Risk[]; total: number; assessment: RiskAssessment }> {
    const {
      page = 1,
      limit = 20,
      level,
      status,
      category,
      sortBy = 'score',
      sortOrder = 'desc',
    } = options || {};

    let risks = Array.from(this.risks.values()).filter(r => r.tenantId === tenantId);

    if (level) {
      risks = risks.filter(r => r.level === level);
    }

    if (status) {
      risks = risks.filter(r => r.status === status);
    }

    if (category) {
      risks = risks.filter(r => r.category === category);
    }

    // Sort
    risks.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortBy) {
        case 'score':
          aVal = a.score;
          bVal = b.score;
          break;
        case 'likelihood':
          aVal = a.likelihood;
          bVal = b.likelihood;
          break;
        case 'impact':
          aVal = a.impact;
          bVal = b.impact;
          break;
        case 'updatedAt':
          aVal = a.updatedAt.getTime();
          bVal = b.updatedAt.getTime();
          break;
        default:
          aVal = a.score;
          bVal = b.score;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const total = risks.length;
    const paginatedRisks = risks.slice((page - 1) * limit, page * limit);
    const assessment = await this.getAssessment(tenantId);

    return {
      data: paginatedRisks,
      total,
      assessment,
    };
  }

  /**
   * Get risk assessment summary
   */
  async getAssessment(tenantId: string): Promise<RiskAssessment> {
    const risks = Array.from(this.risks.values()).filter(r => r.tenantId === tenantId);

    const byLevel: Record<RiskLevel, number> = {
      [RiskLevel.CRITICAL]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.LOW]: 0,
    };

    const byStatus: Record<RiskStatus, number> = {
      [RiskStatus.OPEN]: 0,
      [RiskStatus.MITIGATED]: 0,
      [RiskStatus.MONITORING]: 0,
      [RiskStatus.CLOSED]: 0,
    };

    for (const risk of risks) {
      byLevel[risk.level]++;
      byStatus[risk.status]++;
    }

    const topRisks = risks
      .filter(r => r.status !== RiskStatus.CLOSED)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const mitigatedCount = byStatus[RiskStatus.MITIGATED] + byStatus[RiskStatus.CLOSED];
    const mitigationProgress = risks.length > 0
      ? Math.round((mitigatedCount / risks.length) * 100)
      : 0;

    return {
      totalRisks: risks.length,
      byLevel,
      byStatus,
      topRisks,
      riskTrend: {
        direction: 'stable',
        changePercent: 0,
        velocity: 0,
        confidence: 85,
      },
      mitigationProgress,
    };
  }

  /**
   * Get top risks by score
   */
  async getTopRisks(tenantId: string, limit: number = 10): Promise<Risk[]> {
    return Array.from(this.risks.values())
      .filter(r => r.tenantId === tenantId && r.status !== RiskStatus.CLOSED)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get risks grouped by level
   */
  async getRisksByLevel(tenantId: string): Promise<Record<RiskLevel, Risk[]>> {
    const risks = Array.from(this.risks.values()).filter(r => r.tenantId === tenantId);

    const byLevel: Record<RiskLevel, Risk[]> = {
      [RiskLevel.CRITICAL]: [],
      [RiskLevel.HIGH]: [],
      [RiskLevel.MEDIUM]: [],
      [RiskLevel.LOW]: [],
    };

    for (const risk of risks) {
      byLevel[risk.level].push(risk);
    }

    return byLevel;
  }

  /**
   * Get risks grouped by status
   */
  async getRisksByStatus(tenantId: string): Promise<Record<RiskStatus, Risk[]>> {
    const risks = Array.from(this.risks.values()).filter(r => r.tenantId === tenantId);

    const byStatus: Record<RiskStatus, Risk[]> = {
      [RiskStatus.OPEN]: [],
      [RiskStatus.MITIGATED]: [],
      [RiskStatus.MONITORING]: [],
      [RiskStatus.CLOSED]: [],
    };

    for (const risk of risks) {
      byStatus[risk.status].push(risk);
    }

    return byStatus;
  }

  /**
   * Get a specific risk
   */
  async getRisk(tenantId: string, riskId: string): Promise<Risk | null> {
    const risk = this.risks.get(riskId);
    if (risk && risk.tenantId === tenantId) {
      return risk;
    }
    return null;
  }

  /**
   * Create a new risk
   */
  async createRisk(tenantId: string, data: Partial<Risk>): Promise<Risk> {
    const likelihood = data.likelihood || 5;
    const impact = data.impact || 5;
    const score = likelihood * impact;

    let level: RiskLevel;
    if (score >= 70) {
      level = RiskLevel.CRITICAL;
    } else if (score >= 40) {
      level = RiskLevel.HIGH;
    } else if (score >= 20) {
      level = RiskLevel.MEDIUM;
    } else {
      level = RiskLevel.LOW;
    }

    const risk: Risk = {
      id: uuidv4(),
      tenantId,
      title: data.title || 'Untitled Risk',
      description: data.description || '',
      category: data.category || 'operational',
      level,
      status: RiskStatus.OPEN,
      likelihood,
      impact,
      score,
      owner: data.owner,
      mitigationPlan: data.mitigationPlan,
      contingencies: data.contingencies,
      identifiedAt: new Date(),
      updatedAt: new Date(),
      tags: data.tags,
    };

    this.risks.set(risk.id, risk);
    logger.info('Risk created', { tenantId, riskId: risk.id, level });

    return risk;
  }

  /**
   * Update a risk
   */
  async updateRisk(tenantId: string, riskId: string, data: Partial<Risk>): Promise<Risk | null> {
    const risk = this.risks.get(riskId);

    if (!risk || risk.tenantId !== tenantId) {
      return null;
    }

    Object.assign(risk, data);
    risk.updatedAt = new Date();

    // Recalculate score and level if likelihood/impact changed
    if (data.likelihood !== undefined || data.impact !== undefined) {
      risk.score = risk.likelihood * risk.impact;
      risk.level = this.calculateRiskLevel(risk.score);
    }

    return risk;
  }

  /**
   * Update risk status
   */
  async updateRiskStatus(tenantId: string, riskId: string, status: RiskStatus): Promise<Risk | null> {
    const risk = this.risks.get(riskId);

    if (!risk || risk.tenantId !== tenantId) {
      return null;
    }

    risk.status = status;
    risk.updatedAt = new Date();

    if (status === RiskStatus.CLOSED) {
      risk.resolvedAt = new Date();
    }

    return risk;
  }

  /**
   * Update risk mitigation plan
   */
  async updateMitigationPlan(
    tenantId: string,
    riskId: string,
    mitigationPlan?: string,
    contingencies?: string
  ): Promise<Risk | null> {
    const risk = this.risks.get(riskId);

    if (!risk || risk.tenantId !== tenantId) {
      return null;
    }

    if (mitigationPlan !== undefined) risk.mitigationPlan = mitigationPlan;
    if (contingencies !== undefined) risk.contingencies = contingencies;
    risk.updatedAt = new Date();

    return risk;
  }

  /**
   * Delete a risk
   */
  async deleteRisk(tenantId: string, riskId: string): Promise<boolean> {
    const risk = this.risks.get(riskId);

    if (!risk || risk.tenantId !== tenantId) {
      return false;
    }

    this.risks.delete(riskId);
    return true;
  }

  /**
   * Mark risk as mitigated
   */
  async mitigateRisk(tenantId: string, riskId: string): Promise<Risk | null> {
    return this.updateRiskStatus(tenantId, riskId, RiskStatus.MITIGATED);
  }

  /**
   * Close a risk
   */
  async closeRisk(tenantId: string, riskId: string): Promise<Risk | null> {
    return this.updateRiskStatus(tenantId, riskId, RiskStatus.CLOSED);
  }

  /**
   * Get risk trends over time
   */
  async getRiskTrends(tenantId: string, period: string): Promise<{
    period: string;
    total: number;
    byLevel: Record<RiskLevel, number>;
  }[]> {
    // Generate historical data points
    const days = this.parsePeriodDays(period);
    const trends = [];

    for (let i = days; i >= 0; i -= 7) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const risks = Array.from(this.risks.values()).filter(r => r.tenantId === tenantId);

      // Simulate historical variations
      const variation = Math.floor(Math.random() * 3) - 1;

      trends.push({
        period: date.toISOString().split('T')[0],
        total: Math.max(1, risks.length + variation),
        byLevel: {
          [RiskLevel.CRITICAL]: Math.max(0, 1 + variation),
          [RiskLevel.HIGH]: Math.max(0, 3 + variation),
          [RiskLevel.MEDIUM]: Math.max(0, 5 + variation),
          [RiskLevel.LOW]: Math.max(0, 2 + variation),
        },
      });
    }

    return trends;
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 70) return RiskLevel.CRITICAL;
    if (score >= 40) return RiskLevel.HIGH;
    if (score >= 20) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private parsePeriodDays(period: string): number {
    const match = period.match(/(\d+)([dwmy])?/);
    if (!match) return 30;

    const value = parseInt(match[1], 10);
    const unit = match[2] || 'd';

    switch (unit) {
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return value;
    }
  }

  private initializeSampleRisks(): void {
    const sampleRisks: Risk[] = [
      {
        id: 'risk-1',
        tenantId: 'default',
        title: 'Cybersecurity Vulnerability',
        description: 'Potential security vulnerability in API gateway could expose sensitive customer data.',
        category: 'technical',
        level: RiskLevel.CRITICAL,
        status: RiskStatus.OPEN,
        likelihood: 7,
        impact: 9,
        score: 63,
        owner: 'CTO',
        mitigationPlan: 'Implement security patches and penetration testing',
        contingencies: 'Incident response plan ready',
        identifiedAt: new Date('2026-01-15'),
        updatedAt: new Date(),
        tags: ['security', 'api'],
      },
      {
        id: 'risk-2',
        tenantId: 'default',
        title: 'Key Person Dependency',
        description: 'Critical business processes depend on single individuals without backup.',
        category: 'operational',
        level: RiskLevel.HIGH,
        status: RiskStatus.MONITORING,
        likelihood: 6,
        impact: 7,
        score: 42,
        owner: 'VP HR',
        mitigationPlan: 'Cross-training and documentation initiatives underway',
        identifiedAt: new Date('2026-02-01'),
        updatedAt: new Date(),
        tags: ['hr', 'operations'],
      },
      {
        id: 'risk-3',
        tenantId: 'default',
        title: 'Market Competition',
        description: 'New competitor entering the market with aggressive pricing strategy.',
        category: 'market',
        level: RiskLevel.HIGH,
        status: RiskStatus.OPEN,
        likelihood: 8,
        impact: 6,
        score: 48,
        owner: 'CMO',
        mitigationPlan: 'Accelerate product roadmap and enhance value proposition',
        identifiedAt: new Date('2026-03-10'),
        updatedAt: new Date(),
        tags: ['market', 'competition'],
      },
      {
        id: 'risk-4',
        tenantId: 'default',
        title: 'Regulatory Compliance',
        description: 'Upcoming GDPR updates require system modifications.',
        category: 'compliance',
        level: RiskLevel.MEDIUM,
        status: RiskStatus.MITIGATED,
        likelihood: 9,
        impact: 4,
        score: 36,
        owner: 'Legal',
        mitigationPlan: 'Compliance audit completed, system updates deployed',
        identifiedAt: new Date('2026-01-20'),
        updatedAt: new Date(),
        resolvedAt: new Date('2026-03-01'),
        tags: ['compliance', 'gdpr'],
      },
      {
        id: 'risk-5',
        tenantId: 'default',
        title: 'Supply Chain Disruption',
        description: 'Over-reliance on single vendor for critical components.',
        category: 'operational',
        level: RiskLevel.MEDIUM,
        status: RiskStatus.OPEN,
        likelihood: 4,
        impact: 7,
        score: 28,
        owner: 'COO',
        mitigationPlan: 'Identifying backup suppliers',
        identifiedAt: new Date('2026-04-05'),
        updatedAt: new Date(),
        tags: ['supply-chain', 'vendor'],
      },
    ];

    for (const risk of sampleRisks) {
      this.risks.set(risk.id, risk);
    }
  }
}
