import { v4 as uuidv4 } from 'uuid';
import {
  Recommendation,
  RecommendationCategory,
  RiskAnalysis,
  OpportunityAnalysis
} from '../types';

export class RecommendationEngine {
  async generate(
    tenantId: string,
    riskAnalysis: RiskAnalysis,
    opportunities: OpportunityAnalysis
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Generate recommendations based on risks
    recommendations.push(...this.generateRiskRecommendations(riskAnalysis));

    // Generate recommendations based on opportunities
    recommendations.push(...this.generateOpportunityRecommendations(opportunities));

    // Generate cross-cutting recommendations
    recommendations.push(...this.generateCrossCuttingRecommendations(riskAnalysis, opportunities));

    // Sort by priority
    return this.sortByPriority(recommendations);
  }

  private generateRiskRecommendations(riskAnalysis: RiskAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Critical/High risk recommendations
    if (riskAnalysis.riskLevel === 'critical' || riskAnalysis.riskLevel === 'high') {
      recommendations.push({
        id: uuidv4(),
        category: 'risk_mitigation',
        priority: 'urgent',
        title: 'Executive Risk Review Required',
        description: `Current risk level is ${riskAnalysis.riskLevel} with ${riskAnalysis.risks.length} active risks identified. Immediate executive attention is required.`,
        rationale: `${riskAnalysis.overallRiskScore}/100 risk score exceeds acceptable thresholds. ${riskAnalysis.trendingRisks.length} risks are trending upward.`,
        expectedImpact: 'Reduce overall risk exposure by 30-40%',
        effort: 'medium',
        timeline: 'Within 48 hours',
        metrics: {
          riskReduction: 35
        },
        relatedRisks: riskAnalysis.risks.slice(0, 3).map(r => r.id),
        generatedAt: new Date()
      });
    }

    // Specific risk category recommendations
    for (const risk of riskAnalysis.risks) {
      const rec = this.generateRiskSpecificRecommendation(risk);
      if (rec) recommendations.push(rec);
    }

    // Trending risk recommendations
    if (riskAnalysis.trendingRisks.length > 0) {
      recommendations.push({
        id: uuidv4(),
        category: 'risk_mitigation',
        priority: 'high',
        title: 'Address Escalating Risks',
        description: `${riskAnalysis.trendingRisks.length} risks are showing increasing trends and require proactive measures.`,
        rationale: 'Early intervention on trending risks can prevent escalation to critical levels.',
        expectedImpact: 'Stabilize trending risks within 2 weeks',
        effort: 'medium',
        timeline: 'Within 2 weeks',
        metrics: {
          riskReduction: 20
        },
        relatedRisks: riskAnalysis.trendingRisks.map(r => r.id),
        generatedAt: new Date()
      });
    }

    return recommendations;
  }

