/**
 * Compliance Service
 * Business logic for compliance checking and risk assessment
 */

import { v4 as uuidv4 } from 'uuid';

export interface ComplianceCheck {
  checkId: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  regulationId: string;
  regulationName: string;
  checkType: 'full' | 'partial' | 'spot';
  status: 'in-progress' | 'completed' | 'failed';
  requirements: ComplianceRequirement[];
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: ComplianceFinding[];
  recommendations: string[];
  checkedAt: string;
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRequirement {
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'not-applicable' | 'pending';
  evidence?: string;
  notes?: string;
}

export interface ComplianceFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  regulation?: string;
  remediation?: string;
}

export interface RiskAssessment {
  assessmentId: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  riskFactors: RiskFactor[];
  overallScore: number;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  mitigations: RiskMitigation[];
  nextReviewDate: string;
  createdAt: string;
}

export interface RiskFactor {
  category: string;
  score: number;
  weight: number;
  description?: string;
}

export interface RiskMitigation {
  action: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
}

export class ComplianceService {
  private checks: Map<string, ComplianceCheck> = new Map();
  private assessments: Map<string, RiskAssessment> = new Map();

  async createComplianceCheck(input: Partial<ComplianceCheck>): Promise<ComplianceCheck> {
    const checkId = uuidv4();
    const now = new Date().toISOString();

    const newCheck: ComplianceCheck = {
      checkId,
      entityType: input.entityType || '',
      entityId: input.entityId || '',
      entityName: input.entityName,
      regulationId: input.regulationId || '',
      regulationName: input.regulationName || '',
      checkType: input.checkType || 'full',
      status: 'in-progress',
      requirements: input.requirements || [],
      complianceScore: 0,
      riskLevel: 'medium',
      findings: [],
      recommendations: [],
      checkedAt: now,
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now
    };

    this.checks.set(checkId, newCheck);
    return newCheck;
  }

  async getComplianceCheck(checkId: string): Promise<ComplianceCheck | null> {
    return this.checks.get(checkId) || null;
  }

  async updateComplianceCheck(checkId: string, updates: Partial<ComplianceCheck>): Promise<ComplianceCheck | null> {
    const existingCheck = this.checks.get(checkId);
    if (!existingCheck) return null;

    const updatedCheck: ComplianceCheck = {
      ...existingCheck,
      ...updates,
      checkId: existingCheck.checkId,
      updatedAt: new Date().toISOString()
    };

    // Recalculate score
    if (updates.requirements) {
      const compliantCount = updates.requirements.filter(r => r.status === 'compliant').length;
      updatedCheck.complianceScore = Math.round((compliantCount / updates.requirements.length) * 100);

      if (updatedCheck.complianceScore >= 90) updatedCheck.riskLevel = 'low';
      else if (updatedCheck.complianceScore >= 70) updatedCheck.riskLevel = 'medium';
      else if (updatedCheck.complianceScore >= 50) updatedCheck.riskLevel = 'high';
      else updatedCheck.riskLevel = 'critical';

      updatedCheck.status = updates.requirements.every(r => r.status !== 'pending') ? 'completed' : 'in-progress';
    }

    this.checks.set(checkId, updatedCheck);
    return updatedCheck;
  }

  async createRiskAssessment(input: Partial<RiskAssessment>): Promise<RiskAssessment> {
    const assessmentId = uuidv4();
    const now = new Date().toISOString();

    // Calculate weighted score
    const riskFactors = input.riskFactors || [
      { category: 'operational', score: 50, weight: 0.3 },
      { category: 'financial', score: 50, weight: 0.25 },
      { category: 'regulatory', score: 50, weight: 0.25 },
      { category: 'reputational', score: 50, weight: 0.2 }
    ];

    const weightedScore = riskFactors.reduce((sum, f) => sum + (f.score * f.weight), 0);

    let overallRisk: RiskAssessment['overallRisk'];
    if (weightedScore < 30) overallRisk = 'low';
    else if (weightedScore < 50) overallRisk = 'medium';
    else if (weightedScore < 70) overallRisk = 'high';
    else overallRisk = 'critical';

    const newAssessment: RiskAssessment = {
      assessmentId,
      entityType: input.entityType || '',
      entityId: input.entityId || '',
      entityName: input.entityName,
      riskFactors,
      overallScore: Math.round(weightedScore),
      overallRisk,
      mitigations: [],
      nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now
    };

    this.assessments.set(assessmentId, newAssessment);
    return newAssessment;
  }

  async getRiskAssessment(assessmentId: string): Promise<RiskAssessment | null> {
    return this.assessments.get(assessmentId) || null;
  }

  async getComplianceStats(): Promise<any> {
    const checks = Array.from(this.checks.values());
    const assessments = Array.from(this.assessments.values());

    return {
      totalChecks: checks.length,
      compliantChecks: checks.filter(c => c.riskLevel === 'low').length,
      nonCompliantChecks: checks.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length,
      pendingChecks: checks.filter(c => c.status === 'in-progress').length,
      totalAssessments: assessments.length,
      criticalRisks: assessments.filter(a => a.overallRisk === 'critical').length,
      highRisks: assessments.filter(a => a.overallRisk === 'high').length
    };
  }
}

export default ComplianceService;
