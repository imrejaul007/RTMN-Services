import { IClause, IComplianceCheck } from '../models/DocumentAnalysis';
import logger from '../utils/logger';

export interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  description: string;
  keywords: string[];
  clauseTypes: string[];
  riskThreshold: 'critical' | 'low' | 'medium' | 'high';
  checks: ComplianceCheck[];
}

export interface ComplianceCheck {
  id: string;
  description: string;
  patterns: RegExp[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceMappingResult {
  framework: string;
  overallStatus: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  score: number;
  applicableClauses: IClause[];
  compliantClauses: IClause[];
  nonCompliantClauses: IClause[];
  issues: ComplianceIssue[];
  recommendations: string[];
  details: string;
}

export interface ComplianceIssue {
  clauseId: string;
  clauseTitle: string;
  requirement: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

// Define compliance frameworks with their requirements
const COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  {
    id: 'gdpr',
    name: 'GDPR',
    description: 'General Data Protection Regulation - EU data protection requirements',
    requirements: [
      {
        id: 'gdpr-data-processing',
        description: 'Data processing must have legal basis and be documented',
        keywords: ['personal data', 'data processing', 'legal basis', 'consent'],
        clauseTypes: ['confidentiality', 'data_protection'],
        riskThreshold: 'high',
        checks: [
          {
            id: 'consent-required',
            description: 'Consent clause must be present for data processing',
            patterns: [/consent/i, /agree.*process/i, /authorize.*data/i],
            severity: 'high'
          },
          {
            id: 'purpose-limitation',
            description: 'Data use must be limited to specified purposes',
            patterns: [/purpose/i, /limit.*use/i, /only.*for/i],
            severity: 'medium'
          }
        ]
      },
      {
        id: 'gdpr-data-subject-rights',
        description: 'Must respect data subject rights',
        keywords: ['data subject', 'right to access', 'right to erasure', 'rectification'],
        clauseTypes: ['confidentiality'],
        riskThreshold: 'medium',
        checks: [
          {
            id: 'access-rights',
            description: 'Must include data access rights provisions',
            patterns: [/right.*access/i, /access.*data/i, /provide.*information/i],
            severity: 'medium'
          }
        ]
      },
      {
        id: 'gdpr-breach-notification',
        description: 'Data breach notification requirements',
        keywords: ['data breach', 'breach notification', 'notify.*within', '72 hours'],
        clauseTypes: ['confidentiality', 'liability'],
        riskThreshold: 'high',
        checks: [
          {
            id: 'breach-notification',
            description: 'Must include breach notification timeline',
            patterns: [/breach.*notification/i, /notify.*breach/i, /within.*hours/i, /72.*hour/i],
            severity: 'high'
          }
        ]
      },
      {
        id: 'gdpr-data-transfer',
        description: 'International data transfer requirements',
        keywords: ['transfer', 'international', 'cross-border', 'third country'],
        clauseTypes: ['confidentiality'],
        riskThreshold: 'high',
        checks: [
          {
            id: 'transfer-safeguards',
            description: 'International transfers must have safeguards',
            patterns: [/transfer.*safeguard/i, /standard.*contract/i, / adequacy/i],
            severity: 'high'
          }
        ]
      }
    ]
  },
  {
    id: 'soc2',
    name: 'SOC 2',
    description: 'Service Organization Control 2 - Security controls for service organizations',
    requirements: [
      {
        id: 'soc2-security',
        description: 'Security controls must be documented',
        keywords: ['security', 'access control', 'authentication', 'encryption'],
        clauseTypes: ['confidentiality', 'warranty'],
        riskThreshold: 'high',
        checks: [
          {
            id: 'security-controls',
            description: 'Must describe security controls',
            patterns: [/security.*measure/i, /access.*control/i, /encryption/i],
            severity: 'high'
          }
        ]
      },
      {
        id: 'soc2-availability',
        description: 'Service availability commitments',
        keywords: ['availability', 'uptime', 'sla', 'service level'],
        clauseTypes: ['warranty', 'termination'],
        riskThreshold: 'medium',
        checks: [
          {
            id: 'sla-defined',
            description: 'Service level agreements must be defined',
            patterns: [/sla/i, /service level/i, /uptime.*guarantee/i, /availability/i],
            severity: 'medium'
          }
        ]
      },
      {
        id: 'soc2-confidentiality',
        description: 'Confidentiality of customer data',
        keywords: ['confidential', 'customer data', 'proprietary'],
        clauseTypes: ['confidentiality'],
        riskThreshold: 'high',
        checks: [
          {
            id: 'confidentiality-commitment',
            description: 'Must commit to confidentiality',
            patterns: [/confidential/i, /maintain.*confidential/i, /protect.*information/i],
            severity: 'high'
          }
        ]
      }
    ]
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    description: 'Information Security Management System standard',
    requirements: [
      {
        id: 'iso-risk-assessment',
        description: 'Risk assessment and treatment requirements',
        keywords: ['risk assessment', 'information security', 'security.*policy'],
        clauseTypes: ['liability', 'warranty'],
        riskThreshold: 'medium',
        checks: [
          {
            id: 'risk-management',
            description: 'Risk management processes must be referenced',
            patterns: [/risk.*assess/i, /information.*security/i, /security.*policy/i],
            severity: 'medium'
          }
        ]
      },
      {
        id: 'iso-access-control',
        description: 'Access control requirements',
        keywords: ['access control', 'authentication', 'authorization', 'identity'],
        clauseTypes: ['confidentiality'],
        riskThreshold: 'medium',
        checks: [
          {
            id: 'access-provisions',
            description: 'Must include access control provisions',
            patterns: [/access.*control/i, /authentication/i, /authorize/i],
            severity: 'medium'
          }
        ]
      },
      {
        id: 'iso-incident',
        description: 'Incident management requirements',
        keywords: ['security incident', 'incident response', 'breach.*report'],
        clauseTypes: ['liability', 'confidentiality'],
        riskThreshold: 'high',
        checks: [
          {
            id: 'incident-response',
            description: 'Must include incident response provisions',
            patterns: [/incident.*response/i, /security.*incident/i, /breach.*report/i],
            severity: 'high'
          }
        ]
      }
    ]
  },
  {
    id: 'ccpa',
    name: 'CCPA',
    description: 'California Consumer Privacy Act - California privacy rights',
    requirements: [
      {
        id: 'ccpa-consumer-rights',
        description: 'Consumer rights must be respected',
        keywords: ['consumer', 'personal information', 'right to delete', 'opt-out'],
        clauseTypes: ['confidentiality'],
        riskThreshold: 'high',
        checks: [
          {
            id: 'consumer-rights',
            description: 'Must include consumer rights provisions',
            patterns: [/right.*delete/i, /opt.*out/i, /do.*not.*sell/i, /consumer.*right/i],
            severity: 'high'
          }
        ]
      },
      {
        id: 'ccpa-disclosure',
        description: 'Privacy disclosure requirements',
        keywords: ['privacy policy', 'collect.*information', 'share.*data'],
        clauseTypes: ['confidentiality', 'entire_agreement'],
        riskThreshold: 'medium',
        checks: [
          {
            id: 'disclosure-complete',
            description: 'Must include complete privacy disclosures',
            patterns: [/privacy.*policy/i, /collect.*information/i, /share.*data/i],
            severity: 'medium'
          }
        ]
      }
    ]
  },
  {
    id: 'hipaa',
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act - Healthcare data protection',
    requirements: [
      {
        id: 'hipaa-phi',
        description: 'Protected Health Information (PHI) safeguards',
        keywords: ['protected health', 'phi', 'medical', 'health information'],
        clauseTypes: ['confidentiality', 'liability'],
        riskThreshold: 'critical',
        checks: [
          {
            id: 'phi-protections',
            description: 'Must include PHI protection provisions',
            patterns: [/protected.*health/i, /phi/i, /medical.*information/i, /hipaa/i],
            severity: 'critical'
          }
        ]
      },
      {
        id: 'hipaa-baa',
        description: 'Business Associate Agreement requirements',
        keywords: ['business associate', 'baa', 'subcontractor', 'third party'],
        clauseTypes: ['confidentiality', 'indemnification'],
        riskThreshold: 'high',
        checks: [
          {
            id: 'baa-required',
            description: 'If handling PHI, must include BAA',
            patterns: [/business associate/i, /baa/i, /subcontract.*phi/i],
            severity: 'high'
          }
        ]
      }
    ]
  }
];

/**
 * Map clauses to compliance frameworks
 */
export async function mapToComplianceFrameworks(
  clauses: IClause[],
  frameworks: string[] = ['GDPR', 'SOC2', 'ISO27001']
): Promise<ComplianceMappingResult[]> {
  logger.info('Starting compliance mapping', { clauseCount: clauses.length, frameworks });

  const results: ComplianceMappingResult[] = [];

  for (const frameworkName of frameworks) {
    const framework = COMPLIANCE_FRAMEWORKS.find(
      f => f.name.toLowerCase() === frameworkName.toLowerCase() ||
           f.id.toLowerCase() === frameworkName.toLowerCase()
    );

    if (!framework) {
      logger.warn('Unknown compliance framework', { frameworkName });
      continue;
    }

    const result = analyzeFrameworkCompliance(framework, clauses);
    results.push(result);
  }

  logger.info('Compliance mapping completed', {
    frameworksAnalyzed: results.length,
    compliantCount: results.filter(r => r.overallStatus === 'compliant').length
  });

  return results;
}

/**
 * Analyze compliance for a specific framework
 */
function analyzeFrameworkCompliance(
  framework: ComplianceFramework,
  clauses: IClause[]
): ComplianceMappingResult {
  const issues: ComplianceIssue[] = [];
  const compliantClauses: IClause[] = [];
  const nonCompliantClauses: IClause[] = [];
  const applicableClauses = findApplicableClauses(framework, clauses);

  for (const requirement of framework.requirements) {
    const requirementClauses = findRequirementClauses(requirement, applicableClauses);

    if (requirementClauses.length === 0 && requirement.riskThreshold !== 'low') {
      // Missing required provision
      issues.push({
        clauseId: '',
        clauseTitle: requirement.id,
        requirement: requirement.description,
        issue: `Missing ${framework.name} requirement: ${requirement.description}`,
        severity: requirement.riskThreshold === 'high' ? 'high' :
                  requirement.riskThreshold === 'medium' ? 'medium' : 'low',
        recommendation: `Add provision addressing: ${requirement.description}`
      });
      continue;
    }

    // Check each clause against requirements
    for (const clause of requirementClauses) {
      const clauseIssues = checkClauseCompliance(clause, requirement);

      if (clauseIssues.length > 0) {
        nonCompliantClauses.push(clause);
        issues.push(...clauseIssues);
      } else {
        compliantClauses.push(clause);
      }
    }
  }

  // Calculate overall status
  const totalRequirements = framework.requirements.length;
  const compliantRequirements = totalRequirements - issues.filter(i => i.severity !== 'low').length;
  const score = Math.round((compliantRequirements / totalRequirements) * 100);

  let overallStatus: ComplianceMappingResult['overallStatus'] = 'compliant';
  if (issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0) {
    overallStatus = 'non_compliant';
  } else if (issues.length > 0) {
    overallStatus = 'partial';
  }

  if (applicableClauses.length === 0) {
    overallStatus = 'not_applicable';
  }

  return {
    framework: framework.name,
    overallStatus,
    score,
    applicableClauses,
    compliantClauses,
    nonCompliantClauses,
    issues,
    recommendations: generateComplianceRecommendations(issues),
    details: `Analyzed ${applicableClauses.length} applicable clauses against ${framework.requirements.length} ${framework.name} requirements. ${compliantClauses.length} clauses are compliant. ${issues.length} issues identified.`
  };
}

/**
 * Find clauses applicable to a framework
 */
function findApplicableClauses(framework: ComplianceFramework, clauses: IClause[]): IClause[] {
  return clauses.filter(clause => {
    const clauseContent = `${clause.title} ${clause.content}`.toLowerCase();

    for (const requirement of framework.requirements) {
      // Check if clause contains any framework keywords
      for (const keyword of requirement.keywords) {
        if (clauseContent.includes(keyword.toLowerCase())) {
          return true;
        }
      }

      // Check if clause type matches requirement
      if (requirement.clauseTypes.includes(clause.type)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Find clauses relevant to a specific requirement
 */
function findRequirementClauses(requirement: ComplianceRequirement, clauses: IClause[]): IClause[] {
  return clauses.filter(clause => {
    const clauseContent = `${clause.title} ${clause.content}`.toLowerCase();

    for (const keyword of requirement.keywords) {
      if (clauseContent.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    return requirement.clauseTypes.includes(clause.type);
  });
}

/**
 * Check clause compliance against a requirement
 */
function checkClauseCompliance(clause: IClause, requirement: ComplianceRequirement): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const clauseContent = `${clause.title} ${clause.content}`.toLowerCase();

  for (const check of requirement.checks) {
    let checkPassed = false;

    for (const pattern of check.patterns) {
      if (pattern.test(clauseContent)) {
        checkPassed = true;
        break;
      }
    }

    if (!checkPassed && check.severity !== 'low') {
      issues.push({
        clauseId: clause.id,
        clauseTitle: clause.title,
        requirement: requirement.description,
        issue: check.description,
        severity: check.severity,
        recommendation: `Address: ${check.description}`
      });
    }
  }

  return issues;
}

/**
 * Generate compliance recommendations
 */
function generateComplianceRecommendations(issues: ComplianceIssue[]): string[] {
  const recommendations: string[] = [];
  const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');

  for (const issue of criticalIssues) {
    recommendations.push(issue.recommendation);
  }

  if (recommendations.length === 0) {
    recommendations.push('Document appears to meet compliance requirements. Minor improvements may be beneficial.');
  }

  return [...new Set(recommendations)].slice(0, 5);
}

/**
 * Get all supported compliance frameworks
 */
export function getSupportedFrameworks(): { id: string; name: string; description: string }[] {
  return COMPLIANCE_FRAMEWORKS.map(f => ({
    id: f.id,
    name: f.name,
    description: f.description
  }));
}

/**
 * Check compliance for specific clause type
 */
export function checkClauseComplianceByType(
  clause: IClause,
  framework: string
): { isCompliant: boolean; issues: string[] } {
  const frameworkObj = COMPLIANCE_FRAMEWORKS.find(
    f => f.name.toLowerCase() === framework.toLowerCase() ||
         f.id.toLowerCase() === framework.toLowerCase()
  );

  if (!frameworkObj) {
    return { isCompliant: true, issues: [] };
  }

  const issues: string[] = [];
  const clauseContent = `${clause.title} ${clause.content}`.toLowerCase();

  for (const requirement of frameworkObj.requirements) {
    if (!requirement.clauseTypes.includes(clause.type)) {
      continue;
    }

    for (const check of requirement.checks) {
      let checkPassed = false;
      for (const pattern of check.patterns) {
        if (pattern.test(clauseContent)) {
          checkPassed = true;
          break;
        }
      }

      if (!checkPassed) {
        issues.push(`${check.description} (${requirement.id})`);
      }
    }
  }

  return {
    isCompliant: issues.length === 0,
    issues
  };
}

export default {
  mapToComplianceFrameworks,
  getSupportedFrameworks,
  checkClauseComplianceByType,
  COMPLIANCE_FRAMEWORKS
};
