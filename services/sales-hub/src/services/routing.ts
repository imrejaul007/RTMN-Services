/**
 * Routing Service
 * Rep and territory assignment for leads and deals
 */

import winston from 'winston';
import { Lead } from '../models/Lead';

export interface Territory {
  id: string;
  name: string;
  region: string;
  countries: string[];
  states?: string[];
  cities?: string[];
  zipCodes?: string[];
  assignedReps: string[];
  quotas: TerritoryQuota;
  isActive: boolean;
}

export interface TerritoryQuota {
  monthlyRevenue: number;
  leadTarget: number;
  maxActiveLeads: number;
}

export interface Rep {
  id: string;
  name: string;
  email: string;
  territories: string[];
  skills: string[];
  currentLoad: number;
  maxLoad: number;
  availability: 'full' | 'partial' | 'unavailable';
  performance: RepPerformance;
}

export interface RepPerformance {
  winRate: number;
  avgCycleTime: number;
  quotaAttainment: number;
}

export interface AssignmentResult {
  repId: string;
  repName: string;
  territory: string;
  confidence: number;
  reasons: string[];
}

export interface RoutingRequest {
  entityType: 'lead' | 'deal';
  entity: Lead | any;
  options?: {
    preferredRep?: string;
    forcedTerritory?: string;
    skipCapacity?: boolean;
  };
}

export class RoutingService {
  private logger: winston.Logger;
  private territories: Map<string, Territory>;
  private reps: Map<string, Rep>;

  constructor(logger?: winston.Logger) {
    this.logger = logger || console;
    this.territories = new Map();
    this.reps = new Map();
    this.initializeMockData();
  }

  /**
   * Assign lead to best rep
   */
  async assignLead(lead: Lead, sutarBridge?: any): Promise<AssignmentResult | null> {
    this.logger.info('Assigning lead', { leadId: lead.id, company: lead.company });

    // 1. Determine territory based on lead location/company
    const territory = this.findTerritory(lead);
    if (!territory) {
      this.logger.warn('No territory found for lead', { leadId: lead.id });
      return null;
    }

    // 2. Get available reps in territory
    const availableReps = this.getAvailableReps(territory.id);

    if (availableReps.length === 0) {
      this.logger.warn('No available reps in territory', { territory: territory.id });
      return this.assignToLeastLoadedRep();
    }

    // 3. Score and rank reps
    const rankedReps = await this.scoreReps(availableReps, lead, sutarBridge);

    // 4. Select best rep
    const bestRep = rankedReps[0];

    return {
      repId: bestRep.id,
      repName: bestRep.name,
      territory: territory.id,
      confidence: bestRep.score,
      reasons: bestRep.reasons
    };
  }

  /**
   * Assign deal to rep
   */
  async assignDeal(deal: any, preferredRep?: string): Promise<AssignmentResult | null> {
    this.logger.info('Assigning deal', { dealId: deal.id, value: deal.value.amount });

    // Check for preferred rep
    if (preferredRep && this.reps.has(preferredRep)) {
      const rep = this.reps.get(preferredRep)!;
      if (rep.availability !== 'unavailable' && rep.currentLoad < rep.maxLoad) {
        return {
          repId: rep.id,
          repName: rep.name,
          territory: rep.territories[0] || 'default',
          confidence: 90,
          reasons: ['Preferred rep', 'Available capacity']
        };
      }
    }

    // Territory-based assignment
    if (deal.territory) {
      const availableReps = this.getAvailableReps(deal.territory);
      if (availableReps.length > 0) {
        const bestRep = this.selectByCapacity(availableReps);
        return {
          repId: bestRep.id,
          repName: bestRep.name,
          territory: deal.territory,
          confidence: 85,
          reasons: ['Territory assignment', 'Available capacity']
        };
      }
    }

    // Fallback to least loaded
    return this.assignToLeastLoadedRep();
  }

  /**
   * Find territory for a lead
   */
  findTerritory(lead: Lead): Territory | null {
    const company = lead.company.toLowerCase();
    const industry = lead.industry?.toLowerCase() || '';

    // Check territories in order
    for (const territory of this.territories.values()) {
      if (!territory.isActive) continue;

      // Match by company location or industry
      const territoryLower = territory.name.toLowerCase();

      if (territoryLower.includes('west') && company.includes('california')) {
        return territory;
      }
      if (territoryLower.includes('east') && (company.includes('new york') || company.includes('boston'))) {
        return territory;
      }
      if (territoryLower.includes('tech') && (industry.includes('tech') || industry.includes('software'))) {
        return territory;
      }

      // Default to first active territory
      return territory;
    }

    return this.territories.values().next().value || null;
  }

