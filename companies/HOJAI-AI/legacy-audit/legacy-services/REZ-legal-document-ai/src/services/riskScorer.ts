import { IClause } from '../models/DocumentAnalysis';
import { IRiskReport, IRiskFactor, IRiskClause, IRiskDistribution, getRiskLevel } from '../models/RiskReport';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export interface RiskScoringOptions {
  documentId: string;
  tenantId: string;
  clauses: IClause[];
  content?: string;
}

export interface RiskFactorWeights {
  category: string;
  weight: number;
  keywords: string[];
}

// Risk factor weights for different clause categories
const RISK_FACTOR_WEIGHTS: RiskFactorWeights[] = [
  {
    category: 'unlimited_liability',
    weight: 40,
    keywords: ['unlimited liability', 'unlimited damages', 'no limitation', 'fully liable']
  },
  {
    category: 'broad_indemnification',
    weight: 35,
    keywords: ['indemnify any', 'all claims', 'any liability', 'defend at own expense']
  },
  {
    category: 'one_sided_termination',
    weight: 30,
    keywords: ['terminate at any time', 'terminate without cause', 'immediate termination', 'sole discretion']
  },
  {
    category: 'unreasonable_restrictions',
    weight: 25,
    keywords: ['non-compete', 'cannot work with', 'exclusive', 'sole provider']
  },
  {
    category: 'automatic_renewal',
    weight: 20,
    keywords: ['automatically renew', 'auto-renewal', 'renewal at end of term', 'renewal period']
  },
  {
    category: 'data_privacy_risk',
    weight: 35,
    keywords: ['personal data', 'pii', 'sensitive information', 'data breach', 'gdpr non-compliant']
  },
  {
    category: 'ip_assignment',
    weight: 30,
    keywords: ['assign all ip', 'transfer all rights', 'work for hire', 'assignee owns']
  },
  {
    category: 'unilateral_amendment',
    weight: 25,
    keywords: ['amend at will', 'modify terms', 'change at any time', 'update at discretion']
  },
  {
    category: 'arbitration_clause',
    weight: 15,
    keywords: ['binding arbitration', 'arbitration in', 'waive jury trial', 'class action waiver']
  },
  {
    category: 'venue_restriction',
    weight: 10,
    keywords: ['exclusive jurisdiction', 'venue in', 'courts of', 'shall be filed in']
  }
];

/**
 * Score risk for a single clause
 */
export function scoreClauseRisk(clause: IClause): number {
  let score = 0;

  // Base score by risk level
  switch (clause.risk) {
    case 'high':
      score = 70;
      break;
    case 'medium':
      score = 40;
      break;
    case 'low':
    default:
      score = 10;
  }

  // Add points for each risk factor identified
  score += clause.riskFactors.length * 5;

  // Check for specific high-risk patterns
  const content = clause.content.toLowerCase();
  for (const factor of RISK_FACTOR_WEIGHTS) {
    for (const keyword of factor.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += factor.weight;
        break;
      }
    }
  }

  // Cap at 100
  return Math.min(100, score);
}

/**
 * Generate comprehensive risk report
 */