  private generateRiskSpecificRecommendation(
    risk: RiskAnalysis['risks'][0]
  ): Recommendation | null {
    const categoryRecommendations: Record<string, Partial<Recommendation>> = {
      customer_churn: {
        category: 'customer_experience',
        title: 'Customer Retention Initiative',
        description: `Launch retention campaign targeting at-risk customers in ${risk.category.replace('_', ' ')} area.`,
        rationale: `Customer churn risk identified with score of ${risk.score}. Early intervention can prevent revenue loss.`,
        expectedImpact: 'Reduce churn by 15-25%',
        effort: 'medium',
        timeline: 'Within 2 weeks',
        metrics: {
          customerImpact: 20
        }
      },
      financial: {
        category: 'cost_optimization',
        title: 'Financial Health Review',
        description: `Conduct comprehensive financial review focusing on ${risk.affectedAreas.join(', ')}.`,
        rationale: 'Financial risk requires executive visibility and action planning.',
        expectedImpact: 'Identify cost savings and prevent revenue leakage',
        effort: 'low',
        timeline: 'Within 1 week',
        metrics: {
          potentialSavings: 50000
        }
      },
      operational: {
        category: 'operational',
        title: 'Operational Excellence Program',
        description: `Implement process improvements in ${risk.affectedAreas.join(', ')} areas.`,
        rationale: 'Operational risks affect efficiency and customer experience.',
        expectedImpact: 'Improve operational efficiency by 10-15%',
        effort: 'high',
        timeline: 'Within 1 month',
        metrics: {
          efficiencyGain: 15
        }
      },
      compliance: {
        category: 'risk_mitigation',
        title: 'Compliance Remediation',
        description: `Address compliance issues in ${risk.affectedAreas.join(', ')}. Engage legal and compliance teams.`,
        rationale: 'Compliance breaches can result in penalties and reputational damage.',
        expectedImpact: 'Resolve compliance gaps and prevent penalties',
        effort: 'high',
        timeline: 'Within 1 week',
        metrics: {
          riskReduction: 40
        }
      },
      product: {
        category: 'customer_experience',
        title: 'Product Quality Initiative',
        description: `Address product issues affecting ${risk.affectedAreas.join(', ')}. Prioritize bug fixes and quality improvements.`,
        rationale: 'Product issues directly impact customer satisfaction and retention.',
        expectedImpact: 'Improve product satisfaction scores by 20%',
        effort: 'medium',
        timeline: 'Within 2 weeks',
        metrics: {
          customerImpact: 25
        }
      },
      supply_chain: {
        category: 'operational',
        title: 'Supply Chain Resilience',
        description: `Strengthen supply chain in ${risk.affectedAreas.join(', ')}. Identify backup suppliers and diversify sources.`,
        rationale: 'Supply chain disruptions can halt operations and impact delivery commitments.',
        expectedImpact: 'Reduce supply chain risk exposure by 30%',
        effort: 'high',
        timeline: 'Within 1 month',
        metrics: {
          riskReduction: 30
        }
      }
    };

    const baseRec = categoryRecommendations[risk.category];
    if (!baseRec) return null;

    return {
      id: uuidv4(),
      category: baseRec.category as RecommendationCategory,
      priority: risk.severity === 'critical' ? 'urgent' : risk.severity === 'high' ? 'high' : 'medium',
      title: baseRec.title!,
      description: baseRec.description!,
      rationale: baseRec.rationale!,
      expectedImpact: baseRec.expectedImpact!,
      effort: baseRec.effort as 'low' | 'medium' | 'high',
      timeline: baseRec.timeline!,
      metrics: baseRec.metrics || {},
      relatedRisks: [risk.id],
      generatedAt: new Date()
    };
  }

