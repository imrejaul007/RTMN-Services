// Trust Recommendation Service - Generate trust improvement recommendations

import { v4 as uuidv4 } from "uuid";
import {
  TrustRecommendation,
  TrustScore,
  TrustLevel,
  TrustFactorType,
  TrustFactor,
  PaginationParams,
  PaginatedResponse
} from "../types";

/**
 * Recommendation templates for different trust gaps
 */
interface RecommendationTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  estimatedScoreGain: number;
  steps: string[];
  estimatedTime: string;
  requiredFactors: TrustFactorType[];
  priority: number;
}

/**
 * Recommendation templates
 */
const RECOMMENDATION_TEMPLATES: RecommendationTemplate[] = [
  // Identity Verification Recommendations
  {
    id: "rec-id-001",
    category: "Identity",
    title: "Complete Identity Verification",
    description: "Verify your identity to increase trust score",
    impact: "HIGH",
    estimatedScoreGain: 15,
    steps: [
      "Submit government-issued ID document",
      "Provide proof of address",
      "Complete biometric verification",
      "Wait for verification approval"
    ],
    estimatedTime: "1-2 days",
    requiredFactors: [TrustFactorType.IDENTITY_VERIFICATION],
    priority: 1
  },
  {
    id: "rec-id-002",
    category: "Identity",
    title: "Enhance Verification Depth",
    description: "Add additional verification methods for deeper trust",
    impact: "MEDIUM",
    estimatedScoreGain: 8,
    steps: [
      "Enable two-factor authentication",
      "Add phone number verification",
      "Link social media accounts",
      "Complete video verification"
    ],
    estimatedTime: "2-3 days",
    requiredFactors: [TrustFactorType.VERIFICATION_DEPTH],
    priority: 2
  },
  {
    id: "rec-id-003",
    category: "Identity",
    title: "Maintain Identity Stability",
    description: "Keep your identity information consistent over time",
    impact: "MEDIUM",
    estimatedScoreGain: 5,
    steps: [
      "Avoid frequent changes to profile information",
      "Use consistent contact methods",
      "Maintain account activity regularly"
    ],
    estimatedTime: "Ongoing",
    requiredFactors: [TrustFactorType.IDENTITY_STABILITY],
    priority: 3
  },

  // Transaction History Recommendations
  {
    id: "rec-tx-001",
    category: "Transactions",
    title: "Build Transaction History",
    description: "Complete more transactions to establish history",
    impact: "HIGH",
    estimatedScoreGain: 12,
    steps: [
      "Start with small transactions",
      "Complete transactions on time",
      "Maintain consistent transaction patterns",
      "Gradually increase transaction values"
    ],
    estimatedTime: "30-60 days",
    requiredFactors: [TrustFactorType.TRANSACTION_HISTORY],
    priority: 1
  },
  {
    id: "rec-tx-002",
    category: "Transactions",
    title: "Diversify Transaction Types",
    description: "Engage in various transaction types to show versatility",
    impact: "MEDIUM",
    estimatedScoreGain: 6,
    steps: [
      "Try different service categories",
      "Work with multiple counterparties",
      "Vary transaction amounts"
    ],
    estimatedTime: "14-30 days",
    requiredFactors: [TrustFactorType.TRANSACTION_HISTORY],
    priority: 2
  },

  // Contract Compliance Recommendations
  {
    id: "rec-cc-001",
    category: "Compliance",
    title: "Improve Contract Completion Rate",
    description: "Focus on completing all contracts on time",
    impact: "HIGH",
    estimatedScoreGain: 10,
    steps: [
      "Review contract terms carefully before accepting",
      "Set reminders for important deadlines",
      "Communicate early if issues arise",
      "Request extensions proactively"
    ],
    estimatedTime: "30-60 days",
    requiredFactors: [TrustFactorType.CONTRACT_COMPLIANCE],
    priority: 1
  },
  {
    id: "rec-cc-002",
    category: "Compliance",
    title: "Build Compliance Track Record",
    description: "Maintain a perfect compliance record",
    impact: "MEDIUM",
    estimatedScoreGain: 8,
    steps: [
      "Always deliver on commitments",
      "Document all contract completions",
      "Seek feedback from contract partners"
    ],
    estimatedTime: "60-90 days",
    requiredFactors: [TrustFactorType.CONTRACT_COMPLIANCE],
    priority: 2
  },

  // Network Reputation Recommendations
  {
    id: "rec-nr-001",
    category: "Network",
    title: "Build Network Reputation",
    description: "Get positive reviews and endorsements from network members",
    impact: "HIGH",
    estimatedScoreGain: 10,
    steps: [
      "Request reviews after successful transactions",
      "Respond professionally to all feedback",
      "Build relationships with trusted network members",
      "Participate in network activities"
    ],
    estimatedTime: "30-60 days",
    requiredFactors: [TrustFactorType.NETWORK_REPUTATION],
    priority: 1
  },
  {
    id: "rec-nr-002",
    category: "Network",
    title: "Expand Network Connections",
    description: "Connect with more verified network members",
    impact: "MEDIUM",
    estimatedScoreGain: 5,
    steps: [
      "Join relevant network groups",
      "Attend network events",
      "Engage with other members",
      "Build quality connections over quantity"
    ],
    estimatedTime: "14-30 days",
    requiredFactors: [TrustFactorType.NETWORK_CONNECTIONS],
    priority: 2
  },

  // Agent Performance Recommendations
  {
    id: "rec-ap-001",
    category: "Performance",
    title: "Improve Agent Performance",
    description: "Enhance your agent's performance metrics",
    impact: "HIGH",
    estimatedScoreGain: 8,
    steps: [
      "Monitor performance dashboards",
      "Identify performance bottlenecks",
      "Optimize agent response times",
      "Implement performance best practices"
    ],
    estimatedTime: "7-14 days",
    requiredFactors: [TrustFactorType.AGENT_PERFORMANCE],
    priority: 1
  },

  // Historical Behavior Recommendations
  {
    id: "rec-hb-001",
    category: "Behavior",
    title: "Maintain Positive Behavior",
    description: "Continue positive interactions to build behavioral trust",
    impact: "MEDIUM",
    estimatedScoreGain: 5,
    steps: [
      "Avoid disputes and conflicts",
      "Communicate transparently",
      "Honor all commitments",
      "Provide excellent service quality"
    ],
    estimatedTime: "Ongoing",
    requiredFactors: [TrustFactorType.HISTORICAL_BEHAVIOR],
    priority: 2
  },

  // Response Rate Recommendations
  {
    id: "rec-rr-001",
    category: "Communication",
    title: "Improve Response Rate",
    description: "Respond to requests more quickly",
    impact: "LOW",
    estimatedScoreGain: 3,
    steps: [
      "Enable notifications",
      "Set response time goals",
      "Use automated responses for common queries",
      "Review and respond to messages promptly"
    ],
    estimatedTime: "7-14 days",
    requiredFactors: [TrustFactorType.RESPONSE_RATE],
    priority: 3
  },

  // General Recommendations
  {
    id: "rec-gen-001",
    category: "General",
    title: "Achieve Premium Trust Level",
    description: "Work towards the highest trust level",
    impact: "HIGH",
    estimatedScoreGain: 20,
    steps: [
      "Focus on all trust factors systematically",
      "Maintain consistency over time",
      "Avoid any negative incidents",
      "Build strong network relationships"
    ],
    estimatedTime: "90-180 days",
    requiredFactors: [],
    priority: 1
  },
  {
    id: "rec-gen-002",
    category: "General",
    title: "Recover from Low Trust",
    description: "Rebuild trust after negative incidents",
    impact: "HIGH",
    estimatedScoreGain: 15,
    steps: [
      "Acknowledge any past issues",
      "Focus on consistent positive behavior",
      "Communicate proactively with network",
      "Request verification of improvements"
    ],
    estimatedTime: "60-120 days",
    requiredFactors: [],
    priority: 1
  }
];

