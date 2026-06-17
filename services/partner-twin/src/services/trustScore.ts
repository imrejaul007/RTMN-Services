import { Partner } from '../models/Partner';
import { Performance } from '../models/Performance';
import { PartnerFinancial } from '../models/Financial';
import { SLA } from '../models/SLA';
import { Contract } from '../models/Contract';

interface TrustScoreInput {
  partnerId: string;
  tenantId: string;
}

interface TrustScoreBreakdown {
  performanceScore: number;   // 0-100
  reliabilityScore: number;   // 0-100
  financialScore: number;     // 0-100
  complianceScore: number;    // 0-100
}

interface TrustScoreResult {
  overall: number;            // 0-100
  breakdown: TrustScoreBreakdown;
  factors: {
    factor: string;
    score: number;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
    details: string;
  }[];
  recommendations: string[];
  lastUpdated: Date;
}

/**
 * Calculate comprehensive trust score for a partner
 * Combines performance, reliability, financial health, and compliance
 */
export async function calculateTrustScore(input: TrustScoreInput): Promise<TrustScoreResult> {
  const { partnerId, tenantId } = input;

  // Fetch all relevant data
  const [partner, performance, financial, sla, activeContracts] = await Promise.all([
    Partner.findOne({ partnerId, tenantId, isDeleted: false }),
    Performance.findOne({ partnerId, tenantId, isCurrent: true, isDeleted: false }),
    PartnerFinancial.findOne({ partnerId, tenantId, isDeleted: false }),
    SLA.find({ partnerId, tenantId, status: 'active', isDeleted: false }),
    Contract.countDocuments({ partnerId, tenantId, status: 'active', isDeleted: false }),
  ]);

  if (!partner) {
    throw new Error('Partner not found');
  }

  const factors: TrustScoreResult['factors'] = [];
  const recommendations: string[] = [];

  // 1. Performance Score (40% weight)
  let performanceScore = 50;
  if (performance) {
    // Base score from overall performance
    performanceScore = performance.overallScore;

    // Adjustments based on specific metrics
    if (performance.deliveryMetrics?.onTimeDeliveryRate) {
      const otd = performance.deliveryMetrics.onTimeDeliveryRate;
      if (otd >= 95) {
        performanceScore = Math.min(100, performanceScore + 5);
        factors.push({
          factor: 'On-Time Delivery Rate',
          score: otd,
          weight: 15,
          impact: 'positive',
          details: `Excellent on-time delivery: ${otd}%`,
        });
      } else if (otd < 80) {
        performanceScore = Math.max(0, performanceScore - 10);
        factors.push({
          factor: 'On-Time Delivery Rate',
          score: otd,
          weight: 15,
          impact: 'negative',
          details: `Below target on-time delivery: ${otd}%`,
        });
        recommendations.push('Improve delivery timeliness to build trust');
      }
    }

    if (performance.qualityMetrics?.qualityScore) {
      const quality = performance.qualityMetrics.qualityScore;
      if (quality >= 90) {
        performanceScore = Math.min(100, performanceScore + 3);
        factors.push({
          factor: 'Quality Score',
          score: quality,
          weight: 10,
          impact: 'positive',
          details: `High quality standards maintained: ${quality}%`,
        });
      } else if (quality < 70) {
        performanceScore = Math.max(0, performanceScore - 5);
        factors.push({
          factor: 'Quality Score',
          score: quality,
          weight: 10,
          impact: 'negative',
          details: `Quality concerns identified: ${quality}%`,
        });
        recommendations.push('Address quality issues to maintain partner status');
      }
    }

    if (performance.slaCompliance !== undefined) {
      if (performance.slaCompliance >= 98) {
        performanceScore = Math.min(100, performanceScore + 2);
        factors.push({
          factor: 'SLA Compliance',
          score: performance.slaCompliance,
          weight: 10,
          impact: 'positive',
          details: `Outstanding SLA compliance: ${performance.slaCompliance}%`,
        });
      } else if (performance.slaCompliance < 90) {
        performanceScore = Math.max(0, performanceScore - 5);
        factors.push({
          factor: 'SLA Compliance',
          score: performance.slaCompliance,
          weight: 10,
          impact: 'negative',
          details: `SLA compliance below target: ${performance.slaCompliance}%`,
        });
        recommendations.push('Meet SLA requirements to avoid penalties');
      }
    }

    // Incident impact
    const unresolvedIncidents = performance.incidents?.filter(i => !i.resolved).length || 0;
    if (unresolvedIncidents > 3) {
      performanceScore = Math.max(0, performanceScore - 10);
      factors.push({
        factor: 'Unresolved Incidents',
        score: unresolvedIncidents,
        weight: 5,
        impact: 'negative',
        details: `${unresolvedIncidents} unresolved incidents`,
      });
      recommendations.push('Resolve all open incidents promptly');
    }

    // Trend analysis
    if (performance.trend === 'improving') {
      performanceScore = Math.min(100, performanceScore + 3);
      factors.push({
        factor: 'Performance Trend',
        score: 100,
        weight: 5,
        impact: 'positive',
        details: 'Performance is consistently improving',
      });
    } else if (performance.trend === 'declining') {
      performanceScore = Math.max(0, performanceScore - 5);
      factors.push({
        factor: 'Performance Trend',
        score: 0,
        weight: 5,
        impact: 'negative',
        details: 'Performance is declining over time',
      });
      recommendations.push('Investigate declining performance metrics');
    }
  } else {
    factors.push({
      factor: 'Performance Data',
      score: 0,
      weight: 40,
      impact: 'neutral',
      details: 'No recent performance data available',
    });
    recommendations.push('Implement performance tracking for this partner');
  }

  // 2. Reliability Score (25% weight)
  let reliabilityScore = 50;

  // SLA reliability
  if (sla.length > 0) {
    const avgCompliance = sla.reduce((sum, s) => sum + s.overallCompliance, 0) / sla.length;
    reliabilityScore = avgCompliance;

    const openBreaches = sla.reduce((sum, s) => sum + (s.openBreaches || 0), 0);
    if (openBreaches > 0) {
      reliabilityScore = Math.max(0, reliabilityScore - (openBreaches * 5));
      factors.push({
        factor: 'SLA Breaches',
        score: openBreaches,
        weight: 10,
        impact: 'negative',
        details: `${openBreaches} open SLA breaches`,
      });
      recommendations.push('Address SLA breaches to maintain service levels');
    }

    factors.push({
      factor: 'SLA Compliance',
      score: avgCompliance,
      weight: 10,
      impact: avgCompliance >= 95 ? 'positive' : avgCompliance < 85 ? 'negative' : 'neutral',
      details: `Average SLA compliance: ${avgCompliance.toFixed(1)}%`,
    });
  }

  // Contract reliability
  if (activeContracts > 0) {
    factors.push({
      factor: 'Active Contracts',
      score: activeContracts,
      weight: 5,
      impact: 'positive',
      details: `${activeContracts} active contract(s)`,
    });
    reliabilityScore = Math.min(100, reliabilityScore + 5);
  }

  // Partnership duration
  if (partner.partnership?.startDate) {
    const partnershipMonths = (Date.now() - new Date(partner.partnership.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (partnershipMonths >= 24) {
      reliabilityScore = Math.min(100, reliabilityScore + 5);
      factors.push({
        factor: 'Partnership Tenure',
        score: partnershipMonths,
        weight: 5,
        impact: 'positive',
        details: `Long-standing partnership: ${Math.floor(partnershipMonths)} months`,
      });
    } else if (partnershipMonths < 6) {
      factors.push({
        factor: 'Partnership Tenure',
        score: partnershipMonths,
        weight: 5,
        impact: 'neutral',
        details: `New partnership: ${Math.floor(partnershipMonths)} months`,
      });
    }
  }

  // 3. Financial Score (20% weight)
  let financialScore = 50;

  if (financial) {
    // Payment history score
    if (financial.paymentHistory?.paymentScore) {
      financialScore = financial.paymentHistory.paymentScore;

      if (financial.paymentHistory.latePayments > 0) {
        const lateRate = financial.paymentHistory.latePayments / financial.paymentHistory.totalPayments;
        if (lateRate > 0.2) {
          financialScore = Math.max(0, financialScore - 15);
          factors.push({
            factor: 'Late Payment Rate',
            score: lateRate * 100,
            weight: 10,
            impact: 'negative',
            details: `High late payment rate: ${(lateRate * 100).toFixed(1)}%`,
          });
          recommendations.push('Improve payment timeliness');
        }
      }
    }

    // Financial health
    if (financial.financialHealthScore) {
      financialScore = (financialScore + financial.financialHealthScore) / 2;

      if (financial.financialHealthScore >= 80) {
        factors.push({
          factor: 'Financial Health',
          score: financial.financialHealthScore,
          weight: 5,
          impact: 'positive',
          details: 'Strong financial standing',
        });
      }
    }

    // Risk rating
    if (financial.riskRating === 'high') {
      financialScore = Math.max(0, financialScore - 15);
      factors.push({
        factor: 'Financial Risk Rating',
        score: 0,
        weight: 5,
        impact: 'negative',
        details: 'High financial risk',
      });
      recommendations.push('Review financial arrangements and consider credit limits');
    } else if (financial.riskRating === 'low') {
      financialScore = Math.min(100, financialScore + 5);
      factors.push({
        factor: 'Financial Risk Rating',
        score: 100,
        weight: 5,
        impact: 'positive',
        details: 'Low financial risk',
      });
    }

    // Bankruptcy flag
    if (financial.bankruptcyFlag) {
      financialScore = 10;
      factors.push({
        factor: 'Bankruptcy Status',
        score: 0,
        weight: 15,
        impact: 'negative',
        details: 'Bankruptcy flag active',
      });
      recommendations.push('Immediate review required - bankruptcy flag active');
    }

    // Credit utilization
    const utilization = financial.creditLine.creditLimit > 0
      ? (financial.creditLine.currentBalance / financial.creditLine.creditLimit) * 100
      : 0;

    if (utilization > 90) {
      financialScore = Math.max(0, financialScore - 10);
      factors.push({
        factor: 'Credit Utilization',
        score: utilization,
        weight: 5,
        impact: 'negative',
        details: `High credit utilization: ${utilization.toFixed(1)}%`,
      });
    }
  } else {
    factors.push({
      factor: 'Financial Data',
      score: 0,
      weight: 20,
      impact: 'neutral',
      details: 'No financial data available',
    });
    recommendations.push('Request financial information for better assessment');
  }

  // 4. Compliance Score (15% weight)
  let complianceScore = 50;

  // Partner compliance status
  if (partner.complianceStatus === 'compliant') {
    complianceScore = 90;
    factors.push({
      factor: 'Compliance Status',
      score: 90,
      weight: 10,
      impact: 'positive',
      details: 'Fully compliant with requirements',
    });
  } else if (partner.complianceStatus === 'non_compliant') {
    complianceScore = 20;
    factors.push({
      factor: 'Compliance Status',
      score: 20,
      weight: 10,
      impact: 'negative',
      details: 'Non-compliant with requirements',
    });
    recommendations.push('Address compliance issues immediately');
  }

  // SLA compliance (reused from reliability)
  if (sla.length > 0) {
    const slaCompliance = sla.reduce((sum, s) => sum + s.overallCompliance, 0) / sla.length;
    complianceScore = Math.min(100, (complianceScore + slaCompliance) / 2);
  }

  // Insurance coverage (if applicable)
  if (financial?.hasInsurance) {
    complianceScore = Math.min(100, complianceScore + 5);
    factors.push({
      factor: 'Insurance Coverage',
      score: 100,
      weight: 3,
      impact: 'positive',
      details: 'Adequate insurance coverage in place',
    });
  }

  // Integration status bonus
  if (partner.integrationStatus === 'real_time') {
    complianceScore = Math.min(100, complianceScore + 3);
    factors.push({
      factor: 'Integration Level',
      score: 100,
      weight: 2,
      impact: 'positive',
      details: 'Real-time integration enabled',
    });
  }

  // Calculate overall score
  const weights = {
    performance: 0.40,
    reliability: 0.25,
    financial: 0.20,
    compliance: 0.15,
  };

  const overall = Math.round(
    performanceScore * weights.performance +
    reliabilityScore * weights.reliability +
    financialScore * weights.financial +
    complianceScore * weights.compliance
  );

  // Generate overall recommendation
  if (overall >= 80) {
    recommendations.unshift('Excellent partner - consider for priority business');
  } else if (overall >= 60) {
    recommendations.unshift('Good standing partner - continue monitoring');
  } else if (overall >= 40) {
    recommendations.unshift('Partner requires attention - implement improvement plan');
  } else {
    recommendations.unshift('Critical review needed - consider alternative partners');
  }

  // Update partner with new scores
  await Partner.findByIdAndUpdate(partner._id, {
    trustScore: overall,
    trustScoreBreakdown: {
      performanceScore: Math.round(performanceScore),
      reliabilityScore: Math.round(reliabilityScore),
      financialScore: Math.round(financialScore),
      complianceScore: Math.round(complianceScore),
    },
    updatedAt: new Date(),
  });

  return {
    overall,
    breakdown: {
      performanceScore: Math.round(performanceScore),
      reliabilityScore: Math.round(reliabilityScore),
      financialScore: Math.round(financialScore),
      complianceScore: Math.round(complianceScore),
    },
    factors,
    recommendations: [...new Set(recommendations)], // Remove duplicates
    lastUpdated: new Date(),
  };
}

/**
 * Get trust score without calculation (returns cached)
 */
export async function getTrustScore(partnerId: string, tenantId: string): Promise<{
  overall: number;
  breakdown: TrustScoreBreakdown;
  lastUpdated: Date;
} | null> {
  const partner = await Partner.findOne({ partnerId, tenantId, isDeleted: false })
    .select('trustScore trustScoreBreakdown updatedAt');

  if (!partner || partner.trustScore === undefined) {
    return null;
  }

  return {
    overall: partner.trustScore,
    breakdown: partner.trustScoreBreakdown || {
      performanceScore: 50,
      reliabilityScore: 50,
      financialScore: 50,
      complianceScore: 50,
    },
    lastUpdated: partner.updatedAt,
  };
}

/**
 * Batch calculate trust scores for all partners
 */
export async function batchCalculateTrustScores(tenantId: string): Promise<{
  processed: number;
  errors: string[];
}> {
  const partners = await Partner.find({ tenantId, isDeleted: false, status: 'active' });
  const errors: string[] = [];
  let processed = 0;

  for (const partner of partners) {
    try {
      await calculateTrustScore({ partnerId: partner.partnerId, tenantId });
      processed++;
    } catch (error: any) {
      errors.push(`${partner.partnerId}: ${error.message}`);
    }
  }

  return { processed, errors };
}

export default {
  calculateTrustScore,
  getTrustScore,
  batchCalculateTrustScores,
};
