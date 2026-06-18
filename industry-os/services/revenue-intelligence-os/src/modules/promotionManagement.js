/**
 * Promotion Management Module
 * Campaign attribution, ROI tracking, and budget optimization
 */

export class PromotionManagement {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all promotions
   */
  getPromotions(status = null) {
    let promotions = Array.from(this.db.promotions.values());

    if (status) {
      promotions = promotions.filter(p => p.status === status);
    }

    return {
      promotions: promotions.map(p => ({
        ...p,
        roi: p.roi || 0,
        conversionRate: p.conversionRate || 0,
        revenuePerDollar: p.budget > 0 ? (p.revenue || 0) / p.budget : 0,
      })),
      summary: {
        total: promotions.length,
        active: promotions.filter(p => p.status === 'active').length,
        planned: promotions.filter(p => p.status === 'planned').length,
        completed: promotions.filter(p => p.status === 'completed').length,
        totalBudget: promotions.reduce((s, p) => s + (p.budget || 0), 0),
        totalRevenue: promotions.reduce((s, p) => s + (p.revenue || p.projectedRevenue || 0), 0),
        avgROI: promotions.filter(p => p.roi).length > 0
          ? Math.round(promotions.reduce((s, p) => s + (p.roi || 0), 0) / promotions.filter(p => p.roi).length)
          : 0,
      },
    };
  }

