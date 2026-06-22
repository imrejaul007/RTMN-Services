/**
 * Compliance Checker Agent
 * AI-powered regulatory compliance and risk assessment
 */

import { ComplianceService } from '../services/compliance-service.js';

export interface ComplianceResult {
  checkId: string;
  regulationId: string;
  regulationName: string;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'compliant' | 'partial' | 'non-compliant';
  findings: ComplianceFinding[];
  recommendations: string[];
}

export interface ComplianceFinding {
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'not-applicable' | 'pending';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation?: string;
}

export interface RiskAssessmentResult {
  assessmentId: string;
  overallScore: number;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactorResult[];
  mitigations: Mitigation[];
}

export interface RiskFactorResult {
  category: string;
  score: number;
  weight: number;
  riskLevel: string;
  description: string;
}

export interface Mitigation {
  category: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  impact: string;
}

export class ComplianceCheckerAgent {
  private complianceService: ComplianceService;
  private name = 'Compliance Checker';
  private capabilities = [
    'Regulatory compliance',
    'Risk assessment',
    'GDPR compliance',
    'KYC verification',
    'Policy review'
  ];

  // Regulation requirements
  private regulations: Map<string, any> = new Map([
    ['gdpr', {
      name: 'General Data Protection Regulation',
      requirements: [
        { id: 'consent', name: 'Valid consent obtained', category: 'privacy' },
        { id: 'purpose', name: 'Purpose limitation documented', category: 'privacy' },
        { id: 'minimization', name: 'Data minimization followed', category: 'privacy' },
        { id: 'erasure', name: 'Right to erasure supported', category: 'privacy' },
        { id: 'portability', name: 'Data portability available', category: 'privacy' },
        { id: 'breach', name: 'Breach notification process', category: 'security' }
      ]
    }],
    ['india-pdpa', {
      name: 'India Personal Data Protection Act',
      requirements: [
        { id: 'consent', name: 'Consent documented', category: 'privacy' },
        { id: 'purpose', name: 'Purpose limitation', category: 'privacy' },
        { id: 'localization', name: 'Data localization compliance', category: 'privacy' },
        { id: 'correction', name: 'Right to correction', category: 'privacy' },
        { id: 'grievance', name: 'Grievance redressal mechanism', category: 'privacy' }
      ]
    }],
    ['companies-act', {
      name: 'Companies Act 2013',
      requirements: [
        { id: 'board', name: 'Board meetings conducted', category: 'corporate' },
        { id: 'annual-return', name: 'Annual returns filed', category: 'compliance' },
        { id: 'auditor', name: 'Auditor appointed', category: 'compliance' },
        { id: 'rpt', name: 'Related party transactions disclosed', category: 'compliance' },
        { id: 'csr', name: 'CSR compliance', category: 'compliance' }
      ]
    }],
    ['fema', {
      name: 'Foreign Exchange Management Act',
      requirements: [
        { id: 'kyc', name: 'KYC verification completed', category: 'finance' },
        { id: 'reporting', name: 'Reporting requirements met', category: 'finance' },
        { id: 'documentation', name: 'Proper documentation maintained', category: 'finance' }
      ]
    }]
  ]);

  constructor(complianceService: ComplianceService) {
    this.complianceService = complianceService;
  }

  /**
   * Check compliance for an entity
   */
  async checkCompliance(entityType: string, entityId: string, regulations: string[]): Promise<ComplianceResult> {
    const results: ComplianceResult[] = [];

    for (const regulationId of regulations) {
      const regulation = this.regulations.get(regulationId);

      if (!regulation) {
        throw new Error(`Unknown regulation: ${regulationId}`);
      }

      const result = await this.performComplianceCheck(regulationId, regulation, entityType, entityId);
      results.push(result);
    }

    // Aggregate results
    const totalScore = results.reduce((sum, r) => sum + r.complianceScore, 0);
    const avgScore = Math.round(totalScore / results.length);

    const hasCritical = results.some(r => r.riskLevel === 'critical');
    const hasHigh = results.some(r => r.riskLevel === 'high');

    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (hasCritical) overallRisk = 'critical';
    else if (hasHigh) overallRisk = 'high';
    else if (avgScore >= 80) overallRisk = 'low';
    else overallRisk = 'medium';

    return {
      checkId: `aggregate-${Date.now()}`,
      regulationId: 'multiple',
      regulationName: results.map(r => r.regulationName).join(', '),
      complianceScore: avgScore,
      riskLevel: overallRisk,
      status: avgScore >= 80 ? 'compliant' : avgScore >= 50 ? 'partial' : 'non-compliant',
      findings: results.flatMap(r => r.findings),
      recommendations: this.generateRecommendations(results)
    };
  }