/**
 * In-memory recommendation storage
 */
const recommendationStore: Map<string, TrustRecommendation[]> = new Map();

/**
 * Trust Recommendation Service class
 */
export class TrustRecommendationService {
  /**
   * Generate recommendations based on trust score
   */
  generateRecommendations(entityId: string, score: TrustScore): TrustRecommendation[] {
    const recommendations: TrustRecommendation[] = [];

    // Analyze factors and generate recommendations
    for (const factor of score.factors) {
      if (factor.score < 70) {
        const relevantTemplates = RECOMMENDATION_TEMPLATES.filter(t =>
          t.requiredFactors.includes(factor.type)
        );

        for (const template of relevantTemplates) {
          const existing = recommendations.find(r => r.title === template.title);
          if (!existing) {
            recommendations.push(this.createRecommendation(entityId, template, factor));
          }
        }
      }
    }

    // Add level-based recommendations
    if (score.level === TrustLevel.UNTRUSTED || score.level === TrustLevel.LOW) {
      const recoveryTemplate = RECOMMENDATION_TEMPLATES.find(t => t.id === "rec-gen-002");
      if (recoveryTemplate) {
        recommendations.push(this.createRecommendation(entityId, recoveryTemplate));
      }
    }

    // Add premium goal recommendation
    if (score.level !== TrustLevel.PREMIUM) {
      const premiumTemplate = RECOMMENDATION_TEMPLATES.find(t => t.id === "rec-gen-001");
      if (premiumTemplate) {
        recommendations.push(this.createRecommendation(entityId, premiumTemplate));
      }
    }

    // Sort by priority and impact
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });

    // Store recommendations
    recommendationStore.set(entityId, recommendations);

    return recommendations;
  }

  /**
   * Get recommendations for an entity
   */
  getRecommendations(entityId: string): TrustRecommendation[] {
    return recommendationStore.get(entityId) || [];
  }

  /**
   * Get paginated recommendations
   */
  getPaginatedRecommendations(
    entityId: string,
    pagination: PaginationParams
  ): PaginatedResponse<TrustRecommendation> {
    const recommendations = this.getRecommendations(entityId);
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;

    return {
      items: recommendations.slice(start, end),
      total: recommendations.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(recommendations.length / pagination.limit),
      hasMore: end < recommendations.length
    };
  }

  /**
   * Get recommendations by category
   */
  getRecommendationsByCategory(entityId: string, category: string): TrustRecommendation[] {
    return this.getRecommendations(entityId).filter(r => r.category === category);
  }

  /**
   * Get recommendations by impact
   */
  getRecommendationsByImpact(entityId: string, impact: "HIGH" | "MEDIUM" | "LOW"): TrustRecommendation[] {
    return this.getRecommendations(entityId).filter(r => r.impact === impact);
  }

  /**
   * Get high-priority recommendations
   */
  getHighPriorityRecommendations(entityId: string): TrustRecommendation[] {
    return this.getRecommendations(entityId).filter(r => r.priority <= 2);
  }

  /**
   * Mark recommendation as completed
   */
  completeRecommendation(entityId: string, recommendationId: string): TrustRecommendation | null {
    const recommendations = recommendationStore.get(entityId) || [];
    const index = recommendations.findIndex(r => r.id === recommendationId);

    if (index === -1) return null;

    recommendations[index].completed = true;
    recommendations[index].completedAt = new Date().toISOString();
    recommendationStore.set(entityId, recommendations);

    return recommendations[index];
  }

  /**
   * Get completion statistics
   */
  getCompletionStatistics(entityId: string): {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
    estimatedTotalScoreGain: number;
    achievedScoreGain: number;
  } {
    const recommendations = this.getRecommendations(entityId);

    if (recommendations.length === 0) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0,
        estimatedTotalScoreGain: 0,
        achievedScoreGain: 0
      };
    }

    const completed = recommendations.filter(r => r.completed);
    const pending = recommendations.filter(r => !r.completed);

    const estimatedTotalScoreGain = recommendations.reduce((sum, r) => sum + r.estimatedScoreGain, 0);
    const achievedScoreGain = completed.reduce((sum, r) => sum + r.estimatedScoreGain, 0);

    return {
      total: recommendations.length,
      completed: completed.length,
      pending: pending.length,
      completionRate: (completed.length / recommendations.length) * 100,
      estimatedTotalScoreGain,
      achievedScoreGain
    };
  }

  /**
   * Calculate potential score improvement
   */
  calculatePotentialImprovement(entityId: string): {
    maxPotentialGain: number;
    highImpactGain: number;
    mediumImpactGain: number;
    lowImpactGain: number;
    quickWins: TrustRecommendation[];
  } {
    const recommendations = this.getRecommendations(entityId);

    let highImpactGain = 0;
    let mediumImpactGain = 0;
    let lowImpactGain = 0;
    const quickWins: TrustRecommendation[] = [];

    for (const rec of recommendations) {
      switch (rec.impact) {
        case "HIGH":
          highImpactGain += rec.estimatedScoreGain;
          break;
        case "MEDIUM":
          mediumImpactGain += rec.estimatedScoreGain;
          break;
        case "LOW":
          lowImpactGain += rec.estimatedScoreGain;
          break;
      }

      // Quick wins are recommendations that can be completed in less than 7 days
      if (rec.estimatedTime.includes("1-") || rec.estimatedTime.includes("2-") || rec.estimatedTime === "7-14 days") {
        quickWins.push(rec);
      }
    }

    return {
      maxPotentialGain: highImpactGain + mediumImpactGain + lowImpactGain,
      highImpactGain,
      mediumImpactGain,
      lowImpactGain,
      quickWins
    };
  }

  /**
   * Get recommendation templates
   */
  getTemplates(): RecommendationTemplate[] {
    return [...RECOMMENDATION_TEMPLATES];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): RecommendationTemplate[] {
    return RECOMMENDATION_TEMPLATES.filter(t => t.category === category);
  }

  /**
   * Get templates by factor
   */
  getTemplatesByFactor(factorType: TrustFactorType): RecommendationTemplate[] {
    return RECOMMENDATION_TEMPLATES.filter(t => t.requiredFactors.includes(factorType));
  }

  /**
   * Delete recommendations for an entity
   */
  deleteRecommendations(entityId: string): boolean {
    return recommendationStore.delete(entityId);
  }

  /**
   * Export recommendations
   */
  exportRecommendations(entityId: string): string {
    return JSON.stringify(this.getRecommendations(entityId), null, 2);
  }

  /**
   * Create recommendation from template
   */
  private createRecommendation(
    entityId: string,
    template: RecommendationTemplate,
    relatedFactor?: TrustFactor
  ): TrustRecommendation {
    // Adjust estimated gain based on current factor score
    let estimatedScoreGain = template.estimatedScoreGain;
    if (relatedFactor) {
      // Reduce potential gain if already at moderate score
      if (relatedFactor.score > 50) {
        estimatedScoreGain = Math.round(estimatedScoreGain * 0.7);
      }
    }

    return {
      id: uuidv4(),
      priority: template.priority,
      category: template.category,
      title: template.title,
      description: template.description,
      impact: template.impact,
      estimatedScoreGain,
      steps: [...template.steps],
      estimatedTime: template.estimatedTime,
      requiredFactors: [...template.requiredFactors],
      completed: false
    };
  }

  /**
   * Get recommendation roadmap
   */
  getRoadmap(entityId: string): {
    phase1: TrustRecommendation[];
    phase2: TrustRecommendation[];
    phase3: TrustRecommendation[];
    totalEstimatedTime: string;
  } {
    const recommendations = this.getRecommendations(entityId);

    const phase1: TrustRecommendation[] = [];
    const phase2: TrustRecommendation[] = [];
    const phase3: TrustRecommendation[] = [];

    for (const rec of recommendations) {
      if (rec.priority === 1) {
        phase1.push(rec);
      } else if (rec.priority === 2) {
        phase2.push(rec);
      } else {
        phase3.push(rec);
      }
    }

    // Estimate total time (simplified)
    const timeRanges: Record<string, number> = {
      "1-2 days": 2,
      "2-3 days": 3,
      "7-14 days": 14,
      "14-30 days": 30,
      "30-60 days": 60,
      "60-90 days": 90,
      "90-180 days": 180,
      "Ongoing": 30
    };

    let maxTime = 0;
    for (const rec of recommendations) {
      const time = timeRanges[rec.estimatedTime] || 30;
      maxTime = Math.max(maxTime, time);
    }

    return {
      phase1,
      phase2,
      phase3,
      totalEstimatedTime: `Up to ${maxTime} days`
    };
  }
}

export default TrustRecommendationService;
