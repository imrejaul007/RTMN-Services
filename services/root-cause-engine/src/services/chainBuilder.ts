import { v4 as uuidv4 } from 'uuid';
import { CausalChain, CausalNode, ChainLevel, ConfidenceLevel, ComplaintData } from '../types';
import { CausalChainModel } from '../models';

interface ChainDefinition {
  symptoms: string[];
  issues: string[];
  causes: string[];
  rootCauses: string[];
}

const CAUSAL_TEMPLATES: Record<string, ChainDefinition> = {
  delivery: {
    symptoms: ['late delivery', 'missing package', 'wrong address'],
    issues: ['routing error', 'driver shortage', 'weather delay'],
    causes: ['insufficient logistics capacity', 'poor route planning', 'vendor issues'],
    rootCauses: ['inadequate infrastructure', 'budget constraints', 'vendor management failure']
  },
  quality: {
    symptoms: ['product damaged', 'service incomplete', 'quality below standard'],
    issues: ['supplier failure', 'process deviation', 'training gaps'],
    causes: ['vendor quality issues', 'unclear standards', 'inadequate QA'],
    rootCauses: ['vendor selection criteria', 'process design flaw', 'resource allocation']
  },
  service: {
    symptoms: ['long wait time', 'no response', 'repeated contacts'],
    issues: ['understaffing', 'knowledge gaps', 'system limitations'],
    causes: ['hiring freeze', 'training budget cut', 'tool deficiencies'],
    rootCauses: ['strategic planning', 'HR policies', 'technology investment']
  },
  billing: {
    symptoms: ['overcharge', 'duplicate charge', 'incorrect amount'],
    issues: ['system error', 'manual entry error', 'pricing update delay'],
    causes: ['software bug', 'process gaps', 'data sync failure'],
    rootCauses: ['system architecture', 'validation rules', 'change management']
  },
  communication: {
    symptoms: ['no update', 'conflicting info', 'unclear response'],
    issues: ['information silos', 'update delays', 'channel fragmentation'],
    causes: ['lack of coordination', 'process gaps', 'tool limitations'],
    rootCauses: ['organizational structure', 'process design', 'technology stack']
  }
};

export class ChainBuilder {
  async buildChain(
    analysisId: string,
    tenantId: string,
    complaints: ComplaintData[],
    depth: number = 3
  ): Promise<CausalChain> {
    const causalChainId = uuidv4();

    // Detect the primary issue category
    const category = this.detectCategory(complaints);
    const template = CAUSAL_TEMPLATES[category] || CAUSAL_TEMPLATES.service;

    // Build the causal chain
    const nodes = this.buildNodes(complaints, template, depth);

    // Calculate chain strength based on evidence
    const chainStrength = this.calculateChainStrength(nodes, complaints);

    // Identify primary root cause
    const rootCauseNode = nodes.find(n => n.level === 'root_cause');
    const primaryRootCause = rootCauseNode?.title || 'Unknown root cause';

    // Create and save the causal chain
    const causalChain = new CausalChainModel({
      causalChainId,
      analysisId,
      tenantId,
      nodes,
      chainStrength,
      primaryRootCause
    });

    await causalChain.save();

    return {
      id: causalChainId,
      analysisId,
      tenantId,
      nodes,
      chainStrength,
      primaryRootCause,
      createdAt: causalChain.createdAt,
      updatedAt: causalChain.updatedAt
    };
  }