  /**
   * Perform compliance check for a single regulation
   */
  private async performComplianceCheck(
    regulationId: string,
    regulation: any,
    entityType: string,
    entityId: string
  ): Promise<ComplianceResult> {
    const findings: ComplianceFinding[] = [];
    let compliantCount = 0;

    for (const req of regulation.requirements) {
      // Simulate compliance check based on entity type
      const complianceResult = this.simulateComplianceCheck(regulationId, req.id, entityType);

      findings.push({
        requirement: req.name,
        status: complianceResult.status,
        severity: complianceResult.severity,
        description: complianceResult.description,
        remediation: complianceResult.remediation
      });

      if (complianceResult.status === 'compliant') {
        compliantCount++;
      }
    }

    const complianceScore = Math.round((compliantCount / regulation.requirements.length) * 100);

    let riskLevel: ComplianceResult['riskLevel'];
    if (complianceScore >= 90) riskLevel = 'low';
    else if (complianceScore >= 70) riskLevel = 'medium';
    else if (complianceScore >= 50) riskLevel = 'high';
    else riskLevel = 'critical';

    return {
      checkId: `${regulationId}-${entityId}-${Date.now()}`,
      regulationId,
      regulationName: regulation.name,
      complianceScore,
      riskLevel,
      status: complianceScore >= 80 ? 'compliant' : complianceScore >= 50 ? 'partial' : 'non-compliant',
      findings,
      recommendations: this.generateRegulationRecommendations(riskLevel, regulationId)
    };
  }

  /**
   * Simulate compliance check (in production, would call actual verification APIs)
   */
  private simulateComplianceCheck(
    regulationId: string,
    requirementId: string,
    entityType: string
  ): { status: 'compliant' | 'non-compliant' | 'pending'; severity: 'low' | 'medium' | 'high'; description: string; remediation?: string } {
    // Simulate based on some logic (in production, would check actual compliance)
    const score = Math.random();

    if (score > 0.7) {
      return {
        status: 'compliant',
        severity: 'low',
        description: `${requirementId} requirement met`
      };
    } else if (score > 0.4) {
      return {
        status: 'pending',
        severity: 'medium',
        description: `${requirementId} verification in progress`,
        remediation: 'Complete verification and documentation'
      };
    } else {
      return {
        status: 'non-compliant',
        severity: 'high',
        description: `${requirementId} requirement not met`,
        remediation: this.getRemediation(regulationId, requirementId)
      };
    }
  }

  /**
   * Assess risk for an entity
   */
  async assessRisk(entityType: string, entityId: string): Promise<RiskAssessmentResult> {
    // Define risk factors based on entity type
    const riskFactors = this.getRiskFactors(entityType);

    // Calculate scores (in production, would use actual data)
    const scoredFactors = riskFactors.map(factor => ({
      category: factor.category,
      score: Math.round(30 + Math.random() * 50), // Random score 30-80
      weight: factor.weight,
      riskLevel: '',
      description: factor.description
    }));

    // Calculate weighted score
    const weightedScore = scoredFactors.reduce((sum, f) => sum + (f.score * f.weight), 0);

    // Determine risk level
    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (weightedScore < 30) overallRisk = 'low';
    else if (weightedScore < 50) overallRisk = 'medium';
    else if (weightedScore < 70) overallRisk = 'high';
    else overallRisk = 'critical';

    // Update risk levels
    scoredFactors.forEach(factor => {
      if (factor.score < 30) factor.riskLevel = 'low';
      else if (factor.score < 50) factor.riskLevel = 'medium';
      else if (factor.score < 70) factor.riskLevel = 'high';
      else factor.riskLevel = 'critical';
    });

    // Generate mitigations
    const mitigations = this.generateMitigations(scoredFactors);

    return {
      assessmentId: `${entityType}-${entityId}-${Date.now()}`,
      overallScore: Math.round(weightedScore),
      overallRisk,
      riskFactors: scoredFactors,
      mitigations
    };
  }