export async function generateRiskReport(options: RiskScoringOptions): Promise<IRiskReport> {
  const { documentId, tenantId, clauses, content } = options;
  const startTime = Date.now();

  logger.info('Generating risk report', { documentId, tenantId, clauseCount: clauses.length });

  // Score all clauses
  const scoredClauses = clauses.map(clause => ({
    ...clause,
    riskScore: scoreClauseRisk(clause)
  }));

  // Categorize clauses by risk level
  const highRiskClauses = scoredClauses
    .filter(c => c.riskScore >= 60)
    .map(c => createRiskClause(c));

  const mediumRiskClauses = scoredClauses
    .filter(c => c.riskScore >= 30 && c.riskScore < 60)
    .map(c => createRiskClause(c));

  const lowRiskClauses = scoredClauses
    .filter(c => c.riskScore < 30)
    .map(c => createRiskClause(c));

  // Calculate distribution
  const riskDistribution: IRiskDistribution = {
    low: lowRiskClauses.length,
    medium: mediumRiskClauses.length,
    high: highRiskClauses.length,
    critical: scoredClauses.filter(c => c.riskScore >= 90).length
  };

  // Calculate overall risk score
  const overallRiskScore = calculateOverallRiskScore(scoredClauses);
  const riskLevel = getRiskLevel(overallRiskScore);

  // Identify key risk factors
  const riskFactors = identifyKeyRiskFactors(scoredClauses);

  // Generate compliance alerts
  const complianceAlerts = generateComplianceAlerts(scoredClauses);

  // Generate summary and recommendations
  const summary = generateRiskSummary(scoredClauses, overallRiskScore, riskLevel);
  const keyFindings = generateKeyFindings(scoredClauses, riskFactors);
  const recommendations = generateRecommendations(scoredClauses, riskFactors);

  const report: IRiskReport = {
    reportId: `risk_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
    documentId,
    tenantId,
    overallRiskScore,
    riskLevel,
    riskDistribution,
    highRiskClauses,
    mediumRiskClauses,
    lowRiskClauses,
    riskFactors,
    complianceAlerts,
    summary,
    keyFindings,
    recommendations,
    riskTrends: [],
    generatedAt: new Date(),
    modelVersion: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    metadata: {
      totalClauses: clauses.length,
      analyzedClauses: scoredClauses.length,
      confidence: calculateConfidence(scoredClauses),
      analysisDuration: Date.now() - startTime
    }
  };

  logger.info('Risk report generated', {
    documentId,
    overallRiskScore,
    riskLevel,
    highRiskCount: highRiskClauses.length
  });

  return report;
}

/**
 * Create a risk clause from a regular clause
 */
function createRiskClause(clause: IClause & { riskScore: number }): IRiskClause {
  return {
    clauseId: clause.id,
    title: clause.title,
    type: clause.type,
    riskLevel: clause.risk,
    riskScore: clause.riskScore,
    riskFactors: clause.riskFactors.map((factor, index) => ({
      category: determineRiskCategory(factor),
      description: factor,
      severity: determineSeverity(clause.riskScore, index),
      impact: describeImpact(factor),
      recommendation: generateRecommendation(factor),
      clauseReference: clause.id
    })),
    originalText: clause.content.substring(0, 500),
    suggestedModification: generateSuggestedModification(clause)
  };
}

/**
 * Calculate overall risk score from all clauses
 */
function calculateOverallRiskScore(clauses: (IClause & { riskScore: number })[]): number {
  if (clauses.length === 0) return 0;

  // Weighted average with high-risk clauses having more impact
  let totalScore = 0;
  let totalWeight = 0;

  for (const clause of clauses) {
    const weight = clause.riskScore >= 60 ? 2 : clause.riskScore >= 30 ? 1.5 : 1;
    totalScore += clause.riskScore * weight;
    totalWeight += weight;
  }

  return Math.round(totalScore / totalWeight);
}

/**
 * Identify key risk factors across all clauses
 */
function identifyKeyRiskFactors(clauses: (IClause & { riskScore: number })[]): IRiskFactor[] {
  const factorMap = new Map<string, IRiskFactor>();
  const content = clauses.map(c => c.content).join(' ').toLowerCase();

  for (const factor of RISK_FACTOR_WEIGHTS) {
    let found = false;
    for (const keyword of factor.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        found = true;
        break;
      }
    }

    if (found) {
      factorMap.set(factor.category, {
        category: factor.category,
        description: getFactorDescription(factor.category),
        severity: factor.weight >= 35 ? 'high' : factor.weight >= 20 ? 'medium' : 'low',
        impact: getFactorImpact(factor.category),
        recommendation: getFactorRecommendation(factor.category)
      });
    }
  }

  return Array.from(factorMap.values());
}

/**
 * Generate compliance alerts based on clause content
 */
function generateComplianceAlerts(clauses: (IClause & { riskScore: number })[]): IRiskReport['complianceAlerts'] {
  const alerts: IRiskReport['complianceAlerts'] = [];
  const content = clauses.map(c => c.content).join(' ').toLowerCase();

  // GDPR-related alerts
  if (content.includes('personal data') && !content.includes('gdpr') && !content.includes('consent')) {
    alerts.push({
      framework: 'GDPR',
      severity: 'high',
      description: 'Document mentions personal data but may not fully comply with GDPR requirements'
    });
  }

  // SOC2-related alerts
  if (content.includes('security') && content.includes('audit') && !content.includes('soc 2')) {
    alerts.push({
      framework: 'SOC2',
      severity: 'medium',
      description: 'Security and audit clauses present; verify SOC2 compliance coverage'
    });
  }

  // Data breach alerts
  if (content.includes('data breach') || content.includes('breach notification')) {
    alerts.push({
      framework: 'Multiple',
      severity: 'high',
      description: 'Data breach provisions detected; ensure notification timelines meet requirements'
    });
  }

  return alerts;
}

/**
 * Generate risk summary
 */
function generateRiskSummary(clauses: (IClause & { riskScore: number })[], score: number, level: string): string {
  const highCount = clauses.filter(c => c.riskScore >= 60).length;
  const mediumCount = clauses.filter(c => c.riskScore >= 30 && c.riskScore < 60).length;
  const lowCount = clauses.filter(c => c.riskScore < 30).length;

  let summary = `This document contains ${clauses.length} clauses with an overall risk score of ${score}/100 (${level} risk). `;
  summary += `High-risk clauses: ${highCount}, medium-risk: ${mediumCount}, low-risk: ${lowCount}. `;

  if (highCount > 3) {
    summary += 'Multiple high-risk provisions require attention before proceeding.';
  } else if (highCount > 0) {
    summary += 'Several provisions warrant review by legal counsel.';
  } else {
    summary += 'The document appears to have standard, balanced terms.';
  }

  return summary;
}

/**
 * Generate key findings
 */
function generateKeyFindings(clauses: (IClause & { riskScore: number })[], factors: IRiskFactor[]): string[] {
  const findings: string[] = [];

  // Top risk clauses
  const topRisks = clauses
    .filter(c => c.riskScore >= 60)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3);

  for (const clause of topRisks) {
    findings.push(`${clause.title} (${clause.type}) presents elevated risk with score ${clause.riskScore}`);
  }

  // Top risk factors
  const criticalFactors = factors
    .filter(f => f.severity === 'high' || f.severity === 'critical')
    .slice(0, 3);

  for (const factor of criticalFactors) {
    findings.push(`${factor.category.replace(/_/g, ' ')}: ${factor.description}`);
  }

  return findings;
}

/**
 * Generate recommendations
 */
function generateRecommendations(clauses: (IClause & { riskScore: number })[], factors: IRiskFactor[]): string[] {
  const recommendations: string[] = [];

  for (const factor of factors) {
    if (factor.severity === 'high' || factor.severity === 'critical') {
      recommendations.push(factor.recommendation);
    }
  }

  // Add general recommendations
  if (recommendations.length === 0) {
    recommendations.push('Document appears to have balanced terms. Proceed with standard review.');
  }

  return recommendations.slice(0, 10);
}

/**
 * Helper functions
 */
function determineRiskCategory(factor: string): string {
  const lowerFactor = factor.toLowerCase();
  for (const weight of RISK_FACTOR_WEIGHTS) {
    for (const keyword of weight.keywords) {
      if (lowerFactor.includes(keyword.toLowerCase())) {
        return weight.category;
      }
    }
  }
  return 'general_risk';
}

function determineSeverity(score: number, index: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function describeImpact(factor: string): string {
  const lowerFactor = factor.toLowerCase();
  if (lowerFactor.includes('unlimited')) return 'May expose party to unlimited financial liability';
  if (lowerFactor.includes('indemnif')) return 'Could result in broad indemnification obligations';
  if (lowerFactor.includes('terminate')) return 'May allow one-sided contract termination';
  if (lowerFactor.includes('data')) return 'Potential non-compliance with data protection regulations';
  if (lowerFactor.includes('ip') || lowerFactor.includes('intellectual')) return 'May result in loss of intellectual property rights';
  return 'Standard business risk that should be evaluated in context';
}

function generateRecommendation(factor: string): string {
  const lowerFactor = factor.toLowerCase();
  if (lowerFactor.includes('unlimited')) return 'Negotiate liability cap to limit exposure';
  if (lowerFactor.includes('indemnif')) return 'Request mutual indemnification or carve-out for known claims';
  if (lowerFactor.includes('terminate')) return 'Ensure termination rights are mutual and include notice periods';
  if (lowerFactor.includes('data')) return 'Include GDPR-compliant data processing terms';
  if (lowerFactor.includes('ip') || lowerFactor.includes('intellectual')) return 'Retain rights to pre-existing IP and limit assignment scope';
  return 'Review with legal counsel for specific recommendations';
}

function generateSuggestedModification(clause: IClause): string {
  if (clause.risk === 'high') {
    return `[SUGGESTED] Review and potentially modify ${clause.title} to reduce risk exposure. Consider consulting with legal counsel.`;
  }
  return undefined as any;
}

function calculateConfidence(clauses: (IClause & { riskScore: number })[]): number {
  if (clauses.length === 0) return 0;

  // Base confidence on number of clauses
  const clauseCountConfidence = Math.min(1, clauses.length / 5);

  // Confidence in risk scoring based on risk factor identification
  const riskFactorConfidence = clauses.every(c => c.riskFactors.length > 0) ? 1 : 0.8;

  return Math.round((clauseCountConfidence * 0.4 + riskFactorConfidence * 0.6) * 100) / 100;
}

function getFactorDescription(category: string): string {
  const descriptions: Record<string, string> = {
    unlimited_liability: 'Clause may expose a party to unlimited liability',
    broad_indemnification: 'Indemnification terms are overly broad',
    one_sided_termination: 'Termination rights favor one party',
    unreasonable_restrictions: 'Contains potentially unreasonable business restrictions',
    automatic_renewal: 'Contract contains automatic renewal provisions',
    data_privacy_risk: 'Data handling may not meet privacy regulations',
    ip_assignment: 'Intellectual property rights may be assigned away',
    unilateral_amendment: 'Terms can be modified by one party',
    arbitration_clause: 'Mandatory arbitration provisions present',
    venue_restriction: 'Jurisdiction/venue restrictions may limit legal options'
  };
  return descriptions[category] || 'Risk factor identified';
}

function getFactorImpact(category: string): string {
  const impacts: Record<string, string> = {
    unlimited_liability: 'Potential for significant financial loss',
    broad_indemnification: 'May be responsible for third-party claims',
    one_sided_termination: 'One party can end contract without cause',
    unreasonable_restrictions: 'May limit business operations',
    automatic_renewal: 'Contract may renew without active consent',
    data_privacy_risk: 'Regulatory penalties possible',
    ip_assignment: 'Loss of IP ownership',
    unilateral_amendment: 'Terms can change without negotiation',
    arbitration_clause: 'Limits ability to pursue legal remedies',
    venue_restriction: 'May require litigation in inconvenient location'
  };
  return impacts[category] || 'Moderate business impact';
}

function getFactorRecommendation(category: string): string {
  const recommendations: Record<string, string> = {
    unlimited_liability: 'Negotiate liability cap (e.g., 12 months of fees)',
    broad_indemnification: 'Add mutual indemnification or cap on damages',
    one_sided_termination: 'Ensure mutual termination rights with notice period',
    unreasonable_restrictions: 'Review and narrow scope of restrictions',
    automatic_renewal: 'Add opt-out provision or notice requirement',
    data_privacy_risk: 'Include compliant data processing appendix',
    ip_assignment: 'Retain rights to pre-existing IP',
    unilateral_amendment: 'Require mutual agreement for changes',
    arbitration_clause: 'Negotiate for class action waiver carve-out',
    venue_restriction: 'Consider neutral venue or arbitration'
  };
  return recommendations[category] || 'Review with legal counsel';
}

export default {
  scoreClauseRisk,
  generateRiskReport,
  RISK_FACTOR_WEIGHTS
};
