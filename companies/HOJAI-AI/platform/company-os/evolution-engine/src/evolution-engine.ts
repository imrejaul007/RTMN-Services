/**
 * Evolution Engine
 *
 * Manages company lifecycle: Startup → Growth → Enterprise → Franchise
 */

import { v4 as uuidv4 } from 'uuid';
import { CompanyStage, EvolutionMilestone, StageCapabilities, UpgradeRecommendation } from './types';

// ============================================
// Stage Capabilities
// ============================================

const STAGE_CAPABILITIES: Record<CompanyStage, StageCapabilities> = {
  startup: {
    stage: 'startup',
    features: [
      'Basic CRM',
      'Simple invoicing',
      'Basic analytics',
      'Single location',
      'Up to 10 employees',
      '3 AI workers',
    ],
    limits: {
      maxEmployees: 10,
      maxLocations: 1,
      maxAIWorkers: 3,
      analyticsLevel: 'basic',
    },
    pricing: {
      monthlyFee: 2500,
      setupFee: 5000,
    },
  },
  growth: {
    stage: 'growth',
    features: [
      'Advanced CRM',
      'Multi-location support',
      'Advanced analytics',
      'Up to 50 employees',
      '10 AI workers',
      'Inventory management',
      'Loyalty programs',
    ],
    limits: {
      maxEmployees: 50,
      maxLocations: 5,
      maxAIWorkers: 10,
      analyticsLevel: 'standard',
    },
    pricing: {
      monthlyFee: 7500,
      setupFee: 15000,
    },
  },
  enterprise: {
    stage: 'enterprise',
    features: [
      'Full CRM suite',
      'Unlimited locations',
      'Advanced analytics + AI insights',
      'Up to 500 employees',
      '25 AI workers',
      'Custom integrations',
      'Dedicated support',
      'Multi-brand support',
    ],
    limits: {
      maxEmployees: 500,
      maxLocations: 100,
      maxAIWorkers: 25,
      analyticsLevel: 'advanced',
    },
    pricing: {
      monthlyFee: 25000,
      setupFee: 50000,
    },
  },
  franchise: {
    stage: 'franchise',
    features: [
      'Everything in Enterprise',
      'Franchisee portal',
      'Brand management',
      'Royalty tracking',
      'Unlimited franchisees',
      'Centralized inventory',
      'Master analytics',
      'Priority support',
    ],
    limits: {
      maxEmployees: 5000,
      maxLocations: 10000,
      maxAIWorkers: 100,
      analyticsLevel: 'advanced',
    },
    pricing: {
      monthlyFee: 100000,
      setupFee: 250000,
    },
  },
};

// ============================================
// Evolution Engine
// ============================================

interface CompanyState {
  companyId: string;
  currentStage: CompanyStage;
  revenue: number;
  employees: number;
  locations: number;
  aiWorkers: number;
  hasFranchiseModel: boolean;
  hasBrandGuidelines: boolean;
  milestones: EvolutionMilestone[];
}

const companies = new Map<string, CompanyState>();

export class EvolutionEngine {
  /**
   * Register a company
   */
  registerCompany(companyId: string): CompanyState {
    const state: CompanyState = {
      companyId,
      currentStage: 'startup',
      revenue: 0,
      employees: 0,
      locations: 1,
      aiWorkers: 1,
      hasFranchiseModel: false,
      hasBrandGuidelines: false,
      milestones: [],
    };

    companies.set(companyId, state);
    return state;
  }

  /**
   * Update company metrics
   */
  updateMetrics(companyId: string, metrics: {
    revenue?: number;
    employees?: number;
    locations?: number;
    aiWorkers?: number;
  }): CompanyState | null {
    const state = companies.get(companyId);
    if (!state) return null;

    if (metrics.revenue !== undefined) state.revenue = metrics.revenue;
    if (metrics.employees !== undefined) state.employees = metrics.employees;
    if (metrics.locations !== undefined) state.locations = metrics.locations;
    if (metrics.aiWorkers !== undefined) state.aiWorkers = metrics.aiWorkers;

    return state;
  }

  /**
   * Enable franchise mode
   */
  enableFranchiseMode(companyId: string): CompanyState | null {
    const state = companies.get(companyId);
    if (!state) return null;

    state.hasFranchiseModel = true;
    state.hasBrandGuidelines = true;
    return state;
  }

  /**
   * Get company state
   */
  getCompanyState(companyId: string): CompanyState | null {
    return companies.get(companyId) || null;
  }