  private generateOpportunityRecommendations(
    opportunities: OpportunityAnalysis
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Top opportunity recommendation
    if (opportunities.topPriority.length > 0) {
      const topOpp = opportunities.topPriority[0];
      recommendations.push({
        id: uuidv4(),
        category: 'revenue',
        priority: 'high',
        title: `Pursue: ${topOpp.title}`,
        description: topOpp.description,
        rationale: `Highest value opportunity with ${topOpp.confidence * 100}% confidence. Potential value: $${topOpp.potentialValue.toLocaleString()}.`,
        expectedImpact: `$${topOpp.potentialValue.toLocaleString()} potential revenue/savings`,
        effort: topOpp.estimatedEffort,
        timeline: `Implementation within ${topOpp.timeline.replace('_', ' ')}`,
        metrics: {
          potentialRevenue: topOpp.type.includes('revenue') || topOpp.type.includes('expansion') ? topOpp.potentialValue : undefined,
          potentialSavings: topOpp.type.includes('savings') || topOpp.type.includes('efficiency') ? topOpp.potentialValue : undefined
        },
        relatedOpportunities: [topOpp.id],
        generatedAt: new Date()
      });
    }

    // Quick wins from low-effort opportunities
    const quickWins = opportunities.opportunities.filter(
      o => o.estimatedEffort === 'low' && o.confidence > 0.7
    );

    if (quickWins.length > 0) {
      recommendations.push({
        id: uuidv4(),
        category: 'revenue',
        priority: 'medium',
        title: 'Implement Quick Wins',
        description: `${quickWins.length} high-confidence, low-effort opportunities available. Total potential: $${quickWins.reduce((sum, o) => sum + o.potentialValue, 0).toLocaleString()}.`,
        rationale: 'Quick wins provide immediate value with minimal resource investment.',
        expectedImpact: `$${quickWins.reduce((sum, o) => sum + o.potentialValue, 0).toLocaleString()} with minimal effort`,
        effort: 'low',
        timeline: 'Implementation within 1 week',
        metrics: {
          potentialRevenue: quickWins.filter(o => o.type.includes('revenue')).reduce((sum, o) => sum + o.potentialValue, 0),
          potentialSavings: quickWins.filter(o => o.type.includes('savings')).reduce((sum, o) => sum + o.potentialValue, 0)
        },
        relatedOpportunities: quickWins.map(o => o.id),
        generatedAt: new Date()
      });
    }

    // Strategic expansion recommendation
    const strategicOpps = opportunities.opportunities.filter(
      o => o.type.includes('expansion') || o.type.includes('market')
    );

    if (strategicOpps.length > 0) {
      recommendations.push({
        id: uuidv4(),
        category: 'strategic',
        priority: 'medium',
        title: 'Strategic Growth Initiative',
        description: `${strategicOpps.length} expansion opportunities identified. Consider for next quarter planning.`,
        rationale: 'Strategic opportunities require longer lead time but offer significant growth potential.',
        expectedImpact: `$${strategicOpps.reduce((sum, o) => sum + o.potentialValue, 0).toLocaleString()} potential over next 12 months`,
        effort: 'high',
        timeline: 'Planning phase within 2 weeks, execution over 3-6 months',
        metrics: {
          potentialRevenue: strategicOpps.reduce((sum, o) => sum + o.potentialValue, 0)
        },
        relatedOpportunities: strategicOpps.map(o => o.id),
        generatedAt: new Date()
      });
    }

    return recommendations;
  }

  private generateCrossCuttingRecommendations(
    riskAnalysis: RiskAnalysis,
    opportunities: OpportunityAnalysis
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Balance risk and opportunity
    if (riskAnalysis.riskLevel === 'low' && opportunities.totalOpportunities > 3) {
      recommendations.push({
        id: uuidv4(),
        category: 'strategic',
        priority: 'high',
        title: 'Growth Mode: Capitalize on Low Risk Environment',
        description: 'Current risk profile is favorable. This is an ideal time to aggressively pursue growth opportunities.',
        rationale: 'Low risk environment allows focus on value creation without distraction.',
        expectedImpact: 'Maximize growth potential while maintaining acceptable risk levels',
        effort: 'medium',
        timeline: 'Initiate within 2 weeks',
        metrics: {
          potentialRevenue: opportunities.topPriority.slice(0, 3).reduce((sum, o) => sum + o.potentialValue, 0)
        },
        generatedAt: new Date()
      });
    }

    // Resource allocation recommendation
    const totalOpportunityValue = opportunities.opportunities.reduce(
      (sum, o) => sum + o.potentialValue,
      0
    );
    const highEffortCount = opportunities.opportunities.filter(o => o.effort === 'high').length;
    const lowEffortCount = opportunities.opportunities.filter(o => o.effort === 'low').length;

    if (highEffortCount > lowEffortCount) {
      recommendations.push({
        id: uuidv4(),
        category: 'strategic',
        priority: 'medium',
        title: 'Optimize Initiative Portfolio',
        description: 'Consider prioritizing lower-effort initiatives to demonstrate quick wins before committing to high-effort projects.',
        rationale: 'Balance between quick value delivery and strategic investments improves stakeholder confidence.',
        expectedImpact: 'Build momentum with early wins while planning larger initiatives',
        effort: 'low',
        timeline: 'Review and reprioritize within 1 week',
        metrics: {
          efficiencyGain: 20
        },
        generatedAt: new Date()
      });
    }

    return recommendations;
  }

  private sortByPriority(recommendations: Recommendation[]): Recommendation[] {
    const priorityOrder: Record<string, number> = {
      urgent: 1,
      high: 2,
      medium: 3,
      low: 4
    };

    return recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.generatedAt.getTime() - b.generatedAt.getTime();
    });
  }
}