  /**
   * Create a new promotion
   */
  createPromotion(promotion) {
    const id = `PROM${Date.now()}`;
    const newPromotion = {
      id,
      ...promotion,
      status: promotion.status || 'planned',
      projectedRevenue: promotion.projectedRevenue || promotion.budget * 3,
      roi: promotion.roi || 200,
      conversionRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.promotions.set(id, newPromotion);
    return newPromotion;
  }

  /**
   * Update promotion status
   */
  updatePromotion(id, updates) {
    const promotion = this.db.promotions.get(id);
    if (!promotion) return null;

    const updated = {
      ...promotion,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate ROI if revenue updated
    if (updated.revenue && updated.budget) {
      updated.roi = Math.round((updated.revenue - updated.budget) / updated.budget * 100);
      updated.revenuePerDollar = updated.revenue / updated.budget;
    }

    this.db.promotions.set(id, updated);
    return updated;
  }

  /**
   * Get promotion attribution model
   */
  getAttribution(promotionId) {
    const promotion = this.db.promotions.get(promotionId);
    if (!promotion) return { error: 'Promotion not found' };

    const totalRevenue = promotion.revenue || promotion.projectedRevenue || 0;
    const budget = promotion.budget || 1;

    // Multi-touch attribution model
    return {
      promotionId,
      promotionName: promotion.name,
      totalAttributedRevenue: totalRevenue,
      attributionModel: 'multi-touch',
      touchpoints: [
        {
          name: 'First Touch',
          revenue: Math.round(totalRevenue * 0.25),
          percentage: 25,
          conversions: Math.round(totalRevenue / 1000 * 0.25),
        },
        {
          name: 'Lead Generation',
          revenue: Math.round(totalRevenue * 0.35),
          percentage: 35,
          conversions: Math.round(totalRevenue / 1000 * 0.35),
        },
        {
          name: 'Consideration',
          revenue: Math.round(totalRevenue * 0.25),
          percentage: 25,
          conversions: Math.round(totalRevenue / 1000 * 0.25),
        },
        {
          name: 'Conversion',
          revenue: Math.round(totalRevenue * 0.15),
          percentage: 15,
          conversions: Math.round(totalRevenue / 1000 * 0.15),
        },
      ],
      channelBreakdown: {
        organic: { revenue: Math.round(totalRevenue * 0.30), percentage: 30 },
        paid: { revenue: Math.round(totalRevenue * 0.45), percentage: 45 },
        direct: { revenue: Math.round(totalRevenue * 0.15), percentage: 15 },
        referral: { revenue: Math.round(totalRevenue * 0.10), percentage: 10 },
      },
      metrics: {
        roi: promotion.roi || Math.round((totalRevenue - budget) / budget * 100),
        revenuePerDollar: totalRevenue / budget,
        paybackPeriod: Math.round(12 / ((promotion.roi || 200) / 100 + 1)),
        cacContribution: budget / (totalRevenue / 1000),
      },
    };
  }

  /**
   * Analyze promo effectiveness
   */
  analyzeEffectiveness() {
    const promotions = Array.from(this.db.promotions.values());
    const activePromotions = promotions.filter(p => p.status === 'active');

    const effectiveness = activePromotions.map(p => {
      const roi = p.roi || 0;
      const health = roi > 200 ? 'excellent' : roi > 100 ? 'good' : roi > 50 ? 'moderate' : 'poor';

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        budget: p.budget,
        revenue: p.revenue || 0,
        roi,
        health,
        recommendations: this.generatePromoRecommendations(roi, p.type),
      };
    });

    return {
      promotions: effectiveness,
      summary: {
        totalBudget: activePromotions.reduce((s, p) => s + (p.budget || 0), 0),
        totalRevenue: activePromotions.reduce((s, p) => s + (p.revenue || 0), 0),
        avgROI: Math.round(effectiveness.reduce((s, p) => s + p.roi, 0) / effectiveness.length),
        excellent: effectiveness.filter(p => p.health === 'excellent').length,
        good: effectiveness.filter(p => p.health === 'good').length,
        moderate: effectiveness.filter(p => p.health === 'moderate').length,
        poor: effectiveness.filter(p => p.health === 'poor').length,
      },
    };
  }

  /**
   * Generate promo recommendations
   */
  generatePromoRecommendations(roi, type) {
    const recommendations = [];

    if (roi > 300) {
      recommendations.push({
        type: 'scale',
        message: 'Excellent performance - increase budget allocation',
        expectedImpact: '+30% revenue',
        confidence: 'high',
      });
    } else if (roi > 150) {
      recommendations.push({
        type: 'optimize',
        message: 'Good performance - fine-tune targeting',
        expectedImpact: '+15% revenue',
        confidence: 'medium',
      });
    } else if (roi > 50) {
      recommendations.push({
        type: 'review',
        message: 'Moderate performance - review campaign elements',
        expectedImpact: '+10% revenue',
        confidence: 'medium',
      });
    } else {
      recommendations.push({
        type: 'stop',
        message: 'Poor performance - consider pausing or reallocating budget',
        expectedImpact: '-10% waste',
        confidence: 'high',
      });
    }

    if (type === 'discount') {
      recommendations.push({
        type: 'alternative',
        message: 'Consider value-add promotions instead of pure discounts',
        expectedImpact: '+5% margin',
        confidence: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Optimize budget allocation
   */
  optimizeBudget(totalBudget) {
    const promotions = Array.from(this.db.promotions.values());
    const activePromotions = promotions.filter(p => p.status === 'active');

    if (activePromotions.length === 0) {
      return { error: 'No active promotions to optimize' };
    }

    // Calculate performance scores
    const scores = activePromotions.map(p => ({
      id: p.id,
      name: p.name,
      currentBudget: p.budget || 0,
      roi: p.roi || 100,
      score: (p.roi || 100) / 100,
    }));

    // Normalize scores
    const totalScore = scores.reduce((s, p) => s + p.score, 0);

    // Allocate budget based on performance
    const allocations = scores.map(p => {
      const share = p.score / totalScore;
      const newBudget = Math.round(totalBudget * share);
      const change = newBudget - p.currentBudget;
      const changePercent = p.currentBudget > 0 ? (change / p.currentBudget * 100).toFixed(0) : 100;

      return {
        id: p.id,
        name: p.name,
        currentBudget: p.currentBudget,
        newBudget,
        change,
        changePercent: `${changePercent > 0 ? '+' : ''}${changePercent}%`,
        reason: change > 0 ? 'Above average performance' : 'Below average performance',
      };
    });

    return {
      totalBudget,
      allocations,
      summary: {
        totalAllocated: allocations.reduce((s, a) => s + a.newBudget, 0),
        increased: allocations.filter(a => a.change > 0).length,
        decreased: allocations.filter(a => a.change < 0).length,
        maintained: allocations.filter(a => a.change === 0).length,
        projectedROI: Math.round(allocations.reduce((s, a) => s + a.newBudget * (a.id ? (promotions.find(p => p.id === a.id)?.roi || 100) / 100 : 1), 0) / totalBudget),
      },
    };
  }

  /**
   * Get promo calendar
   */
  getCalendar(year = 2026) {
    const promotions = Array.from(this.db.promotions.values());

    const calendar = [];
    for (let month = 0; month < 12; month++) {
      const monthPromotions = promotions.filter(p => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return start.getFullYear() <= year && end.getFullYear() >= year &&
               start.getMonth() <= month && end.getMonth() >= month;
      });

      calendar.push({
        month: new Date(year, month).toLocaleString('default', { month: 'long' }),
        promotions: monthPromotions.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          budget: p.budget,
          revenue: p.revenue || p.projectedRevenue,
        })),
        totalBudget: monthPromotions.reduce((s, p) => s + (p.budget || 0), 0),
        projectedRevenue: monthPromotions.reduce((s, p) => s + (p.revenue || p.projectedRevenue || 0), 0),
      });
    }

    return {
      year,
      calendar,
      summary: {
        totalPromotions: promotions.length,
        totalBudget: promotions.reduce((s, p) => s + (p.budget || 0), 0),
        totalProjectedRevenue: promotions.reduce((s, p) => s + (p.revenue || p.projectedRevenue || 0), 0),
      },
    };
  }

  /**
   * Forecast promo impact
   */
  forecastImpact(promotionData) {
    const { type, discount, budget, duration } = promotionData;

    let baseConversions = 100;
    let baseConversionRate = 3.5;

    // Adjust for promo type
    if (type === 'discount') {
      baseConversionRate += discount * 0.2; // Higher discount = higher conversion
      baseConversions += discount * 10;
    } else if (type === 'bundle') {
      baseConversionRate += 1.5;
      baseConversions += 50;
    } else if (type === 'referral') {
      baseConversionRate += 0.5;
      baseConversions += 30;
    }

    // Calculate metrics
    const avgDealSize = 25000;
    const totalConversions = baseConversions * (duration / 30); // Scale by duration
    const projectedRevenue = totalConversions * avgDealSize;
    const costPerAcquisition = budget / totalConversions;
    const roi = ((projectedRevenue - budget) / budget * 100).toFixed(0);

    return {
      input: promotionData,
      projections: {
        totalConversions: Math.round(totalConversions),
        projectedRevenue: Math.round(projectedRevenue),
        costPerAcquisition: Math.round(costPerAcquisition),
        roi: parseInt(roi),
        revenuePerDollar: (projectedRevenue / budget).toFixed(2),
      },
      assumptions: {
        avgDealSize,
        baseConversionRate,
        duration,
      },
      recommendations: roi > 150 ?
        { action: 'proceed', message: 'Promising ROI - proceed with promotion' } :
        { action: 'revise', message: 'Consider increasing discount or budget' },
    };
  }
}

export default PromotionManagement;