  /**
   * Get available reps for territory
   */
  getAvailableReps(territoryId: string): Rep[] {
    const available: Rep[] = [];

    for (const rep of this.reps.values()) {
      if (rep.availability === 'unavailable') continue;
      if (!rep.territories.includes(territoryId)) continue;
      if (rep.currentLoad >= rep.maxLoad) continue;

      available.push(rep);
    }

    return available;
  }

  /**
   * Score reps for lead assignment
   */
  private async scoreReps(reps: Rep[], lead: Lead, sutarBridge?: any): Promise<Array<Rep & { score: number; reasons: string[] }>> {
    const scored = await Promise.all(
      reps.map(async (rep) => {
        let score = 50;
        const reasons: string[] = [];

        // Capacity score (max 30 points)
        const capacityRatio = (rep.maxLoad - rep.currentLoad) / rep.maxLoad;
        const capacityScore = capacityRatio * 30;
        score += capacityScore;

        if (capacityRatio > 0.5) {
          reasons.push('High availability');
        }

        // Performance score (max 30 points)
        const perfScore = (rep.performance.quotaAttainment / 100) * 30;
        score += perfScore;

        if (rep.performance.quotaAttainment >= 100) {
          reasons.push('Exceeding quota');
        } else if (rep.performance.quotaAttainment >= 80) {
          reasons.push('Good performance');
        }

        // Win rate score (max 20 points)
        const winRateScore = (rep.performance.winRate / 100) * 20;
        score += winRateScore;

        // Skill match (max 20 points)
        const skillMatch = this.calculateSkillMatch(rep, lead);
        score += skillMatch;

        if (skillMatch >= 15) {
          reasons.push('Strong skill match');
        }

        // Karma score from SUTAR if available
        if (sutarBridge) {
          try {
            const karma = await sutarBridge.getKarmaScore('rep', rep.id);
            if (karma.success && karma.data) {
              const karmaBonus = (karma.data.percentile / 100) * 10;
              score += karmaBonus;

              if (karma.data.percentile >= 90) {
                reasons.push('Top performer');
              }
            }
          } catch (e) {
            // Ignore karma errors
          }
        }

        return {
          ...rep,
          score: Math.min(100, score),
          reasons
        };
      })
    );

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate skill match between rep and lead
   */
  private calculateSkillMatch(rep: Rep, lead: Lead): number {
    let score = 10; // Base score

    const leadIndustry = lead.industry?.toLowerCase() || '';
    const leadSize = lead.companySize || '';
    const leadTitle = lead.title?.toLowerCase() || '';

    // Industry match
    const industrySkills = ['tech', 'finance', 'healthcare', 'retail', 'manufacturing'];
    for (const skill of rep.skills) {
      if (leadIndustry.includes(skill) || skill.includes(leadIndustry)) {
        score += 8;
      }
    }

    // Company size match
    if (rep.skills.includes('enterprise') && ['1001-5000', '5000+'].includes(leadSize)) {
      score += 10;
    } else if (rep.skills.includes('mid-market') && ['201-500', '501-1000'].includes(leadSize)) {
      score += 10;
    } else if (rep.skills.includes('smb') && ['1-10', '11-50', '51-200'].includes(leadSize)) {
      score += 10;
    }

    // Title match (technical vs executive)
    if (rep.skills.includes('technical') && (leadTitle.includes('engineer') || leadTitle.includes('technical'))) {
      score += 7;
    }
    if (rep.skills.includes('executive') && (leadTitle.includes('ceo') || leadTitle.includes('vp') || leadTitle.includes('director'))) {
      score += 7;
    }

    return Math.min(20, score);
  }

  /**
   * Select rep with least load
   */
  private assignToLeastLoadedRep(): AssignmentResult | null {
    let minLoad = Infinity;
    let bestRep: Rep | null = null;

    for (const rep of this.reps.values()) {
      if (rep.availability === 'unavailable') continue;
      if (rep.currentLoad < rep.maxLoad && rep.currentLoad < minLoad) {
        minLoad = rep.currentLoad;
        bestRep = rep;
      }
    }

    if (!bestRep) return null;

    return {
      repId: bestRep.id,
      repName: bestRep.name,
      territory: bestRep.territories[0] || 'default',
      confidence: 60,
      reasons: ['Least loaded rep']
    };
  }

  /**
   * Select by capacity
   */
  private selectByCapacity(reps: Rep[]): Rep {
    return reps.reduce((best, rep) => {
      const bestCapacity = best.maxLoad - best.currentLoad;
      const repCapacity = rep.maxLoad - rep.currentLoad;
      return repCapacity > bestCapacity ? rep : best;
    });
  }

  /**
   * Re-balance territory assignments
   */
  async rebalanceTerritory(territoryId: string): Promise<{
    rebalanced: boolean;
    changes: Array<{ entityId: string; fromRep: string; toRep: string }>;
  }> {
    const reps = this.getAvailableReps(territoryId);
    if (reps.length < 2) {
      return { rebalanced: false, changes: [] };
    }

    // Simple load balancing logic
    const avgLoad = reps.reduce((sum, r) => sum + r.currentLoad, 0) / reps.length;
    const changes: Array<{ entityId: string; fromRep: string; toRep: string }> = [];

    // Move leads from overloaded reps to underloaded reps
    for (const rep of reps) {
      if (rep.currentLoad > avgLoad * 1.3) {
        // Find rep with load below average
        const targetRep = reps.find(r => r.currentLoad < avgLoad * 0.8);
        if (targetRep) {
          // In production, would reassign actual leads
          changes.push({
            entityId: `lead-reassign-${Date.now()}`,
            fromRep: rep.id,
            toRep: targetRep.id
          });
        }
      }
    }

    return {
      rebalanced: changes.length > 0,
      changes
    };
  }

  /**
   * Get routing analytics
   */
  getRoutingAnalytics(): {
    territoryLoad: Array<{ territoryId: string; territoryName: string; totalLoad: number; repCount: number }>;
    repUtilization: Array<{ repId: string; repName: string; utilization: number }>;
    avgAssignmentConfidence: number;
  } {
    const territoryLoad: Array<{ territoryId: string; territoryName: string; totalLoad: number; repCount: number }> = [];

    for (const territory of this.territories.values()) {
      const reps = this.getAvailableReps(territory.id);
      const totalLoad = reps.reduce((sum, r) => sum + r.currentLoad, 0);
      territoryLoad.push({
        territoryId: territory.id,
        territoryName: territory.name,
        totalLoad,
        repCount: reps.length
      });
    }

    const repUtilization = Array.from(this.reps.values()).map(rep => ({
      repId: rep.id,
      repName: rep.name,
      utilization: Math.round((rep.currentLoad / rep.maxLoad) * 100)
    }));

    return {
      territoryLoad,
      repUtilization,
      avgAssignmentConfidence: 78 // Would calculate from actual assignments
    };
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    // Initialize territories
    this.territories.set('territory-west', {
      id: 'territory-west',
      name: 'West Coast',
      region: 'West',
      countries: ['US'],
      assignedReps: ['rep-1', 'rep-2'],
      quotas: { monthlyRevenue: 300000, leadTarget: 150, maxActiveLeads: 50 },
      isActive: true
    });

    this.territories.set('territory-east', {
      id: 'territory-east',
      name: 'East Coast',
      region: 'East',
      countries: ['US'],
      assignedReps: ['rep-3', 'rep-4'],
      quotas: { monthlyRevenue: 350000, leadTarget: 175, maxActiveLeads: 55 },
      isActive: true
    });

    this.territories.set('territory-central', {
      id: 'territory-central',
      name: 'Central',
      region: 'Central',
      countries: ['US'],
      assignedReps: ['rep-5'],
      quotas: { monthlyRevenue: 200000, leadTarget: 100, maxActiveLeads: 35 },
      isActive: true
    });

    // Initialize reps
    this.reps.set('rep-1', {
      id: 'rep-1',
      name: 'Alice Johnson',
      email: 'alice@company.com',
      territories: ['territory-west'],
      skills: ['tech', 'enterprise'],
      currentLoad: 8,
      maxLoad: 15,
      availability: 'full',
      performance: { winRate: 85, avgCycleTime: 35, quotaAttainment: 125 }
    });

    this.reps.set('rep-2', {
      id: 'rep-2',
      name: 'Bob Smith',
      email: 'bob@company.com',
      territories: ['territory-west'],
      skills: ['smb', 'technical'],
      currentLoad: 12,
      maxLoad: 15,
      availability: 'partial',
      performance: { winRate: 70, avgCycleTime: 42, quotaAttainment: 85 }
    });

    this.reps.set('rep-3', {
      id: 'rep-3',
      name: 'Carol Williams',
      email: 'carol@company.com',
      territories: ['territory-east'],
      skills: ['finance', 'enterprise', 'executive'],
      currentLoad: 6,
      maxLoad: 12,
      availability: 'full',
      performance: { winRate: 90, avgCycleTime: 28, quotaAttainment: 150 }
    });

    this.reps.set('rep-4', {
      id: 'rep-4',
      name: 'David Brown',
      email: 'david@company.com',
      territories: ['territory-east'],
      skills: ['healthcare', 'mid-market'],
      currentLoad: 10,
      maxLoad: 12,
      availability: 'partial',
      performance: { winRate: 65, avgCycleTime: 50, quotaAttainment: 70 }
    });

    this.reps.set('rep-5', {
      id: 'rep-5',
      name: 'Eve Davis',
      email: 'eve@company.com',
      territories: ['territory-central'],
      skills: ['tech', 'mid-market', 'executive'],
      currentLoad: 5,
      maxLoad: 10,
      availability: 'full',
      performance: { winRate: 78, avgCycleTime: 38, quotaAttainment: 95 }
    });
  }
}
