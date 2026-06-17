import { v4 as uuidv4 } from 'uuid';
import {
  Recommendation,
  ContributingFactor,
  CausalChain,
  ImpactLevel
} from '../types';
import { RecommendationModel } from '../models';

interface RecommendationTemplate {
  title: string;
  description: string;
  priority: number;
  expectedImpact: ImpactLevel;
  estimatedCost?: number;
  implementationEffort: 'low' | 'medium' | 'high';
  timeframe: string;
  targetFactorTypes: string[];
  targetControllability?: string[];
}

const RECOMMENDATION_TEMPLATES: RecommendationTemplate[] = [
  // Process recommendations
  {
    title: 'Implement standardized process documentation',
    description: 'Create comprehensive process documentation with clear steps, checkpoints, and escalation paths.',
    priority: 8,
    expectedImpact: 'significant',
    estimatedCost: 5000,
    implementationEffort: 'medium',
    timeframe: '2-4 weeks',
    targetFactorTypes: ['process']
  },
  {
    title: 'Add process verification checkpoints',
    description: 'Introduce mandatory verification steps at critical process points to catch errors early.',
    priority: 9,
    expectedImpact: 'significant',
    estimatedCost: 3000,
    implementationEffort: 'low',
    timeframe: '1-2 weeks',
    targetFactorTypes: ['process']
  },
  {
    title: 'Streamline workflow procedures',
    description: 'Identify and eliminate bottlenecks in current workflows. Implement lean principles.',
    priority: 7,
    expectedImpact: 'moderate',
    estimatedCost: 8000,
    implementationEffort: 'high',
    timeframe: '4-8 weeks',
    targetFactorTypes: ['process']
  },

  // Technology recommendations
  {
    title: 'Upgrade system integration layer',
    description: 'Implement robust API integrations with proper error handling and retry mechanisms.',
    priority: 9,
    expectedImpact: 'significant',
    estimatedCost: 15000,
    implementationEffort: 'high',
    timeframe: '6-12 weeks',
    targetFactorTypes: ['technology']
  },
  {
    title: 'Implement data quality controls',
    description: 'Add validation rules and duplicate detection to improve data accuracy.',
    priority: 8,
    expectedImpact: 'significant',
    estimatedCost: 6000,
    implementationEffort: 'medium',
    timeframe: '3-4 weeks',
    targetFactorTypes: ['technology']
  },
  {
    title: 'Performance optimization review',
    description: 'Conduct thorough performance audit and optimize slow system components.',
    priority: 7,
    expectedImpact: 'moderate',
    estimatedCost: 10000,
    implementationEffort: 'medium',
    timeframe: '4-6 weeks',
    targetFactorTypes: ['technology']
  },

  // Human factors recommendations
  {
    title: 'Comprehensive training program',
    description: 'Develop and implement role-specific training covering processes, systems, and customer service.',
    priority: 9,
    expectedImpact: 'significant',
    estimatedCost: 12000,
    implementationEffort: 'high',
    timeframe: '4-8 weeks',
    targetFactorTypes: ['human']
  },
  {
    title: 'Cross-training initiative',
    description: 'Train staff on multiple roles to address staffing gaps and improve flexibility.',
    priority: 6,
    expectedImpact: 'moderate',
    estimatedCost: 4000,
    implementationEffort: 'medium',
    timeframe: '3-4 weeks',
    targetFactorTypes: ['human', 'resource']
  },
  {
    title: 'Implement error prevention checklists',
    description: 'Create simple checklists for common tasks to reduce human error rates.',
    priority: 8,
    expectedImpact: 'significant',
    estimatedCost: 1000,
    implementationEffort: 'low',
    timeframe: '1-2 weeks',
    targetFactorTypes: ['human']
  },

  // Resource recommendations
  {
    title: 'Inventory optimization system',
    description: 'Implement real-time inventory tracking with automated reordering triggers.',
    priority: 7,
    expectedImpact: 'significant',
    estimatedCost: 20000,
    implementationEffort: 'high',
    timeframe: '8-12 weeks',
    targetFactorTypes: ['resource']
  },
  {
    title: 'Capacity planning improvement',
    description: 'Implement demand forecasting and capacity planning to prevent resource shortages.',
    priority: 7,
    expectedImpact: 'moderate',
    estimatedCost: 8000,
    implementationEffort: 'medium',
    timeframe: '4-6 weeks',
    targetFactorTypes: ['resource']
  },

  // External recommendations
  {
    title: 'Vendor performance management',
    description: 'Establish vendor KPIs and regular performance reviews. Create backup vendor relationships.',
    priority: 8,
    expectedImpact: 'significant',
    estimatedCost: 5000,
    implementationEffort: 'medium',
    timeframe: '4-6 weeks',
    targetFactorTypes: ['external']
  },
  {
    title: 'Contingency planning program',
    description: 'Develop and test contingency plans for external disruption scenarios.',
    priority: 6,
    expectedImpact: 'moderate',
    estimatedCost: 6000,
    implementationEffort: 'medium',
    timeframe: '4-6 weeks',
    targetFactorTypes: ['external']
  },

  // Policy recommendations
  {
    title: 'Policy review and update',
    description: 'Review current policies for clarity and practicality. Update and communicate changes.',
    priority: 7,
    expectedImpact: 'significant',
    estimatedCost: 3000,
    implementationEffort: 'low',
    timeframe: '2-3 weeks',
    targetFactorTypes: ['policy']
  },
  {
    title: 'Establish clear escalation paths',
    description: 'Document and communicate clear escalation procedures for all customer-facing staff.',
    priority: 8,
    expectedImpact: 'significant',
    estimatedCost: 2000,
    implementationEffort: 'low',
    timeframe: '1-2 weeks',
    targetFactorTypes: ['policy', 'human']
  }
];