  /**
   * Check if company is ready to evolve
   */
  checkEvolution(companyId: string): UpgradeRecommendation | null {
    const state = companies.get(companyId);
    if (!state) return null;

    const currentStage = state.currentStage;
    const nextStage = this.getNextStage(currentStage);

    if (!nextStage) {
      return null; // Already at max stage
    }

    const criteria = this.getStageCriteria(nextStage);
    const missingCriteria: string[] = [];
    let readiness = 0;

    // Check revenue
    if (criteria.minRevenue !== undefined) {
      if (state.revenue >= criteria.minRevenue) {
        readiness += 25;
      } else {
        missingCriteria.push(`Revenue target: ₹${criteria.minRevenue}/month (current: ₹${state.revenue})`);
      }
    }

    // Check employees
    if (criteria.minEmployees !== undefined) {
      if (state.employees >= criteria.minEmployees) {
        readiness += 25;
      } else {
        missingCriteria.push(`Employees: ${criteria.minEmployees} (current: ${state.employees})`);
      }
    }

    // Check locations
    if (criteria.minLocations !== undefined) {
      if (state.locations >= criteria.minLocations) {
        readiness += 25;
      } else {
        missingCriteria.push(`Locations: ${criteria.minLocations} (current: ${state.locations})`);
      }
    }

    // Check franchise requirements
    if (nextStage === 'franchise') {
      if (state.hasFranchiseModel && state.hasBrandGuidelines) {
        readiness += 25;
      } else {
        missingCriteria.push('Franchise model and brand guidelines required');
      }
    }

    return {
      currentStage,
      targetStage: nextStage,
      readiness,
      missingCriteria,
      suggestedActions: this.getSuggestedActions(nextStage, readiness),
      estimatedTime: this.getEstimatedTime(nextStage, state),
    };
  }

  /**
   * Evolve company to next stage
   */
  evolve(companyId: string): EvolutionMilestone | null {
    const state = companies.get(companyId);
    if (!state) return null;

    const recommendation = this.checkEvolution(companyId);
    if (!recommendation || recommendation.readiness < 75) {
      return null; // Not ready
    }

    const fromStage = state.currentStage;
    const toStage = recommendation.targetStage;

    const milestone: EvolutionMilestone = {
      id: `evo_${uuidv4().slice(0, 8)}`,
      companyId,
      fromStage,
      toStage,
      triggeredAt: new Date().toISOString(),
      reason: `Readiness: ${recommendation.readiness}%`,
      metrics: {
        revenue: state.revenue,
        employees: state.employees,
        locations: state.locations,
      },
    };

    state.currentStage = toStage;
    state.milestones.push(milestone);

    return milestone;
  }

  /**
   * Get capabilities for a stage
   */
  getCapabilities(stage: CompanyStage): StageCapabilities {
    return STAGE_CAPABILITIES[stage];
  }

  /**
   * Get next stage
   */
  private getNextStage(current: CompanyStage): CompanyStage | null {
    const order: CompanyStage[] = ['startup', 'growth', 'enterprise', 'franchise'];
    const currentIndex = order.indexOf(current);
    return currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
  }

  /**
   * Get criteria for a stage
   */
  private getStageCriteria(stage: CompanyStage): any {
    switch (stage) {
      case 'growth':
        return { minRevenue: 500000, minEmployees: 5, minLocations: 2 };
      case 'enterprise':
        return { minRevenue: 5000000, minEmployees: 25, minLocations: 5 };
      case 'franchise':
        return { minRevenue: 10000000, minEmployees: 50, minLocations: 10 };
      default:
        return {};
    }
  }

  /**
   * Get suggested actions
   */
  private getSuggestedActions(stage: CompanyStage, readiness: number): string[] {
    if (readiness >= 75) {
      return ['Ready to upgrade! Click "Evolve Now"'];
    }

    switch (stage) {
      case 'growth':
        return [
          'Hire 2 more employees',
          'Open a second location',
          'Increase monthly revenue to ₹5 lakh',
        ];
      case 'enterprise':
        return [
          'Scale to 25+ employees',
          'Open 5+ locations',
          'Grow revenue to ₹50 lakh/month',
        ];
      case 'franchise':
        return [
          'Create franchise business model',
          'Develop brand guidelines',
          'Document operating procedures',
        ];
      default:
        return [];
    }
  }

  /**
   * Estimate time to next stage
   */
  private getEstimatedTime(stage: CompanyStage, state: CompanyState): string {
    const criteria = this.getStageCriteria(stage);

    if (!criteria.minRevenue) return 'Now';

    const currentRevenue = state.revenue;
    const targetRevenue = criteria.minRevenue;

    if (currentRevenue >= targetRevenue) return 'Now';

    const monthlyGrowth = state.revenue > 0 ? state.revenue * 0.2 : 50000; // Assume 20% growth or 50k
    const monthsNeeded = Math.ceil((targetRevenue - currentRevenue) / monthlyGrowth);

    return `${Math.max(1, monthsNeeded)} months`;
  }
}

export const evolutionEngine = new EvolutionEngine();