// ============================================================================
// Strategic Alignment Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { AlignmentScore, Objective, Strategy } from '../types';
import { logger } from '../utils/logger';

export interface AlignmentInput {
  businessUnit: string;
  strategyId: string;
  objectives: Objective[];
}

export interface AlignmentReport {
  id: string;
  businessUnit: string;
  strategyId: string;
  alignmentScore: number;
  status: 'aligned' | 'partially-aligned' | 'misaligned';
  gaps: string[];
  recommendations: string[];
  assessedAt: Date;
}

export class StrategicAlignmentService {
  private reports: Map<string, AlignmentReport> = new Map();
  private unitScores: Map<string, AlignmentScore[]> = new Map();

  /**
   * Assess alignment of a business unit to strategy
   */
  assess(input: AlignmentInput): AlignmentReport {
    const strategyObjectives = input.objectives.filter(o => o.strategyId === input.strategyId);
    const aligned = input.objectives.filter(o =>
      o.strategyId === input.strategyId ||
      this.hasCascadingLink(o, strategyObjectives)
    );
    const score = strategyObjectives.length > 0
      ? (aligned.length / strategyObjectives.length) * 100
      : 0;

    const status: AlignmentReport['status'] =
      score >= 90 ? 'aligned' :
      score >= 60 ? 'partially-aligned' : 'misaligned';

    const gaps = this.identifyGaps(strategyObjectives, input.objectives);
    const recommendations = this.generateRecommendations(score, gaps);

    const report: AlignmentReport = {
      id: uuidv4(),
      businessUnit: input.businessUnit,
      strategyId: input.strategyId,
      alignmentScore: Math.round(score),
      status,
      gaps,
      recommendations,
      assessedAt: new Date(),
    };

    this.reports.set(report.id, report);
    this.recordScore(input.businessUnit, input.strategyId, score, aligned.length, strategyObjectives.length);

    logger.info(`[Alignment] ${input.businessUnit} -> Strategy ${input.strategyId}: ${report.alignmentScore}% (${status})`);
    return report;
  }

  /**
   * Get all alignment reports for a business unit
   */
  getReportsForUnit(businessUnit: string): AlignmentReport[] {
    return Array.from(this.reports.values()).filter(r => r.businessUnit === businessUnit);
  }

  /**
   * Get alignment scores
   */
  getScores(businessUnit?: string): AlignmentScore[] {
    if (businessUnit) return this.unitScores.get(businessUnit) || [];
    const all: AlignmentScore[] = [];
    this.unitScores.forEach(scores => all.push(...scores));
    return all;
  }

  /**
   * Get aggregate alignment across all units
   */
  getAggregateAlignment(): { businessUnits: number; avgScore: number; alignedUnits: number; totalStrategies: number } {
    const allScores = this.getScores();
    const units = new Set(allScores.map(s => s.businessUnit));
    const avgScore = allScores.length > 0 ? allScores.reduce((s, x) => s + x.score, 0) / allScores.length : 0;
    const alignedUnits = new Set(allScores.filter(s => s.score >= 90).map(s => s.businessUnit)).size;
    const totalStrategies = new Set(allScores.map(s => s.strategyId)).size;
    return { businessUnits: units.size, avgScore: Math.round(avgScore), alignedUnits, totalStrategies };
  }

  private hasCascadingLink(objective: Objective, strategyObjectives: Objective[]): boolean {
    // Check if objective has parent in strategy objectives (cascading alignment)
    let current = objective;
    while (current.parentObjectiveId) {
      const parent = strategyObjectives.find(o => o.id === current.parentObjectiveId);
      if (parent) return true;
      break; // Only one level check
    }
    return false;
  }

  private identifyGaps(strategyObjectives: Objective[], unitObjectives: Objective[]): string[] {
    const gaps: string[] = [];
    const strategyObjectiveIds = new Set(unitObjectives.map(o => o.id));

    for (const so of strategyObjectives) {
      if (!strategyObjectiveIds.has(so.id)) {
        gaps.push(`Missing alignment with: ${so.title}`);
      }
    }
    if (gaps.length === 0 && strategyObjectives.length === unitObjectives.length) {
      // All aligned, check coverage
    }
    return gaps;
  }

  private generateRecommendations(score: number, gaps: string[]): string[] {
    const recs: string[] = [];
    if (score < 60) {
      recs.push('URGENT: Conduct strategy alignment workshop with leadership');
      recs.push('Review and refresh business unit objectives');
    } else if (score < 90) {
      recs.push('Schedule monthly alignment reviews');
      recs.push('Identify and close remaining alignment gaps');
    } else {
      recs.push('Maintain current alignment through regular check-ins');
    }
    if (gaps.length > 0) {
      recs.push(`Address ${gaps.length} identified gap(s) in next planning cycle`);
    }
    return recs;
  }

  private recordScore(businessUnit: string, strategyId: string, score: number, aligned: number, total: number): void {
    if (!this.unitScores.has(businessUnit)) this.unitScores.set(businessUnit, []);
    this.unitScores.get(businessUnit)!.push({
      businessUnit,
      strategyId,
      score: Math.round(score),
      alignedObjectives: aligned,
      totalObjectives: total,
      lastAssessed: new Date(),
    });
  }
}

export const strategicAlignmentService = new StrategicAlignmentService();
export default strategicAlignmentService;