export class RecommendationGenerator {
  async generate(
    analysisId: string,
    tenantId: string,
    factors: ContributingFactor[],
    causalChain: CausalChain
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const matchedTemplates = new Set<string>();

    // Match templates to factors
    factors.forEach(factor => {
      const matchingTemplates = this.findMatchingTemplates(factor);

      matchingTemplates.forEach(template => {
        if (!matchedTemplates.has(template.title)) {
          matchedTemplates.add(template.title);

          const recommendation: Recommendation = {
            id: uuidv4(),
            analysisId,
            tenantId,
            title: template.title,
            description: template.description,
            priority: this.adjustPriority(template.priority, factor),
            expectedImpact: template.expectedImpact,
            estimatedCost: template.estimatedCost,
            estimatedSavings: this.calculateSavings(factor, template),
            roi: template.estimatedCost ? this.calculateROI(template.estimatedCost, factor) : undefined,
            implementationEffort: template.implementationEffort,
            timeframe: template.timeframe,
            relatedFactors: [factor.id],
            linkedHistoricalCases: [],
            status: 'proposed',
            createdAt: new Date()
          };

          recommendations.push(recommendation);
        } else {
          // Add factor to existing recommendation
          const existing = recommendations.find(r => r.title === template.title);
          if (existing) {
            existing.relatedFactors.push(factor.id);
            existing.priority = Math.min(existing.priority, this.adjustPriority(template.priority, factor));
          }
        }
      });
    });

    // Add root cause recommendations
    const rootCauseNodes = causalChain.nodes.filter(n => n.level === 'root_cause');
    if (rootCauseNodes.length > 0) {
      const rootCauseRec = {
        id: uuidv4(),
        analysisId,
        tenantId,
        title: 'Address root cause systematically',
        description: `Primary root cause identified: ${rootCauseNodes[0].title}. Develop comprehensive action plan targeting systemic changes.`,
        priority: 10,
        expectedImpact: 'severe' as ImpactLevel,
        estimatedCost: 25000,
        estimatedSavings: this.calculateTotalSavings(factors),
        roi: 25000 ? Math.round((this.calculateTotalSavings(factors) / 25000) * 100) : undefined,
        implementationEffort: 'high' as const,
        timeframe: '8-12 weeks',
        relatedFactors: factors.map(f => f.id),
        linkedHistoricalCases: [],
        status: 'proposed' as const,
        createdAt: new Date()
      };
      recommendations.unshift(rootCauseRec);
    }

    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    // Save recommendations
    await RecommendationModel.insertMany(recommendations.map(r => ({
      recommendationId: r.id,
      analysisId: r.analysisId,
      tenantId: r.tenantId,
      title: r.title,
      description: r.description,
      priority: r.priority,
      expectedImpact: r.expectedImpact,
      estimatedCost: r.estimatedCost,
      estimatedSavings: r.estimatedSavings,
      roi: r.roi,
      implementationEffort: r.implementationEffort,
      timeframe: r.timeframe,
      relatedFactors: r.relatedFactors,
      linkedHistoricalCases: r.linkedHistoricalCases,
      status: r.status
    })));

    return recommendations;
  }

  private findMatchingTemplates(factor: ContributingFactor): RecommendationTemplate[] {
    return RECOMMENDATION_TEMPLATES.filter(template =>
      template.targetFactorTypes.includes(factor.type) ||
      (factor.controllability === 'controllable' && template.targetControllability?.includes('controllable'))
    );
  }

  private adjustPriority(basePriority: number, factor: ContributingFactor): number {
    let adjusted = basePriority;

    // Increase priority for high-impact factors
    if (factor.impact > 75) {
      adjusted = Math.max(1, adjusted - 2);
    } else if (factor.impact > 50) {
      adjusted = Math.max(1, adjusted - 1);
    }

    // Increase priority for controllable factors (actionable)
    if (factor.controllability === 'controllable') {
      adjusted = Math.max(1, adjusted - 1);
    }

    return adjusted;
  }

