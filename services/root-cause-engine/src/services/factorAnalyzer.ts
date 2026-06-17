import { v4 as uuidv4 } from 'uuid';
import {
  ContributingFactor,
  FactorType,
  ControlLevel,
  ComplaintData,
  CausalChain
} from '../types';
import { Factor } from '../models';

interface FactorTemplate {
  type: FactorType;
  name: string;
  controllable: ControlLevel;
  keywords: string[];
}

const FACTOR_TEMPLATES: FactorTemplate[] = [
  // Process factors
  { type: 'process', name: 'Unclear process documentation', controllable: 'controllable', keywords: ['unclear', 'confusing', 'documentation', 'process'] },
  { type: 'process', name: 'Missing process checkpoints', controllable: 'controllable', keywords: ['checkpoint', 'verification', 'review', 'approval'] },
  { type: 'process', name: 'Inefficient workflow', controllable: 'controllable', keywords: ['workflow', 'bottleneck', 'slow', 'inefficient'] },
  { type: 'process', name: 'Lack of standardization', controllable: 'controllable', keywords: ['standard', 'consistent', 'uniform', 'procedure'] },

  // Technology factors
  { type: 'technology', name: 'System integration failure', controllable: 'controllable', keywords: ['integration', 'sync', 'connect', 'api'] },
  { type: 'technology', name: 'Outdated technology stack', controllable: 'partially_controllable', keywords: ['outdated', 'legacy', 'old system', 'upgrade'] },
  { type: 'technology', name: 'System performance issues', controllable: 'controllable', keywords: ['slow', 'performance', 'loading', 'timeout'] },
  { type: 'technology', name: 'Data quality issues', controllable: 'controllable', keywords: ['data', 'incorrect', 'missing', 'duplicate'] },

  // Human factors
  { type: 'human', name: 'Insufficient training', controllable: 'controllable', keywords: ['training', 'knowledge', 'skill', 'unfamiliar'] },
  { type: 'human', name: 'Staffing shortage', controllable: 'partially_controllable', keywords: ['shortage', 'understaff', 'busy', 'unavailable'] },
  { type: 'human', name: 'Human error', controllable: 'partially_controllable', keywords: ['error', 'mistake', 'forgot', 'accidental'] },
  { type: 'human', name: 'Poor communication', controllable: 'controllable', keywords: ['communication', 'misunderstand', 'unclear', '传达'] },

  // Resource factors
  { type: 'resource', name: 'Budget constraints', controllable: 'uncontrollable', keywords: ['budget', 'cost', 'expensive', 'afford'] },
  { type: 'resource', name: 'Insufficient inventory', controllable: 'controllable', keywords: ['stock', 'inventory', 'available', 'shortage'] },
  { type: 'resource', name: 'Capacity limitations', controllable: 'partially_controllable', keywords: ['capacity', 'limit', 'maximum', 'overflow'] },

  // External factors
  { type: 'external', name: 'Vendor/supplier issues', controllable: 'partially_controllable', keywords: ['vendor', 'supplier', 'third party', 'partner'] },
  { type: 'external', name: 'Market conditions', controllable: 'uncontrollable', keywords: ['market', 'demand', 'competition', 'economy'] },
  { type: 'external', name: 'Regulatory changes', controllable: 'uncontrollable', keywords: ['regulation', 'compliance', 'legal', 'policy'] },
  { type: 'external', name: 'Force majeure events', controllable: 'uncontrollable', keywords: ['weather', 'disaster', 'emergency', 'unforeseen'] },

  // Policy factors
  { type: 'policy', name: 'Restrictive policies', controllable: 'controllable', keywords: ['policy', 'rule', 'restriction', 'limitation'] },
  { type: 'policy', name: 'Unclear guidelines', controllable: 'controllable', keywords: ['guideline', 'directive', 'instruction', 'guidance'] },
  { type: 'policy', name: 'Lack of escalation path', controllable: 'controllable', keywords: ['escalate', 'escalation', 'escalation path', 'supervisor'] }
];

export class FactorAnalyzer {
  async analyzeFactors(
    analysisId: string,
    tenantId: string,
    complaints: ComplaintData[],
    causalChain: CausalChain
  ): Promise<ContributingFactor[]> {
    const factors: ContributingFactor[] = [];
    const detectedFactors = new Set<string>();

    // Analyze each complaint for contributing factors
    complaints.forEach(complaint => {
      const text = `${complaint.title} ${complaint.description}`.toLowerCase();
      const matchedTemplates = this.findMatchingTemplates(text);

      matchedTemplates.forEach(template => {
        if (!detectedFactors.has(template.name)) {
          detectedFactors.add(template.name);

          const factor: ContributingFactor = {
            id: uuidv4(),
            analysisId,
            tenantId,
            type: template.type,
            name: template.name,
            description: this.generateDescription(template),
            impact: this.calculateImpact(complaints, template),
            controllability: template.controllable,
            frequency: 1,
            affectedComplaints: [complaint.id || 'unknown'],
            createdAt: new Date()
          };

          factors.push(factor);
        } else {
          // Update existing factor
          const existing = factors.find(f => f.name === template.name);
          if (existing) {
            existing.frequency++;
            existing.affectedComplaints.push(complaint.id || 'unknown');
            existing.impact = this.calculateImpact(complaints, template);
          }
        }
      });
    });

    // Add root cause level factors from causal chain
    const rootCauseNodes = causalChain.nodes.filter(n => n.level === 'root_cause');
    rootCauseNodes.forEach(node => {
      if (!detectedFactors.has(node.title)) {
        detectedFactors.add(node.title);

        const factor: ContributingFactor = {
          id: uuidv4(),
          analysisId,
          tenantId,
          type: 'process',
          name: node.title,
          description: node.description,
          impact: 80,
          controllability: 'partially_controllable',
          frequency: complaints.length,
          affectedComplaints: complaints.map(c => c.id || 'unknown'),
          createdAt: new Date()
        };

        factors.push(factor);
      }
    });

    // Save all factors
    await Factor.insertMany(factors.map(f => ({
      factorId: f.id,
      analysisId: f.analysisId,
      tenantId: f.tenantId,
      type: f.type,
      name: f.name,
      description: f.description,
      impact: f.impact,
      controllability: f.controllability,
      frequency: f.frequency,
      affectedComplaints: f.affectedComplaints
    })));

    // Sort by impact
    return factors.sort((a, b) => b.impact - a.impact);
  }

