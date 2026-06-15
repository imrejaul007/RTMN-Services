// Alignment Checker Service
import { v4 as uuidv4 } from 'uuid';
import { AlignmentRecord, AlignmentLevel } from '../types';
import { logger } from '../utils/logger';
import { boaClient } from './boaClient';
import { sutarClient } from './sutarClient';

export class AlignmentChecker {
  private records: Map<string, AlignmentRecord> = new Map();

  /**
   * Check alignment of all objectives in a strategy
   */
  async checkStrategyAlignment(strategyId: string, businessUnit: string = 'default'): Promise<AlignmentRecord> {
    const boaObjectives = await boaClient.getAllObjectives({ strategyId });
    const sutarGoals = await sutarClient.listGoals();
    const goalMap = new Map(sutarGoals.map(g => [g.metadata?.boaObjectiveId, g]));

    const alignments: { boaId: string; sutarId: string; aligned: boolean; drift: number }[] = [];
    let totalDrift = 0;

    for (const boa of boaObjectives) {
      const sutar = goalMap.get(boa.id);
      if (sutar) {
        const drift = Math.abs((boa.progress || 0) - (sutar.progress || 0));
        const aligned = drift < 10;
        alignments.push({ boaId: boa.id, sutarId: sutar.id, aligned, drift });
        totalDrift += drift;
      } else {
        alignments.push({ boaId: boa.id, sutarId: '', aligned: false, drift: 100 });
        totalDrift += 100;
      }
    }

    const avgDrift = alignments.length > 0 ? totalDrift / alignments.length : 100;
    const alignmentScore = Math.max(0, Math.min(100, 100 - avgDrift));
    const alignmentLevel = this.scoreToLevel(alignmentScore);

    const record: AlignmentRecord = {
      id: uuidv4(),
      businessUnit,
      strategyId,
      alignmentLevel,
      alignmentScore: Math.round(alignmentScore),
      objectives: alignments,
      assessedAt: new Date(),
      nextAssessment: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    this.records.set(record.id, record);
    logger.info(`[AlignmentChecker] Strategy ${strategyId}: ${record.alignmentScore}% (${alignmentLevel})`);
    return record;
  }

  /**
   * Get alignment trend over time
   */
  getAlignmentTrend(strategyId: string, businessUnit: string = 'default'): AlignmentRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.strategyId === strategyId && r.businessUnit === businessUnit)
      .sort((a, b) => a.assessedAt.getTime() - b.assessedAt.getTime());
  }

  /**
   * Get aggregate alignment across all strategies
   */
  getAggregateAlignment(): { avgScore: number; totalRecords: number; levelBreakdown: Record<AlignmentLevel, number> } {
    const all = Array.from(this.records.values());
    if (all.length === 0) return { avgScore: 0, totalRecords: 0, levelBreakdown: { 'fully-aligned': 0, 'mostly-aligned': 0, 'partially-aligned': 0, 'misaligned': 0 } };
    const avgScore = all.reduce((s, r) => s + r.alignmentScore, 0) / all.length;
    const breakdown: Record<AlignmentLevel, number> = { 'fully-aligned': 0, 'mostly-aligned': 0, 'partially-aligned': 0, 'misaligned': 0 };
    all.forEach(r => breakdown[r.alignmentLevel]++);
    return { avgScore: Math.round(avgScore), totalRecords: all.length, levelBreakdown: breakdown };
  }

  getRecord(id: string): AlignmentRecord | undefined { return this.records.get(id); }
  getAllRecords(): AlignmentRecord[] { return Array.from(this.records.values()); }

  private scoreToLevel(score: number): AlignmentLevel {
    if (score >= 90) return 'fully-aligned';
    if (score >= 70) return 'mostly-aligned';
    if (score >= 50) return 'partially-aligned';
    return 'misaligned';
  }
}

export const alignmentChecker = new AlignmentChecker();
export default alignmentChecker;