  private calculateSavings(factor: ContributingFactor, template: RecommendationTemplate): number {
    // Estimate savings based on factor impact and frequency
    const baseSavings = factor.impact * factor.frequency * 100;

    // Adjust based on expected impact
    const impactMultiplier: Record<ImpactLevel, number> = {
      severe: 1.5,
      significant: 1.2,
      moderate: 1.0,
      minimal: 0.8
    };

    return Math.round(baseSavings * impactMultiplier[template.expectedImpact]);
  }

  private calculateROI(cost: number, factor: ContributingFactor): number {
    const savings = factor.impact * factor.frequency * 100;
    return Math.round((savings / cost) * 100);
  }

  private calculateTotalSavings(factors: ContributingFactor[]): number {
    return factors.reduce((sum, f) => sum + (f.impact * f.frequency * 50), 0);
  }

  async getRecommendationsByStatus(
    tenantId: string,
    status: Recommendation['status']
  ): Promise<Recommendation[]> {
    const recs = await RecommendationModel.find({ tenantId, status }).sort({ priority: 1 });
    return recs.map(r => ({
      id: r.recommendationId,
      analysisId: r.analysisId,
      tenantId: r.tenantId,
      title: r.title,
      description: r.description,
      priority: r.priority,
      expectedImpact: r.expectedImpact,
      estimatedCost: r.estimatedCost,
      estimatedSavings: r.estimatedSavings,
      roi: r.roi,
      implementationEffort: r.implementationEffort,
      timeframe: r.timeframe,
      relatedFactors: r.relatedFactors,
      linkedHistoricalCases: r.linkedHistoricalCases,
      status: r.status,
      createdAt: r.createdAt
    }));
  }

  async updateRecommendationStatus(
    recommendationId: string,
    status: Recommendation['status']
  ): Promise<Recommendation | null> {
    const rec = await RecommendationModel.findOneAndUpdate(
      { recommendationId },
      { status },
      { new: true }
    );

    if (!rec) return null;

    return {
      id: rec.recommendationId,
      analysisId: rec.analysisId,
      tenantId: rec.tenantId,
      title: rec.title,
      description: rec.description,
      priority: rec.priority,
      expectedImpact: rec.expectedImpact,
      estimatedCost: rec.estimatedCost,
      estimatedSavings: rec.estimatedSavings,
      roi: rec.roi,
      implementationEffort: rec.implementationEffort,
      timeframe: rec.timeframe,
      relatedFactors: rec.relatedFactors,
      linkedHistoricalCases: rec.linkedHistoricalCases,
      status: rec.status,
      createdAt: rec.createdAt
    };
  }

  async getRecommendationSummary(tenantId: string): Promise<{
    total: number;
    byStatus: Record<Recommendation['status'], number>;
    byEffort: Record<string, number>;
    totalEstimatedCost: number;
    totalEstimatedSavings: number;
    averageROI: number;
    topRecommendations: Recommendation[];
  }> {
    const recs = await RecommendationModel.find({ tenantId });

    const byStatus: Record<string, number> = {
      proposed: 0, approved: 0, implemented: 0, rejected: 0
    };
    const byEffort: Record<string, number> = { low: 0, medium: 0, high: 0 };

    let totalCost = 0;
    let totalSavings = 0;
    let totalROI = 0;
    let roiCount = 0;

    recs.forEach(r => {
      byStatus[r.status]++;
      byEffort[r.implementationEffort]++;
      totalCost += r.estimatedCost || 0;
      totalSavings += r.estimatedSavings || 0;
      if (r.roi) {
        totalROI += r.roi;
        roiCount++;
      }
    });

    const topRecommendations = [...recs]
      .filter(r => r.status === 'proposed')
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)
      .map(r => ({
        id: r.recommendationId,
        analysisId: r.analysisId,
        tenantId: r.tenantId,
        title: r.title,
        description: r.description,
        priority: r.priority,
        expectedImpact: r.expectedImpact,
        estimatedCost: r.estimatedCost,
        estimatedSavings: r.estimatedSavings,
        roi: r.roi,
        implementationEffort: r.implementationEffort,
        timeframe: r.timeframe,
        relatedFactors: r.relatedFactors,
        linkedHistoricalCases: r.linkedHistoricalCases,
        status: r.status,
        createdAt: r.createdAt
      }));

    return {
      total: recs.length,
      byStatus: byStatus as Record<Recommendation['status'], number>,
      byEffort,
      totalEstimatedCost: totalCost,
      totalEstimatedSavings: totalSavings,
      averageROI: roiCount > 0 ? Math.round(totalROI / roiCount) : 0,
      topRecommendations
    };
  }
}