  private findMatchingTemplates(text: string): FactorTemplate[] {
    return FACTOR_TEMPLATES.filter(template =>
      template.keywords.some(keyword => text.includes(keyword.toLowerCase()))
    );
  }

  private calculateImpact(complaints: ComplaintData[], template: FactorTemplate): number {
    const severityValues = { critical: 4, high: 3, medium: 2, low: 1 };
    const avgSeverity = complaints.reduce((sum, c) => sum + severityValues[c.severity], 0) / complaints.length;
    const avgUsers = complaints.reduce((sum, c) => sum + c.affectedUsers, 0) / complaints.length;

    // Impact calculation based on severity and affected users
    let impact = avgSeverity * 15 + Math.min(avgUsers / 10, 25);

    // Adjust based on controllability
    if (template.controllable === 'controllable') {
      impact *= 1.2; // Higher impact for controllable factors
    }

    return Math.min(Math.round(impact), 100);
  }

  private generateDescription(template: FactorTemplate): string {
    const descriptions: Record<FactorType, string> = {
      process: `Process-related issue: ${template.name}. Can be addressed through process improvements and standardization.`,
      technology: `Technology-related issue: ${template.name}. Can be mitigated through system upgrades or integrations.`,
      human: `Human factor issue: ${template.name}. Can be addressed through training and resource allocation.`,
      external: `External factor: ${template.name}. May require contingency planning or vendor management.`,
      resource: `Resource constraint: ${template.name}. Can be addressed through better resource planning.`,
      policy: `Policy-related issue: ${template.name}. Can be addressed through policy review and update.`
    };
    return descriptions[template.type];
  }

  async getFactorsByType(tenantId: string, type: FactorType): Promise<ContributingFactor[]> {
    const factors = await Factor.find({ tenantId, type }).sort({ impact: -1 });
    return factors.map(f => ({
      id: f.factorId,
      analysisId: f.analysisId,
      tenantId: f.tenantId,
      type: f.type,
      name: f.name,
      description: f.description,
      impact: f.impact,
      controllability: f.controllability,
      frequency: f.frequency,
      affectedComplaints: f.affectedComplaints,
      recommendations: f.recommendations,
      createdAt: f.createdAt
    }));
  }

  async getControllableFactors(tenantId: string): Promise<ContributingFactor[]> {
    const factors = await Factor.find({
      tenantId,
      controllability: 'controllable'
    }).sort({ impact: -1 });

    return factors.map(f => ({
      id: f.factorId,
      analysisId: f.analysisId,
      tenantId: f.tenantId,
      type: f.type,
      name: f.name,
      description: f.description,
      impact: f.impact,
      controllability: f.controllability,
      frequency: f.frequency,
      affectedComplaints: f.affectedComplaints,
      recommendations: f.recommendations,
      createdAt: f.createdAt
    }));
  }

  async getFactorSummary(tenantId: string): Promise<{
    total: number;
    byType: Record<FactorType, number>;
    byControllability: Record<ControlLevel, number>;
    topFactors: ContributingFactor[];
  }> {
    const factors = await Factor.find({ tenantId });

    const byType: Record<FactorType, number> = {
      process: 0, technology: 0, human: 0, external: 0, resource: 0, policy: 0
    };

    const byControllability: Record<ControlLevel, number> = {
      controllable: 0, partially_controllable: 0, uncontrollable: 0
    };

    factors.forEach(f => {
      byType[f.type]++;
      byControllability[f.controllability]++;
    });

    const topFactors = [...factors]
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 10)
      .map(f => ({
        id: f.factorId,
        analysisId: f.analysisId,
        tenantId: f.tenantId,
        type: f.type,
        name: f.name,
        description: f.description,
        impact: f.impact,
        controllability: f.controllability,
        frequency: f.frequency,
        affectedComplaints: f.affectedComplaints,
        recommendations: f.recommendations,
        createdAt: f.createdAt
      }));

    return {
      total: factors.length,
      byType,
      byControllability,
      topFactors
    };
  }
}