  /**
   * Get risk factors for entity type
   */
  private getRiskFactors(entityType: string): { category: string; weight: number; description: string }[] {
    switch (entityType) {
      case 'corporate':
        return [
          { category: 'Operational', weight: 0.25, description: 'Operational processes and controls' },
          { category: 'Financial', weight: 0.25, description: 'Financial health and reporting' },
          { category: 'Regulatory', weight: 0.30, description: 'Regulatory compliance status' },
          { category: 'Reputational', weight: 0.20, description: 'Brand and public perception' }
        ];
      case 'individual':
        return [
          { category: 'Identity', weight: 0.30, description: 'Identity verification status' },
          { category: 'Financial', weight: 0.35, description: 'Financial history and stability' },
          { category: 'Compliance', weight: 0.35, description: 'KYC and AML compliance' }
        ];
      default:
        return [
          { category: 'General', weight: 1.0, description: 'General risk assessment' }
        ];
    }
  }

  /**
   * Generate mitigations based on risk factors
   */
  private generateMitigations(factors: RiskFactorResult[]): Mitigation[] {
    const mitigations: Mitigation[] = [];

    factors.forEach(factor => {
      if (factor.riskLevel === 'high' || factor.riskLevel === 'critical') {
        mitigations.push({
          category: factor.category,
          action: `Implement ${factor.category.toLowerCase()} controls`,
          priority: factor.riskLevel === 'critical' ? 'high' : 'medium',
          impact: `Reduce ${factor.category.toLowerCase()} risk by implementing proper controls and monitoring`
        });
      }
    });

    if (mitigations.length === 0) {
      mitigations.push({
        category: 'General',
        action: 'Maintain current controls',
        priority: 'low',
        impact: 'Continue monitoring and periodic reviews'
      });
    }

    return mitigations;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(results: ComplianceResult[]): string[] {
    const recommendations: string[] = [];

    const criticalFindings = results.flatMap(r =>
      r.findings.filter(f => f.severity === 'critical')
    );

    if (criticalFindings.length > 0) {
      recommendations.push(`Address ${criticalFindings.length} critical compliance gaps immediately`);
    }

    const highFindings = results.flatMap(r =>
      r.findings.filter(f => f.severity === 'high')
    );

    if (highFindings.length > 0) {
      recommendations.push(`Review ${highFindings.length} high-severity findings`);
    }

    recommendations.push('Schedule regular compliance audits');

    return recommendations;
  }

  /**
   * Generate regulation-specific recommendations
   */
  private generateRegulationRecommendations(riskLevel: string, regulationId: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push(`Review ${regulationId.toUpperCase()} requirements and create remediation plan`);
      recommendations.push('Consider engaging compliance consultant');
    }

    recommendations.push('Schedule periodic compliance reviews');

    return recommendations;
  }

  /**
   * Get remediation for specific requirement
   */
  private getRemediation(regulationId: string, requirementId: string): string {
    const remediations: Record<string, Record<string, string>> = {
      'gdpr': {
        'consent': 'Implement clear consent mechanisms and maintain consent records',
        'erasure': 'Implement right to erasure (right to be forgotten) functionality',
        'breach': 'Establish breach notification process within 72 hours'
      },
      'india-pdpa': {
        'consent': 'Obtain explicit consent with clear purpose statement',
        'localization': 'Ensure sensitive personal data is stored in India'
      },
      'companies-act': {
        'board': 'Schedule and document regular board meetings',
        'csr': 'Allocate and spend required CSR funds'
      }
    };

    return remediations[regulationId]?.[requirementId] || 'Review and implement required controls';
  }

  // Agent info
  getInfo() {
    return {
      name: this.name,
      capabilities: this.capabilities,
      status: 'active'
    };
  }
}

export default ComplianceCheckerAgent;
