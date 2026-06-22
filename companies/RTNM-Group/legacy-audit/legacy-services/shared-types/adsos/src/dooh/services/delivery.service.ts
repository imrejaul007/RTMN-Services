/**
 * DOOH - Ad Delivery Service
 * Decides which ads to show on which screens
 */

import type {
  Screen,
  DOOHCampaign,
  DeliveryRequest,
  DeliveryResponse,
  DeliverySlot,
  Creative,
  DeliveryContext,
  RevenueModel,
  AudienceProfile
} from '../types'

/**
 * Ad Delivery Engine
 * Core decision-making for DOOH ad network
 */
export class DeliveryEngine {
  /**
   * Get ads for a screen
   */
  getAdsForScreen(
    request: DeliveryRequest,
    screen: Screen,
    campaigns: DOOHCampaign[]
  ): DeliveryResponse {
    const eligible = this.filterCampaigns(campaigns, screen, request)
    const ranked = this.rankCampaigns(eligible, screen, request.context)
    const slots = this.selectSlots(ranked, request.available_slots)

    return {
      screen_id: request.screen_id,
      slots,
      generated_at: new Date()
    }
  }

  private filterCampaigns(
    campaigns: DOOHCampaign[],
    screen: Screen,
    _request: DeliveryRequest
  ): DOOHCampaign[] {
    return campaigns.filter(c => {
      if (c.status !== 'active') return false
      if (c.spent >= c.budget) return false

      const now = new Date()
      if (now < c.start_date || now > c.end_date) return false

      if (c.targeting.cities?.length) {
        if (!c.targeting.cities.includes(screen.location.city)) {
          return false
        }
      }

      if (c.targeting.screen_types?.length) {
        if (!c.targeting.screen_types.includes(screen.type)) {
          return false
        }
      }

      return true
    })
  }

  private rankCampaigns(
    campaigns: DOOHCampaign[],
    screen: Screen,
    context: DeliveryContext
  ): RankedCampaign[] {
    return campaigns.map(campaign => {
      let score = 100
      const reasons: string[] = []

      const audienceScore = this.calculateAudienceScore(campaign, screen.audience_profile)
      score *= (0.4 + audienceScore * 0.6)
      if (audienceScore > 0.8) {
        reasons.push(`High audience match (${Math.round(audienceScore * 100)}%)`)
      }

      const timeScore = this.calculateTimeScore(campaign, context)
      score *= (0.8 + timeScore * 0.2)
      if (timeScore > 1) {
        reasons.push('Prime time targeting match')
      }

      const urgency = (campaign.budget - campaign.spent) / campaign.budget
      if (urgency > 0.8) {
        score *= 1.3
        reasons.push('High budget remaining')
      }

      return { campaign, score, reasons }
    }).sort((a, b) => b.score - a.score)
  }

  private calculateAudienceScore(
    campaign: DOOHCampaign,
    audienceProfile?: AudienceProfile
  ): number {
    if (!audienceProfile?.primary?.length || !campaign.targeting.audience_segments?.length) {
      return 1.0
    }

    const targetSegments = new Set(campaign.targeting.audience_segments)
    let totalMatch = 0
    let totalWeight = 0

    for (const segment of audienceProfile.primary) {
      totalWeight += segment.percentage
      if (targetSegments.has(segment.type)) {
        totalMatch += segment.percentage
      }
    }

    return totalWeight > 0 ? totalMatch / totalWeight : 1.0
  }

  private calculateTimeScore(campaign: DOOHCampaign, context: DeliveryContext): number {
    const hour = new Date().getHours()

    if (!campaign.targeting.day_parts) return 1.0

    if (hour >= 6 && hour < 12 && campaign.targeting.day_parts.morning) return 1.5
    if (hour >= 12 && hour < 17 && campaign.targeting.day_parts.afternoon) return 1.5
    if (hour >= 17 && hour < 22 && campaign.targeting.day_parts.evening) return 1.5

    return 0.7
  }

  private selectSlots(
    ranked: RankedCampaign[],
    availableSlots: number
  ): DeliverySlot[] {
    const slots: DeliverySlot[] = []
    let position = 0

    for (let i = 0; i < Math.min(availableSlots, ranked.length); i++) {
      const item = ranked[i]
      const creative = item.campaign.creatives[0]
      if (!creative) continue

      slots.push({
        position: position++,
        campaign_id: item.campaign.id,
        creative,
        duration: creative.duration,
        priority: Math.round(item.score),
        reason: item.reasons.join(', ')
      })
    }

    return slots
  }
}

interface RankedCampaign {
  campaign: DOOHCampaign
  score: number
  reasons: string[]
}

/**
 * Revenue calculator for DOOH
 */
export class RevenueCalculator {
  calculateCost(
    campaign: DOOHCampaign,
    impressions: number,
    model: RevenueModel
  ): number {
    switch (model.type) {
      case 'cpm':
        return (impressions / 1000) * (model.cpm_rate || 10)
      case 'slot': {
        const slot = model.slot_pricing?.find(s => s.slot_type === 'standard')
        return (impressions / 60) * (slot?.price || 1)
      }
      case 'performance':
        return this.calculatePerformanceCost(campaign, model)
      case 'hybrid': {
        const base = (impressions / 1000) * (model.base_cpm || 5)
        const bonus = this.calculatePerformanceCost(campaign, model) * (model.performance_bonus || 0)
        return base + bonus
      }
      default:
        return impressions * 0.01
    }
  }

  private calculatePerformanceCost(campaign: DOOHCampaign, model: RevenueModel): number {
    const metric = model.performance_metric || 'scan'
    const rate = model.performance_rate || 0.5

    if (metric === 'scan') return campaign.metrics.scans * rate
    if (metric === 'visit') return campaign.metrics.visits * rate
    if (metric === 'purchase') return campaign.metrics.purchases * rate
    return 0
  }

  calculatePayout(
    impressions: number,
    revenue: number,
    share: { screen_owner: number; platform: number }
  ): { owner: number; platform: number } {
    return {
      owner: Math.round(revenue * (share.screen_owner / 100)),
      platform: Math.round(revenue * (share.platform / 100))
    }
  }
}

export function createDeliveryEngine(): DeliveryEngine {
  return new DeliveryEngine()
}

export function createRevenueCalculator(): RevenueCalculator {
  return new RevenueCalculator()
}
