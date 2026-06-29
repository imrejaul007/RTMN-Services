/**
 * Evolution Engine Types
 *
 * Company lifecycle: Startup → Growth → Enterprise → Franchise
 */

export type CompanyStage = 'startup' | 'growth' | 'enterprise' | 'franchise';

export interface StageCriteria {
  startup: {
    minRevenue?: number;
    maxEmployees?: number;
    maxLocations?: number;
  };
  growth: {
    minRevenue?: number;
    minEmployees?: number;
    maxLocations?: number;
  };
  enterprise: {
    minRevenue?: number;
    minEmployees?: number;
    minLocations?: number;
  };
  franchise: {
    hasFranchiseModel: boolean;
    hasBrandGuidelines: boolean;
  };
}

export interface EvolutionMilestone {
  id: string;
  companyId: string;
  fromStage: CompanyStage;
  toStage: CompanyStage;
  triggeredAt: string;
  reason: string;
  metrics: Record<string, number>;
}

export interface StageCapabilities {
  stage: CompanyStage;
  features: string[];
  limits: {
    maxEmployees: number;
    maxLocations: number;
    maxAIWorkers: number;
    analyticsLevel: 'basic' | 'standard' | 'advanced';
  };
  pricing: {
    monthlyFee: number;
    setupFee: number;
  };
}

export interface UpgradeRecommendation {
  currentStage: CompanyStage;
  targetStage: CompanyStage;
  readiness: number;        // 0-100
  missingCriteria: string[];
  suggestedActions: string[];
  estimatedTime: string;     // "3 months"
}