  private detectCategory(complaints: ComplaintData[]): string {
    const categoryKeywords: Record<string, string[]> = {
      delivery: ['delivery', 'shipping', 'transit', 'arrival', 'courier', 'package'],
      quality: ['quality', 'damaged', 'broken', 'defective', 'substandard'],
      service: ['service', 'wait', 'staff', 'support', 'help', 'response'],
      billing: ['billing', 'charge', 'payment', 'price', 'cost', 'invoice'],
      communication: ['communication', 'update', 'info', 'information', 'notify']
    };

    const categoryCounts: Record<string, number> = {};

    complaints.forEach(complaint => {
      const text = `${complaint.title} ${complaint.description}`.toLowerCase();

      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        const matchCount = keywords.filter(k => text.includes(k)).length;
        categoryCounts[category] = (categoryCounts[category] || 0) + matchCount;
      });
    });

    return Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'service';
  }

  private buildNodes(
    complaints: ComplaintData[],
    template: ChainDefinition,
    depth: number
  ): CausalNode[] {
    const nodes: CausalNode[] = [];
    const complaintIds = complaints.map(c => c.id || 'unknown');

    // Symptom level
    const symptoms = this.mapSymptoms(complaints, template.symptoms);
    symptoms.forEach(symptom => {
      nodes.push(this.createNode('symptom', symptom, complaintIds, 'high'));
    });

    // Issue level (if depth >= 2)
    if (depth >= 2) {
      const issues = this.deriveIssues(symptoms, template.issues);
      issues.forEach(issue => {
        nodes.push(this.createNode('issue', issue, complaintIds, 'medium'));
      });
    }

    // Cause level (if depth >= 3)
    if (depth >= 3) {
      const causes = this.deriveCauses(template.causes, complaints);
      causes.forEach(cause => {
        nodes.push(this.createNode('cause', cause, complaintIds, 'medium'));
      });
    }

    // Root cause level
    const rootCauses = this.deriveRootCauses(template.rootCauses, complaints);
    rootCauses.forEach(rootCause => {
      nodes.push(this.createNode('root_cause', rootCause, complaintIds, 'low'));
    });

    return nodes;
  }

  private mapSymptoms(complaints: ComplaintData[], possibleSymptoms: string[]): string[] {
    const symptoms: string[] = [];
    const complaintTexts = complaints.map(c => `${c.title} ${c.description}`.toLowerCase());

    possibleSymptoms.forEach(symptom => {
      const hasMatch = complaintTexts.some(text => text.includes(symptom));
      if (hasMatch) {
        symptoms.push(symptom);
      }
    });

    // If no symptoms matched, create from complaint summaries
    if (symptoms.length === 0) {
      const uniqueCategories = [...new Set(complaints.map(c => c.category))];
      uniqueCategories.forEach(cat => {
        symptoms.push(`Issue in ${cat}`);
      });
    }

    return symptoms.slice(0, 5);
  }

  private deriveIssues(symptoms: string[], possibleIssues: string[]): string[] {
    // Map symptoms to likely issues
    const issueMapping: Record<string, string[]> = {
      'late delivery': ['routing error', 'driver shortage', 'capacity constraint'],
      'no response': ['understaffing', 'system failure', 'process breakdown'],
      'wrong amount': ['system error', 'manual entry error', 'pricing issue'],
      'damaged product': ['handling issue', 'packaging failure', 'supplier problem']
    };

    const issues: string[] = [];
    symptoms.forEach(symptom => {
      const mapped = issueMapping[symptom] || possibleIssues.slice(0, 2);
      issues.push(...mapped);
    });

    return [...new Set(issues)].slice(0, 4);
  }

  private deriveCauses(possibleCauses: string[], complaints: ComplaintData[]): string[] {
    // Analyze patterns to determine causes
    const severityCounts = complaints.reduce((acc, c) => {
      acc[c.severity] = (acc[c.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const causes: string[] = [];

    // High severity issues often point to systemic causes
    if ((severityCounts.critical || 0) + (severityCounts.high || 0) > complaints.length / 2) {
      causes.push('Inadequate quality control measures');
      causes.push('Insufficient process documentation');
    }

    // Add from template
    causes.push(...possibleCauses.slice(0, 2));

    return [...new Set(causes)].slice(0, 3);
  }

  private deriveRootCauses(possibleRootCauses: string[], complaints: ComplaintData[]): string[] {
    // Determine root causes based on complaint metadata and patterns
    const rootCauses: string[] = [];

    // Analyze metadata for root cause indicators
    const hasMetadata = complaints.some(c => c.metadata && Object.keys(c.metadata).length > 0);
    if (!hasMetadata) {
      rootCauses.push('Insufficient data collection for early detection');
    }

    // Check for recurring patterns
    const complaintHashes = complaints.map(c => `${c.category}-${c.severity}`);
    const uniquePatterns = new Set(complaintHashes);
    if (uniquePatterns.size <= 2) {
      rootCauses.push('Systematic process failure requiring structural changes');
    }

    // Add from template
    rootCauses.push(...possibleRootCauses.slice(0, 2));

    return [...new Set(rootCauses)].slice(0, 2);
  }

  private createNode(
    level: ChainLevel,
    title: string,
    relatedComplaints: string[],
    confidence: ConfidenceLevel
  ): CausalNode {
    return {
      id: uuidv4(),
      level,
      title,
      description: this.generateDescription(level, title),
      confidence,
      evidence: [],
      relatedComplaints,
      factorContributions: []
    };
  }

  private generateDescription(level: ChainLevel, title: string): string {
    const descriptions: Record<ChainLevel, string> = {
      symptom: `Observed manifestation: ${title}. This is what customers experience directly.`,
      issue: `Underlying issue related to: ${title}. This contributes to the observed symptoms.`,
      cause: `Contributing cause: ${title}. This enables the issue to occur.`,
      root_cause: `Root cause identified as: ${title}. Addressing this will prevent recurrence.`
    };
    return descriptions[level];
  }

  private calculateChainStrength(nodes: CausalNode[], complaints: ComplaintData[]): number {
    // Calculate chain strength based on:
    // 1. Number of levels covered
    // 2. Evidence available
    // 3. Confidence of nodes

    const levelCoverage = new Set(nodes.map(n => n.level)).size / 4;
    const avgConfidence = nodes.reduce((sum, n) => {
      const values: Record<ConfidenceLevel, number> = { high: 1, medium: 0.7, low: 0.4 };
      return sum + values[n.confidence];
    }, 0) / nodes.length;
    const evidenceScore = complaints.length >= 5 ? 1 : complaints.length / 5;

    return Math.round((levelCoverage * 0.3 + avgConfidence * 0.5 + evidenceScore * 0.2) * 100);
  }
}
